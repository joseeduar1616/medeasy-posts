# Agentes do Cadência Med

Dois agentes rodam todo dia, sozinhos, por pedido do José (22/10/2026):

| Agente | Horário (Brasília) | O que faz |
|---|---|---|
| Meme do dia | 14:52 | Cria o meme sozinho (foto feita pela IA do Canva na arte de tweet), publica no feed (Reel) e no story |
| Turbinar | 19:47 | Coloca o meme novo como anúncio no conjunto certo (nicho ou geral), tira os que não rendem e põe mais dinheiro no conjunto que dá visita mais barata, com teto de R$ 15 por dia |

Os dois começam igual a qualquer rotina daqui: leia antes o `LEIA-ME.md`
(começo da execução, regras de texto e como subir arquivos).

## O que funciona (até 22/10/2026)

- **Pago:** o Reel de meme "Meu estado mental faltando 1 mês para as provas de Residência" gastou R$ 206 e
  trouxe 2.087 visitas ao site, cerca de R$ 0,10 por visita (CTR de 5,5%). O carrossel de concorrência saiu
  R$ 0,76 por visita, e os Reels com tela do app, R$ 0,85.
- **Orgânico:** depois do lançamento, os Reels tiveram 165 a 390 contas alcançadas e os carrosséis 37 a 55.
- **Formato que ganhou:** a arte de tweet (`molde-tweet.png`), um texto curto em primeira pessoa
  ("Meu estado mental faltando 1 mês pra prova de residência", "Quando me perguntam o tamanho do meu conteúdo
  atrasado", "Como eu revisava antes de conhecer o Cadência Med") e, dentro do cartão, um vídeo viral de pessoa
  reagindo, com o áudio original.
- **O José não gostou** do Reel com telas do app passando dentro do cartão (22/10). Não use mais `midia` com prints no post do dia.

---

## 1. Meme do dia (14:52)

O agente faz o meme inteiro sozinho, sem o José mandar nada (pedido dele em 22/10).
Os sites de vídeo e banco de imagens não abrem daqui, e repostar vídeo viral de outra
pessoa tem risco de direito autoral e de imagem. Por isso a foto do meme é feita pela
IA do Canva (pessoa que não existe, sem direito de ninguém) e a montagem sai do Canva.

**Qual caminho usar hoje:**
1. Tem vídeo na pasta do Drive "Cadência Med · memes" (`1qkfX5z2T6zCgAebXPz4wJSX6U7T3Kn2H`)? Caminho B.
2. Senão, se o post de ontem foi de foto da IA e a pasta "Cadência Med · memes famosos"
   (`1ClSHXlSwaB2feWe23qsMCfl8Tu2-T2Mh`) tem imagem que não saiu nos últimos 14 dias? Caminho C.
3. Senão, caminho A (foto da IA). Nunca avise que a pasta está vazia: as pastas são opcionais.

Depois de 14 dias alternando, compare no `historico.md` o alcance e as visitas ao perfil de A e C e
passe a usar mais o que rende mais (anote a decisão aqui).

### Antes de tudo

0. **Meme pronto na fila.** Se a seção "Memes prontos na fila" do `historico.md` tiver item, publique o
   primeiro dela (exporte de novo o design do Canva anotado, jpg e mp4, e siga do passo 6 do caminho A) e
   tire da fila. Não crie outro nesse dia.

1. **Desempenho.** Leia os últimos 14 dias no Windsor (como no LEIA-ME, com `media_reel_skip_rate` e
   `media_reel_avg_watch_time`) e preencha o "Alcance depois" no `historico.md`. Se já houver Reel publicado
   hoje, não publique outro.
2. **Texto do tweet.** Pegue a próxima pauta de "Memes com foto" no `pautas.md` (ou invente uma no mesmo tom
   quando acabar). Uma frase em primeira pessoa sobre a vida de quem presta residência (prova chegando,
   plantão, revisão, conteúdo atrasado, simulado, internato, ranking com os amigos). Pode citar o Cadência Med
   no fim ("Como eu revisava antes de conhecer o Cadência Med").
   - Até 3 linhas, 1 ou 2 trechos em **negrito**.
   - Nada de conteúdo médico, número inventado ou promessa de aprovação.
   - **Nicho (pedido do José em 22/10):** pelo menos 3 memes por semana falam de quem está no 3º e 4º ano,
     entrando no internato ou se preparando pro ENAMED (pautas "Nicho internato e ENAMED" no `pautas.md`).
     Nesses, use as hashtags #enamed #internato #medicinagoiania. Fato do ENAMED só o que está no
     `pautas.md` (vem do edital). Não use o nome da UFG nem de outra faculdade no texto.
   - Olhe os números: se um tema de meme rendeu bem, faça outro parecido.

### Caminho A: foto da IA do Canva (o normal)

1. **Foto.** `generate-image` do Canva, `aspectRatio: SQUARE_1_1`, prompt em inglês no molde:
   "Candid realistic photo, meme reaction style: <cena da pauta, com estudante de medicina ou residente
   brasileiro, roupa de plantão ou jaleco quando fizer sentido, expressão bem exagerada>. Slightly grainy
   phone-camera look. No text, no logos, no watermarks."
   Espere com `get-generate-image-job` até SUCCESS e olhe a prévia. Gere de novo (no máximo 2 vezes) se a
   expressão não casar com o texto, se aparecer letra, logo, mão deformada ou paciente. Varie quem aparece
   (homem, mulher, idades e tons de pele diferentes). Guarde o `media id` (MA...).
2. **Moldura com o texto.** JSON `cadencia/posts/AAAA-MM-DD-slug-meme.json` com `id`, `formato: "tweet"`,
   `imagem_ia: true`, `texto`, `prompt` (o que foi pro Canva) e `legenda` (regras do LEIA-ME, com "Marca quem
   tá na mesma" ou "Manda pra quem..." e "Teste 3 dias grátis, sem cartão. Link na bio 👉 cadenciamed.com.br").
   Rode `python3 cadencia/tweet.py <json>`: sai `publicado/<id>/moldura.png` (arte com o texto e a área da
   foto vazada) e `previa-texto.jpg`. Abra a prévia e confira o texto.
3. **Subir a moldura.** Commit de `posts/<id>.json` e `publicado/<id>/`, `git pull --rebase origin main`, push.
   No Canva, `upload-asset-from-url` com o link raw da `moldura.png` (do commit) e nome `cadencia-<id>`.
4. **Montar no Canva.** O desenho base é "Cadência Med · meme base" (`DAHYxSBc_kA`); a página 2 tem a foto
   (top 898, left 189, 702 x 705) e a moldura por cima (página inteira).
   - `copy-design` de `DAHYxSBc_kA` com `page_numbers: [2]` (guarde o `design_id` novo);
   - `read-design` com `open_transaction: true` pra ver os dois elementos;
   - `edit-design` com `update_fill` na foto (o elemento de 702 x 705) com o media id da IA e na moldura
     (o de 1080 x 1920) com o media id da moldura, mais `update_title` "Meme <data> <slug>";
   - em seguida `crop_media` na moldura com top 0, left 0, width 1080, height 1920 (o `update_fill`
     amplia a imagem uns 2% e desalinha o furo da foto);
   - olhe a miniatura que volta (texto, foto e moldura no lugar) e `commit`.
5. **Exportar.** `export-design` do design novo: `jpg` (width 1080, height 1920, quality 92) e
   `mp4` (`quality: "vertical_1080p"`). Os links que voltam são públicos por algumas horas: use logo.
6. **Publicar.** Windsor `execute_action`, conector `instagram`, conta `17841456884640989`:
   - `create_video_post` com `video_url` = link do mp4, `cover_url` = link do jpg, `caption` = legenda,
     `share_to_feed: true`;
   - logo depois, `create_story` com `image_url` = link do jpg.
   Se der timeout, confira os posts do dia antes de tentar de novo.
7. **Registrar** no `historico.md` (data, hora, formato "Reel meme IA", texto, `design_id` do Canva, media_id do
   Reel e do story, link) e marque a pauta como saída. Commit e push. O `design_id` é o que o Turbinar usa.

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
4. **JSON** com `foto` (caminho do arquivo baixado), `texto` e `legenda`. No JSON que vai pro repositório,
   troque o caminho da `foto` pelo nome e id do arquivo no Drive.
5. **Gerar.** `python3 cadencia/tweet.py <json>` (precisa do `imageio-ffmpeg`): sai `reel.mp4` parado de 6 s e
   `capa.jpg`. Abra a capa e confira: a imagem entra inteira, sem cortar o texto que ela tem.
6. **Subir** só `posts/<id>.json` e `publicado/<id>/` (a imagem original nunca vai pro GitHub), pull com rebase, push.
7. **Publicar.** `create_video_post` (`video_url` raw do `reel.mp4`, `cover_url` raw da `capa.jpg`, `caption`,
   `share_to_feed: true`) e `create_story` com `image_url` raw da `capa.jpg`.
8. **Registrar** no `historico.md` (formato "Reel meme famoso", nome do arquivo no Drive, media_ids, link). Commit e push.

**Meme famoso nunca vira anúncio.** Usar a imagem de famoso pra vender o app em anúncio pago tem risco de
direito de imagem e o Meta costuma reprovar. O Turbinar só usa os caminhos A e B.

---

## 2. Turbinar (19:47)

### Onde

- Conta de anúncios `1829823838034115` (BRL), página do Facebook `1411404442052391`, Instagram `17841456884640989`.
- Campanha "Memes Reels · cliques no site · out/26" (`120251405506040345`, objetivo tráfego).
- Conjunto "BR · 20-32 · Instagram · memes · turbinar contínuo" (`120251603405840345`):
  R$ 14 por dia (cerca de R$ 100 por semana), público de 20 a 32 anos no Brasil, só Instagram.
  Criado em 22/10 com o meme campeão "estado mental" (anúncio `120251603412240345`).
- Conjunto de nicho "Goiânia · 19-27 · Instagram · medicina internato e ENAMED" (`120251603906260345`):
  raio de 25 km do centro de Goiânia, 19 a 27 anos, R$ 14 por dia. Criado em 22/10 a pedido do José, com os
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
   - `create_ad_video` com o `video_url`: no meme de IA, exporte de novo o design do Canva anotado no
     `historico.md` (`export-design` mp4 `vertical_1080p` e jpg pra capa), porque os links do Canva vencem
     em poucas horas; no meme de vídeo, o link raw do `reel.mp4`;
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
