# Ponte do Portal MedEasy

Cloudflare Worker que grava no Notion o que o mentor muda pelo site e manda o GitHub sincronizar na hora. As chaves ficam só aqui, nos secrets do Worker.

## Subir pela primeira vez

1. Crie uma conta grátis em dash.cloudflare.com com o e-mail da MedEasy.
2. No computador, com Node instalado:
   ```
   cd worker
   npx wrangler login
   npx wrangler secret put PORTAL_SENHA         # senha da equipe, igual à do site
   npx wrangler secret put PORTAL_SENHA_ADMIN   # senha de administrador (opcional)
   npx wrangler secret put NOTION_TOKEN         # token da conexão Portal MedEasy, com "Atualizar conteúdo" ligado
   npx wrangler secret put GITHUB_TOKEN         # token fine-grained só com Actions: write em medeasy-posts
   npx wrangler deploy
   ```
3. O deploy mostra o endereço, tipo `https://medeasy-ponte.SEU-USUARIO.workers.dev`. Cole esse endereço em `scripts/portal/ponte.txt`, rode `node scripts/portal/montar-site.mjs` e publique.
4. No Notion, abra a conexão "Portal MedEasy" e ligue "Atualizar conteúdo" em Funções. Sem isso o Worker só consegue ler.

## O que ele aceita

- `POST /pagina` com `{ id, props }`: grava nas colunas permitidas da linha do cliente (Status, Pagamento, Tipo de serviço, Certificados por item, Controle de certificados, datas, Mentor, Corretor, Trainee, Telefone). Mentor pago, Valor total, Desconto e Forma de pagamento só com a senha de administrador no cabeçalho `X-Admin`.
- `POST /sincronizar`: dispara o workflow do Notion no GitHub.
- `GET /saude`: diz o que está configurado.

Todo pedido leva `Authorization: Bearer <senha da equipe>`. O site manda isso sozinho com a senha que o mentor usou para entrar.
