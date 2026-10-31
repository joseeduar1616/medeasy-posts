# Vídeos animados do Cadência Med

Reels de texto animado, no estilo dos vídeos de lançamento que o José mandou em 25/10/2026:
fundo escuro com a constelação da marca, frase grande em caixa alta aparecendo palavra por
palavra, palavra-chave acesa em lilás ou ciano, e no meio um elemento que mostra a ideia
(relógio, etiquetas, carimbo, tela real do app, escada de revisão, lista com check, preço).
Termina sempre no cartão "Teste 3 dias grátis · sem cartão · cadenciamed.com.br".

| Arquivo | Vídeo | Duração |
|---|---|---|
| `v1.js` | Plantão às 3h da manhã: a semana montada em volta da escala | 32 s |
| `v2.js` | Pergunta frequente: quanto custa (R$ 39 por mês, R$ 300 por ano, 7 dias de garantia) | 32 s |
| `v3.js` | O app em 30 segundos: cronograma, ciclo clínico, revisão, flashcards, foco e ranking | 36 s |
| `v4.js` | Nicho internato e ENAMED: 100 questões, 20 por área | 32 s |
| `v5.js` | Meme animado (caminho A2 do AGENTES.md): POV 23h, "e agora, estudo o quê?" | 16 s |
| `v6.js` | Nicho: você sobreviveria a uma semana de internato? | 19 s |
| `v7.js` | Meme animado de nicho: você sobreviveria a um dia de 4º ano com o ENAMED chegando? | 18 s |
| `v8.js` | Meme animado de nicho: níveis de cansaço no internato, o 5 é a semana já montada | 18 s |

## Como gerar

Fora do repositório (os pacotes não sobem pro GitHub):

```bash
mkdir -p /tmp/videos && cp cadencia/videos/* /tmp/videos/ && cp -r cadencia/prints cadencia/marca.png /tmp/videos/
cd /tmp/videos && npm init -y && npm i playwright@1.56 @fontsource/anton @fontsource/jetbrains-mono @fontsource/inter
node render.mjs v1 previa 2,8,15     # quadros soltos pra conferir (saida/<id>-<t>.jpg)
node render.mjs v1                   # vídeo mudo, 30 quadros por segundo
python3 som.py saida/plantao-eventos.json saida/plantao.wav
ffmpeg -i saida/plantao-mudo.mp4 -i saida/plantao.wav -c:v copy -c:a aac -b:a 192k -shortest saida/cadencia-plantao.mp4
```

`render.mjs` usa o Chromium em `/opt/pw-browsers/chromium`. `som.py` (numpy e scipy) faz a trilha:
pulso grave a 96 bpm (a "cadência"), um acorde baixo e um efeito em cada palavra, etiqueta,
carimbo e troca de cena. Ao postar, dá pra pôr uma música em alta por cima no próprio Instagram.

## Como escrever um vídeo novo

Copie um `vN.js`. Cada cena tem `t0` e `t1` (segundos), `bg` (duas cores do brilho do fundo) e
`blocos`. Blocos: `head` (frase: `*assim*` acende em lilás, `^assim^` em ciano, `~assim~` risca
em vermelho, pode pegar várias palavras), `relogio`, `chips`, `carimbo`, `tela` (print de
`prints/` com `recorte: [x, y, largura, altura]` em pixels do print), `escada`, `checks`,
`grande`, `adesivo`, `contador`, `pergunta`, `rank`, `timer`, `areas` e `fim`.

Regras de texto do `../LEIA-ME.md`: sem travessão, sem "não é X, é Y", só função que existe no
app, nenhum número inventado (os de cada vídeo vêm do site, da tela de planos e do edital do ENAMED).
Deixe o conteúdo entre y 230 e y 1500: em cima fica o nome do perfil e embaixo a legenda do Reels.

## Vídeo do agente que fala (esfera de pontos e voz)

Arquivos: `agente.html`, `agente.js`, `roteiro.py`, `render-agente.mjs`, `fazer-agente.sh`.
A esfera pulsa com a voz, a legenda entra palavra por palavra e as telas do app aparecem conforme a fala.
1. Gere a voz no ElevenLabs (voz Lucas, `7lu3ze7orhWaNeSPowWx`) com o texto das frases do `roteiro.py`.
2. Baixe o MP3 (o servidor do áudio não abre daqui, então o José anexa na conversa).
3. `./fazer-agente.sh voz.mp3` (ou `TEMA=claro ./fazer-agente.sh voz.mp3` pro fundo claro) encaixa as frases nas pausas da voz, faz a trilha baixinha por baixo e gera `saida/cadencia-agente.mp4`.
Sem MP3, `python3 roteiro.py` monta um tempo de teste e `node render-agente.mjs previa 2,10,20` tira quadros soltos.
