#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
narration/timing.py — timing manifest + human-readable script export + cue checker.

  python narration/timing.py                      estimate → manifest.estimated.json
                                                  (+ manifest.json if none exists), then
                                                  export docs/voiceover_script.md from manifest.json
  python narration/timing.py --force              overwrite manifest.json with the estimate
  python narration/timing.py --check scenes/video.py
                                                  verify every self.cue("seg", "word") in the scenes
                                                  names a word that is really in that segment

narrate.py imports build_manifest() and hands it measured durations + word timestamps
from ElevenLabs, which is what makes the visuals land on the spoken word.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from script import (ACT_TITLES, DEFAULT_PAUSE, SEGMENTS, SUBTITLE, TITLE,  # noqa: E402
                    VOICE_DIRECTION, WPM)

PAUSE_RE = re.compile(r"\{pause(?::([0-9.]+))?\}")
WORD_RE = re.compile(r"\S+")


# --------------------------------------------------------------------------- text helpers
def tokenize(text: str):
    """-> [('word', 'Here's'), ('pause', 0.5), ...] in reading order."""
    out, pos = [], 0
    for m in PAUSE_RE.finditer(text):
        out += [("word", w) for w in WORD_RE.findall(text[pos:m.start()])]
        out.append(("pause", float(m.group(1) or DEFAULT_PAUSE)))
        pos = m.end()
    out += [("word", w) for w in WORD_RE.findall(text[pos:])]
    return out


def norm(word: str) -> str:
    """'Petersburg,' -> 'petersburg' ; "Here's" -> "here's" ; '\"twice' -> 'twice'."""
    return re.sub(r"[^\w']", "", unicodedata.normalize("NFC", word.lower()))


def words_only(text: str):
    return [w for k, w in tokenize(text) if k == "word"]


def spoken_text(text: str, break_tag=True) -> str:
    """Text for the TTS: {pause:x} -> <break time=\"xs\" /> (ElevenLabs), or plain text."""
    if break_tag:
        return PAUSE_RE.sub(lambda m: f'<break time="{float(m.group(1) or DEFAULT_PAUSE):.1f}s" />', text)
    return PAUSE_RE.sub(" ", text)


def printed_text(text: str) -> str:
    """Text for the human script: {pause:x} -> (pause x s)."""
    return PAUSE_RE.sub(lambda m: f"(pause {float(m.group(1) or DEFAULT_PAUSE):.1f}s)", text)


def mmss(t: float) -> str:
    m, s = divmod(int(round(t)), 60)
    return f"{m:02d}:{s:02d}"


# --------------------------------------------------------------------------- manifest
def estimate_words(text: str, wpm: float = WPM):
    """Uniform estimate: every word takes 60/wpm s, every {pause} its own length."""
    per = 60.0 / wpm
    t, words = 0.0, []
    for kind, val in tokenize(text):
        if kind == "word":
            words.append({"w": val, "t": round(t, 3)})
            t += per
        else:
            t += val
    return words, t


def build_manifest(measured: dict | None = None) -> dict:
    """
    measured = {seg_id: {"duration": s, "words": [{"w","t"}, ...], "audio": "narration/audio/s1a.mp3"}}
    Segments without a measured entry fall back to the wpm estimate.
    """
    measured = measured or {}
    segs, t = [], 0.0
    for s in SEGMENTS:
        m = measured.get(s["id"])
        if m:
            words, dur, audio, src = m["words"], float(m["duration"]), m.get("audio"), "elevenlabs"
        else:
            words, dur = estimate_words(s["text"])
            audio, src = None, "estimate"
        start, speech_end = t, t + dur
        end = speech_end + float(s["pause_after"])
        segs.append({
            "id": s["id"], "scene": s["scene"],
            "start": round(start, 3), "speech_end": round(speech_end, 3), "end": round(end, 3),
            "duration": round(dur, 3), "pause_after": float(s["pause_after"]),
            "source": src, "audio": audio, "text": s["text"], "words": words,
        })
        t = end
    scenes = []
    for name in dict.fromkeys(s["scene"] for s in SEGMENTS):
        mine = [x for x in segs if x["scene"] == name]
        scenes.append({"name": name, "start": mine[0]["start"], "end": mine[-1]["end"],
                       "duration": round(mine[-1]["end"] - mine[0]["start"], 3)})
    n_meas = sum(1 for s in SEGMENTS if s["id"] in measured)
    source = "elevenlabs" if n_meas == len(SEGMENTS) else ("mixed" if n_meas else "estimate")
    return {"title": TITLE, "source": source, "wpm": WPM, "total": round(t, 3),
            "scenes": scenes, "segments": segs}


# --------------------------------------------------------------------------- export
def export_markdown(manifest: dict, path: Path) -> None:
    how = ("measured from the ElevenLabs render" if manifest["source"] == "elevenlabs"
           else f"estimated at {WPM} wpm plus pauses — re-run after narrate.py for measured cues")
    L = [f"# {TITLE} — Voiceover Script", "", f"*{SUBTITLE}*", "",
         f"Runtime **{mmss(manifest['total'])}** ({how}).", "",
         "## Voice direction", "", VOICE_DIRECTION.strip(), "",
         "## Reading the cues", "",
         "`[mm:ss]` is when the segment starts. `(pause 0.5s)` is a break the TTS renders. "
         "Each segment ends with a *pause after* of its own. The notation box shows the symbols "
         "on screen at that moment and how to say them.", ""]
    for sc in manifest["scenes"]:
        L += [f"## {ACT_TITLES[sc['name']]}  [{mmss(sc['start'])} – {mmss(sc['end'])}]", ""]
        for s in manifest["segments"]:
            if s["scene"] != sc["name"]:
                continue
            guide = next(x["guide"] for x in SEGMENTS if x["id"] == s["id"])
            L += [f"**[{mmss(s['start'])}] `{s['id']}`**  ", printed_text(s["text"]),
                  f"*(pause after: {s['pause_after']:.1f}s)*", ""]
            if guide:
                L += [f"> **Notation & pronunciation.** {guide}", ""]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(L), encoding="utf-8")


# --------------------------------------------------------------------------- cue check
CUE_RE = re.compile(r"""\.cue\(\s*["'](\w+)["']\s*,\s*["']([^"']+)["']\s*(?:,\s*(\d+))?\s*\)""")
SEG_RE = re.compile(r"""\.(?:at|until|speech_end)\(\s*["'](\w+)["']\s*\)""")


def check_cues(py_path: str) -> int:
    src = Path(py_path).read_text(encoding="utf-8")
    by_id = {s["id"]: s for s in SEGMENTS}
    problems = 0
    for seg, word, n in CUE_RE.findall(src):
        n = int(n or 1)
        if seg not in by_id:
            print(f"  ✗ cue in unknown segment {seg!r}")
            problems += 1
            continue
        ws = [norm(w) for w in words_only(by_id[seg]["text"])]
        have = ws.count(norm(word))
        if have < n:
            print(f"  ✗ {seg}: cue {word!r} #{n} — only {have} occurrence(s) in the narration")
            problems += 1
    for seg in SEG_RE.findall(src):
        if seg not in by_id:
            print(f"  ✗ unknown segment {seg!r} in at()/until()/speech_end()")
            problems += 1
    # every segment should be referenced by the scene that owns it
    for s in SEGMENTS:
        if not re.search(rf"""["']{s['id']}["']""", src):
            print(f"  ! segment {s['id']} ({s['scene']}) is never referenced by the scenes")
    print("cue check:", "OK" if problems == 0 else f"{problems} problem(s)")
    return problems


# --------------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="overwrite manifest.json with the estimate")
    ap.add_argument("--check", metavar="SCENES_PY", help="check cue words against the narration")
    a = ap.parse_args()
    if a.check:
        sys.exit(1 if check_cues(a.check) else 0)

    est = build_manifest()
    (HERE / "manifest.estimated.json").write_text(json.dumps(est, indent=1, ensure_ascii=False), encoding="utf-8")
    mp = HERE / "manifest.json"
    if a.force or not mp.exists():
        mp.write_text(json.dumps(est, indent=1, ensure_ascii=False), encoding="utf-8")
        print("wrote narration/manifest.json  (source: estimate)")
    cur = json.loads(mp.read_text(encoding="utf-8"))
    print(f"runtime {mmss(cur['total'])}  (source: {cur['source']}, {sum(len(words_only(s['text'])) for s in SEGMENTS)} words)")
    for sc in cur["scenes"]:
        print(f"  {sc['name']:<12} {mmss(sc['start'])} – {mmss(sc['end'])}   ({sc['duration']:.1f}s)")
    out = ROOT / "docs" / "voiceover_script.md"
    export_markdown(cur, out)
    print(f"exported {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
