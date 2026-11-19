#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build/contact_sheet.py — QA: tile one frame per narration cue of a rendered scene.

    python build/contact_sheet.py S2BestResponse                       # reads media/videos/.../480p15/S2BestResponse.mp4
    python build/contact_sheet.py S2BestResponse --quality 1080p60 --out build/out/qa_S2.png

For every segment of the scene it grabs a frame just after each cue word used by the scene
(parsed from scenes/video.py) plus the segment end, and tiles them with a label.
Needs ffmpeg and Pillow.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
CUE_RE = re.compile(r"""\.cue\(\s*["'](\w+)["']\s*,\s*["']([^"']+)["']\s*(?:,\s*(\d+))?\s*\)""")


def norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("--quality", default="480p15")
    ap.add_argument("--out")
    ap.add_argument("--delay", type=float, default=1.0, help="seconds after the cue to grab the frame")
    a = ap.parse_args()
    video = ROOT / "media" / "videos" / "video" / a.quality / f"{a.scene}.mp4"
    man = json.loads((ROOT / "narration" / "manifest.json").read_text())
    segs = [s for s in man["segments"] if s["scene"] == a.scene]
    t0 = segs[0]["start"]
    src = (ROOT / "scenes" / "video.py").read_text()
    # keep only the cues of this scene, in source order
    cls = re.search(rf"class {a.scene}\(.*?(?=\nclass |\Z)", src, re.S).group(0)
    times = []
    by_id = {s["id"]: s for s in segs}
    for seg, word, n in CUE_RE.findall(cls):
        if seg not in by_id:
            continue
        s = by_id[seg]
        hits = [w for w in s["words"] if norm(w["w"]) == norm(word)]
        n = int(n or 1)
        if len(hits) >= n:
            times.append((f"{seg} '{word}'", s["start"] - t0 + hits[n - 1]["t"] + a.delay))
    for s in segs:
        times.append((f"{s['id']} end", s["end"] - t0 - 0.2))
    times.sort(key=lambda x: x[1])
    tmp = Path(tempfile.mkdtemp())
    frames = []
    for k, (label, t) in enumerate(times):
        png = tmp / f"f{k:03d}.png"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{max(t, 0):.3f}", "-i", str(video),
                        "-frames:v", "1", str(png)], check=True)
        frames.append((label, t, Image.open(png).convert("RGB")))
    w, h = frames[0][2].size
    cols = 3
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * h), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    for k, (label, t, im) in enumerate(frames):
        x, y = (k % cols) * w, (k // cols) * h
        sheet.paste(im, (x, y))
        d.rectangle([x, y, x + 260, y + 18], fill=(0, 0, 0))
        d.text((x + 4, y + 3), f"{label} @{t:.1f}s", fill=(255, 255, 255))
    out = Path(a.out or ROOT / "build" / "out" / f"qa_{a.scene}.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(out, f"{len(frames)} frames")


if __name__ == "__main__":
    main()
