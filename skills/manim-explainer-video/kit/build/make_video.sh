#!/usr/bin/env bash
# build/make_video.sh — the whole build: narration with ElevenLabs, 4K render, final video, YouTube package.
#
#   bash build/make_video.sh                                        everything; asks for the ElevenLabs key
#   SKIP_NARRATION=1 bash build/make_video.sh                       keep the narration already made (no key needed)
#   SKIP_NARRATION=1 SCENES="S03Name S09Name" bash build/make_video.sh   re-render only these scenes, then rebuild
#   BURN=1 bash build/make_video.sh                                 also a copy with the captions burned in
#
# The key is typed once, hidden, stays inside this process and is never written to disk.
# Segments already narrated with the same text, voice, model and settings are not paid for again.
set -euo pipefail
cd "$(dirname "$0")/.."

VOICE="${VOICE:-George}"                 # ElevenLabs voice, by name or id: set your own
MODEL="${MODEL:-eleven_v4}"              # newest ElevenLabs text-to-speech model when this project was set up
LANGUAGE="${LANGUAGE:-en}"               # narration language, ISO 639-1
JOBS="${JOBS:-4}"                        # scenes rendered in parallel
VENV="${VENV:-.venv}"                    # Python environment with Manim

[ -f "$VENV/bin/activate" ] || { echo "No Python environment at $VENV (run with VENV=path/to/venv)"; exit 1; }
source "$VENV/bin/activate"
eval "$(/usr/libexec/path_helper)"
export PATH="$VIRTUAL_ENV/bin:$PATH"
SCENE_FILE=scenes/video.py
mkdir -p build/logs

if [ "${SKIP_NARRATION:-0}" != "1" ]; then
  if [ -z "${ELEVENLABS_API_KEY:-}" ]; then
    read -rsp "ElevenLabs API key (paste it and press Enter; nothing is shown or saved): " ELEVENLABS_API_KEY
    echo
    export ELEVENLABS_API_KEY
  fi
  ARGS=(--voice "$VOICE" --model "$MODEL" --language "$LANGUAGE" --stability 0.5 --similarity 0.8 --no-speed)
  FIRST=$(python -c "import sys; sys.path.insert(0, 'narration'); import script; print(script.SEGMENTS[0]['id'])")
  echo "1/5 Voice test ($FIRST)"
  python narration/narrate.py "${ARGS[@]}" --only "$FIRST"
  afplay "narration/audio/$FIRST.mp3" || true
  read -rp "Press Enter to narrate the whole script, or Ctrl-C to stop: " _
  echo "2/5 Narration"
  python narration/narrate.py "${ARGS[@]}"
  unset ELEVENLABS_API_KEY
else
  python -c "import json, sys; s = json.load(open('narration/manifest.json')).get('source'); sys.exit(0 if s == 'elevenlabs' else 'The narration is not finished (manifest source: %s). Run once without SKIP_NARRATION.' % s)"
fi
python narration/timing.py --check "$SCENE_FILE" | tail -1

echo "3/5 4K render (keep the lid open)"
caffeinate -dims env QUALITY=k JOBS="$JOBS" bash build/render_par.sh ${SCENES:-} | tee build/logs/render_k.log
if grep -q '^FAIL' build/logs/render_k.log; then
  echo "Some scenes failed: see build/logs/. The narration is kept and will not be paid for again."
  exit 1
fi
rm -rf media/_par

echo "4/5 Final video"
python build/assemble.py --quality 2160p60
caffeinate -dims bash build/youtube.sh

echo "5/5 YouTube package"
python build/youtube_package.py
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -show_entries format=duration -of default=nw=1 build/out/final_youtube.mp4
echo "Done: build/out/final_youtube.mp4, build/out/subtitles.srt, build/out/youtube/"
open build/out
