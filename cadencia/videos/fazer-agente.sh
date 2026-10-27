#!/bin/bash
# Uso: ./fazer-agente.sh voz.mp3  -> saida/cadencia-agente.mp4
set -e
cd /tmp/claude-0/vid
python3 roteiro.py "$1"
python3 som.py saida/agente-eventos.json saida/agente-trilha.wav
node render-agente.mjs video
ffmpeg -v error -y -i saida/agente-mudo.mp4 -i "$1" -i saida/agente-trilha.wav -filter_complex \
 "[1:a]aresample=44100,highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,volume=1.6,apad,asplit=2[voz1][voz2];[2:a]volume=0.28[bed];[bed][voz1]sidechaincompress=threshold=0.05:ratio=6:attack=20:release=300[bd];[bd][voz2]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
 -map 0:v -map "[a]" -c:v libx264 -crf 23 -maxrate 10M -bufsize 20M -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart saida/cadencia-agente.mp4
ls -la saida/cadencia-agente.mp4
