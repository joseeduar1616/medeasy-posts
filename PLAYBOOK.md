# Manual de posts automáticos da Medeasy (@med_easyy)

Este manual vale para toda execução agendada. Leia inteiro antes de criar ou publicar qualquer coisa.

## Começo de toda execução

1. Anexe o repositório com `add_repo` (owner `joseeduar1616`, repo `medeasy-posts`, access `push`) e clone em `/home/claude/medeasy-posts`.
2. Trabalhe de dentro dele: `cd /home/claude/medeasy-posts`.
3. Commits com `git -c user.name="joseeduar1616" -c user.email="220754317+joseeduar1616@users.noreply.github.com"`. Antes de cada push, rode `git pull --rebase origin main`.
4. Horários sempre no fuso de Brasília (America/Sao_Paulo).

## Público

- Internos, recém-formados e médicos generalistas prestando residência. A maioria tem entre 25 e 34 anos e há uma leve maioria de mulheres.
- A base é forte no Centro-Oeste: Goiânia sozinha tem cerca de 16% dos seguidores, e somando interior de Goiás e DF chega a uns 30%. Também há presença em SP, RJ, BH e capitais do Nordeste.
- O público está em modo decisão (onde prestar, prazos, nota, currículo). Ele salva e compartilha muito mais do que comenta.

## O que mais funciona (dados de nov/2024 a set/2026, mediana de interações)

1. **Calendário e prazos de várias provas num post só.** É o tipo mais compartilhado: o calendário de jun/26 teve 474 interações e 257 compartilhamentos, e o calendário por região de set/26 teve 253 e 108.
2. **Notícia grande e oficial**, como mudança de regra de prova. "ENARE sem análise curricular" é o recorde da conta, com 1.165 interações e 673 compartilhamentos.
3. **Notas de corte e concorrência por prova e região**: mediana de 68. SES-DF teve 250 e ENARE Centro-Oeste teve 219.
4. **Mapa de vagas** (o total, não uma especialidade só): 235 interações em mai/26.
5. **O que mudou no edital**, para PSU-GO, SES-GO, SES-DF e USP. SES-GO 2026 teve 180 e SES-DF teve 140.
6. **Bate-volta com residente** (reels): mediana de 158. Esse formato precisa de vídeo real, então NÃO é feito pela automação.

Dê prioridade a GO, DF, MG, ENARE e USP, porque é onde está o público.

## O que não funciona (não fazer)

- Venda direta como post próprio ("deixe seu currículo com a gente"): mediana de 39 e quase nenhum compartilhamento. A venda vai só como chamada no último slide e na legenda.
- Dica genérica de currículo sem uma prova específica: 38.
- Série "Top 5 vagas de UMA especialidade": a primeira teve 235, as seguintes caíram para 15 a 40. Não repetir.
- Aviso curto em imagem única ("Alerta de mudança"): 8 a 20.
- Post de opinião pedindo debate: comenta pouco.

## Antes de escolher o tema de cada post

1. Puxe os dados recentes no Windsor (conector `instagram`, conta `17841452692504029`, campos `media_id, timestamp, media_type, media_caption, media_reach, media_like_count, media_comments_count, media_saved, media_shares, media_engagement`, `date_preset: last_3m`). Use só dados diários: o plano de teste do Windsor não tem dados horários, e `force_refresh` falha.
2. Leia `log/posts.md` para não repetir tema recente e veja como foram os últimos posts automáticos. Se um tipo foi mal em 2 posts seguidos, troque de tipo.
3. Se houver arquivo em `queue/`, use primeiro os que têm `"urgent": true`, depois o mais antigo. Arquivo com `"pauta": true` é um pedido do José com tema e ângulo, sem slides prontos: pesquise, confira e monte o JSON completo seguindo a pauta. Pauta pedida pelo José tem prioridade sobre qualquer outro tema e não pode ser trocada. Confira de novo os dados (prazos podem ter passado ou mudado), mova o arquivo para `posts/` e só então gere as artes.

## Conferência (obrigatória, sem exceção)

- Todo número, data, taxa e regra vem de **edital oficial** ou do site da banca/comissão: AREMG, CEREM-GO, Ebserh/ENARE, FUVEST, Vunesp, IADES, Instituto Verbena/UFG, SES, MEC/INEP. Portais de cursinho (Estratégia MED, Medway, MedCof) servem para achar a informação, e o dado tem que bater com a fonte oficial ou com pelo menos 2 desses portais concordando entre si.
- Anote as URLs no campo `sources` do JSON.
- Se não der para confirmar um dado, tire o dado do post. Se o post perder o sentido sem ele, não publique.
- Nada de previsão apresentada como fato. Data "prevista" aparece escrita como prevista.
- Use o fuso de Brasília para datas e horários. Confira se o prazo já não passou na hora da publicação.
- Depois de gerar as artes, ABRA cada imagem (Read) e confira: texto cortado ou sobreposto, número errado, ortografia, ordem dos slides. `check.json` precisa estar vazio.
- Em caso de dúvida, não publique: avise o usuário na conversa.

## Estilo de texto

- Português do Brasil, direto, como os posts da Medeasy.
- **Nunca use travessão (— ou –)**, nem nas artes nem na legenda. Use ponto, vírgula ou dois-pontos.
- Legenda: título curto em maiúsculas com 1 emoji, 2 a 4 parágrafos curtos, chamada para salvar e compartilhar, uma pergunta para comentar, uma linha de venda leve ("Precisa organizar o currículo? Chama a MedEasy no direct 💚") e 4 a 6 hashtags.
- Carrossel de 5 a 7 slides: capa, conteúdo, e o último no formato "SALVA" com a fonte dos dados em letra pequena.

## Como gerar as artes

O kit fica em `kit/`. Crie `posts/AAAA-MM-DD-HHMM-assunto.json` (o `slug` igual ao nome do arquivo) seguindo `queue/psugo-2027-vagas.json` como exemplo. Os tipos de slide são `cover`, `rows`, `cards`, `grid`, `table` e `cta`. Depois rode:

```
python3 kit/render.py posts/<arquivo>.json
```

Saem `out/<slug>/slide_N.jpg` (1080x1350), `story.jpg` (1080x1920) e `check.json`. O título curto vai no cabeçalho `header` (ex.: `["EDITAL", "SES-GO 2027"]`).

## Como publicar

1. Copie os JPEGs (slides e story) para `media/<slug>/`, faça commit e push na branch `main`.
2. Monte as URLs com o hash desse commit: `https://raw.githubusercontent.com/joseeduar1616/medeasy-posts/<commit>/media/<slug>/slide_1.jpg`.
3. Carrossel: Windsor `execute_action`, conector `instagram`, conta `17841452692504029`, ação `create_carousel_post`, com `image_urls` na ordem e `caption`.
4. Story: ação `create_story` com `image_url` do `story.jpg`.
5. Registre em `log/posts.md`: data e hora, slug, tipo, tema, media_id e fontes. Faça commit e push.
6. Avise o usuário na conversa: o que saiu, o tema e por que foi escolhido.

Se a publicação falhar, não tente em loop: uma nova tentativa no máximo, e depois avise o usuário com o motivo.

## Novidades (busca a cada 2 horas)

- Procure novidade oficial das provas de residência: edital publicado, retificação, prorrogação, mudança de data ou de regra, resultado, gabarito, nota de corte, convocação. Comece pelas provas que o público mais faz.
- Compare com `log/news_seen.md`. Só é novidade o que ainda não está lá.
- Se for relevante e estiver confirmado na fonte oficial, faça um post curto (3 a 5 slides) e publique na hora, com story.
- Se faltar menos de 60 minutos para um post fixo (12h ou 18h), não publique em separado: salve o JSON em `queue/` com `"urgent": true`, e o post fixo usa ele.
- Limite de 2 posts de novidade por dia, fora os posts fixos.
- Registre cada novidade verificada em `log/news_seen.md`, mesmo as que não viraram post.
