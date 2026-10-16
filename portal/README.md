# Portal MedEasy

Site estático onde os clientes acompanham o currículo e os mentores acompanham os clientes e os repasses.

Endereço depois de ligar o GitHub Pages: `https://joseeduar1616.github.io/medeasy-posts/portal/`

## Como funciona o login

- **Equipe:** nome + senha da equipe. A senha abre `data/equipe.json`. Cada pessoa vê os clientes em que aparece como mentor, corretor ou trainee, e o que vai receber em cada papel. José vê todos (para mudar quem vê tudo, crie a variável `PORTAL_ADMINS` com os nomes separados por vírgula).
- **Cliente:** código de 10 letras e números. O código abre só o arquivo dele em `data/c/`.

Os arquivos em `data/` são criptografados (AES-GCM, chave derivada da senha com PBKDF2). A senha não fica escrita em nenhum arquivo do repositório. Sem a senha ou o código, os arquivos são ilegíveis.

Limites: como todos os mentores usam a mesma senha, quem tem a senha consegue abrir os dados da equipe inteira, mesmo que a tela mostre só os clientes dele. O site é só de leitura. As mudanças são feitas no Notion.

## Atualização pelo Notion

O workflow `.github/workflows/portal-notion.yml` roda de hora em hora, lê a base Controle cliente do Notion e regrava `data/`. Ele usa a API oficial, que traz o resultado das fórmulas (Valor para mentor, Valor para corretor e Valor para Medeasy). Ele precisa de três segredos em Settings > Secrets and variables > Actions:

| Segredo | O que é |
| --- | --- |
| `PORTAL_SENHA` | a senha da equipe |
| `NOTION_TOKEN` | token de uma integração interna do Notion (notion.so/my-integrations) com acesso à base |
| `NOTION_DB` | o link da página Clientes (ou só o código de 32 caracteres) |

## Gerar à mão

```
PORTAL_SENHA=... NOTION_TOKEN=... NOTION_DB=... node scripts/portal/build.mjs --forcar
```

Detalhes que não existem no Notion (nota da análise, itens da ficha, pendências) ficam em `data/extras.json`, também cifrado. Para editar: `node scripts/portal/extras.mjs abrir > extras.json`, mude o arquivo e rode `node scripts/portal/extras.mjs cifrar extras.json`. Nunca coloque arquivos legíveis dentro do repositório.

## Análise curricular

Na base Controle cliente do Notion, crie uma coluna do tipo **Arquivos e mídia** com o nome **Análise curricular**. O mentor arrasta o PDF da análise (o modelo MedEasy) ou o `triagem.json` para essa coluna, na linha do cliente. Na sincronização seguinte, o portal lê a nota atual, a nota possível, o prazo, as regras do edital e cada item: situação, nota, ganho possível, comprovantes que a pessoa já tem e o comentário do mentor. Pode anexar mais de uma análise, uma por prova.

Para testar um PDF à mão: `node scripts/portal/analise.mjs arquivo.pdf`
