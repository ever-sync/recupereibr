#!/usr/bin/env python3
"""Apply the reviewed form guards to existing n8n workflows without replacing unrelated nodes.

Dry-run by default. Reads N8N_API_KEY from the environment or the existing macOS
Keychain item. Credentials are never written to source, command arguments or logs.
"""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
FORM_ID = "J92oyqqDNuqQhPzE"
RD_ID = "0z22FDBfZ70c8oVw"
BASE = "https://n8n.eversync.space/api/v1/"
NAMESPACE = uuid.UUID("62a6f9a6-1fbd-40eb-a5b9-d5692f571d87")


def node(name, kind, parameters, position, version=2):
    return {"id": str(uuid.uuid5(NAMESPACE, name)), "name": name,
            "type": "n8n-nodes-base." + kind, "typeVersion": version,
            "position": position, "parameters": parameters}


def edge(name):
    return {"node": name, "type": "main", "index": 0}


def connect(workflow, name, *outputs):
    workflow["connections"][name] = {"main": [[edge(target) for target in output] for output in outputs]}


def put_node(workflow, replacement):
    workflow["nodes"] = [n for n in workflow["nodes"] if n["name"] != replacement["name"]] + [replacement]


def guard_code(rd=False):
    shared = (ROOT / "form-validation.js").read_text()
    return shared + """
const formValidation = typeof module !== 'undefined' && module.exports?.validate
  ? module.exports : globalThis.recupereibrForms;
const item = $input.first();
const raw = item.json.body ?? item.json ?? {};
const documentCount = Object.keys(item.binary || {}).length || Number(raw.documentCount || 0);
""" + (
        "const gate = raw.source === 'whatsapp_davi' ? {valid: true, pending: false, missingFields: []} : formValidation.validate(raw, {documentCount});\n"
        if rd else "const gate = formValidation.validate(raw, {documentCount: Object.keys(item.binary || {}).length});\n"
    ) + "return [{json: {...item.json, _formGate: gate}, binary: item.binary}];"


def add_guard(workflow, triggers, next_node, rd=False):
    label = "Validar formulario antes do RD" if rd else "Validar formulario completo"
    decision = label + "?"
    reject = "Responder formulario incompleto RD" if rd else "Responder formulario incompleto"
    put_node(workflow, node(label, "code", {"jsCode": guard_code(rd)}, [-700, 400]))
    put_node(workflow, node(decision, "if", {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
                       "conditions": [{"id": str(uuid.uuid5(NAMESPACE, decision)),
                                       "leftValue": "={{ $json._formGate.valid }}", "rightValue": True,
                                       "operator": {"type": "boolean", "operation": "equals"}}], "combinator": "and"},
        "options": {}
    }, [-480, 400], 2.2))
    put_node(workflow, node(reject, "respondToWebhook", {
        "respondWith": "json",
        "responseBody": "={{ { ok: $json._formGate.pending, synchronized: false, status: $json._formGate.pending ? 'awaiting_completion' : 'invalid_form', missingFields: $json._formGate.missingFields } }}",
        "options": {"responseCode": "={{ $json._formGate.pending ? 202 : 422 }}"}
    }, [-240, 600], 1.4))
    for trigger in triggers:
        current = next(n for n in workflow["nodes"] if n["name"] == trigger)
        current["parameters"]["responseMode"] = "responseNode"
        connect(workflow, trigger, [label])
    connect(workflow, label, [decision])
    connect(workflow, decision, [next_node], [reject])


def patch_rd(original):
    workflow = copy.deepcopy(original)
    add_guard(workflow, ["Entrada RD CRM"], "Normalizar Lead RD", rd=True)
    # Completed forms must also fill contact details when the deal already exists.
    # Reuse the established merge that retains existing phones, emails and deals.
    connect(workflow, "Mover negocio para Qualificado", ["Preparar vinculo do contato"])
    connect(workflow, "Atualizar campos na etapa atual", ["Preparar vinculo do contato"])
    result = next(n for n in workflow["nodes"] if n["name"] == "Registrar resultado RD")
    if "synchronized: true" not in result["parameters"]["jsCode"]:
        result["parameters"]["jsCode"] = result["parameters"]["jsCode"].replace(
            "ok: true, provider:", "ok: true, synchronized: true, provider:")
    # Search results must match the exact normalized phone. Never use arbitrary
    # fallback contacts returned by the provider's broad text search.
    resolver = next(n for n in workflow["nodes"] if n["name"] == "Resolver contato e negocio")
    resolver["parameters"]["jsCode"] = resolver["parameters"]["jsCode"].replace(
        "const candidates = matchingRows.length ? matchingRows : rows;",
        "const candidates = matchingRows;").replace(
        "const suffix = target.slice(-10);",
        "const national = target.startsWith('55') ? target.slice(2) : target;").replace(
        "digits === target || digits.endsWith(suffix)",
        "digits === target || digits === national")
    put_node(workflow, node("Responder gravacao RD", "respondToWebhook", {
        "respondWith": "json", "responseBody": "={{ $json }}", "options": {"responseCode": 200}
    }, [2800, 400], 1.4))
    connect(workflow, "Registrar resultado RD", ["Responder gravacao RD"])
    return workflow


def patch_form(original):
    workflow = copy.deepcopy(original)
    add_guard(workflow, ["Captacao", "Simulacao"], "Normalizar e Qualificar")
    obsolete = {"Cadastro apenas iniciado?", "Sincronizar lead iniciado no RD"}
    workflow["nodes"] = [n for n in workflow["nodes"] if n["name"] not in obsolete]
    for name in obsolete:
        workflow["connections"].pop(name, None)
    sync = next(n for n in workflow["nodes"] if n["name"] == "Sincronizar formulario concluido no RD")
    # A provider error must fail the request, never be acknowledged as saved.
    sync["parameters"]["options"].pop("response", None)
    sync["parameters"]["options"]["timeout"] = 45000
    put_node(workflow, node("Confirmar gravacao do formulario", "code", {
        "jsCode": """if ($json.ok !== true || $json.synchronized !== true || !$json.dealId || !$json.contactId) {
  throw new Error('O RD nao confirmou a gravacao completa do formulario.');
}
const lead = $('Normalizar e Qualificar').item;
return [{json: {ok: true, synchronized: true}, binary: lead.binary}];"""
    }, [900, 400]))
    put_node(workflow, node("Responder formulario salvo", "respondToWebhook", {
        "respondWith": "json", "responseBody": "={{ {ok: true, synchronized: true} }}",
        "options": {"responseCode": 200}
    }, [1120, 400], 1.4))
    put_node(workflow, node("Retomar formulario salvo", "code", {
        "jsCode": "const lead = $('Normalizar e Qualificar').item;\nreturn [{json: lead.json, binary: lead.binary}];"
    }, [1340, 400]))
    connect(workflow, "Normalizar e Qualificar", ["Sincronizar formulario concluido no RD"])
    connect(workflow, "Sincronizar formulario concluido no RD", ["Confirmar gravacao do formulario"])
    connect(workflow, "Confirmar gravacao do formulario", ["Responder formulario salvo"])
    connect(workflow, "Responder formulario salvo", ["Retomar formulario salvo"])
    connect(workflow, "Retomar formulario salvo", ["Preparar primeira mensagem do Davi", "Pre-atendimento com anexos?"])
    return workflow


def payload(workflow):
    # Keep credentials as existing n8n references. Do not export credential values.
    return {key: workflow[key] for key in ("name", "nodes", "connections", "settings")}


def fingerprint(workflow):
    return hashlib.sha256(json.dumps(payload(workflow), sort_keys=True).encode()).hexdigest()


def check(workflow):
    names = {n["name"] for n in workflow["nodes"]}
    assert len(names) == len(workflow["nodes"]), "Duplicate node names"
    for name, outputs in workflow["connections"].items():
        assert name in names, name
        for branch in outputs["main"]:
            for connection in branch:
                assert connection["node"] in names, connection["node"]
    for current in workflow["nodes"]:
        if current["type"] == "n8n-nodes-base.code":
            subprocess.run(["node", "-e", "new (Object.getPrototypeOf(async function(){}).constructor)(require('fs').readFileSync(0,'utf8'))"],
                           input=current["parameters"]["jsCode"], text=True, check=True, capture_output=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup-dir", type=Path, required=True)
    args = parser.parse_args()
    key = os.environ.get("N8N_API_KEY") or subprocess.check_output(
        ["security", "find-generic-password", "-a", "rapha", "-s", "recupereibr-n8n-api", "-w"], text=True).strip()

    def request(path, method="GET", body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method,
                                     headers={"X-N8N-API-KEY": key, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            # Workflow errors contain schema diagnostics, not credentials.
            raise RuntimeError(f"n8n {method} {path}: HTTP {error.code}: {error.read().decode()[:1200]}") from None

    args.backup_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    for workflow_id, patch in [(RD_ID, patch_rd), (FORM_ID, patch_form)]:
        original = request("workflows/" + workflow_id)
        changed = patch(original)
        check(changed)
        backup = args.backup_dir / (workflow_id + ".json")
        if not backup.exists():
            backup.write_text(json.dumps(original, ensure_ascii=False))
            backup.chmod(0o600)
        before = {n["name"]: n for n in original["nodes"]}
        modifications = [n["name"] for n in changed["nodes"] if n != before.get(n["name"])]
        if args.apply and fingerprint(original) != fingerprint(changed):
            latest = request("workflows/" + workflow_id)
            if latest["versionId"] != original["versionId"]:
                raise RuntimeError("Workflow changed concurrently; review again before applying.")
            saved = request("workflows/" + workflow_id, "PUT", payload(changed))
            if original["active"]:
                request("workflows/" + workflow_id + "/activate", "POST", {"versionId": saved["versionId"]})
            live = request("workflows/" + workflow_id)
            assert live["active"] == original["active"]
            assert fingerprint(live) == fingerprint(changed), "Saved workflow differs"
            assert not live["active"] or live.get("activeVersionId") == live["versionId"], "New version is not active"
            print(json.dumps({"workflowId": workflow_id, "applied": True, "versionId": live["versionId"],
                              "changedNodes": modifications}))
        else:
            print(json.dumps({"workflowId": workflow_id, "applied": False, "changedNodes": modifications}))


if __name__ == "__main__":
    main()
