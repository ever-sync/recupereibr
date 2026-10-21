# Publicacao do RecupereiBR no Railway

O site estatico e servido pelo Caddy do Railpack. O servidor bloqueia scripts de
automacao, testes, metadados e configuracoes. A `.railwayignore` tambem limita
uploads pela CLI aos arquivos publicos e a configuracao do servidor.

- Workspace: gridlabs002's Projects
- Projeto: `3e549685-76dc-4706-afab-a55132f78b7a` (RecupereiBR Site)
- Ambiente: `1f5fd5de-4545-4ec7-84f3-361c68160451` (production)
- Servico: `67575fdb-c94d-4e1d-a063-42cdef91e07e` (recupereibr-site)
- Endereco Railway: https://recupereibr-site-production-3702.up.railway.app
- Dominio principal: https://recupereibr.com.br

## Publicar

Utilizar um checkout limpo do commit confirmado em `origin/main`. O servico esta
conectado a `ever-sync/recupereibr`, com um SHA especifico fixado no Railway.
Depois do push, atualizar a origem do servico para o novo SHA revisado e aguardar
o deploy. Um push isolado nao atualiza um servico que esta fixado em um commit.

Como alternativa, o upload direto pela CLI usa os seguintes identificadores:

```sh
railway up --project 3e549685-76dc-4706-afab-a55132f78b7a --environment 1f5fd5de-4545-4ec7-84f3-361c68160451 --service 67575fdb-c94d-4e1d-a063-42cdef91e07e --detach --json -m "Atualiza site RecupereiBR"
```

Aguardar `SUCCESS` do ID retornado e conferir paginas, assets e formularios na
URL do Railway. Verificar `/avaliacao`, `/simulacao`, redirecionamentos com
parametros e o status 404 de caminhos inexistentes e arquivos internos.
O Caddy usa `PORT` fornecido pela plataforma; `SITE_ROOT` permite testar o mesmo
servidor localmente, mantendo `/app` como padrao de producao.

O projeto antigo `837a0685-8f64-4a72-86ac-91a38e0bd131`, no workspace EverSync,
recusou novos deploys com "Your trial has expired" em 20/10/2026. Os demais
servicos desse projeto foram preservados; a migracao abrange apenas o site.

## Dominio

Consultar os valores atuais de CNAME e TXT com `railway domain status` antes de
alterar o provedor DNS. Preservar os registros de e-mail e outros subdominios.
Confirmar resolucao DNS, verificacao de propriedade, certificado HTTPS e o
conteudo publicado no dominio principal. Apenas cadastrar o dominio no Railway
nao conclui o apontamento.

O fluxo dos formularios continua utilizando os webhooks existentes do n8n. A
interface so confirma o envio com `{ok: true, synchronized: true}`; uma resposta
HTTP 200 isolada nao comprova que os dados foram gravados no RD.
