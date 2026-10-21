#!/usr/bin/env python3
"""Empacota os arquivos publicos do commit atual para public_html da Hostinger."""

import argparse
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import zipfile


ROOT = Path(__file__).resolve().parents[1]
WEB_EXTENSIONS = {
    ".html", ".css", ".js", ".txt", ".xml", ".ico", ".png", ".jpg",
    ".jpeg", ".webp", ".gif", ".svg", ".avif", ".woff", ".woff2",
    ".ttf", ".otf", ".webmanifest",
}


def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path, help="Caminho do ZIP")
    args = parser.parse_args()
    output = args.output.expanduser().resolve()
    if output.suffix.lower() != ".zip":
        parser.error("O arquivo de saida precisa ter extensao .zip")

    revision = git("rev-parse", "HEAD").decode().strip()
    timestamp = int(git("show", "-s", "--format=%ct", revision).decode())
    files = {}
    # git archive preserva a versao publicada e ignora alteracoes locais,
    # arquivos nao rastreados e as pastas de controle do Git.
    with tarfile.open(fileobj=io.BytesIO(git("archive", "--format=tar", revision))) as archive:
        for entry in archive.getmembers():
            path = PurePosixPath(entry.name)
            if not entry.isfile() or any(part.startswith(".") for part in path.parts):
                continue
            if len(path.parts) > 1 and path.parts[0] != "assets":
                continue
            if path.suffix.lower() not in WEB_EXTENSIONS:
                continue
            files[path.as_posix()] = archive.extractfile(entry).read()

    # A configuracao da hospedagem e a unica adicao ao conteudo publico.
    files[".htaccess"] = (ROOT / "deploy/hostinger/.htaccess").read_bytes()
    required = {"index.html", "advisora.js", "404.html", "avaliacao.html", "tracking.js"}
    missing = required - files.keys()
    if missing:
        raise SystemExit("Arquivos obrigatorios ausentes no commit: " + ", ".join(sorted(missing)))

    output.parent.mkdir(parents=True, exist_ok=True)
    zip_time = datetime.fromtimestamp(max(timestamp, 315532800), timezone.utc).timetuple()[:6]
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, zip_time)
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            package.writestr(info, data)

    with zipfile.ZipFile(output) as package:
        invalid = package.testzip()
        if invalid:
            raise SystemExit("Falha na verificacao do ZIP: " + invalid)
    print(json.dumps({
        "archive": str(output), "source_commit": revision, "files": len(files),
        "bytes": output.stat().st_size,
        "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
