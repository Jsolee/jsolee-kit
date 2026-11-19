# -*- coding: utf-8 -*-
"""
narration/script.py — the single source of truth for the voiceover.

Each segment has
  id           short handle the scenes use (self.at / self.cue / self.until): s1a, s1b, ... = scene number + letter
  scene        the scene class in scenes/video.py that owns the segment
  text         what the narrator says, with maths, numbers and dates written out as spoken
  pause_after  seconds of silence after the segment. The newest ElevenLabs models ignore <break> tags,
               so a pause belongs at a segment boundary: end the segment where the pause goes.
  guide        notation and pronunciation notes for the human-readable script (docs/voiceover_script.md)

Replace the EXAMPLE segments below with the real script.
"""

TITLE = "Example video"
SUBTITLE = "One line saying what the video explains"
WPM = 145            # pace for the timing estimate; replaced by real timestamps once narrate.py runs
DEFAULT_PAUSE = 0.6  # seconds, for a bare {pause} (only older models honour pauses inside a segment)

VOICE_DIRECTION = """
Deep, warm, deliberate. A narrator who is thinking alongside the viewer, not lecturing.
Never say "as you can see": the picture does that.
"""

ACT_TITLES = {
    "S01Example": "1 · Example in 2D",
    "S02Example3D": "2 · Example in 3D",
}


def _s(id_, scene, text, pause=0.3, guide=""):
    return dict(id=id_, scene=scene, text=text, pause_after=pause, guide=guide)


SEGMENTS = [
    _s("s1a", "S01Example", "Here is a single point. Watch where it goes: it moves to the right.", 0.4),
    _s("s1b", "S01Example", "And now it becomes a circle.", 0.8),
    _s("s2a", "S02Example3D", "A flat map of colours. Give each colour a height, and the surface rises.", 0.4),
    _s("s2b", "S02Example3D", "The highest point is the peak.", 1.0),
]
