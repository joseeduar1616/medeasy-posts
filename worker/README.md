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
3. O deploy mostra o endereço, tipo `https://medeasy-ponte.SEU-USUARIO.workers.dev`. Cole esse endereço em `scripts/portal/ponte.txt` (fica no repositório, não é segredo), rode `node scripts/portal/montar-site.mjs` e publique.
4. No Notion, abra a conexão "Portal MedEasy" e ligue "Atualizar conteúdo" em Funções. Sem isso o Worker só consegue ler.

## Atualizar

Depois de mudar `src/index.js` ou `wrangler.toml`: `git pull` e, dentro de `worker`, `npx wrangler deploy`. Os secrets continuam.

## Agendamento

O `wrangler.toml` tem um agendamento a cada 10 minutos que dispara a sincronização do Notion no GitHub. Ele só passa a valer depois de `npx wrangler deploy`.

## O que ele aceita

- `POST /pagina` com `{ id, props }`: grava nas colunas permitidas da linha do cliente (Status, Pagamento, Tipo de serviço, Certificados por item, Controle de certificados, datas, Mentor, Corretor, Trainee, Telefone). Mentor pago, Valor total, Desconto e Forma de pagamento só com a senha de administrador no cabeçalho `X-Admin`.
- `POST /triagem` com `{ id?, props, arquivar? }`: cria ou atualiza a linha na base "Triagem MedEasy" (TRIAGEM_DB). Só mexe em páginas dessa base.
- `POST /cliente` com `{ props }`: cria o cliente que fechou no "Controle cliente" (CLIENTES_DB) e pede a sincronização.
- `POST /sincronizar`: dispara o workflow do Notion no GitHub.

Nas colunas de opção (Mentor, Tipo de serviço, Provas), a ponte usa a opção que já existe, sem diferença de maiúscula, acento ou traço. Assim "Lucas" vira "LUCAS" e "PSU-GO" vira "PSUGO".
- `GET /saude`: diz o que está configurado.

Todo pedido leva `Authorization: Bearer <senha da equipe>`. O site manda isso sozinho com a senha que o mentor usou para entrar.
