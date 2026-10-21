#!/usr/bin/env bash
# Prepara um post do Instagram do Cadência Med a partir do JSON em cadencia/posts/.
#
#   ./cadencia/preparar.sh cadencia/posts/2026-10-21-algo.json           # carrossel
#   ./cadencia/preparar.sh cadencia/posts/2026-10-21-algo.json --reel    # Reel 9:16
#
# Gera as imagens (ou o reel.mp4) em cadencia/publicado/<id>/. Depois é commit,
# push no main deste repositório e publicar pelo Windsor com os links
# raw.githubusercontent.com do commit (veja cadencia/LEIA-ME.md).
set -euo pipefail
JSON="$(realpath "$1")"
MODO="${2:-}"
cd "$(dirname "$0")"
ID=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['id'])" "$JSON")

# dependências que não moram no repositório
python3 -c "import PIL" 2>/dev/null || python3 -m pip install -q --break-system-packages pillow
if [ "$MODO" = "--reel" ]; then
  python3 -c "import imageio_ffmpeg" 2>/dev/null || python3 -m pip install -q --break-system-packages imageio-ffmpeg
  export FFMPEG="${FFMPEG:-$(python3 -c 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())')}"
fi
if [ ! -d node_modules/playwright ]; then
  (npm init -y >/dev/null 2>&1 || true; npm i -s --no-save playwright@1.56 >/dev/null)
fi
if [ -z "${CHROMIUM:-}" ]; then
  for c in /opt/pw-browsers/chromium-*/chrome-linux/chrome /opt/pw-browsers/chromium; do [ -x "$c" ] && export CHROMIUM="$c"; done
fi

if [ "$MODO" = "--reel" ]; then
  python3 reel.py "$JSON"
  node reel.mjs "$ID"
else
  python3 carrossel.py "$JSON"
  node render.mjs "$ID"
fi
ls -la "publicado/$ID"
echo
echo "Depois do push, os links ficam assim (troque COMMIT pelo hash do commit que subiu as imagens):"
echo "https://raw.githubusercontent.com/joseeduar1616/medeasy-posts/COMMIT/cadencia/publicado/$ID/1.jpg"
