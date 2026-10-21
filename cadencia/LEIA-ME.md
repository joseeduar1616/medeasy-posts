# Posts do Instagram do Cadência Med (@cadenciamed)

Esta pasta faz e publica os posts do perfil @cadenciamed. Duas rotinas diárias
rodam o passo a passo abaixo sozinhas (carrossel às 09:52 e Reel às 14:55,
horário de Brasília). O mesmo passo a passo serve pra fazer um post na mão.

A pasta mora no repositório `joseeduar1616/medeasy-posts` desde 21/10/2026.
Antes ela ficava em `social/` do repositório do site (`cadenciamed`), mas o
Claude perdeu a permissão de envio nele e as rotinas pararam de publicar
depois de 16/10. Aqui as imagens sobem pro GitHub e o Instagram busca pelo
link `raw.githubusercontent.com`, igual aos posts da MedEasy. Não depende
do site.

O resto do repositório (posts da MedEasy, portal) não é do Cadência: não mexa
fora de `cadencia/`.

## Começo de toda execução

1. Anexe o repositório com `add_repo` (owner `joseeduar1616`, repo `medeasy-posts`, access `push`) e clone em `/home/claude/medeasy-posts`.
2. Trabalhe de dentro dele: `cd /home/claude/medeasy-posts`.
3. Commits com `git -c user.name="joseeduar1616" -c user.email="220754317+joseeduar1616@users.noreply.github.com"`. Antes de cada push, rode `git pull --rebase origin main` (as rotinas da MedEasy também enviam pra cá).
4. Horários sempre no fuso de Brasília (America/Sao_Paulo).

## O que os números do perfil mostraram (até 21/10/2026)

Os números vêm do Windsor, conector `instagram`, conta `17841456884640989`.

- **O melhor formato foi o carrossel de lançamento:** dor ou identificação na capa, um ou dois slides de problema, a virada e a solução com **print real do app**.
  - "Cronograma na planilha, flashcards no celular..." (03/10): 656 contas alcançadas, 12 seguidores novos, 38 visitas ao perfil.
  - "Terminou a aula. E agora?" (03/10): 513 alcançadas, 10 seguidores, 40 visitas.
  - Os dois tinham 9 slides, saíram às 09:52 e a legenda pedia "Comente CADÊNCIA".
- **Carrossel de dica em passos com interface desenhada** ("Atrasou o cronograma?", 16/10): 47 contas.
- **Carrossel com estatística do mercado** (ENARE, 08/10): 55 contas.
- **Reels de meme:** 165 a 390 contas, mas 66% a 92% pulam nos 3 primeiros segundos e quase não trazem seguidor.
  - O que abria com o logo teve 92% de pulo. Por isso a capa do Reel aparece inteira já no quadro 0.
  - Melhor Reel até agora às 14:55 (300 contas).
- **Cuidado ao ler:** são poucos posts e os dois melhores saíram no dia do lançamento. Cada rotina confere os números novos e anota no `historico.md`. Se dois carrosséis seguidos no estilo de lançamento ficarem abaixo de 100 contas, varie o gancho da capa (pergunta, frase de identificação, situação do plantão) antes de mudar de formato.

Atualize esta seção quando os números mudarem.

## Rotina de cada dia

- **09:52 · carrossel:** 7 slides no estilo de lançamento (molde: `posts/2026-10-21-semana-com-plantao.json`).
  1. **Capa** (tema `degrade`): dor ou identificação em poucas palavras ("Plantão de 12h e a aula ficou pra depois"), uma frase de apoio e um `print` do app embaixo.
  2. **Problema** (escuro): o que acontece na vida real. Pode usar um bloco desenhado (`semana`, `lista`, `barras`).
  3. **Consequência** (claro): por que isso atrapalha a prova.
  4. **A virada** (escuro): o jeito certo de fazer, já com um `print`.
  5. **Solução** (escuro): a função do app que resolve, com `print`.
  6. **Solução** (claro): outra função, com `print`.
  7. **Final** (claro, tipo `final`): bloco `recursos` com 3 ou 4 funções e o botão "Teste 3 dias grátis".
  - Pelo menos 3 slides com `print` real. Não repita a mesma tela dois dias seguidos na capa.
- **14:55 · Reel:** 3 a 5 cenas, 15 a 25 s.
  - Gancho de identificação já no quadro 0 ("Quem nunca...?", "Plantão de 12h e...").
  - Uma ou duas cenas com a solução.
  - Chamada final.

## Prints reais do app (`prints/`)

Use no bloco `{"tipo": "print", "imagem": "<nome>", "altura": 520, "foco": "top", "nota": "Texto curto"}`.
`altura` em pixels (400 a 560 funciona bem), `foco` é `top`, `center` ou `bottom`, `nota` é opcional.

| Nome | O que mostra |
|---|---|
| `hoje` | Tela Hoje: tempo estudado no dia e na semana, questões, dias seguidos, ritmo e projeção, agenda de hoje |
| `cronograma` | Qual cronograma você segue (residência, ciclo clínico, os dois juntos), 90 aulas e 213 tópicos, datas do curso e da prova |
| `revisoes` | Escada de revisão (1 sem, 1 mês, 2, 4, 6 meses) com as aulas e o que venceu |
| `cartoes_ia` | Montar flashcards com IA a partir de PDF e o estilo do cartão |
| `foco` | Foco: pomodoro ou tempo corrido, 25:00, sessões registradas |
| `assistente` | Mentor de IA respondendo o que priorizar na semana, com base no painel |
| `rotina` | Agenda da semana: montar a semana, Google Agenda, horas de plantão, estudo e aula |
| `materias` | Matérias e temas: aulas principais, tópicos, filtros por área |
| `planos` | Plano e preço: mensal R$ 39, anual R$ 300 |

Se precisar de uma tela que não está aqui, use um bloco desenhado (`lista`, `barras`, `semana`, `checklist`, `cartao`, `questao`, `recursos`). Nunca invente tela.

## Passo a passo

1. **Ler o desempenho.** Pelo Windsor (`get_data`, conector `instagram`, conta
   `17841456884640989`), puxe os últimos 14 dias com estes campos:
   - `timestamp`, `media_id`, `media_type`, `media_caption`, `media_permalink`;
   - `media_reach`, `media_views`, `media_saved`, `media_shares`, `media_follows`, `media_profile_visits`;
   - `media_reel_skip_rate`, `media_reel_avg_watch_time`.

   Preencha o "Alcance depois" dos posts anteriores no `historico.md` e anote o que funcionou.
   Se já houver post do mesmo formato publicado hoje, não publique outro.
2. **Escolher a pauta.** Se houver JSON em `posts/` que ainda não está no `historico.md`, publique ele primeiro (sem gerar outro). Senão, pegue a próxima do `pautas.md` que ainda não saiu.
3. **Escrever o JSON.** Crie `cadencia/posts/AAAA-MM-DD-slug.json` seguindo o molde:
   - **Tipos de slide:** `capa`, `passo`, `final`. **Temas:** `escuro`, `claro`, `degrade`.
   - **Destaque no título:** `{g}texto{/g}`. Negrito no texto: `<b>texto</b>`.
   - **Blocos de `ui`:** `print` (tela real, veja a tabela), `lista` (itens com titulo/sub/selo), `barras` (nome/valor 0 a 1/rotulo), `semana` (dias com blocos), `checklist` (itens com texto/feito), `cartao` (frente/verso), `questao` (enunciado/alternativas/certa/comentario), `recursos` (itens com titulo/texto).
   - **Pro Reel:** o mesmo formato, com 3 a 5 slides.
4. **Gerar.**
   - Carrossel: `./cadencia/preparar.sh cadencia/posts/<id>.json`
   - Reel: `./cadencia/preparar.sh cadencia/posts/<id>.json --reel` e confira com `node cadencia/reel.mjs <id> --previa 0,60,120,200`.
5. **Conferir.** Abra cada imagem de `cadencia/publicado/<id>/` (Read) e veja:
   - nada cortado nem colado no texto;
   - contraste bom;
   - texto sem erro e na ordem certa.
   Corrija o JSON e gere de novo se precisar.
6. **Subir as imagens.** `git add cadencia`, commit, `git pull --rebase origin main`, `git push origin HEAD:main`. Pegue o hash com `git rev-parse HEAD`.
   - Os links ficam `https://raw.githubusercontent.com/joseeduar1616/medeasy-posts/<hash>/cadencia/publicado/<id>/1.jpg`, `2.jpg`...
   - Confira um deles com `curl -sI <link>`: precisa responder 200.
7. **Publicar no Instagram.** Pelo Windsor, `execute_action` no conector `instagram`, conta `17841456884640989`:
   - **carrossel:** `create_carousel_post` com `image_urls` na ordem e `caption` = `legenda`;
   - **Reel:** `create_video_post` com `video_url` = link raw do `reel.mp4`, `caption` e `share_to_feed: true`.

   Se a chamada passar de 60 s, ela pode ter publicado mesmo assim. Confira os
   posts do dia antes de tentar de novo, pra não duplicar. No máximo uma nova
   tentativa; se falhar de novo, registre o motivo no `historico.md` e avise.
8. **Registrar.** Anote em `historico.md` a data, o horário, o formato, a pauta e o link do post. Commit e push.

## Regras de texto

- **Tom:** português do Brasil, natural, de estudante pra estudante.
- **Proibido no texto:**
  - travessão (o `carrossel.py` recusa);
  - o molde "não é X, é Y";
  - frase de coach.
- **Não citar:**
  - marca de outro app ou cursinho;
  - número inventado (só número verdadeiro do próprio app ou de fonte citada).
- **Não prometer aprovação.**
- **Só falar de função que existe no app:**
  - cronograma pronto ou o do cursinho (a IA lê), ciclo clínico e os dois juntos;
  - revisão espaçada com o teste de memória (escada de 1 semana, 1 mês, 2, 4 e 6 meses);
  - flashcards (a IA monta do PDF);
  - mentor de IA, inclusive por voz;
  - provas comentadas;
  - caderno de erros;
  - desempenho por área;
  - simulados com a turma;
  - salas com amigos e ranking por horas líquidas;
  - Foco com pomodoro;
  - agenda com Google Agenda;
  - 3 dias grátis sem cartão.
- **Preço:** mensal R$ 39, anual R$ 300 (R$ 25 por mês), garantia de 7 dias. Só quando fizer sentido.
- **Legenda:** abra com a dor da capa numa frase, 2 ou 3 parágrafos curtos, termine com o convite pra salvar ou mandar pra um amigo, uma pergunta pros comentários e "Teste 3 dias grátis, sem cartão. Link na bio 👉 cadenciamed.com.br".
  Use 5 hashtags: #residenciamedica #medicina #estudantedemedicina #internato e uma do tema.
- **"Comente CADÊNCIA":** os dois melhores posts usaram essa chamada com cupom no direct. Só use se o José avisar que tem alguém (ou uma automação) respondendo os comentários e o direct. Nunca coloque cupom no repositório.
