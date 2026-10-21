# Publicacao do RecupereiBR no Railway

O site estatico e servido pelo Caddy do Railpack. O upload inclui apenas paginas,
estilos, JavaScript, arquivos publicos e assets; scripts de automacao, testes,
metadados e backups nao sao publicados.

- Projeto: `837a0685-8f64-4a72-86ac-91a38e0bd131`
- Ambiente: `81427875-d0b6-42d6-8574-a732d03822db` (production)
- Servico: `1d0af971-ae8b-4f0e-b0c2-1907ac7f22dc` (recupereibr-site)
- Endereco Railway: https://recupereibr-site-production.up.railway.app
- Dominio principal: https://recupereibr.com.br

## Publicar

Utilizar um checkout limpo do commit confirmado em `origin/main`. O servico
existente recebe os arquivos via CLI; um push no Git nao substitui o deploy.

```sh
railway up --project 837a0685-8f64-4a72-86ac-91a38e0bd131 --environment 81427875-d0b6-42d6-8574-a732d03822db --service 1d0af971-ae8b-4f0e-b0c2-1907ac7f22dc --detach --json -m "Atualiza site RecupereiBR"
```

Aguardar `SUCCESS` do ID retornado e conferir paginas, assets e formularios na
URL do Railway. Verificar `/avaliacao`, `/simulacao`, redirecionamentos com
parametros e o status 404 de caminhos inexistentes e arquivos internos.
O Caddy usa `PORT` fornecido pela plataforma; `SITE_ROOT` permite testar o mesmo
servidor localmente, mantendo `/app` como padrao de producao.

## Dominio

Consultar os valores atuais de CNAME e TXT com `railway domain status` antes de
alterar o provedor DNS. Preservar os registros de e-mail e outros subdominios.
Confirmar resolucao DNS, verificacao de propriedade, certificado HTTPS e o
conteudo publicado no dominio principal. Apenas cadastrar o dominio no Railway
nao conclui o apontamento.

O fluxo dos formularios continua utilizando os webhooks existentes do n8n. A
interface so confirma o envio com `{ok: true, synchronized: true}`; uma resposta
HTTP 200 isolada nao comprova que os dados foram gravados no RD.
