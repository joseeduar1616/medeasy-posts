# Agentes do Cadência Med

Dois agentes rodam todo dia, sozinhos, por pedido do José (22/10/2026):

| Agente | Horário (Brasília) | O que faz |
|---|---|---|
| Meme do dia | 14:52 | Pega um vídeo da pasta de memes, monta na arte de tweet e publica no feed (Reel) e no story |
| Turbinar | 19:47 | Coloca o meme novo como anúncio no conjunto de memes do Meta e tira os que não rendem |

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

### Onde estão os vídeos

Pasta do Google Drive "Cadência Med · memes (jogue os vídeos aqui)", id `1qkfX5z2T6zCgAebXPz4wJSX6U7T3Kn2H`.
O José salva ali os vídeos que escolheu. Depois de usado, o vídeo vai pra subpasta "usados",
id `1jXMBvV544KQJIE6jHQ8gUWWhJh1khCce`. O agente nunca busca vídeo fora dessa pasta.

### Passo a passo

1. **Desempenho.** Leia os últimos 14 dias no Windsor (como no LEIA-ME, com `media_reel_skip_rate` e
   `media_reel_avg_watch_time`) e preencha o "Alcance depois" no `historico.md`. Se já houver Reel publicado
   hoje, não publique outro.
2. **Escolher o vídeo.** No Drive (`search_files` com `parentId = '1qkfX5z2T6zCgAebXPz4wJSX6U7T3Kn2H' and mimeType contains 'video/'`),
   pegue o mais antigo. Se a pasta estiver vazia, não publique: avise em uma frase que a pasta de memes
   acabou. Se o vídeo passar de 80 MB, pule pro próximo e avise.
3. **Baixar.** `download_file_content` devolve o arquivo em base64 (num JSON salvo em disco quando é grande).
   Decodifique pra um arquivo FORA do repositório (pasta temporária). O vídeo original nunca vai pro GitHub.
4. **Assistir.** Tire um quadro por segundo com o ffmpeg (`-vf fps=1,scale=270:-1,tile=6x3`) e abra a imagem.
   Use também o nome do arquivo como pista. Escolha o trecho mais forte, de 4 a 20 s (`inicio` e `fim`).
5. **Texto do tweet.** Uma frase em primeira pessoa que case com a reação do vídeo, sobre a vida de quem
   presta residência (prova chegando, plantão, revisão, conteúdo atrasado, simulado, internato, ranking com
   os amigos). Pode citar o Cadência Med no fim ("Como eu revisava antes de conhecer o Cadência Med").
   - Até 3 linhas, 1 ou 2 trechos em **negrito**.
   - Nunca zombe da pessoa do vídeo, nem cite o nome dela, nem diga quem ela é.
   - Nada de conteúdo médico, número inventado ou promessa de aprovação.
6. **JSON.** `cadencia/posts/AAAA-MM-DD-slug-meme.json` com `id`, `formato: "tweet"`, `texto`,
   `clipe` (caminho do arquivo baixado), `inicio`, `fim` e `legenda` (regras do LEIA-ME, com "Marca quem tá
   na mesma" ou "Manda pra quem..." e "Teste 3 dias grátis, sem cartão. Link na bio 👉 cadenciamed.com.br").
   No JSON que vai pro repositório, troque o caminho do `clipe` pelo nome do arquivo do Drive e o id dele.
7. **Gerar.** `./cadencia/preparar.sh <json> --tweet`. Abra `capa.jpg`, `previa-meio.jpg` e `previa-fim.jpg`
   e confira texto e enquadramento.
8. **Subir.** Commit só de `cadencia/posts/<id>.json` e `cadencia/publicado/<id>/` (reel.mp4 e as capas),
   `git pull --rebase origin main`, push. Link: `https://raw.githubusercontent.com/joseeduar1616/medeasy-posts/<hash>/cadencia/publicado/<id>/reel.mp4`.
9. **Publicar.** Windsor `execute_action`, conector `instagram`, conta `17841456884640989`:
   - `create_video_post` com `video_url`, `caption` = legenda, `share_to_feed: true`;
   - logo depois, `create_story` com o mesmo `video_url` (repost no story).
   Se der timeout, confira os posts do dia antes de tentar de novo.
10. **Mover o vídeo** pra "usados" (`update_file` com `parentId = '1jXMBvV544KQJIE6jHQ8gUWWhJh1khCce'`).
11. **Registrar** no `historico.md` (data, hora, formato "Reel meme", texto, arquivo do Drive, media_id do
    Reel e do story, link). Commit e push.

---

## 2. Turbinar (19:47)

### Onde

- Conta de anúncios `1829823838034115` (BRL), página do Facebook `1411404442052391`, Instagram `17841456884640989`.
- Campanha "Memes Reels · cliques no site · out/26" (`120251405506040345`, objetivo tráfego).
- Conjunto "BR · 20-32 · Instagram · memes · turbinar contínuo" (`120251603405840345`):
  R$ 14 por dia (cerca de R$ 100 por semana), público de 20 a 32 anos no Brasil, só Instagram.
  Criado em 22/10 com o meme campeão "estado mental" (anúncio `120251603412240345`).
- O orçamento é o do conjunto: o agente **nunca** muda orçamento, nunca cria campanha ou conjunto novo e
  nunca ativa conjunto pausado. Quem liga e desliga o gasto é o José.

### Passo a passo

1. Leia os anúncios do conjunto no Windsor (conector `facebook`, campos `ad_name`, `ad_id`, `ad_status`,
   `adset_status`, `spend`, `reach`, `actions_link_click`, `actions_landing_page_view`, `ctr`) dos últimos 7 dias.
   Preencha o resultado em `turbinadas.md`.
2. **Meme novo.** Pra cada Reel meme publicado nas últimas 30 h que ainda não está em `turbinadas.md`:
   - `create_ad_video` com o `video_url` raw do `reel.mp4`;
   - `create_ad` no conjunto `120251603405840345`, nome "Meme <data> <slug>", `status: active`, com
     `creative.object_story_spec` = `page_id` 1411404442052391, `instagram_user_id` 17841456884640989 e
     `video_data` (`video_id`, `image_url` = link raw da `capa.jpg`, `message` = primeira frase da legenda
     + "Teste 3 dias grátis, sem cartão.", `call_to_action` `SIGN_UP` com link `https://cadenciamed.com.br`).
   (O caminho pelo post do Instagram com `source_instagram_media_id` dá erro de vídeo não carregado: use este.)
3. **Tirar o que não rende.** Pause (`pause_ad`) o anúncio que já gastou R$ 10 ou mais e:
   - não trouxe nenhuma visita ao site; ou
   - tem custo por visita acima de 3 vezes o do melhor anúncio do conjunto.
   Deixe no máximo 6 anúncios ativos (pause os piores). Nunca pause o melhor.
4. **Data de fim.** Se o conjunto termina em menos de 7 dias, adie o fim em 30 dias (`update_adset` com
   `end_time`). Não mexa em mais nada do conjunto.
5. Se o conjunto estiver pausado, siga colocando os anúncios novos (ficam prontos) e lembre o José em uma
   frase que o gasto está desligado.
6. Se o Meta der erro de acesso ("log in to www.facebook.com", conta desconectada) ou pedir identidade
   verificada, não tente contornar: registre e avise em uma frase que o acesso ao Meta no Windsor precisa
   ser refeito.
7. Registre em `turbinadas.md` (data, meme, ids do vídeo e do anúncio, o que foi pausado e por quê). Commit e push.
