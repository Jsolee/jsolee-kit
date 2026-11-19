---
name: "manim-explainer-video"
description: "Build a complete narrated 3Blue1Brown-style Manim explainer video (6 to 20 min) on any topic. Starts with a grilling session (topic, audience, length, language, series, data, style, voice, deliverables), then storyboard approval, script, 2D and 3D scenes, narration with the newest ElevenLabs model, 4K render with frame review, YouTube package, and the exact commands to enter the ElevenLabs key and build the 4K video."
---

# Manim explainer video (3Blue1Brown style, any topic)

Use this skill when the user wants an animated, narrated explainer on any subject: maths, computer science, economics, physics, biology, statistics, history of science and so on.
- Reply in the user's language. The narration language is whatever the grilling session settles (default English).
- Do no research, create no files and write no code before the grilling session is closed.

## 1. Grilling session (always first)
Interview the user until the video is fully specified. Ask only what the request does not already answer. Propose a default for every question and put the recommended option first.

**How to ask:**
- If the environment has a question tool, use it. In Claude Code that is `AskUserQuestion`: up to 4 questions per call, 2 to 4 options each, and the user can always type their own answer.
- Otherwise, ask in chat as a numbered list with the default in brackets.
- Ask open answers in chat: the topic itself, sources, a dataset.

**Rounds:** at most three, in this order, plus follow-ups.
1. **Essentials:**
   - The topic, and the exact question the video answers.
   - Audience and level: secondary school, undergraduate, graduate or general public, and what they already know.
   - Length: 6 to 20 minutes. Recommend one once you see the concept map (section 2).
   - Language of the narration and of the on-screen text.
2. **Content:**
   - Scope: what must be in and what stays out. Ask for slides, notes, a syllabus or a paper to follow.
   - Series: standalone, or part N of M of a named series, and what the previous part ended with.
   - Running example and data: real data by default. Ask for a preferred dataset or source, or offer to find one.
   - Style reference (default 3Blue1Brown) and 3D (default: wherever depth carries meaning, section 8).
3. **Production:**
   - ElevenLabs voice, by name or id (default: the voice the user chose last time, if memory has it; otherwise George from the ElevenLabs library). Check that their plan covers the characters: about 810 per minute of video.
   - Deliverables: the YouTube package (title, description, tags, thumbnail), and subtitles as a separate `.srt` or burned into the picture.
   - Project folder (default `~/Downloads/<topic-slug>-3b1b`).
   - The production rules of section 3: keep them unless the user changes them.

**Grill, do not just collect.** Push back on:
- Vague answers: "the basics" becomes which definitions, which theorem, which proof.
- Conflicts: twenty minutes of content in six.
- Claims the user wants in that cannot be checked.

Ask one follow-up per unclear item.

**Close with a brief** and wait for a clear yes. The brief covers: topic, audience, length and word budget, language, series, example and data sources, style and 3D, voice and estimated characters, deliverables and folder. If memory is available, save the answers that will hold for future videos (voice, style, rules).

## 2. Plan: concept map, length, storyboard
**Concept map.** The video must teach the topic in full, never skim it. Before writing, list:
1. The motivating problem.
2. Every definition and assumption.
3. The main result and its precise statement.
4. Why it is true: a proof or constructive derivation shown step by step, not just asserted.
5. At least one fully worked numeric example.
6. Failure modes, edge cases and common misconceptions, including what a quantity does not mean.
7. How it connects to neighbouring ideas.

Every item must appear in the script. Skipping item 4 is the usual way a video turns superficial.

**Length.** It is set by the topic, between 6 and 20 minutes; do not pad a small topic or cram a large one.
- The newest ElevenLabs voices speak at a fixed pace, about 145 words per minute for the narrator this kit was calibrated on. With pauses, plan about 140 words per minute of video: in part 4 of the Game Theory series, 2,441 words came to 17:29.
- That gives 6 min ≈ 840 words, 10 min ≈ 1,400, 15 min ≈ 2,100 and 20 min ≈ 2,800.
- Each scene runs 1.5 to 2.5 minutes, up to about ten scenes.
- Calibrate on the voice test (section 9) before fixing the final length.

**Storyboard, then wait for approval.** Do this before any scene code. For each concept, give:
- The visual idea that explains it without audio.
- What transforms into what.
- The memorable moment.
- Whether it is 3D.
- The real data it uses, with source and verification status.

Show it in chat and later save it as `docs/storyboard.md`.

**In a series,** open with one sentence linking to the previous part and close by teasing the next.

## 3. Production rules (defaults; the grilling session may change them)
- Each concept must be understood without audio. If a scene only works by reading its text, redesign it.
- Objects transform. Appearing and disappearing is not the main device.
- At most 12 words on screen at once: labels and titles count, numbers and formulas do not. No text cards except titles. The kit's `NarratedScene` counts the words at every cue and logs `WORDS` when there are more.
- Show cause and effect live, and compare cases side by side.
- Use real data whenever possible. Check it against primary sources and say what stays unverified. Keep the measurement scripts and their outputs in `data/`.
- After rendering, review the frames, score each scene from 1 to 10, redo every scene under 7, and tell the user what could not be checked.

## 4. Start from the kit in this skill's folder
The skill carries its own kit in `kit/`, next to this file. `<skill-folder>` is the skill's base directory, shown when the skill loads. The kit is generic and was tested end to end on its example scenes.

**Copy it into the project folder:**

```bash
mkdir -p ~/Downloads/<topic-slug>-3b1b && cp -R <skill-folder>/kit/. ~/Downloads/<topic-slug>-3b1b/
```

**Write per video:**
- `narration/script.py`: replace the example segments.
- `scenes/video.py`: keep the BASE section, and replace the example scenes with `S01Name`, `S02Name`, ... in script order. The file name stays `scenes/video.py`, and the build scripts find the scenes by that pattern.
- `youtube.json`: fill in the template. For a series, add `series`, `part` and `series_total`; for a standalone video, `badge` labels the thumbnail.
- `data/`: data and measurement scripts, with their outputs.
- `README.md`: adapt it to the project.

**Set the defaults** at the top of `build/make_video.sh` (voice id, newest model, language, Python environment), then run `bash -n build/make_video.sh`.

**Python environment:** it can be shared between projects. Point `VENV` in `make_video.sh` to it, for example `../nash-equilibrium-3b1b/.venv` with Manim 0.22.

**Improvements:** if a later project improves a kit file, copy the improvement back into `kit/` so the next video starts from it.

## 5. The six acts
1. Hook: a visual paradox shown before any notation.
2. Geometric translation: coordinates, simplex, landscape, graph or tree, in 3D when the object has real depth (section 8).
3. Formal definition in clean LaTeX, highlighted in step with the narration.
4. Mechanical walkthrough: the mechanism running step by step, with numbers.
5. Nuance: a misconception, failure mode or edge case, plus what a quantity does not mean.
6. Takeaway: one unified picture, then a short hold.

For 12 to 20 minutes, split the acts into more scenes, each a separate Manim class. Pick one running example with small or real numbers, and reuse it in acts 2, 4 and 6.

## 6. Write the script (`narration/script.py`)
`SEGMENTS` is a list of dicts with:
- `id`: s1a, s1b, ... (act number plus letter).
- `scene`: the class name.
- `text`: what the narrator says.
- `pause_after`: seconds of silence after the segment.
- `guide`: notation and pronunciation notes.

Rules for the text:
- **Write everything as spoken.** Maths: "alpha p plus one minus alpha q". Numbers: "thirty-eight point five percent". Dates: "nineteen twenty-eight". Use full names, no abbreviations, and spell letter-by-letter acronyms with hyphens ("P-P-A-D").
- **Pauses.** The newest models ignore `<break>` tags, so a `{pause}` inside a segment is lost. End the segment where the pause belongs and give it a `pause_after`: 0.3 to 0.8 s, about 1.0 s at the end of a scene.
- **Cues.** Every word a visual cues on must be in its segment. `cue(seg, word, n)` waits for the n-th occurrence, so look for earlier occurrences of the same word. In part 4, "every" first appeared in "hard every time" and a sweep started 7 s early.
- Never write "as you can see"; the animation does the showing. Be grounded, conversational and rigorous.

## 7. Write the scenes (2D)
One `NarratedScene` subclass per scene, all in `scenes/video.py`, below the kit's BASE section. `NarratedScene` is a `ThreeDScene` that starts flat, so the same class serves 2D and 3D scenes (section 8).

**Look:** background `#0e1117`; palette Blue `#3B82F6`, Green `#10B981`, Yellow `#FBBF24`, Pink `#F43F5E`, White `#F3F4F6`, grey `#9CA3AF`. Keep colour roles constant through the video, for example green = best or guaranteed, pink = worst or failed, yellow = equilibrium or value.

**Sync API** (reads `narration/manifest.json`): `self.at(seg)`, `self.cue(seg, word, n=1)`, `self.speech_end(seg)`, `self.until(seg)`, `self.finish()`, and `self.left(seg)` (the seconds until that segment's speech ends, for slow continuous moves).
- Each beat is `self.cue(...)` followed by the animation.
- The animations between two cues must fit in the gap. The render logs `visuals are Xs behind the narration` when they do not, so shorten the `run_time`s there.

**Layout rules:**
- Reserve zones: titles at the top (y > 3.0), captions at the bottom (y < -3.0). Keep diagram labels out of them.
- Prefer `next_to`, `arrange`, `to_edge` and `to_corner` over typed coordinates. When two groups share a scene, give each its own x-range.
- Fade out or move earlier groups before a later beat reuses their space.
- `MathTex` rejects `\color[HTML]{...}`. Split the formula into parts and colour them with `set_color`.
- Render each scene at `-ql` and inspect frames with `build/qa_frames.py` before any 4K render.

## 8. 3D scenes: use them where depth carries meaning
3D is more impressive, but it must explain something, never decorate. Decide it per concept in the storyboard.

**Good in 3D:**
- A function of two variables: the expected payoff over two mixes is a saddle, and its two shadows are the maximin tent and the minimax valley.
- Polytopes and linear programs: a roof of planes over a simplex, with water rising until one point is left.
- Growth you can stack: a stepped pyramid, one layer per step.
- Physical metaphors: pillars under a slab that tilts when values differ, tiles that rise or sink, cards that flip.
- Surfaces in a cube, and a path receding to the horizon.

**Keep in 2D:** tables, formulas, and charts with axes and data labels. Tilted numbers read worse, so pin them as a heads-up layer beside the 3D object.

**Bridge 2D and 3D by transformation, not by cuts.** Start the 3D scene flat (`phi = 0`) so the 2D drawing is the floor, then tilt the camera while the object rises. Examples: a heatmap rises into a landscape; table numbers become corner pillars, then a stretched sheet.

**Working code:**
- The kit's `scenes/video.py` BASE section already has `NarratedScene` (a `ThreeDScene` with `pin`, `hud_redraw`, `face_camera` and `cam`), plus `face3d`, `box3d`, `Sheet`, `param_sheet` and `clip_poly`. Its example `S02Example3D` raises a flat colour map into a landscape while the camera tilts.
- Earlier projects in `~/Downloads/*-3b1b/`, when there are any, hold fuller examples: reuse their scene code.

**Implementation** (Manim CE 0.22, Cairo renderer):
- **Base class:** `NarratedScene` subclasses `ThreeDScene` and keeps the same sync API. Start at `phi=0, theta=-90°` so all 2D code works unchanged. Move with `self.move_camera(phi=..., theta=..., zoom=..., focal_distance=..., frame_center=..., added_anims=[...])`.
- **Overlays while the camera is tilted** (titles, numbers, formulas, tables): `self.camera.add_fixed_in_frame_mobjects(m)` registers an overlay without adding it, so `FadeIn` and `Write` still work. An `always_redraw` overlay must re-register its new submobjects every frame (the `hud_redraw` helper). Otherwise they are projected into the world: a counter showed "1²" instead of "12".
- **Labels attached to a 3D object:** `self.camera.add_fixed_orientation_mobjects(m)` keeps them at their 3D position, facing the camera. A plain `Text` placed in the world gets sheared.
- **`frame_center`:** a value in x or y also shifts every overlay, because the camera caches its Cairo context. Move it only in z, or slide the world sideways with part 5's `ShiftCamera` (`screen_shift`).
- **Depth sorting:** call `set_shade_in_3d(True)` on every face so it is sorted by depth. Non-shaded mobjects are drawn last, on top: use that for paths, highlight lines and water. Lift an overlay 0.02 above its surface so the two do not flicker.
- **Build the faces yourself:**
  - `box3d`: a box with five faces.
  - `Sheet`: a height field whose quads move in place with `set_points_as_corners` (rebuilding a `Surface` every frame is slow).
  - `param_sheet`: parametric surfaces.
  - `clip_poly` (Sutherland–Hodgman): polytope facets and water cross-sections.
- **Z scale:** take it from the data's real range. A 16% cell once put a roof under the floor because the scale started at 50.
- **Shadows and silhouettes:** `phi=90°` with `focal_distance` around 60 to 70, which is almost orthographic. Then turn `theta` by 90° for the other shadow.
- **Ambient rotation** (`begin_ambient_camera_rotation`, rate 0.03 to 0.16): only for an object at the world origin, because an off-centre object swings out of frame.

**Cost:**
- Cairo draws 3D in software. A static camera is cheap, because static mobjects are cached in one image. A moving camera redraws every face on every frame, so move it in short bursts.
- Keep each scene under about 5,000 faces (a 40×40 sheet is 1,521 quads). Rotate continuously only in light scenes of a few hundred faces.
- Time a 4K slice before promising a duration: `manim -qk -n 20,24 scenes/<file>.py <Scene>`. In part 4, a 6.5 s slice of the saddle took 36 s.
- 3D does not make the files big: 17:29 at 4K60 came to 144 MB.
- In the frame review, check the end of every camera move for labels cut off at the frame edge, faces popping through each other, and overlays hidden behind surfaces.

## 9. Narration with the newest ElevenLabs model
**Use the newest text-to-speech model.**
- Before narrating, confirm which model is newest on the ElevenLabs models page or changelog. Alternatively, on the user's computer, call `GET /v1/models` and take the newest one with `can_do_text_to_speech`.
- In November 2026 that is `eleven_v4`, released on 28 September 2026. Use the standard variant for narration, not Turbo.
- Write the model id into `build/make_video.sh`.

**What changes with `eleven_v4`:**
- No `<break>` tags, no `speed` and no `style`. Send only stability 0.5 and similarity 0.8, which is what `narrate.py --model eleven_v4 --no-speed` does.
- The voice sets the pace; adjust the word budget, not the speed.
- `POST /v1/text-to-speech/{voice_id}/with-timestamps` works with v4 and returns character alignment. The docs do not say so; it was verified in November 2026.
- Requests take up to 10,000 characters.
- Pass `--language` with an ISO 639-1 code.

**The API key:**
- The user types it only into `build/make_video.sh`, which reads it hidden and keeps it inside that one process. It never goes into the chat, a file, a command line or a log.
- If the user pastes a key in the chat, do not use it, and ask them to rotate it.

**Voice test first.** The script narrates and plays the first segment, and the user approves before the full run. Claude cannot hear audio, so say that the user must judge the voice.

**Who runs it:**
- If you can drive the user's terminal (the Terminal panel in Claude Code), launch the script there and read its output.
- Otherwise, hand over the commands from section 12.
- Unchanged segments are cached, so re-running never pays twice.

## 10. Render, review, package
**Where you can run Manim** (Claude Code on the user's Mac):
1. Render every scene at `-ql` with the estimated manifest, review the frames and fix.
2. Narrate.
3. Re-render at `-ql` with the real timings and clear every `behind` and `WORDS` warning.
4. Render in 4K.
5. Review the 4K frames, score each scene, redo every scene under 7, and re-assemble.
6. Report the per-scene drift that `assemble.py` prints.

**In a sandbox without Cairo or Pango,** run only the static checks: `python -m py_compile`, `python narration/timing.py --check scenes/<file>.py`, and a dry run of the assembly. Say plainly that the scenes were not rendered.

**Long renders:**
- Keep the Mac awake with the lid open. `caffeinate -i` only stops idle sleep: in part 4 the Mac slept through the night and a 4K render took 7.6 hours of wall time. `make_video.sh` uses `caffeinate -dims`.
- Warn the user with an estimate measured on a slice.

**macOS setup (first time only):**
1. `brew install ffmpeg pkg-config cairo pango`
2. MacTeX: `brew install --cask mactex-no-gui`. If the checksum fails, run `brew cleanup --prune=all mactex-no-gui` and retry.
3. `eval "$(/usr/libexec/path_helper)"`
4. `python3 -m venv .venv` and `pip install -r requirements.txt`. Manim 0.22 works on Python 3.15.

**Captions:** Homebrew's ffmpeg has no libass, so `build/burn_subs.py` draws burned captions with Pillow, in a band under the picture. Always provide `subtitles.srt` as well.

**Master file:** libx264 `-preset slow -crf 18 -pix_fmt yuv420p`, AAC 256k, `-movflags +faststart`. Check 3840×2160 at 60 fps with ffprobe.

**Documents:** save `docs/storyboard.md` and `docs/voiceover_script.md` (with `[mm:ss]` cues and pronunciation guides) in the project.

### YouTube package (when the user wants it)
Write `youtube.json` and run `python build/youtube_package.py`. It reads the measured manifest and writes `build/out/youtube/`: `title.txt`, `description.txt`, `tags.txt`, `thumbnail.png` and `upload_checklist.md`.

**Fields of `youtube.json`:**
- `title` and `alt_titles[]`.
- `hook`, `subtitle`, `motif` and `accent` (for the thumbnail).
- `intro` and `chapters[]` (exactly one per scene, in order).
- `keywords[]`, `extra_tags[]` and `hashtags[]` (3).
- `prerequisites` and `references[]`.
- Optional: `series`, `part`, `series_total`, `prev_url`, `next_url`, `disclosure`.

**Content rules:**
- **Title:** search keywords first (what a student types), under about 70 characters, plus 2 alternatives.
- **Description** (under 5,000 characters):
  - a 2 to 4 sentence keyword-rich intro;
  - chapters, the first at `0:00`, at least 3, each at least 10 s, titled as search phrases;
  - the series line and prerequisites;
  - topics, then references;
  - the disclosure that the narration is ElevenLabs-generated and the animations are Manim;
  - 3 hashtags.
- **Tags:** up to 500 characters.
- **Upload:** closed captions from `subtitles.srt`; answer YouTube's altered or synthetic content question honestly.

**Thumbnail** (`build/thumbnail.py`, 1280×720), identical within a series:
- background `#0e1117` with a faint grid;
- a badge with the series name (or a short subject label) and, in a series, a yellow pill with the part number;
- a hook of at most 3 short lines in white Latin Modern Roman Bold, with one yellow accent word (`*word*`, lines separated by `|`);
- a blue subtitle;
- one glowing motif on the right (`simplex`, `payoff`, `curve`, `tree`, `network`, `bipartite`).

The hook is a question or a bold claim, never the full title. Always view the PNG, and shorten the hook if it crowds the motif.

**Existing series:** earlier parts are in `~/Downloads/*-3b1b/youtube.json`.

**In the reply,** paste the title, description and tags, and send the thumbnail as a file. Chapter times are final only after narration.

## 11. What the kit contains
- **`narration/timing.py`:**
  - estimates word times (from `WPM` in the script) and builds `manifest.json`: `segments[]` with `id, scene, start, speech_end, end, duration, pause_after, audio, words[{w,t}]`, and `scenes[]`; `source` becomes `elevenlabs` once measured;
  - exports `docs/voiceover_script.md`;
  - `--check scenes/video.py` validates every `cue(seg, word, n)`.
- **`narration/narrate.py`:**
  - resolves the voice by name or id and synthesizes each segment with `/with-timestamps` (retrying on 429 and 5xx);
  - caches by a hash of text, voice, model and settings, so nothing is paid twice;
  - accepts `--model` (default `eleven_v4`), `--language`, `--no-speed` and `--only`;
  - drops settings a model rejects;
  - writes the measured words and the manifest.
- **`narration/subtitles.py`:** SRT cues from word timestamps.
- **`scenes/video.py`:** the BASE section (palette, sync API, word counter, 2D and 3D helpers) plus two example scenes.
- **`build/render_par.sh`:**
  - renders the scenes of `scenes/video.py` in parallel, each process with its own media folder, and prints `ok`/`FAIL` per scene;
  - `QUALITY=l|m|h|k`, `JOBS=n`, and an optional list of scenes.
- **`build/assemble.py`:**
  - takes the scene order from the manifest;
  - pads each segment with `apad=pad_dur=pause_after`;
  - concatenates the scene videos with `-c copy`;
  - prints the per-scene drift and muxes with AAC.
- **`build/qa_frames.py`** and **`build/contact_sheet.py`:** frame grids for the visual review.
- **`build/youtube.sh`:** writes the master and `subtitles.srt`; `BURN=1` adds `final_youtube_subs.mp4` with captions drawn by `burn_subs.py`.
- **`build/youtube_package.py`** and **`build/thumbnail.py`:** title, description, tags, checklist and thumbnail, for a series or a standalone video.
- **`build/make_video.sh`:** the whole build. In order, it:
  1. activates the environment;
  2. reads the key hidden;
  3. runs the voice test and waits for Enter;
  4. narrates everything and checks the cues;
  5. renders in 4K with `caffeinate -dims`;
  6. assembles, encodes the master and builds the YouTube package.

  Options: `SKIP_NARRATION=1` reuses the narration with no key needed, `SCENES="..."` re-renders only some scenes, and `BURN=1` adds burned captions.
- **`youtube.json`** and **`README.md`:** templates.

## 12. Always finish with the exact commands
End every delivery with the YouTube package (if requested), then these commands. Fill in the real folder, and put each command in its own `bash` block.

```bash
cd ~/Downloads/<project-folder>
```

```bash
bash build/make_video.sh
```

Explain in a few lines what happens:
- It asks for the ElevenLabs key: paste it and press Enter. Nothing is shown, and the key is not saved anywhere.
- It plays a test sentence; press Enter to narrate the whole script, or Ctrl-C to stop.
- Then it renders in 4K. Give the time estimate measured on a slice, and say to keep the lid open.
- It leaves `build/out/final_youtube.mp4`, `build/out/subtitles.srt` and `build/out/youtube/`.

Add the re-run commands. To rebuild without paying for narration again, for example after editing scenes:

```bash
SKIP_NARRATION=1 bash build/make_video.sh
```

To re-render only some scenes and rebuild the video:

```bash
SKIP_NARRATION=1 SCENES="S03Name S09Name" bash build/make_video.sh
```

Then list what to upload:
- `final_youtube.mp4` plus `subtitles.srt`, or `final_youtube_subs.mp4` when the captions are burned in (`BURN=1`);
- `build/out/youtube/thumbnail.png`;
- the text in `title.txt`, `description.txt` and `tags.txt`.

Remind the user to rotate any API key that was ever pasted into a chat or a terminal log.
