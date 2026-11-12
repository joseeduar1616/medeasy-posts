# Vídeos animados da MedEasy

Reels de motion de marca, sem ninguém aparecendo: frase grande entrando palavra por palavra,
palavra-chave em verde neon (ou numa pílula verde nas cenas claras), cenas que sobem como cartões
e objetos 3D feitos em código com three.js (lâmpada poligonal da logo, certificados, celular com o portal).
Três temas de cena: `claro` (creme), `escuro` (preto com brilho verde) e `neon` (degradê verde e amarelo).

| Arquivo | Vídeo | Duração |
|---|---|---|
| `m1.js` | O certificado na gaveta pode valer ponto, cada edital pontua de um jeito, a MedEasy lê o edital, portal | 31 s |

## Como gerar

Fora do repositório:

```bash
mkdir -p /tmp/mvid && cd /tmp/mvid && npm init -y && npm i playwright@1.56 three@0.170
R=/home/claude/medeasy-posts
cp $R/videos/* . && mkdir -p fontes && cp $R/cadencia/fontes/*.woff2 $R/kit/assets/Anton-Regular.ttf fontes/
cp $R/cadencia/videos/som.py . && cp node_modules/three/build/three.module.min.js three.js
cp node_modules/three/examples/jsm/environments/RoomEnvironment.js node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js .
python3 -c "from PIL import Image; Image.open('$R/portal/logo.webp').save('logo.png')"
python3 -m http.server 8765 &          # os módulos precisam de servidor
node render.mjs m1 previa 1,5,17       # quadros soltos em saida/
node render.mjs m1                     # vídeo mudo, 30 quadros por segundo
python3 som.py saida/gaveta-eventos.json saida/gaveta.wav
ffmpeg -i saida/gaveta-mudo.mp4 -i saida/gaveta.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart saida/medeasy-gaveta.mp4
```

O 3D roda no SwiftShader do Chromium (sem placa de vídeo), por isso o `render.mjs` passa `--use-angle=swiftshader`.

## Como escrever um vídeo novo

Copie `m1.js`. Cada cena tem `t0`, `t1`, `tema` e `blocos`. Blocos: `head` (frase; `*assim*` acende,
`~assim~` risca em vermelho), `sub`, `tres` (`obj`: `certificados`, `lampada` ou `celular`), `fichas`,
`compara`, `checks` e `fim`. Pra primeira cena já aparecer inteira no quadro 0, use `t` negativo.
Conteúdo entre y 230 e y 1500. Regras de texto do PLAYBOOK: sem travessão e nenhum número sem fonte oficial.
