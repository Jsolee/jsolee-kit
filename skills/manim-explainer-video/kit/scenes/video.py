# -*- coding: utf-8 -*-
"""
scenes/video.py — every scene of the video, in one file (the build scripts expect this name).

Keep the BASE section; replace the EXAMPLE scenes with the real ones. Scene classes are named S01Name, S02Name, ...
and appear in the same order as in narration/script.py; build/render_par.sh finds them by that pattern.

Each scene is a NarratedScene: its beats wait on narration cues read from narration/manifest.json.
    self.at(seg)                wait until a segment starts
    self.cue(seg, word, n=1)    wait until the n-th occurrence of a word in that segment is spoken
    self.speech_end(seg)        wait until the speech of a segment ends
    self.until(seg)             wait until a segment and its trailing pause end
    self.left(seg)              seconds until the speech of a segment ends (for slow continuous moves)
    self.finish()               pad the scene to the exact length of its narration

3D: NarratedScene is a ThreeDScene that starts flat (phi = 0), so 2D code works unchanged. Tilt with self.cam(...).
    self.pin(m)                 heads-up overlay: stays fixed in the frame while the camera moves
    self.hud_redraw(fn)         always_redraw for an overlay (re-registers every new submobject)
    self.face_camera(m)         a label that stays at its 3D position and always faces the camera

Preview one scene:   QUALITY=l bash build/render_par.sh S01Example
"""
from __future__ import annotations

import json
import math
import os
import re
from pathlib import Path

import numpy as np
from manim import *  # noqa: F401,F403

try:
    from manim import logger
except ImportError:  # pragma: no cover
    import logging
    logger = logging.getLogger("manim")

# =============================================================================================
# BASE — keep this section
# =============================================================================================
BG = "#0e1117"
BLUE_ = "#3B82F6"
GREEN_ = "#10B981"
YELLOW_ = "#FBBF24"
PINK_ = "#F43F5E"
WHITE_ = "#F3F4F6"
GREY_ = "#374151"
GREY_L = "#9CA3AF"
GRID_ = "#1f2937"

config.background_color = BG
ROOT = Path(__file__).resolve().parent.parent


def mtex(*parts, color=WHITE_, **kw):
    return MathTex(*parts, color=color, **kw)


def cap(text, size=26, color=GREY_L):
    """On-screen words. Every word here counts toward the 12-word limit."""
    return Text(text, font_size=size, color=color)


def glow_dot(point, color, radius=0.09):
    """A dot with a soft halo — the 3b1b 'point' look."""
    return VGroup(Dot(point, radius=radius * 2.6, color=color, fill_opacity=0.18, stroke_width=0),
                  Dot(point, radius=radius, color=color))


def ramp(lo, hi):
    """Colour scale for values in [-1, 1]."""
    a, b = ManimColor(lo), ManimColor(hi)
    return lambda h, i=0, j=0: interpolate_color(a, b, float(np.clip((h + 1) / 2, 0, 1)))


# ----------------------------------------------------------------------------- 3D building blocks
def face3d(corners, color, opacity=1.0, stroke=0.0, stroke_color=None):
    """One flat polygon that depth-sorts with the other 3D faces."""
    f = VMobject(fill_color=color, fill_opacity=opacity, stroke_width=stroke, stroke_color=stroke_color or color)
    f.set_points_as_corners([*corners, corners[0]])
    f.set_shade_in_3d(True)
    return f


def box3d(x0, x1, y0, y1, z0, z1, color, opacity=1.0, stroke=0.6, stroke_color=BG):
    """An axis-aligned box as five faces (the bottom is never seen)."""
    c = lambda x, y, z: np.array([x, y, z], dtype=float)
    faces = [
        [c(x0, y0, z1), c(x1, y0, z1), c(x1, y1, z1), c(x0, y1, z1)],
        [c(x0, y0, z0), c(x1, y0, z0), c(x1, y0, z1), c(x0, y0, z1)],
        [c(x0, y1, z0), c(x1, y1, z0), c(x1, y1, z1), c(x0, y1, z1)],
        [c(x0, y0, z0), c(x0, y1, z0), c(x0, y1, z1), c(x0, y0, z1)],
        [c(x1, y0, z0), c(x1, y1, z0), c(x1, y1, z1), c(x1, y0, z1)],
    ]
    return VGroup(*[face3d(f, color, opacity, stroke, stroke_color) for f in faces])


class Sheet(VGroup):
    """A height field of quads over [x0, x1] x [y0, y1]. Z has shape (nx+1, ny+1).
    set_heights() moves the quads in place, which is much faster than rebuilding a Surface every frame."""

    def __init__(self, Z, x0, x1, y0, y1, color_fn, opacity=1.0, stroke=0.35, stroke_color=BG, **kw):
        super().__init__(**kw)
        self.xs = np.linspace(x0, x1, Z.shape[0])
        self.ys = np.linspace(y0, y1, Z.shape[1])
        self.color_fn = color_fn
        self.faces = []
        for i in range(Z.shape[0] - 1):
            for j in range(Z.shape[1] - 1):
                f = VMobject(fill_opacity=opacity, stroke_width=stroke, stroke_color=stroke_color)
                f.set_shade_in_3d(True)
                self.faces.append((i, j, f))
                self.add(f)
        self.set_heights(Z, recolor=True)

    def set_heights(self, Z, recolor=False, z_offset=0.0):
        xs, ys = self.xs, self.ys
        for i, j, f in self.faces:
            pts = [np.array([xs[a], ys[b], Z[a, b] + z_offset]) for a, b in
                   ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1), (i, j))]
            f.set_points_as_corners(pts)
            if recolor:
                f.set_fill(self.color_fn(float(Z[i:i + 2, j:j + 2].mean()), i, j))
        return self


def param_sheet(fn, u_range, v_range, colour, res=12, opacity=0.8):
    """A parametric surface fn(u, v) -> point, as res x res flat faces."""
    us = np.linspace(*u_range, res + 1)
    vs = np.linspace(*v_range, res + 1)
    g = VGroup()
    for i in range(res):
        for j in range(res):
            g.add(face3d([fn(us[i], vs[j]), fn(us[i + 1], vs[j]), fn(us[i + 1], vs[j + 1]), fn(us[i], vs[j + 1])], colour, opacity, 0.5, BG))
    return g


def clip_poly(points, normal, bound):
    """Sutherland-Hodgman: keep the part of a convex polygon where normal . x <= bound (any dimension).
    Use it for polytope facets (clip a simplex by one half-space per constraint) and water cross-sections."""
    out = []
    n = len(points)
    for i in range(n):
        a, b = np.array(points[i], dtype=float), np.array(points[(i + 1) % n], dtype=float)
        fa, fb = float(np.dot(normal, a)) - bound, float(np.dot(normal, b)) - bound
        if fa <= 0:
            out.append(a)
        if fa * fb < 0:
            out.append(a + (b - a) * fa / (fa - fb))
    return out


# ----------------------------------------------------------------------------- narration sync
def _norm(w: str) -> str:
    return re.sub(r"[^\w']", "", w.lower())


class NarratedScene(ThreeDScene):
    """A scene whose beats wait on the narration manifest. Starts flat (phi = 0) and tilts when depth helps.
    At every cue it counts the words on screen and logs WORDS when there are more than MAX_WORDS."""

    MANIFEST = Path(os.environ.get("NARRATION_MANIFEST", ROOT / "narration" / "manifest.json"))
    MAX_WORDS = 12

    def setup(self):
        try:
            data = json.loads(self.MANIFEST.read_text(encoding="utf-8"))
        except FileNotFoundError:
            raise SystemExit("narration/manifest.json is missing — run `python narration/timing.py` first")
        mine = [s for s in data["segments"] if s["scene"] == type(self).__name__]
        if not mine:
            raise SystemExit(f"no narration segments are assigned to {type(self).__name__}")
        self._t0 = mine[0]["start"]
        self._seg = {s["id"]: s for s in mine}
        self.scene_len = mine[-1]["end"] - self._t0
        logger.info(f"{type(self).__name__}: {len(mine)} narration segments, {self.scene_len:.1f}s "
                    f"(timing source: {data.get('source', '?')})")

    # -- the word limit, checked at every narration beat -------------------------------------------
    def words_on_screen(self):
        seen, words = set(), []
        for top in self.mobjects:
            for m in top.get_family():
                if isinstance(m, Text) and id(m) not in seen:
                    seen.add(id(m))
                    ops = [s.get_fill_opacity() for s in m.submobjects if s.has_points()] or [m.get_fill_opacity()]
                    if max(ops) > 0.1:
                        words += re.findall(r"[^\W\d_][\w'\-]*", m.original_text)
        return words

    def _check_words(self):
        w = self.words_on_screen()
        if len(w) > self.MAX_WORDS:
            logger.warning(f"WORDS {type(self).__name__} t={self.clock:.1f}: {len(w)} on screen: {' '.join(w)}")

    @property
    def clock(self) -> float:
        return float(getattr(self.renderer, "time", 0.0))

    def wait_until(self, t: float):
        self._check_words()
        dt = t - self.clock
        if dt >= 1.0 / config.frame_rate:
            self.wait(dt)
        elif dt < -0.3:
            logger.warning(f"{type(self).__name__}: visuals are {-dt:.2f}s behind the narration "
                           f"(target t={t:.2f}s) — shorten the animations before this point")

    def at(self, seg: str):
        self.wait_until(self._seg[seg]["start"] - self._t0)

    def speech_end(self, seg: str):
        self.wait_until(self._seg[seg]["speech_end"] - self._t0)

    def until(self, seg: str):
        self.wait_until(self._seg[seg]["end"] - self._t0)

    def finish(self):
        self.wait_until(self.scene_len)

    def cue(self, seg: str, word: str, n: int = 1):
        """Wait until the n-th occurrence of `word` is spoken in segment `seg`."""
        s = self._seg[seg]
        key = _norm(word)
        hits = [w for w in s["words"] if _norm(w["w"]) == key]
        if len(hits) < n:
            logger.warning(f"cue {word!r} (#{n}) not found in {seg}; using the segment start")
            self.at(seg)
            return
        self.wait_until(s["start"] - self._t0 + hits[n - 1]["t"])

    def left(self, seg: str) -> float:
        """Seconds from now to the end of the speech of `seg`, for slow continuous moves."""
        return max(0.5, self._seg[seg]["speech_end"] - self._t0 - self.clock)

    # -- 3D bookkeeping ---------------------------------------------------------------------------
    def pin(self, *mobs):
        """Register as fixed in the frame (heads-up overlay) without adding to the scene; FadeIn/Write still work."""
        self.camera.add_fixed_in_frame_mobjects(*mobs)
        return mobs[0] if len(mobs) == 1 else mobs

    def hud_redraw(self, fn):
        """always_redraw for an overlay; keeps every new submobject fixed in the frame."""
        m = fn()
        self.camera.add_fixed_in_frame_mobjects(m)

        def up(mm):
            mm.become(fn())
            self.camera.add_fixed_in_frame_mobjects(mm)
        m.add_updater(up)
        return m

    def face_camera(self, *mobs):
        """Keep at their 3D position while always facing the camera (labels on 3D objects)."""
        self.camera.add_fixed_orientation_mobjects(*mobs)
        return mobs[0] if len(mobs) == 1 else mobs

    def cam(self, phi=None, theta=None, zoom=None, focal=None, center=None, run_time=2.0, added=(), rate_func=smooth):
        """Move the camera (angles in degrees). Keep `center` to z only: an x or y offset also shifts the overlays."""
        kw = {}
        if phi is not None:
            kw["phi"] = phi * DEGREES
        if theta is not None:
            kw["theta"] = theta * DEGREES
        if zoom is not None:
            kw["zoom"] = zoom
        if focal is not None:
            kw["focal_distance"] = focal
        if center is not None:
            kw["frame_center"] = center
        self.move_camera(run_time=run_time, added_anims=list(added), rate_func=rate_func, **kw)

    def clear_all(self, run_time=0.7, keep=()):
        keep = set(id(m) for m in keep)
        gone = [m for m in self.mobjects if id(m) not in keep and not isinstance(m, ValueTracker)]
        if gone:
            self.play(*[FadeOut(m) for m in gone], run_time=run_time)


# =============================================================================================
# EXAMPLE SCENES — replace them with the real ones (same naming pattern: S01Name, S02Name, ...)
# =============================================================================================
class S01Example(NarratedScene):
    """2D: one object transforms on a spoken word."""

    def construct(self):
        self.at("s1a")
        dot = glow_dot(LEFT * 3, BLUE_, 0.14)
        label = cap("one point", 30, WHITE_).next_to(dot, UP, buff=0.4)
        self.play(FadeIn(dot, scale=2), FadeIn(label), run_time=0.8)
        self.cue("s1a", "moves")
        self.play(dot.animate.move_to(RIGHT * 3), label.animate.next_to(RIGHT * 3, UP, buff=0.4), run_time=1.5)
        self.cue("s1b", "circle")
        ring = Circle(radius=1.2, color=YELLOW_, stroke_width=6).move_to(RIGHT * 3)
        self.play(ReplacementTransform(dot, ring), run_time=1.0)
        self.finish()


class S02Example3D(NarratedScene):
    """3D: a flat colour map rises into a landscape while the camera tilts; one overlay, one 3D label."""

    def construct(self):
        n = 21
        x, y = np.meshgrid(np.linspace(0, 1, n), np.linspace(0, 1, n), indexing="ij")
        Z = np.sin(2 * np.pi * x) * np.cos(2 * np.pi * y)
        self.at("s2a")
        title = cap("a landscape", 32, WHITE_).to_edge(UP, buff=0.4)
        self.pin(title)
        sheet = Sheet(Z * 0, -3, 3, -3, 3, lambda h, i=0, j=0: ramp(PINK_, BLUE_)(float(Z[i:i + 2, j:j + 2].mean())))
        self.play(FadeIn(sheet), FadeIn(title), run_time=1.0)
        self.cue("s2a", "rises")
        rise = ValueTracker(0.0)
        sheet.add_updater(lambda m: m.set_heights(Z * 1.2 * rise.get_value()))
        self.cam(phi=62, theta=-120, focal=16, center=np.array([0, 0, 0.4]), run_time=2.0, added=[rise.animate.set_value(1.0)])
        sheet.clear_updaters()
        self.cue("s2b", "peak")
        top = glow_dot([-3 + 6 * 0.25, -3, 1.2 * 1.0 + 0.05], YELLOW_, 0.12)
        tag = cap("peak", 26, YELLOW_).move_to([-3 + 6 * 0.25, -3, 1.75])
        self.face_camera(top, tag)
        self.play(FadeIn(top, scale=2), FadeIn(tag), run_time=0.6)
        self.begin_ambient_camera_rotation(rate=0.1)
        self.finish()
        self.stop_ambient_camera_rotation()
