# Portal MedEasy

Site estático onde os clientes acompanham o currículo e os mentores acompanham os clientes e os repasses.

Endereço depois de ligar o GitHub Pages: `https://joseeduar1616.github.io/medeasy-posts/portal/`

## Como funciona o login

- **Mentor:** nome + senha da equipe. A senha abre `data/equipe.json`. Cada mentor vê só os próprios clientes. Quem está marcado como admin vê todos.
- **Cliente:** código de 10 letras e números. O código abre só o arquivo dele em `data/c/`.

Os arquivos em `data/` são criptografados (AES-GCM, chave derivada da senha com PBKDF2). A senha não fica escrita em nenhum arquivo do repositório. Sem a senha ou o código, os arquivos são ilegíveis.

Limites: como todos os mentores usam a mesma senha, quem tem a senha consegue abrir os dados da equipe inteira, mesmo que a tela mostre só os clientes dele. O site é só de leitura. As mudanças são feitas no Notion.

## Atualização pelo Notion

O workflow `.github/workflows/portal-notion.yml` roda de hora em hora, lê a base de clientes do Notion e regrava `data/`. Ele precisa de três segredos em Settings > Secrets and variables > Actions:

| Segredo | O que é |
| --- | --- |
| `PORTAL_SENHA` | a senha da equipe |
| `NOTION_TOKEN` | token de uma integração interna do Notion (notion.so/my-integrations) com acesso à base |
| `NOTION_DB` | o id da base de clientes (o trecho de 32 caracteres no link) |

## Gerar à mão

```
PORTAL_SENHA=... node scripts/portal/build.mjs --entrada dados.json
```

Nunca coloque o `dados.json` legível dentro do repositório.
