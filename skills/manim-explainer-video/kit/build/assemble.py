#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build/assemble.py — stitch the six rendered acts and the narration into the final video.

    python build/assemble.py                         # expects the 1080p60 renders (manim -qh)
    python build/assemble.py --quality 480p15        # after a quick -ql preview render
    python build/assemble.py --quality 2160p60 --out final_4k.mp4

Inputs
  media/videos/video/<quality>/<Scene>.mp4      from manim
  narration/manifest.json + narration/audio/<id>.mp3     from narrate.py
                                                         (a segment without audio becomes silence of
                                                          its estimated length, so the cut still lines up)
Outputs (build/out/)
  narration_full.wav   every segment + its trailing pause, concatenated
  video_silent.mp4     the six acts concatenated (stream copy)
  <out>                the muxed episode
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCENES: list[str] = []   # filled from narration/manifest.json


def run(cmd):
    subprocess.run(cmd, check=True)


def ffprobe_duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1",
                          str(path)], capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--quality", default="1080p60", help="manim output folder: 480p15, 720p30, 1080p60, 2160p60")
    ap.add_argument("--media", default="media/videos/video")
    ap.add_argument("--out", default="final.mp4")
    a = ap.parse_args()

    manifest = json.loads((ROOT / "narration" / "manifest.json").read_text(encoding="utf-8"))
    SCENES[:] = [s["name"] for s in manifest["scenes"]]          # scene order of narration/script.py
    out = ROOT / "build" / "out"
    out.mkdir(parents=True, exist_ok=True)

    # 1 · narration track: each segment padded with its pause, then concatenated -------------------
    print("narration track")
    parts = []
    for s in manifest["segments"]:
        wav = out / f"{s['id']}.wav"
        src = ROOT / s["audio"] if s.get("audio") else None
        if src and src.exists():
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                 "-af", f"apad=pad_dur={s['pause_after']:.3f}", "-ar", "44100", "-ac", "2", str(wav)])
        else:
            total = s["duration"] + s["pause_after"]
            run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                 "-t", f"{total:.3f}", str(wav)])
            print(f"  {s['id']}: no audio yet → {total:.1f}s of silence")
        parts.append(wav)
    alist = out / "audio_concat.txt"
    alist.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    narration = out / "narration_full.wav"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(alist),
         "-c:a", "pcm_s16le", str(narration)])

    # 2 · video: the six acts, stream-copied into one file ---------------------------------------------
    print("video track")
    vids = [ROOT / a.media / a.quality / f"{sc}.mp4" for sc in SCENES]
    missing = [v for v in vids if not v.exists()]
    if missing:
        sys.exit("missing renders:\n  " + "\n  ".join(str(m) for m in missing) + "\nrun: bash build/render_par.sh")
    vlist = out / "video_concat.txt"
    vlist.write_text("".join(f"file '{v.as_posix()}'\n" for v in vids), encoding="utf-8")
    silent = out / "video_silent.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(vlist), "-c", "copy", str(silent)])

    # 3 · drift report: each act should match its narration to within a frame or two -----------------
    print("sync check (video vs narration per act)")
    worst = 0.0
    for sc, v in zip(manifest["scenes"], vids):
        got, want = ffprobe_duration(v), sc["duration"]
        worst = max(worst, abs(got - want))
        flag = "" if abs(got - want) < 0.25 else "   ← check the warnings in that act's render log"
        print(f"  {sc['name']:<16} video {got:7.2f}s   narration {want:7.2f}s   Δ {got - want:+.2f}s{flag}")
    if worst > 0.5:
        print("  note: an act that runs long means its animations overran a cue; the audio keeps its own timing.")

    # 4 · mux ------------------------------------------------------------------------------------------
    final = out / a.out
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(silent), "-i", str(narration),
         "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(final)])
    print(f"\ndone → {final.relative_to(ROOT)}   ({ffprobe_duration(final):.1f}s)")


if __name__ == "__main__":
    main()
