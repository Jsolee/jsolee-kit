#!/usr/bin/env bash
# build/render_par.sh — render the scenes of scenes/video.py in parallel. Each process gets its own media folder,
# so the LaTeX caches never collide. Prints "ok" or "FAIL" per scene; logs go to build/logs/<Scene>.log.
#   QUALITY=l JOBS=4 bash build/render_par.sh              # every scene at 480p15
#   QUALITY=k JOBS=4 bash build/render_par.sh              # every scene at 2160p60
#   QUALITY=l bash build/render_par.sh S03Name S08Name     # only these scenes
set -uo pipefail
cd "$(dirname "$0")/.."
QUALITY="${QUALITY:-h}"
JOBS="${JOBS:-4}"
case "$QUALITY" in
  l) FOLDER=480p15 ;;  m) FOLDER=720p30 ;;  h) FOLDER=1080p60 ;;  k) FOLDER=2160p60 ;;
  *) echo "QUALITY must be l, m, h or k"; exit 1 ;;
esac
# every scene class in scenes/video.py, in file order: "class S01Hook(NarratedScene):" -> S01Hook
ALL=$(grep -oE '^class S[0-9]+[A-Za-z0-9_]*' scenes/video.py | sed 's/^class //' | tr '\n' ' ')
SCENES="${*:-$ALL}"
OUT="media/videos/video/$FOLDER"
mkdir -p "$OUT" build/logs
render_one() {
  sc="$1"
  tmp="media/_par/$sc"
  rm -rf "$tmp"
  if manim -q"$QUALITY" --disable_caching --progress_bar none --media_dir "$tmp" scenes/video.py "$sc" > "build/logs/$sc.log" 2>&1; then
    mv -f "$tmp/videos/video/$FOLDER/$sc.mp4" "$OUT/$sc.mp4"
    rm -rf "$tmp"
    echo "ok   $sc"
  else
    echo "FAIL $sc (build/logs/$sc.log)"
  fi
}
export -f render_one
export QUALITY FOLDER OUT
echo $SCENES | tr ' ' '\n' | xargs -P "$JOBS" -I{} bash -c 'render_one {}'
