#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
narration/subtitles.py — SubRip subtitles from the measured manifest.

    python narration/subtitles.py                 → build/out/subtitles.srt
    python narration/subtitles.py --max-words 10  (shorter cues)

Uses the per-word timestamps from ElevenLabs, so every cue lands on the spoken word.
Run narrate.py first; with an estimated manifest the cues are approximate.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def ts(t: float) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def chunks(words, max_words):
    """Split a segment's words into cues at sentence ends, commas, or max_words."""
    cur = []
    for w in words:
        cur.append(w)
        text = w["w"]
        if len(cur) >= max_words or re.search(r"[.!?]$", text) or (len(cur) >= 5 and text.endswith(",")):
            yield cur
            cur = []
    if cur:
        yield cur


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-words", type=int, default=12)
    ap.add_argument("--out", default=str(ROOT / "build" / "out" / "subtitles.srt"))
    a = ap.parse_args()
    man = json.loads((HERE / "manifest.json").read_text(encoding="utf-8"))
    lines, n = [], 0
    for seg in man["segments"]:
        base, speech_end = seg["start"], seg["speech_end"]
        words = seg["words"]
        if not words:
            continue
        groups = list(chunks(words, a.max_words))
        for i, g in enumerate(groups):
            start = base + g[0]["t"]
            end = base + (groups[i + 1][0]["t"] if i + 1 < len(groups) else speech_end - base)
            end = max(end - 0.05, start + 0.8)
            n += 1
            lines += [str(n), f"{ts(start)} --> {ts(end)}", " ".join(w["w"] for w in g), ""]
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"{n} cues → {out}  (source: {man['source']}, runtime {man['total']:.0f}s)")


if __name__ == "__main__":
    main()
