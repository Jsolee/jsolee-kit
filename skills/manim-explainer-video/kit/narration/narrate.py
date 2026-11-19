#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
narration/narrate.py — synthesise every segment with ElevenLabs and write the measured manifest.

    Normally run through build/make_video.sh, which asks for the key without showing or saving it.
    python narration/narrate.py --voice <id> --model eleven_v4 --language en --no-speed   # newest model, no speed control
    python narration/narrate.py --only s1a s1b               # re-render a couple of segments
    python narration/narrate.py --list-voices

Writes narration/audio/<id>.mp3 and narration/manifest.json, where every segment carries its
measured duration and per-word timestamps (from the /with-timestamps endpoint). The Manim scenes
read that manifest, so each reveal lands on the spoken word. docs/voiceover_script.md is
re-exported with the measured [mm:ss] cues.

Unchanged segments (same text, voice, model, settings) are skipped via narration/audio/cache.json.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from script import SEGMENTS, WPM  # noqa: E402
from timing import (build_manifest, export_markdown, mmss, norm, spoken_text,  # noqa: E402
                    words_only)

try:
    import requests
except ImportError:  # pragma: no cover
    sys.exit("pip install requests")

API = "https://api.elevenlabs.io/v1"
AUDIO_DIR = HERE / "audio"
CACHE = AUDIO_DIR / "cache.json"
PREFERRED_VOICES = ["George", "Brian", "Daniel", "Adam"]   # deep, warm narrators in the ElevenLabs library


# --------------------------------------------------------------------------- API plumbing
def api_key() -> str:
    key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY")
    if not key:
        sys.exit("Set ELEVENLABS_API_KEY in your environment first (see README).")
    return key


def headers() -> dict:
    return {"xi-api-key": api_key(), "accept": "application/json", "content-type": "application/json"}


def list_voices() -> list:
    r = requests.get(f"{API}/voices", headers=headers(), timeout=30)
    r.raise_for_status()
    return r.json().get("voices", [])


def resolve_voice(name_or_id: str | None) -> tuple[str, str]:
    looks_like_id = bool(name_or_id) and len(name_or_id) == 20 and name_or_id.isalnum()
    try:
        voices = list_voices()
    except requests.HTTPError:          # una clau sense permís per llistar veus pot sintetitzar igualment
        if looks_like_id:
            return name_or_id, name_or_id
        raise
    if name_or_id:
        for v in voices:
            if v.get("voice_id") == name_or_id or v.get("name", "").lower() == name_or_id.lower():
                return v["voice_id"], v["name"]
        if looks_like_id:               # no és a la llista: l'id es prova directament i l'API dirà si és vàlid
            return name_or_id, name_or_id
        sys.exit(f"voice {name_or_id!r} not found in your library — try --list-voices")
    for want in PREFERRED_VOICES:
        for v in voices:
            if v.get("name", "").lower() == want.lower():
                return v["voice_id"], v["name"]
    v = voices[0]
    return v["voice_id"], v["name"]


# Opcions que no tots els models accepten: si l'API les rebutja, es treuen i es continua (el rebuig no gasta caràcters).
OPTIONAL = {"language": True, "speed": True}


def synthesize(voice_id: str, text: str, model: str, settings: dict, output_format: str, language: str | None = None) -> dict:
    url = f"{API}/text-to-speech/{voice_id}/with-timestamps"
    body = {"text": text, "model_id": model, "voice_settings": dict(settings)}
    if language and OPTIONAL["language"]:
        body["language_code"] = language
    if not OPTIONAL["speed"]:
        body["voice_settings"].pop("speed", None)
    for attempt in range(6):
        r = requests.post(url, headers=headers(), params={"output_format": output_format}, json=body, timeout=180)
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(2 ** attempt)
            continue
        if r.status_code in (400, 422) and "language_code" in body:
            print(f"\n     note: the API rejected language_code, retrying without it: {r.text[:200]}")
            OPTIONAL["language"] = False
            body.pop("language_code")
            continue
        if r.status_code in (400, 422) and "speed" in body["voice_settings"]:
            print(f"\n     note: the API rejected speed, retrying without it: {r.text[:200]}")
            OPTIONAL["speed"] = False
            body["voice_settings"].pop("speed")
            continue
        if not r.ok:
            sys.exit(f"ElevenLabs error {r.status_code}: {r.text[:500]}")
        return r.json()
    sys.exit("ElevenLabs: gave up after four attempts")


# --------------------------------------------------------------------------- alignment → words
def _chars_and_starts(alignment) -> tuple[list, list]:
    """Accept both response shapes: parallel arrays (REST) or a list of character objects (SDK)."""
    if not alignment or "characters" not in alignment:
        return [], []
    chars = alignment["characters"]
    if chars and isinstance(chars[0], dict):
        return [c["character"] for c in chars], [float(c["start_time_seconds"]) for c in chars]
    return list(chars), [float(x) for x in alignment["character_start_times_seconds"]]


def word_times(alignment) -> list:
    """Per-word start times in seconds, skipping anything inside <break …/> tags."""
    chars, starts = _chars_and_starts(alignment)
    words, cur, t0, depth = [], "", None, 0
    for ch, t in zip(chars, starts):
        if ch == "<":
            depth += 1
            continue
        if ch == ">":
            depth = max(0, depth - 1)
            continue
        if depth:
            continue
        if ch.isspace():
            if cur:
                words.append({"w": cur, "t": round(t0, 3)})
                cur, t0 = "", None
        else:
            if not cur:
                t0 = t
            cur += ch
    if cur:
        words.append({"w": cur, "t": round(t0, 3)})
    return words


def audio_duration(path: Path, fallback: float) -> float:
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", str(path)],
                             capture_output=True, text=True, check=True).stdout.strip()
        return float(out)
    except Exception:
        return fallback


# --------------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voice", help="voice name or voice_id (default: George, then Brian, Daniel, Adam)")
    ap.add_argument("--model", default="eleven_v4", help="use the newest ElevenLabs text-to-speech model")
    ap.add_argument("--language", help="ISO 639-1 code to enforce, e.g. ca (the model must support it)")
    ap.add_argument("--stability", type=float, default=0.55)
    ap.add_argument("--similarity", type=float, default=0.80)
    ap.add_argument("--style", type=float, default=0.15)
    ap.add_argument("--speed", type=float, default=0.92, help="1.0 = normal; 0.9–0.95 gives the deliberate pace")
    ap.add_argument("--no-speed", action="store_true", help="omit the speed setting (older models reject it)")
    ap.add_argument("--format", default="mp3_44100_128")
    ap.add_argument("--only", nargs="*", help="segment ids to (re)render")
    ap.add_argument("--force", action="store_true", help="ignore the cache")
    ap.add_argument("--list-voices", action="store_true")
    a = ap.parse_args()

    if a.list_voices:
        for v in list_voices():
            labels = ", ".join(f"{k}={val}" for k, val in (v.get("labels") or {}).items())
            print(f"{v['voice_id']}  {v['name']:<16} {labels}")
        return

    settings = {"stability": a.stability, "similarity_boost": a.similarity, "style": a.style, "use_speaker_boost": True}
    if a.model.startswith("eleven_v3"):      # v3 only uses stability (0, 0.5 or 1)
        settings = {"stability": a.stability}
    elif a.model.startswith("eleven_v4"):    # v4 uses stability and similarity (no style, no speed)
        settings = {"stability": a.stability, "similarity_boost": a.similarity}
    if not a.no_speed:
        settings["speed"] = a.speed

    voice_id, voice_name = resolve_voice(a.voice)
    print(f"voice: {voice_name} ({voice_id})  model: {a.model}  settings: {settings}")
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    measured = {}

    for s in SEGMENTS:
        sid = s["id"]
        # v3 i v4 no admeten <break>: les pauses queden a càrrec de la puntuació i del pause_after de cada segment
        tts = spoken_text(s["text"], break_tag=not a.model.startswith(("eleven_v3", "eleven_v4")))
        digest = hashlib.sha1(json.dumps([tts, voice_id, a.model, settings, a.language], sort_keys=True).encode()).hexdigest()
        mp3 = AUDIO_DIR / f"{sid}.mp3"
        hit = cache.get(sid)
        wanted = (not a.only) or (sid in a.only)
        if hit and hit.get("hash") == digest and mp3.exists() and not a.force and not (a.only and wanted):
            measured[sid] = {"duration": hit["duration"], "words": hit["words"], "audio": f"narration/audio/{sid}.mp3"}
            print(f"  {sid}: cached ({hit['duration']:.1f}s)")
            continue
        if not wanted:
            if hit and mp3.exists():
                measured[sid] = {"duration": hit["duration"], "words": hit["words"], "audio": f"narration/audio/{sid}.mp3"}
            continue

        print(f"  {sid}: synthesising {len(words_only(s['text']))} words …", end="", flush=True)
        res = synthesize(voice_id, tts, a.model, settings, a.format, a.language)
        mp3.write_bytes(base64.b64decode(res["audio_base64"]))
        words = word_times(res.get("alignment") or res.get("normalized_alignment"))
        tail = (words[-1]["t"] + 0.4) if words else len(words_only(s["text"])) * 60 / WPM
        dur = audio_duration(mp3, tail)
        print(f" {dur:.1f}s, {len(words)} timed words")

        # sanity: the timed words should line up with the script's words
        script_words = [norm(w) for w in words_only(s["text"])]
        timed = [norm(w["w"]) for w in words]
        missing = [w for w in set(script_words) if script_words.count(w) > timed.count(w)]
        if missing:
            print(f"     note: alignment tokenised differently for {sorted(missing)[:6]} — "
                  f"cues on those words fall back to the segment start")

        measured[sid] = {"duration": dur, "words": words, "audio": f"narration/audio/{sid}.mp3"}
        cache[sid] = {"hash": digest, "duration": dur, "words": words, "voice": voice_name, "model": a.model}
        CACHE.write_text(json.dumps(cache, indent=1, ensure_ascii=False), encoding="utf-8")

    manifest = build_manifest(measured)
    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False), encoding="utf-8")
    export_markdown(manifest, ROOT / "docs" / "voiceover_script.md")
    print(f"\nmanifest.json written — source: {manifest['source']}, runtime {mmss(manifest['total'])}")
    for sc in manifest["scenes"]:
        print(f"  {sc['name']:<12} {mmss(sc['start'])} – {mmss(sc['end'])}")
    print("next: bash build/render.sh")


if __name__ == "__main__":
    main()
