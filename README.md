# jsolee-kit

A Claude Code skill with how I build interfaces: the workflow, which skill to use at each step, the house rules against the "AI-made" look, and the sites I pull references from.

## Install

Just the kit:

```bash
npx skills add Jsolee/jsolee-kit --skill jsolee-kit -g -a claude-code
```

The kit plus the ~30 skills it points to (impeccable, taste, Emil Kowalski, GSAP, Vercel guidelines, ECC React/Prisma patterns, superpowers…):

```bash
curl -fsSL https://raw.githubusercontent.com/Jsolee/jsolee-kit/main/install.sh | bash
```

Restart Claude Code afterwards. Skills install to `~/.claude/skills/`; nothing is vendored here, everything comes from its upstream repo.

## What's inside

- [`skills/jsolee-kit/SKILL.md`](skills/jsolee-kit/SKILL.md): workflow, skill map, house rules, motion tokens.
- [`references/inspiration.md`](skills/jsolee-kit/references/inspiration.md): galleries by section (hero, navbar, pricing, OG, email…) and motion/3D sites.
- [`references/skills.md`](skills/jsolee-kit/references/skills.md): every skill and plugin I use, with its source repo.

Claude loads it on its own when you ask for UI work or inspiration, or call it with `/jsolee-kit`.
