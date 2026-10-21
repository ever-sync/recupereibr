# Publicar a RecupereiBR na Hostinger

O site usa HTML, CSS e JavaScript. Use uma hospedagem com a opção **Site personalizado PHP/HTML** e acesso ao Gerenciador de arquivos.

## Enviar o pacote

1. No painel da Hostinger, adicione um site PHP/HTML. Você pode começar pelo domínio temporário para conferir as páginas.
2. Se já houver um site no destino, faça um backup dos arquivos e da configuração antes de substituir seu conteúdo.
3. Abra **Sites → Painel → Gerenciador de arquivos → public_html**.
4. Envie `recupereibr-hostinger.zip` e extraia seu conteúdo diretamente nessa pasta. `index.html`, `.htaccess`, `avaliacao.html` e a pasta `assets` devem ficar dentro de `public_html`, sem uma pasta intermediária.
5. Confira se não existe uma página inicial antiga, como `index.php` ou `default.php`, assumindo a página inicial. Preserve o backup antes de retirar arquivos antigos do destino.
6. Confira a página inicial, `/avaliacao`, `/blog` e as páginas de agradecimento no domínio temporário. Os links canônicos e os links absolutos de produção continuam apontando para `recupereibr.com.br`.
7. Configure `recupereibr.com.br` e `www.recupereibr.com.br` no painel, habilite o certificado SSL para ambos e use os apontamentos de DNS informados pela Hostinger. Preserve os registros de e-mail e os subdomínios das integrações.
8. Depois da publicação, valide as páginas e acompanhe um envio autorizado/real de formulário até o RD Station, incluindo o responsável atribuído. Retire o ZIP de `public_html` depois de extraí-lo.

O pacote contém uma regra `.htaccess` que mantém as URLs sem `.html`, redireciona `index.html` para `/`, remove a barra final das páginas e entrega a página de erro com status HTTP 404. Para o domínio de produção, as regras usam HTTPS e a versão sem `www`. O domínio temporário permanece utilizável para conferência.

Os parâmetros de campanha (`gclid` e `utm_*`) são preservados nos redirecionamentos. As páginas revalidam o cache; scripts, estilos e imagens têm cache de um dia.

## Formulários e anúncios

Os endereços HTTPS dos formulários e os arquivos de rastreamento são copiados sem alteração. As automações n8n e a integração com RD Station continuam hospedadas separadamente; o ZIP não inclui essas aplicações ou o banco de dados. A distribuição de leads continua sendo definida pela automação existente.

Não envie testes pelo formulário do domínio temporário durante a conferência visual: os endereços de envio continuam sendo os de produção. A validação local do pacote não precisa criar leads nem enviar mensagens.

## Gerar o ZIP novamente

Na raiz deste repositório, com Python 3 e Git instalados:

```sh
python3 scripts/package-hostinger.py --output "$HOME/Downloads/recupereibr-hostinger.zip"
```

O script usa os arquivos públicos do commit atual (`HEAD`) e acrescenta `deploy/hostinger/.htaccess` na raiz do ZIP. Alterações locais ainda não commitadas nas páginas não entram no pacote. A configuração da Hostinger é lida do arquivo de trabalho, permitindo sua conferência antes do commit.

O ZIP não inclui `.git`, `.DS_Store`, configurações da Vercel, scripts de manutenção ou esta documentação. O conteúdo pode ser extraído diretamente em `public_html`.

## Referências

- [Transferir um site para a Hostinger](https://www.hostinger.com/support/1583289-how-to-manually-transfer-a-website-to-hostinger/)
- [Usar .htaccess na Hostinger](https://www.hostinger.com/support/1583307-how-to-create-an-htaccess-file-at-hostinger/)
