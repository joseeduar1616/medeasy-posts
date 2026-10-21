# MedEasy

Este repositório tem três partes:
- Posts automáticos do Instagram (@med_easyy). Regras em PLAYBOOK.md.
- Portal MedEasy: site em que os clientes acompanham o currículo e os mentores acompanham todos os clientes. Publicado no GitHub Pages a partir da pasta `portal/`.
- Pasta `cadencia/`: posts automáticos do Instagram do Cadência Med (@cadenciamed), outra marca do José. Regras em `cadencia/LEIA-ME.md`. As rotinas da MedEasy não mexem nela.

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
- `scripts/portal/leitor-analise.mjs` é o leitor do texto da análise curricular, o mesmo no build e no site (o montar-site injeta). Aceita "ITEM 1", "01" ou "Item 1 -", número antes ou depois do rótulo (também com os números numa linha e os rótulos em outra, ou o rótulo quebrado em duas linhas), comprovantes numerados ou com marcador e, se faltar algo, a tabela "Análise resumida". Reconhece a prova pelo título (SCMSP e ISCMSP viram Santa Casa SP, Escola Paulista vira UNIFESP). Quando não reconhece, o cartão da análise pede para o mentor escolher a prova. Cada análise lançada tem o botão "Remover PDF" (e "Remover todas"), que tira também a prova que ela tinha marcado sozinha na triagem.
- `scripts/portal/leitor-ficha.mjs` lê tabelas de pontuação, o mesmo arquivo no site (o montar-site injeta em `ficha.js`). `lerFichaDoEdital` acha a lista numerada de critérios do edital com o máximo na coluna da direita (com vírgula ou "ponto") e o valor por certificado no texto, e para na linha TOTAL. Editais em tabela de várias colunas, como o ENARE, voltam vazios e o mentor monta à mão. `lerNotasDoCurriculo` lê a ficha preenchida do currículo pronto (a última coluna é a nota do candidato).
- `scripts/portal/analise.mjs` lê o PDF da análise curricular MedEasy, item por item. O build lê os PDFs anexados na coluna "Análise" (arquivo) do cliente no Notion e o portal do cliente mostra a nota, o que falta e como conseguir.
- `scripts/portal/form-cert.txt` (opcional, fora do git se quiser) guarda o link público do formulário do Notion "Enviar certificados". Com ele, a triagem mostra o botão para o cliente mandar os PDFs.
- `scripts/portal/site/` tem os moldes do site:
  - `index.tpl.html`: tela do mentor e login.
  - `certitens.js`: certificados por item, nota e valor.
  - `portalview.js`: tela do cliente.
  - `triagem.js`: triagem de cliente novo. Formulário público em `portal/?triagem=<whatsapp do mentor>`, sem nenhum valor (o orçamento é só do mentor), com campo "Outras provas" para as que não estão na lista (cobradas no Modelo A), aba Triagem do mentor (com a ponte, cada triagem vai sozinha para a base "Triagem MedEasy", com tudo na coluna "Dados do site", e volta pelo build para os outros aparelhos. O botão "Criar cliente no Notion" cria a linha no Controle cliente), orçamento com opções (o botão "Editar à mão" muda título, descrição, quantidade e valor de cada linha, acrescenta linhas, fixa o valor final e edita a nota do PDF e a mensagem), mensagem de WhatsApp e PDFs do orçamento e da análise gerados no navegador. O PDF da análise sai no formato que `analise.js` e `analise.mjs` sabem ler.
  - `controle.js`: controle de certificados na tela do cliente e na triagem. Abas Resumo (projeção real e ideal por prova), Pendências (quem resolve e situação, as do cliente aparecem no portal dele), Certificados (inventário por tipo) e uma por prova (adicionar e remover certificado em cada item, com estado pontuando, com risco, tentativa ou reserva). "Adicionar arquivos" lê PDFs e fotos dos certificados no navegador e cria um certificado por arquivo, ou por página quando o PDF junta vários, com tipo, ano e carga horária tirados do texto. Os arquivos não sobem para lugar nenhum. A alocação alimenta a contagem por item quando não há contagem digitada. Fica no navegador e vai para o Notion pelo botão "Copiar controle para o Notion".
  - `marcacao.js`: no portal do cliente, "Marque o que você já tem" em cada item do edital (Já tenho com quantidade, Em andamento, Não tenho, Não se aplica), com nota atual, meta e o que falta por pontos. Fica no celular do cliente. "Enviar para o mentor" manda pelo WhatsApp um link `?m=` que importa a marcação no painel como rascunho da contagem por item. No mesmo arquivo, "Seus certificados": o cliente escolhe os PDFs e fotos no celular, o site monta a lista e manda ao mentor um link `?k=` que entra no controle de certificados do cliente.
  - `ficha.js`: no cartão Certificados por item. Prova sem ficha: "Ler PDF do edital" (PDF ou Word) monta a ficha num editor para o mentor conferir, ou "Montar à mão". Toda prova: "Editar ficha" e "Ler currículo pronto" (PDF ou Word do Vitae com a ficha preenchida), que vira a contagem por item como rascunho. Nos itens por certificado entra o mínimo de certificados para chegar na nota. A ficha fica no controle do cliente (vai para o Notion em "Controle de certificados", campo `fichas`) ou na triagem.
  - `feedback.js`: feedback dos clientes. Página `?feedback` (pede o código) ou `?c=CODIGO&feedback` (link do botão "Pedir feedback" do mentor), e o cartão "Deixar feedback" no portal do cliente. Duas partes opcionais: depoimento público (nota, texto, assinatura escolhida e autorização) e feedback particular anônimo (nota do mentor, nota da MedEasy, se indicaria e texto), que vai sem o nome do cliente, só com o mentor. Envia pela ponte (`/feedback/enviar`). A aba Feedbacks só aparece para administrador com a senha de administrador (os dados vêm do `admin.json`) e tem "Publicar no site". Os depoimentos aprovados ficam na página pública `?depoimentos`.
  - `analise.js`: lê a análise curricular (PDF com pdf.js ou triagem.json) no navegador e junta nas provas do cliente ou da triagem.
  - `base.css`: estilo.
- Depois de mexer nos moldes, rode `node scripts/portal/montar-site.mjs`. Ele gera `portal/index.html`, e nunca se edita esse arquivo direto.
- `worker/` tem a ponte: Cloudflare Worker que grava no Notion o que o mentor muda pelo site e dispara a sincronização no GitHub. Instruções em `worker/README.md`. O endereço dela fica em `scripts/portal/ponte.txt` (hoje https://medeasy-ponte.medeasy.workers.dev, não é segredo). O Worker também pede a sincronização a cada 10 minutos pelo agendamento do Cloudflare, e o site pede uma quando o mentor entra. Com a ponte, "Copiar para o Notion" vira "Salvar no Notion", e a tela do cliente tem Status, Pagamento e Mentor pago (só admin) editáveis. Sem a ponte, o site só copia o texto.
- Workflows:
  - `.github/workflows/portal-pages.yml` publica o site a cada push.
  - `.github/workflows/portal-ponte.yml` verifica a versão da ponte no ar e, com o secret CLOUDFLARE_API_TOKEN, publica a pasta `worker/` no Cloudflare a cada mudança. Sem o token, a publicação é pelo computador (`npx wrangler deploy`).
  - `.github/workflows/portal-notion.yml` sincroniza com o Notion. O agendamento do GitHub atrasa horas, por isso quem dispara de verdade é a ponte. Precisa dos secrets PORTAL_SENHA, NOTION_TOKEN e NOTION_DB.

## Notion

- A base "Controle cliente" fica em https://app.notion.com/p/Clientes-2b34d05bd374809a8b54cfb8413a106c (Espaço de MedEasy). Cada linha é um serviço, e as linhas são agrupadas por nome do cliente mais os 8 últimos dígitos do telefone.
- "Tipo de serviço" mistura serviços (Vitae, Lattes, ANALISE, Certificados) e provas (PSUGO, PSUMG, HPP...). Uma prova escrita no fim do nome do cliente ("Jose Nicolas PSU") também conta.
- A base "Triagem MedEasy", dentro da página Clientes, recebe o formulário "Enviar certificados" (nome, WhatsApp, mentor, provas, pedido, arquivos) e as triagens feitas no site (colunas Serviço, Valor do orçamento, Situação e "Dados do site", um JSON gravado pela ponte que não se edita à mão). O build lê essa base. As linhas sem "Dados do site" aparecem na aba Triagem como "Chegaram pelo formulário", com botão Importar.
- A base "Feedback MedEasy", ao lado da Triagem, recebe o feedback dos clientes pela ponte. A ponte cria a base sozinha no primeiro envio se ela não existir. Colunas: Nome (assinatura ou Anônimo), Tipo (Público ou Particular), Nota, Nota do mentor, Nota da MedEasy, Indicaria, Texto, Mentor, Provas e Publicar. O build põe todos os feedbacks no `admin.json` (só abre com a senha de administrador) e os públicos com Publicar marcado em `portal/data/depoimentos.json`, que é público de propósito. O mentor não vê a parte particular.
- "Controle de certificados" é um JSON gravado pelo site (`{certs, aloc, pend, fichas}`). O build lê e devolve em `c.controle`, e as pendências do cliente entram no portal dele. `fichas` são as fichas montadas pelo mentor (prova, itens, fonte, data). O build aplica a ficha ao cliente dela e usa a mais nova de cada prova para todos os clientes quando o editais.json não tem ficha daquela prova.
- O portal do cliente recebe também o plano (tipos), a contagem e os certificados do controle (sem as observações). Com isso mostra "Suas notas no currículo" (nota e quanto falta por prova) e "Seu orçamento", calculado com as mesmas regras do mentor e atualizado quando entram certificados ou artigos. O valor combinado (Valor total do Notion) aparece junto. O administrador pode gravar o valor calculado no Notion pelo cartão "Valor pelos certificados".
- "Certificados por item" é preenchida com o botão "Copiar para o Notion" do site. Formato: uma linha por prova, como `PSU-GO: 2=2; 4=3; 9=/0,5`, em que o número antes do = é o número do item na ficha e "/0,5" são pontos digitados.
- Cliente só de mentoria mensal tem um portal próprio: sem etapas, prazo de entrega, parcelas nem orçamento, com o cartão da mentoria e a mensalidade. A mensalidade fica fora do pagamento parcelado, e o repasse dela libera quando o cliente paga o mês (Pagamento finalizado na linha do mês).
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
- No orçamento de cada prova entram só os certificados válidos para ela: no item por certificado, até o número que ainda soma ponto. O que passa do máximo do item fica de fora, e a tela avisa quantos.
- O serviço Vitae aparece como "Currículo Vitae/currículo com certificados comprovados".
- Mentoria mensal: 250 por mês para até 2 provas, mais 150 por prova a mais (PRECO.mentoria no certitens.js). Na triagem é uma opção à parte, com o valor "por mês". No Notion entra como "Mentoria" no Tipo de serviço.
- Mentoria individual: paga uma vez, com o valor digitado pelo mentor na triagem. No Notion entra como "Mentoria individual".
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
