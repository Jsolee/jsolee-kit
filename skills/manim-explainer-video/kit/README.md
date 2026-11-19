# Explainer video kit (Manim + ElevenLabs)

Copy this folder into a new project, write the video, and build it with one command.

```bash
cp -R <skill-folder>/kit/. ~/Downloads/<topic-slug>-3b1b/
```

## What to write for each video

| File | What goes in it |
|---|---|
| `narration/script.py` | The voiceover, segment by segment (replace the example segments) |
| `scenes/video.py` | Keep the BASE section; replace the example scenes with `S01Name`, `S02Name`, ... in script order |
| `youtube.json` | Title, description pieces, chapters (one per scene), tags, thumbnail hook |
| `build/make_video.sh` | The defaults at the top: voice id, model, language, Python environment |
| `data/` | Any measurement or data-preparation script, with its outputs |

## Build

Preview while you write (no narration needed; timings are estimated at 145 words per minute):

```bash
python narration/timing.py --force && QUALITY=l bash build/render_par.sh
```

Everything, in 4K: asks for the ElevenLabs key (hidden, never saved), plays a test sentence, then narrates, renders, assembles, encodes and writes the YouTube package.

```bash
bash build/make_video.sh
```

Rebuild without narrating again, optionally only some scenes:

```bash
SKIP_NARRATION=1 SCENES="S03Name" bash build/make_video.sh
```

## Tools inside

- `narration/timing.py`: the timing estimate, `--check scenes/video.py` for the cue words, and `docs/voiceover_script.md`.
- `narration/narrate.py`: ElevenLabs with timestamps; caches every segment so nothing is paid twice.
- `build/render_par.sh`: parallel Manim renders; finds the scenes in `scenes/video.py` by name.
- `build/qa_frames.py` and `build/contact_sheet.py`: frame grids for the visual review.
- `build/assemble.py`: narration track, video concatenation, drift report per scene, final mux.
- `build/youtube.sh`: the YouTube master and `subtitles.srt` (`BURN=1` adds burned-in captions).
- `build/youtube_package.py` and `build/thumbnail.py`: title, description, tags, checklist and thumbnail.

First-time setup on macOS: `brew install ffmpeg pkg-config cairo pango`, MacTeX (`brew install --cask mactex-no-gui`), then `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`.
