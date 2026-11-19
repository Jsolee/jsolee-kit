#!/usr/bin/env python3
"""build/qa_frames.py ESCENA [--every 4] [--cols 3] [--quality 480p15] — graella de fotogrames a intervals regulars, amb el temps."""
import argparse, json, subprocess, tempfile
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("scene"); ap.add_argument("--every", type=float, default=4.0); ap.add_argument("--cols", type=int, default=3)
ap.add_argument("--quality", default="480p15"); ap.add_argument("--start", type=float, default=0.0); ap.add_argument("--end", type=float, default=1e9)
ap.add_argument("--out"); ap.add_argument("--w", type=int, default=640)
a = ap.parse_args()
v = ROOT / "media" / "videos" / "video" / a.quality / f"{a.scene}.mp4"
dur = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",str(v)],capture_output=True,text=True).stdout)
ts = [t for t in [a.start + i * a.every for i in range(10000)] if t < min(dur, a.end)]
ims = []
with tempfile.TemporaryDirectory() as td:
    for i, t in enumerate(ts):
        f = Path(td) / f"{i}.png"
        subprocess.run(["ffmpeg","-y","-loglevel","error","-ss",f"{t:.2f}","-i",str(v),"-frames:v","1",str(f)],check=True)
        im = Image.open(f).convert("RGB")
        h = int(a.w * im.height / im.width)
        im = im.resize((a.w, h))
        ImageDraw.Draw(im).text((a.w - 58, 4), f"{t:.1f}s", fill=(255, 255, 0))
        ims.append(im)
rows = (len(ims) + a.cols - 1) // a.cols
W, H = a.w * a.cols, ims[0].height * rows
sheet = Image.new("RGB", (W, H), (40, 40, 40))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % a.cols) * a.w, (i // a.cols) * ims[0].height))
out = a.out or str(ROOT / "build" / "out" / f"qa_{a.scene}.png")
Path(out).parent.mkdir(parents=True, exist_ok=True)
sheet.save(out)
print(out, sheet.size, len(ims))
