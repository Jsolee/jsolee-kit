# Logo and brand

From a name to a mark and a one-page system people can apply without asking.

## Workflow

1. **Brief.** What the product does, who it's for, what it must not look like, and every place the mark has to live: favicon, app icon, avatar, email header, slide. Use `brand` for voice, messaging and visual identity.
2. **Pull 2-3 references** from [references/inspiration.md](inspiration.md). Say what you take from each.
3. **Three ideas, in black.** Three different concepts drawn as SVG, each from an idea about the product. Form first, color after. `design` generates logos in 55 styles if `GEMINI_API_KEY` is set; treat those as exploration and redraw the winner as vector.
4. **Test the winner.** At 16 px as a favicon, in one color on light and on dark, next to the wordmark, and as an app icon (`ios-icon-gen`).
5. **Write the system.** Mark, wordmark, lockup, clear space, minimum size, one accent and its neutrals with exact values, a type pair, three lines of voice, a few do's and don'ts. Keep it in `DESIGN.md` and tokens so every later skill reads it.
6. **Apply it.** `banner-design` for social covers and ads, [email.md](email.md) for the email header.

## Rules

- The mark comes from an idea about the product. No swooshes, orbits, hexagons, sparkles, a letter in a rounded square, or an initial with a colored dot.
- The sheet has a point of view too: not the cream page with a serif and mono captions, not yellow and black.
- It works in one color first. No gradients, shadows or strokes that vanish at 16 px.
- The final file is a clean vector with outlined type, never a generated raster.
- Align by eye: geometry that is mathematically centered often looks off.
- One accent, used with intent. Neutrals carry the rest.
- Search existing marks and trademarks before committing to a name or a shape.
