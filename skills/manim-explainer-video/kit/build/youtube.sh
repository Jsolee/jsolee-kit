#!/usr/bin/env bash
# build/youtube.sh — final YouTube masters from build/out/final.mp4 (run after QUALITY=k bash build/render.sh)
#   bash build/youtube.sh          → final_youtube.mp4 (clean) + subtitles.srt (upload as closed captions)
#   BURN=1 bash build/youtube.sh   → also final_youtube_subs.mp4, captions burned into a bottom band
set -euo pipefail
cd "$(dirname "$0")/.."
IN=build/out/final.mp4
[ -f "$IN" ] || { echo "missing $IN — run: QUALITY=k bash build/render.sh"; exit 1; }

python narration/subtitles.py

ffmpeg -y -loglevel error -stats -i "$IN" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -movflags +faststart build/out/final_youtube.mp4
echo "→ build/out/final_youtube.mp4"

if [ "${BURN:-0}" = "1" ]; then
  # captions are drawn with Pillow (no libass/freetype needed in ffmpeg): pip install pillow
  python build/burn_subs.py "$IN" build/out/subtitles.srt build/out/final_youtube_subs.mp4
  echo "→ build/out/final_youtube_subs.mp4"
fi
