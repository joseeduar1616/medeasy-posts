# Agentes do Cadência Med

Dois agentes rodam todo dia, sozinhos, por pedido do José (22/10/2026):

| Agente | Horário (Brasília) | O que faz |
|---|---|---|
| Post tweet | 14:52 | Cria e publica um Reel no formato tweet |
| Turbinar | 19:47 | Escolhe o post orgânico que mais rendeu e turbina no Meta |

Os dois começam igual a qualquer rotina daqui: leia antes o `LEIA-ME.md`
(começo da execução, regras de texto e como subir arquivos).

---

## 1. Post tweet (14:52)

Formato pedido pelo José: a arte dele (`molde-tweet.png`) com um cartão de
tweet do @cadenciamed. O texto é uma frase curta e chamativa, de identificação
ou de humor de estudante de residência, com 2 a 4 trechos em **negrito**. Dentro
do cartão passam 2 ou 3 telas reais do app, com movimento lento. Sai um Reel
9:16 de 8 a 12 s.

### Por que Reel

Depois do lançamento, os Reels alcançaram 165 a 390 contas e os carrosséis 37
a 55. Por isso o post diário é Reel. Se os números mudarem, anote no
`historico.md` e ajuste aqui.

### Passo a passo

1. **Desempenho.** Leia os últimos 14 dias no Windsor (como no LEIA-ME, com
   `media_reel_skip_rate` e `media_reel_avg_watch_time`) e preencha o
   "Alcance depois" no `historico.md`. Se já houver Reel publicado hoje, não
   publique outro.
2. **Texto.** Pegue a próxima ideia de `pautas.md` (seção Tweets) que ainda não
   saiu, ou crie uma no mesmo tom. O que vale no texto:
   - começa com um gancho forte, às vezes em maiúsculas: "A PAZ de...",
     "O SOM QUE A VIDA TEM quando...", "POV:", "Ninguém fala sobre...",
     "Eu depois de...";
   - fala de uma situação real de quem estuda pra residência (plantão,
     internato, revisão, simulado, cansaço, cronograma);
   - cabe em 3 linhas (o `tweet.py` recusa se não couber);
   - só cita função que existe no app (lista no LEIA-ME).
   Se um gancho tiver o melhor alcance da semana, repita a estrutura com outra
   situação.
3. **JSON.** `cadencia/posts/AAAA-MM-DD-slug-tweet.json` no molde de
   `posts/2026-10-22-pos-plantao-tweet.json`:
   - `texto` com `**negrito**`;
   - `midia`: 2 ou 3 telas de `prints/` combinando com o texto, cada uma com `mov`
     (`direita`, `esquerda`, `zoom` ou `desce`);
   - `duracao` de 8 a 12;
   - `legenda` nas regras do LEIA-ME.
4. **Gerar.** `./cadencia/preparar.sh cadencia/posts/<id>.json --tweet`.
   Abra `capa.jpg` e as `previa-*.jpg` de `cadencia/publicado/<id>/` e confira
   o texto (sem erro, sem espaço sobrando) e se as telas aparecem.
5. **Subir e publicar.** Commit, `git pull --rebase origin main`, push. Link:
   `https://raw.githubusercontent.com/joseeduar1616/medeasy-posts/<hash>/cadencia/publicado/<id>/reel.mp4`.
   Windsor `execute_action`, conector `instagram`, conta `17841456884640989`,
   `create_video_post` com `video_url`, `caption` = legenda e `share_to_feed: true`.
   Se a chamada der timeout, confira os posts do dia antes de tentar de novo.
6. **Registrar** no `historico.md` (data, hora, formato, texto do tweet,
   media_id, link). Commit e push.

---

## 2. Turbinar (19:47)

Turbina no Meta o post orgânico que mais rendeu, pra gastar só no que já
provou que prende.

### Configuração

Fica em `turbinar.json`: orçamento por post, dias, teto por semana, público e
os ids da campanha (não são segredo). Para mudar o orçamento, mude só ali.

### Regras

- **Qual post:** entre os posts do @cadenciamed publicados de 24 a 72 h atrás
  e ainda não turbinados (veja `turbinadas.md`), escolha o de maior pontuação:
  - pontuação = alcance + 3 × (salvamentos + compartilhamentos) + 5 × seguidores vindos do post;
  - nos Reels, desconte 1% da pontuação pra cada ponto de pulo acima de 60%.
- **Quando não turbinar:**
  - o melhor post ficou abaixo de 50% da mediana de alcance dos últimos 14 dias;
  - o teto da semana já foi atingido;
  - já houve turbinada hoje.
- **Quanto:** o que estiver em `turbinar.json`, hoje R$ 10 por dia durante 3 dias
  (R$ 30 por post), no máximo 1 post por dia e R$ 100 por semana (segunda a domingo).
- **Como:** pelo Windsor, conector `facebook`. Rode `list_actions` antes, porque os parâmetros podem mudar.
  1. Se `turbinar.json` não tiver `campaign_id`, crie uma vez a campanha
     "Cadência Med · Turbinar posts" (`create_campaign`, objetivo
     `OUTCOME_ENGAGEMENT`, sem categoria especial) e grave o id.
  2. Para cada post, crie um conjunto de anúncios (`create_adset`) com o nome
     "Turbinar <data> <slug>":
     - `lifetime_budget` = orçamento em centavos e `end_time` = agora + dias;
     - `destination_type` `ON_POST`, `optimization_goal` `POST_ENGAGEMENT`, `billing_event` `IMPRESSIONS`;
     - `promoted_object` com a página do Facebook ligada ao @cadenciamed;
     - o público de `turbinar.json`.
     Se o Meta pedir identidade verificada do anunciante (Brasil), registre o
     erro no `turbinadas.md` e avise o José. Não tente contornar.
  3. `boost_post` com o id do post e o `adset_id`, `status` `active`. Se o
     post for do Instagram e a ação pedir outro formato de id, use o que o
     erro indicar, sem inventar.
  4. Confira no `get_data` do conector `facebook` que o anúncio está ativo.
- **Registro:** cada turbinada vai em `turbinadas.md` (data, post, link, ids
  do conjunto e do anúncio, orçamento, fim). Nos dias seguintes, preencha o
  resultado (gasto, alcance pago, custo por resultado, seguidores) e anote
  que tipo de post rende mais por real gasto.
- **Se o Meta der erro de acesso** ("log in to www.facebook.com" ou conta
  desconectada): não tente outra vez no mesmo dia. Registre e avise o José em uma
  frase que o acesso ao Meta precisa ser refeito no Windsor.
