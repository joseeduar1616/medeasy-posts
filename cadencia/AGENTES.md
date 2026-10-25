# Agentes do Cadência Med

Os agentes rodam sozinhos, sozinhos, por pedido do José (22/10 e 25/10/2026):

| Agente | Horário (Brasília) | O que faz |
|---|---|---|
| Carrossel do dia | 09:52 | Carrossel de 7 slides no estilo de lançamento (dor na capa e telas reais do app) |
| Meme do dia | 14:52 | Meme que divulga o Cadência Med, feito aqui em alta, no feed e no story |
| Comentários | 20:23 | Responde os comentários novos dos posts com o tom da marca e esconde spam (skill `insta-comunidade`) |
| Viralização e plano da semana | domingo 17:44 | Lê os números, tira os padrões e escreve o plano da semana em `viralizacao.md` (skill `insta-viralizacao`) |
| Turbinar | 19:47 | Coloca o meme novo como anúncio no conjunto certo (nicho ou geral), tira os que não rendem e põe mais dinheiro no conjunto que dá visita mais barata, com teto de R$ 15 por dia |

Antes de criar post, leia o `viralizacao.md` (padrões e plano da semana). Os skills `insta-criador`,
`insta-viralizacao` e `insta-comunidade` (do José) explicam cada função com mais detalhe.

Todos começam igual a qualquer rotina daqui: leia antes o `LEIA-ME.md`
(começo da execução, regras de texto e como subir arquivos).

## O que funciona (até 25/10/2026)

- **Pago:** o Reel de meme "Meu estado mental faltando 1 mês para as provas de Residência" gastou R$ 206 e
  trouxe 2.087 visitas ao site, cerca de R$ 0,10 por visita (CTR de 5,5%). O carrossel de concorrência saiu
  R$ 0,76 por visita, e os Reels com tela do app, R$ 0,85.
- **Orgânico:** depois do lançamento, os Reels tiveram 165 a 390 contas alcançadas e os carrosséis 37 a 55.
- **Formato que ganhou:** a arte de tweet com texto curto em primeira pessoa e, dentro do cartão, um vídeo
  viral de pessoa reagindo, com o áudio original.
- **O José não gostou** do Reel com telas do app passando dentro do cartão (22/10).
- **Foto da IA do Canva não serve mais (25/10):** os três memes ficaram entre 39 e 63 contas, com 82% a 89%
  de pulo, o Instagram põe o selo "Conteúdo de IA" e o vídeo exportado do Canva sai borrado no feed. Não use
  `generate-image` nem o desenho `DAHYxSBc_kA` no post do dia.
- **Pedido do José (25/10):** os memes têm que divulgar o Cadência Med, e o carrossel volta todo dia.

---

## 1. Meme do dia (14:52)

O agente faz o meme inteiro sozinho e em alta, sem o José mandar nada. Todo meme divulga o Cadência Med:
o nome do app aparece no texto do tweet ou a imagem é uma tela real do app (ou as duas coisas).

**Qual caminho usar hoje:**
1. Tem vídeo na pasta do Drive "Cadência Med · memes" (`1qkfX5z2T6zCgAebXPz4wJSX6U7T3Kn2H`)? Caminho B.
2. Senão, a pasta "Cadência Med · memes famosos" (`1ClSHXlSwaB2feWe23qsMCfl8Tu2-T2Mh`) tem imagem que não
   saiu nos últimos 14 dias e o meme de ontem não foi famoso? Caminho C.
3. Senão, alterne entre o caminho A1 (meme com tela do app, foto) e o A2 (meme animado, Reel): se ontem foi
   A1, hoje é A2, e o contrário. Nunca avise que a pasta está vazia: as pastas são opcionais.

Depois de 14 dias, compare no `historico.md` alcance, visitas ao perfil e pulo de A1, A2 e C e passe a usar
mais o que rende mais (anote a decisão aqui).

### Antes de tudo

0. **Meme pronto na fila.** Se a seção "Memes prontos na fila" do `historico.md` tiver item, publique o
   primeiro dela (os arquivos já estão em `publicado/<id>/`) e tire da fila. Não crie outro nesse dia.
1. **Desempenho.** Leia os últimos 14 dias no Windsor (como no LEIA-ME, com `media_reel_skip_rate` e
   `media_reel_avg_watch_time`) e preencha o "Alcance depois" no `historico.md`. Se já houver meme publicado
   hoje, não publique outro.
2. **Texto do tweet.** Pegue a próxima pauta de "Memes que divulgam" no `pautas.md` (ou invente uma no mesmo
   tom quando acabar). Uma frase em primeira pessoa sobre a vida de quem presta residência (prova chegando,
   plantão, revisão, conteúdo atrasado, simulado, internato, ranking com os amigos) com o Cadência Med na piada.
   - Até 3 linhas, 1 ou 2 trechos em **negrito**.
   - Nada de conteúdo médico, número inventado ou promessa de aprovação. Só função que existe no app.
   - **Nicho (pedido do José em 22/10):** pelo menos 3 memes por semana falam de quem está no 3º e 4º ano,
     entrando no internato ou se preparando pro ENAMED (pautas "Nicho internato e ENAMED" no `pautas.md`).
     Nesses, use as hashtags #enamed #internato #medicinagoiania. Fato do ENAMED só o que está no
     `pautas.md` (vem do edital). Não use o nome da UFG nem de outra faculdade no texto.
   - Olhe os números: se um tema de meme rendeu bem, faça outro parecido.

### Caminho A1: meme com tela do app (foto no feed)

1. **JSON** `cadencia/posts/AAAA-MM-DD-slug-meme.json` com `id`, `formato: "meme-print"`, `texto`, `imagem` e
   `legenda` (regras do LEIA-ME, com "Marca quem..." ou "Manda pra quem..." e "Teste 3 dias grátis, sem cartão.
   Link na bio 👉 cadenciamed.com.br", hashtags com #memesdemedicina). `imagem` é uma destas:
   - `{"print": "<nome>", "recorte": [x, y, largura, altura]}`, tela real de `prints/` (tabela no LEIA-ME), com
     `"selo": "Tela real do Cadência Med"`. Recortes que funcionam: revisoes `[290,225,660,190]`,
     cartoes_ia `[210,0,840,450]`, assistente `[225,255,830,300]`, rotina `[205,378,520,300]`,
     cronograma `[662,126,352,188]` (ciclo clínico), planos `[205,440,845,230]`. Prefira recorte em que a parte
     importante da tela fique grande.
   - `{"ranking": [["Você","11h05",1],["Marina","8h30"],["Seu amigo","1h40"]]}` (sala com amigos, desenhado).
   Modelos: `posts/2026-10-26-revisoes-vencidas-meme.json`, `posts/2026-10-27-pdf-flashcards-meme.json`,
   `posts/2026-10-28-ranking-meme.json`.
2. **Gerar.** Se `cadencia/node_modules/playwright` não existir, rode antes `./cadencia/preparar.sh` em qualquer
   carrossel ou `cd cadencia && npm i --no-save playwright@1.56`. Depois `node cadencia/meme.mjs <json>`: sai
   `publicado/<id>/feed.jpg` (1080x1350) e `story.jpg` (1080x1920). Abra os dois (Read) e confira texto e imagem.
3. **Subir.** Commit de `posts/<id>.json` e `publicado/<id>/`, `git pull --rebase origin main`, push. Confira um
   link raw com `curl -sI` (200).
4. **Publicar.** Windsor `execute_action`, conector `instagram`, conta `17841456884640989`:
   `create_image_post` com `image_url` = raw do `feed.jpg` e `caption` = legenda, e depois `create_story` com
   `image_url` = raw do `story.jpg`. Se der timeout, confira os posts do dia antes de tentar de novo.
5. **Registrar** no `historico.md` (data, hora, formato "Meme com tela", texto, media_id do post e do story,
   link) e marque a pauta como saída. Commit e push.

### Caminho A2: meme animado (Reel)

Usa o gerador de `cadencia/videos/` (leia o `videos/LEIA-ME.md`): texto grande aparecendo palavra por palavra
em fundo escuro, um elemento no meio (etiquetas, carimbo, escada de revisão, tela do app) e o cartão final
"Teste 3 dias grátis". De 14 a 18 s: cena 1 com o gancho do meme (bloco `pergunta` com rótulo "POV" ou frase
grande), cena 2 com o exagero (etiquetas e carimbo), cena 3 com o Cadência Med resolvendo e a cena final.
Modelo: `videos/v5.js` (POV 23h).

1. Escreva `cadencia/videos/<id>.js` no modelo e a legenda num JSON `posts/<id>.json` (`formato: "meme-animado"`).
2. Gere fora do repositório como manda o `videos/LEIA-ME.md` (prévia com `render.mjs <v> previa`, depois o
   vídeo, a trilha com `som.py` e o ffmpeg que junta). Comprima pra subir: `ffmpeg -i <mp4> -c:v libx264
   -preset medium -crf 23 -maxrate 10M -bufsize 20M -c:a copy -movflags +faststart publicado/<id>/reel.mp4`
   e tire a capa com `ffmpeg -ss 2 -i reel.mp4 -frames:v 1 -q:v 3 publicado/<id>/capa.jpg`. Leva uns 10 minutos.
3. Abra 3 quadros da prévia antes de gerar o vídeo inteiro.
4. Subir como no A1 e publicar: `create_video_post` (`video_url` raw do `reel.mp4`, `cover_url` raw da
   `capa.jpg`, `caption`, `share_to_feed: true`) e `create_story` com o mesmo `video_url`.
5. Registrar como no A1, com formato "Meme animado".

### Caminho B: vídeo que o José deixou no Drive

1. **Escolher o vídeo.** No Drive (`search_files` com `parentId = '1qkfX5z2T6zCgAebXPz4wJSX6U7T3Kn2H' and mimeType contains 'video/'`),
   pegue o mais antigo. Se passar de 80 MB, pule pro próximo e avise.
2. **Baixar.** `download_file_content` devolve o arquivo em base64 (num JSON salvo em disco quando é grande).
   Decodifique pra um arquivo FORA do repositório. O vídeo original nunca vai pro GitHub.
3. **Assistir.** Tire um quadro por segundo com o ffmpeg (`-vf fps=1,scale=270:-1,tile=6x3`) e abra a imagem.
   Escolha o trecho mais forte, de 4 a 20 s (`inicio` e `fim`). Nunca zombe da pessoa do vídeo, nem cite o
   nome dela, nem diga quem ela é. O texto do tweet casa com a reação do vídeo.
4. **JSON** com `clipe` (caminho do arquivo baixado), `inicio`, `fim`, `texto` e `legenda`. No JSON que vai pro
   repositório, troque o caminho do `clipe` pelo nome e id do arquivo no Drive.
5. **Gerar.** `./cadencia/preparar.sh <json> --tweet`. Abra `capa.jpg`, `previa-meio.jpg` e `previa-fim.jpg`.
6. **Subir.** Commit só de `posts/<id>.json` e `publicado/<id>/`, pull com rebase, push. Link:
   `https://raw.githubusercontent.com/joseeduar1616/medeasy-posts/<hash>/cadencia/publicado/<id>/reel.mp4`.
7. **Publicar.** `create_video_post` (`video_url`, `caption`, `share_to_feed: true`) e `create_story` com o mesmo `video_url`.
8. **Mover o vídeo** pra "usados" (`update_file` com `parentId = '1jXMBvV544KQJIE6jHQ8gUWWhJh1khCce'`).
9. **Registrar** no `historico.md` (formato "Reel meme vídeo", arquivo do Drive, media_ids, link). Commit e push.

### Caminho C: meme famoso que o José deixou no Drive

As imagens de memes conhecidos (novela, reality, famosos) o José salva na pasta "memes famosos". Cada
imagem pode voltar com outro texto, desde que não repita nos últimos 14 dias.

1. **Escolher.** `search_files` com `parentId = '1ClSHXlSwaB2feWe23qsMCfl8Tu2-T2Mh' and mimeType contains 'image/'`.
   Pegue a que saiu há mais tempo (ou nunca saiu), olhando o `historico.md`.
2. **Baixar** com `download_file_content` pra um arquivo FORA do repositório e abrir a imagem (Read).
   Entenda a reação do meme e o texto que ele já tem.
3. **Texto do tweet** que casa com a reação, pelas regras de cima. Nunca escreva o nome da pessoa da imagem,
   nunca ponha fala inventada na boca dela e nunca diga que ela usa ou indica o Cadência Med.
4. **JSON** com `formato: "meme-print"`, `imagem: {"arquivo": "<caminho do arquivo baixado>"}`, `texto` (com o
   Cadência Med na piada, sem dizer que a pessoa usa o app) e `legenda`. No JSON que vai pro repositório,
   troque o caminho do `arquivo` pelo nome e id do arquivo no Drive.
5. **Gerar.** `node cadencia/meme.mjs <json>`: sai `feed.jpg` e `story.jpg`. Abra e confira: a imagem entra
   inteira, sem cortar o texto que ela tem (se cortar, ponha `"recorte"` com a imagem toda).
6. **Subir** só `posts/<id>.json` e `publicado/<id>/` (a imagem original nunca vai pro GitHub), pull com rebase, push.
7. **Publicar** como no A1: `create_image_post` com o `feed.jpg` e `create_story` com o `story.jpg`.
8. **Registrar** no `historico.md` (formato "Meme famoso", nome do arquivo no Drive, media_ids, link). Commit e push.

**Meme famoso nunca vira anúncio.** Usar a imagem de famoso pra vender o app em anúncio pago tem risco de
direito de imagem e o Meta costuma reprovar. O Turbinar só usa os caminhos A1, A2 e B.

---

## 3. Carrossel do dia (09:52)

Volta todo dia desde 25/10 (pedido do José). Siga a "Rotina de cada dia" e o "Passo a passo" do `LEIA-ME.md`:
7 slides no estilo de lançamento, molde `posts/2026-10-25-nao-lembro-nada.json`, pauta do `pautas.md`
(a próxima que não saiu, marque `~~...~~ *(saiu em DD/MM)*`). Pelo menos 3 slides com `print` real e não
repita a tela da capa do dia anterior. Uma vez por semana a pauta pode ser do nicho internato e ENAMED.
Publica com `create_carousel_post` e registra no `historico.md` como "Carrossel 7 slides".
Se já houver carrossel publicado hoje, não publique outro.

---

## 2. Turbinar (19:47)

### Onde

- Conta de anúncios `1829823838034115` (BRL), página do Facebook `1411404442052391`, Instagram `17841456884640989`.
- Campanha "Memes Reels · cliques no site · out/26" (`120251405506040345`, objetivo tráfego).
- Conjunto "BR · 20-32 · Instagram · memes · turbinar contínuo" (`120251603405840345`):
  orçamento definido pelo passo 4 (começou com R$ 6 por dia em 22/10), público de 20 a 32 anos no Brasil, só Instagram.
  Criado em 22/10 com o meme campeão "estado mental" (anúncio `120251603412240345`).
- Conjunto de nicho "Goiânia · 19-27 · Instagram · medicina internato e ENAMED" (`120251603906260345`):
  raio de 25 km do centro de Goiânia, 19 a 27 anos, começou com R$ 9 por dia. Criado em 22/10 a pedido do José, com os
  memes de internato e ENAMED. Os memes de nicho (que falam de internato, 4º ano ou ENAMED) entram aqui. Os
  outros entram no conjunto geral.
- **Dinheiro (pedido do José em 22/10):** no total, cerca de R$ 15 por dia somando os conjuntos ativos.
  Começou com R$ 9 no nicho e R$ 6 no geral, os dois ligados. O agente divide esse valor pelo desempenho
  (passo 4) e nunca passa de R$ 15 no total. Não cria campanha nem conjunto novo e não liga conjunto que
  esteja pausado (se o José pausou, ele quis assim).

### Passo a passo

1. Leia os anúncios dos dois conjuntos no Windsor (conector `facebook`, campos `ad_name`, `ad_id`, `ad_status`,
   `adset_status`, `spend`, `reach`, `actions_link_click`, `actions_landing_page_view`, `ctr`) dos últimos 7 dias.
   Preencha o resultado em `turbinadas.md`.
2. **Meme novo.** Pra cada Reel meme publicado nas últimas 30 h que ainda não está em `turbinadas.md`
   (só "Reel meme IA" e "Reel meme vídeo", nunca "Reel meme famoso"):
   - meme em vídeo (A2 e B): `create_ad_video` com o link raw do `reel.mp4`, e no `create_ad` abaixo o
     `video_data` com `image_url` = raw da `capa.jpg`;
   - meme em foto (A1): sem vídeo. No `create_ad`, use `object_story_spec` com `link_data`
     (`picture` = raw do `feed.jpg`, `link` = https://cadenciamed.com.br, `message`, `call_to_action` SIGN_UP).
     Se o Meta recusar, anote o erro em `turbinadas.md` e turbine só os memes em vídeo;
   - memes antigos de foto da IA (até 25/10) têm o `design_id` do Canva no `historico.md`: não entram mais;
   - `create_ad` no conjunto `120251603405840345` (ou no de nicho `120251603906260345`, se o meme for de
     internato, 4º ano ou ENAMED), nome "Meme <data> <slug>", `status: active`, com
     `creative.object_story_spec` = `page_id` 1411404442052391, `instagram_user_id` 17841456884640989 e
     `video_data` (`video_id`, `image_url` = jpg exportado ou link raw da `capa.jpg`, `message` = primeira frase da legenda
     + "Teste 3 dias grátis, sem cartão.", `call_to_action` `SIGN_UP` com link `https://cadenciamed.com.br`).
   (O caminho pelo post do Instagram com `source_instagram_media_id` dá erro de vídeo não carregado: use este.)
3. **Tirar o que não rende.** Pause (`pause_ad`) o anúncio que já gastou R$ 10 ou mais e:
   - não trouxe nenhuma visita ao site; ou
   - tem custo por visita acima de 3 vezes o do melhor anúncio do conjunto.
   Deixe no máximo 6 anúncios ativos (pause os piores). Nunca pause o melhor.
4. **Investir mais no que dá certo.** Se o último ajuste anotado em `turbinadas.md` foi há 3 dias ou mais:
   - compare o custo por visita ao site (`spend` / `actions_landing_page_view`) dos últimos 3 dias dos
     conjuntos ativos que gastaram pelo menos R$ 10 nesse período;
   - se o melhor custa 70% ou menos do pior, tire R$ 2 por dia do pior e ponha no melhor
     (`set_adset_budget`, valor em centavos: R$ 9 = 900);
   - cada conjunto ativo fica entre R$ 4 e R$ 11 por dia, e a soma fica em R$ 15;
   - se a diferença for menor que isso, não mexa (o Meta precisa de dias estáveis pra aprender);
   - anote o ajuste e o motivo em `turbinadas.md`.
   Quando o site tiver o Pixel com o evento de conta criada, o critério passa a ser custo por conta criada.
5. **Data de fim.** Se um conjunto termina em menos de 7 dias, adie o fim em 30 dias (`update_adset` com
   `end_time`).
6. Se um conjunto estiver pausado, siga colocando os anúncios novos nele (ficam prontos) e lembre o José em
   uma frase que o gasto dele está desligado. O dinheiro dele fica com o conjunto ativo, sem passar de R$ 11.
7. Se o Meta der erro de acesso ("log in to www.facebook.com", conta desconectada) ou pedir identidade
   verificada, não tente contornar: registre e avise em uma frase que o acesso ao Meta no Windsor precisa
   ser refeito.
8. Registre em `turbinadas.md` (data, meme, ids do vídeo e do anúncio, o que foi pausado, ajuste de dinheiro
   e por quê). Commit e push.

---

## 4. Comentários (20:23)

Siga o skill `insta-comunidade` (ou, sem ele, este resumo): leia os comentários dos últimos 3 dias no
Windsor (`comment_id`, `comment_text`, `media_id`), pule os que já estão em `comentarios.md`, responda com
`reply_to_comment` (até 2 frases, 1 emoji, tom de estudante, informação certa do app) e esconda spam com
`hide_comment`. Anote tudo em `comentarios.md`. Se a resposta for recusada, deixe como "pendente" e avise.
Pergunta que aparece mais de uma vez vira pauta no `pautas.md`.

## 5. Viralização e plano da semana (domingo 17:44)

Siga o skill `insta-viralizacao`: números dos últimos 30 dias (orgânico e anúncios), perfis do nicho no
`instagram_public` quando o José conectar, padrões (gancho no 1º segundo, quebra de padrão aos 3 s,
recompensa antes do loop), plano dos 7 dias em `viralizacao.md` e pautas novas no `pautas.md`.
