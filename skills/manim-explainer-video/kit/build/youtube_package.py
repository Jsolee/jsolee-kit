#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build/youtube_package.py — everything needed to upload the video (standalone or one part of a series).

    python build/youtube_package.py                       # reads youtube.json + narration/manifest.json
    python build/youtube_package.py --manifest path.json --out-dir build/out/youtube

Writes build/out/youtube/:
    title.txt           search title (+ alternatives)
    description.txt     intro, chapters (measured times), series line, topics, references, hashtags
    tags.txt            comma-separated, <= 500 characters
    thumbnail.png       1280x720, the series style (build/thumbnail.py)
    upload_checklist.md what to click in YouTube Studio

youtube.json fields: title, alt_titles[], hook ("LINE1|*ACCENT* LINE2"), subtitle,
motif (simplex|payoff|curve|tree|network|bipartite), accent, intro, chapters[] (one search-style title per
scene), keywords[], extra_tags[], hashtags[], prerequisites, references[], disclosure?, badge? (thumbnail label for a
standalone video), and for a series: series, part, series_total, prev_url?, next_url?
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from thumbnail import render  # noqa: E402


def stamp(t: float) -> str:
    t = int(round(t))
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--meta", default=str(ROOT / "youtube.json"))
    ap.add_argument("--manifest", default=str(ROOT / "narration" / "manifest.json"))
    ap.add_argument("--out-dir", default=str(ROOT / "build" / "out" / "youtube"))
    a = ap.parse_args()

    meta = json.loads(Path(a.meta).read_text(encoding="utf-8"))
    man = json.loads(Path(a.manifest).read_text(encoding="utf-8"))
    out = Path(a.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    warn = []
    if man.get("source") != "elevenlabs":
        warn.append("manifest is an ESTIMATE (narrate.py has not run): re-run this script after narrating, the chapter times will change")

    # ---- chapters from the measured scene boundaries
    scenes = man["scenes"]
    titles = meta.get("chapters") or [s["name"] for s in scenes]
    if len(titles) != len(scenes):
        sys.exit(f"youtube.json has {len(titles)} chapter titles but the video has {len(scenes)} scenes")
    chapters = [f"{stamp(s['start'])} {t}" for s, t in zip(scenes, titles)]
    if scenes[0]["start"] != 0:
        warn.append("first chapter must start at 0:00")
    if len(scenes) < 3:
        warn.append("YouTube needs at least 3 chapters")
    if any(s["duration"] < 10 for s in scenes):
        warn.append("every chapter must be at least 10 seconds long")

    # ---- description
    series, part, total = meta.get("series"), meta.get("part"), meta.get("series_total")
    series_line = ""
    if series:
        series_line = f"📚 Series: {series}" + (f" · Part {part}" if part else "") + (f" of {total}" if part and total else "")
    nav = []
    if meta.get("prev_url"):
        nav.append(f"Previous: {meta['prev_url']}")
    if meta.get("next_url"):
        nav.append(f"Next: {meta['next_url']}")
    desc = [meta["intro"].strip(), "", "⏱ Chapters", *chapters]
    if series_line:
        desc += ["", series_line]
    if nav:
        desc.append(" · ".join(nav))
    if meta.get("prerequisites"):
        desc.append(f"Prerequisites: {meta['prerequisites']}")
    desc += ["", "Topics covered: " + ", ".join(meta["keywords"])]
    if meta.get("references"):
        desc += ["", "References"] + [f"- {r}" for r in meta["references"]]
    desc += ["", meta.get("disclosure", "Narration generated with ElevenLabs; animations made with Manim (Python). Subtitles (CC) available."),
             "If this helped, subscribe for the rest of the series." if series else "If this helped, subscribe for more.", "",
             " ".join("#" + h.lstrip("#") for h in meta["hashtags"])]
    text = "\n".join(desc) + "\n"
    if len(text) > 5000:
        warn.append(f"description is {len(text)} characters; YouTube's limit is 5000")
    (out / "description.txt").write_text(text, encoding="utf-8")

    # ---- title(s), tags
    title = meta["title"]
    if len(title) > 70:
        warn.append(f"title is {len(title)} characters; search results cut around 70")
    alts = meta.get("alt_titles", [])
    (out / "title.txt").write_text(title + "\n" + "".join(f"\n(alt) {t}" for t in alts) + "\n", encoding="utf-8")
    tags, size = [], 0
    for t in meta["keywords"] + meta.get("extra_tags", []):
        if t.lower() not in [x.lower() for x in tags] and size + len(t) + 1 <= 480:
            tags.append(t)
            size += len(t) + 1
    (out / "tags.txt").write_text(", ".join(tags) + "\n", encoding="utf-8")

    # ---- thumbnail (series style)
    render(meta["hook"], meta.get("subtitle", ""), meta["motif"], part, meta.get("accent", "yellow"),
           (series or meta.get("badge", "")).upper(), str(out / "thumbnail.png"))

    # ---- checklist
    (out / "upload_checklist.md").write_text(f"""# Upload checklist — {meta['title']}

1. Video: `build/out/final_youtube.mp4` (clean, with `subtitles.srt` as closed captions) or `build/out/final_youtube_subs.mp4` (captions burned in). Check it is 3840x2160 first.
2. Title: first line of `title.txt` (alternatives below it).
3. Description: paste `description.txt` as is (chapters start at 0:00).
4. Thumbnail: `thumbnail.png`.
5. Subtitles → Add language → English → Upload file → With timing → `build/out/subtitles.srt`.
6. Tags (More options): `tags.txt`.
7. Playlist: {('"' + series + '"') if series else 'optional'}. Category: Education. Audience: not made for kids.
8. Answer the "altered or synthetic content" question in Studio honestly, using YouTube's current wording (the narration is a stock AI voice, not a real person's voice; the description already says it was generated).
9. Publish only after the quality menu shows 2160p60 (processing takes a while).
""", encoding="utf-8")

    print(f"wrote {out}/ : title.txt, description.txt, tags.txt, thumbnail.png, upload_checklist.md")
    print("runtime", stamp(man["total"]), f"({man.get('source')})")
    for w in warn:
        print("WARNING:", w)


if __name__ == "__main__":
    main()
