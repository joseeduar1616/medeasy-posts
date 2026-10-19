# MedEasy

Este repositório tem duas partes:
- Posts automáticos do Instagram (@med_easyy). Regras em PLAYBOOK.md.
- Portal MedEasy: site em que os clientes acompanham o currículo e os mentores acompanham todos os clientes. Publicado no GitHub Pages a partir da pasta `portal/`.

Escreva em português simples, sem travessão e sem ponto e vírgula, com vírgula decimal. Mensagens de WhatsApp sem emoji.

## Portal: como está montado

- O site é estático e todos os dados ficam cifrados (PBKDF2 SHA-256 com 310000 iterações e AES-GCM 256).
  - `portal/data/equipe.json` abre com a senha da equipe. A senha não fica no repositório, porque ele é público. Peça ao José.
  - `portal/data/c/<hash>.json` guarda os dados de cada cliente e abre com o código de 10 letras dele.
  - `portal/data/extras.json` guarda o que não está no Notion: pendências, especialidade, telefones da equipe e análises. Para abrir: `PORTAL_SENHA=... node scripts/portal/extras.mjs abrir > extras.json` (fora do repositório). Para cifrar de novo: `... extras.mjs cifrar extras.json`.
- O login do mentor é o nome dele mais a senha da equipe. Mentor comum vê só os próprios clientes. José e Eduardo são administradores (`ADMINS` no build.mjs) e veem toda a equipe. Com o secret `PORTAL_SENHA_ADMIN`, o build gera `portal/data/admin.json` e o site pede essa segunda senha para entrar como administrador.
- O cliente entra com o código pelo link `portal/?c=CODIGO`.

## Arquivos

- `scripts/portal/build.mjs` lê o Notion e gera `portal/data`.
  - Com `NOTION_TOKEN` e `NOTION_DB`, usa a API.
  - Com `--linhas arquivo.json`, usa um export da base.
- `scripts/portal/editais.json` guarda os editais 2027, com a parte do currículo e a ficha numérica de cada prova. Cada item da ficha tem:
  - `item`: nome do item.
  - `pontos`: regra em texto.
  - `maxN`: máximo do item.
  - `unit`: pontos por certificado, ou null quando não é por contagem.
  - `artigo`: marca artigo ou capítulo.
  - `grupo` e `grupoMax`: teto comum entre vários itens.
- `scripts/portal/analise.mjs` lê o PDF da análise curricular MedEasy, item por item. O build lê os PDFs anexados na coluna "Análise" (arquivo) do cliente no Notion e o portal do cliente mostra a nota, o que falta e como conseguir.
- `scripts/portal/form-cert.txt` (opcional, fora do git se quiser) guarda o link público do formulário do Notion "Enviar certificados". Com ele, a triagem mostra o botão para o cliente mandar os PDFs.
- `scripts/portal/site/` tem os moldes do site:
  - `index.tpl.html`: tela do mentor e login.
  - `certitens.js`: certificados por item, nota e valor.
  - `portalview.js`: tela do cliente.
  - `triagem.js`: triagem de cliente novo. Formulário público em `portal/?triagem=<whatsapp do mentor>`, aba Triagem do mentor (fica no localStorage), orçamento com opções, mensagem de WhatsApp e PDFs do orçamento e da análise gerados no navegador. O PDF da análise sai no formato que `analise.js` e `analise.mjs` sabem ler.
  - `controle.js`: controle de certificados na tela do cliente e na triagem. Abas Resumo (projeção real e ideal por prova), Pendências (quem resolve e situação, as do cliente aparecem no portal dele), Certificados (inventário por tipo) e uma por prova (adicionar e remover certificado em cada item, com estado pontuando, com risco, tentativa ou reserva). A alocação alimenta a contagem por item quando não há contagem digitada. Fica no navegador e vai para o Notion pelo botão "Copiar controle para o Notion".
  - `marcacao.js`: no portal do cliente, "Marque o que você já tem" em cada item do edital (Já tenho com quantidade, Em andamento, Não tenho, Não se aplica), com nota atual, meta e o que falta por pontos. Fica no celular do cliente. "Enviar para o mentor" manda pelo WhatsApp um link `?m=` que importa a marcação no painel como rascunho da contagem por item.
  - `analise.js`: lê a análise curricular (PDF com pdf.js ou triagem.json) no navegador e junta nas provas do cliente ou da triagem.
  - `base.css`: estilo.
- Depois de mexer nos moldes, rode `node scripts/portal/montar-site.mjs`. Ele gera `portal/index.html`, e nunca se edita esse arquivo direto.
- `worker/` tem a ponte: Cloudflare Worker que grava no Notion o que o mentor muda pelo site e dispara a sincronização no GitHub. Instruções em `worker/README.md`. O endereço dela fica em `scripts/portal/ponte.txt` (hoje https://medeasy-ponte.medeasy.workers.dev, não é segredo). O Worker também pede a sincronização a cada 10 minutos pelo agendamento do Cloudflare, e o site pede uma quando o mentor entra. Com a ponte, "Copiar para o Notion" vira "Salvar no Notion", e a tela do cliente tem Status, Pagamento e Mentor pago (só admin) editáveis. Sem a ponte, o site só copia o texto.
- Workflows:
  - `.github/workflows/portal-pages.yml` publica o site a cada push.
  - `.github/workflows/portal-notion.yml` sincroniza com o Notion. O agendamento do GitHub atrasa horas, por isso quem dispara de verdade é a ponte. Precisa dos secrets PORTAL_SENHA, NOTION_TOKEN e NOTION_DB.

## Notion

- A base "Controle cliente" fica em https://app.notion.com/p/Clientes-10e01997062f83fdbe2001c61ce41a4b. Cada linha é um serviço, e as linhas são agrupadas por nome do cliente mais os 8 últimos dígitos do telefone.
- "Tipo de serviço" mistura serviços (Vitae, Lattes, ANALISE, Certificados) e provas (PSUGO, PSUMG, HPP...). Uma prova escrita no fim do nome do cliente ("Jose Nicolas PSU") também conta.
- A base "Triagem MedEasy", dentro da página Clientes, recebe o formulário "Enviar certificados" (nome, WhatsApp, mentor, provas, pedido, arquivos). O build lê essa base e a aba Triagem do site mostra quem chegou, com botão Importar.
- "Controle de certificados" é um JSON colado do site (`{certs, aloc, pend}`). O build lê e devolve em `c.controle`, e as pendências do cliente entram no portal dele.
- "Certificados por item" é preenchida com o botão "Copiar para o Notion" do site. Formato: uma linha por prova, como `PSU-GO: 2=2; 4=3; 9=/0,5`, em que o número antes do = é o número do item na ficha e "/0,5" são pontos digitados.
- O mentor recebe 60% do valor total, e o repasse só fica "a receber" quando o serviço está Concluído e o cliente com Pagamento finalizado. Antes disso o site mostra como "valor futuro". O corretor hoje é o mesmo mentor, então não há repasse separado. O build ignora a fórmula "Valor para mentor" do Notion (PORTAL_USAR_FORMULA=1 volta a usá-la).
- Quem sai da equipe entra em `EX_EQUIPE` no build.mjs (hoje: Ana Eluiza). Some do login e do filtro, e os clientes antigos ficam no histórico.

## Valores (tabela 2026)

- Vitae: taxa de 100 por prova (90 com mais de 2 provas) mais o valor por certificado, nas faixas até 30, de 31 a 49 e 50 ou mais.
  - Modelo A: 9 / 8,5 / 8
  - Modelo B: 9,5 / 9 / 8,5
  - Modelo C: 8 / 7,5 / 7
  - Modelo D: 9 / 8,5 / 8
  - Modelo E: 9 / 8,5 / 8
- Artigo: 12,50 cada.
- Lattes: Categoria A 7 / 6,5 / 6. Categoria B 12 / 11,5 / 11.
- Lattes com Certificados e sem Vitae equivale ao plano B: o documento já está incluso e a prova cobra só a análise (100, ou 90 cada com 2 ou mais).
- Modelo por prova:
  - D: PSU-GO e PSU-MG
  - C: HPP, Santa Casa SP, FMABC, UNITAU, IDOR, PUC-Campinas e HCPA
  - E: CET
  - A: todas as outras

## Pendências conhecidas

- Faltam os secrets do Notion no GitHub, por isso a sincronização automática ainda não roda.
- Fichas sem números:
  - IPSEMG e Santa Casa SP: falta o PDF do anexo.
  - Einstein: os pesos ainda não saíram.
  - UNIFESP: o peso é definido por cada programa.
  - CET: não tem tabela de pontos.
  - Sírio: não tem análise no acesso direto.
- Conferir:
  - HCPA: os valores por subitem vieram de resumo.
  - HPP: a ficha vem da análise da Beatriz.
  - UNIARA: usa o edital de 2026.
- 21 clientes em andamento ainda estão sem prova marcada no Notion. A lista aparece no Painel do site.
- O secret PORTAL_SENHA foi cadastrado com maiúscula. O build usa a forma que abre os extras (minúsculas), então funciona, mas o certo é corrigir o secret.
- Não guarde chave de escrita (GitHub, Notion) dentro do site. Ele é público, e a senha da equipe é compartilhada.
