# Skills catalog

What the kit points to and where it comes from. `install.sh` installs the core set (marked ★); the rest install with `npx skills add <repo> --skill <name> -g -a claude-code`.

## Design and UI

| Skill | Repo | Use |
|---|---|---|
| ★ impeccable | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Design vocabulary: shape, critique, audit, polish, bolder/quieter |
| ★ design-taste-frontend | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Anti-slop art direction with variance / motion / density dials |
| ★ emil-design-eng | [emilkowalski/skills](https://github.com/emilkowalski/skills) | UI polish and animation decisions (Emil Kowalski) |
| ★ ui-ux-pro-max | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Styles, palettes, font pairings by product type |
| ★ brand | same repo | Brand voice, visual identity, messaging, style guides |
| ★ design | same repo | Logo generation (needs `GEMINI_API_KEY`), corporate identity, icons, social images |
| ★ banner-design | same repo | Social covers, ads and hero banners |
| ui-styling, design-system, slides | same repo | Tokens, component styling, HTML slides |
| ★ ios-icon-gen | affaan-m/ECC | iOS app icons from SF Symbols or Iconify |
| ★ web-design-guidelines | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Vercel interface checklist |
| ★ make-interfaces-feel-better | [affaan-m/ECC](https://github.com/affaan-m/ECC) | Concrete design-engineering details |
| ★ frontend-a11y, accessibility | affaan-m/ECC | WCAG 2.2 for React / Next.js and native |
| liquid-glass-design | affaan-m/ECC | iOS 26 Liquid Glass in SwiftUI |
| ★ frontend-slides | [zarazhangrui/frontend-slides](https://github.com/zarazhangrui/frontend-slides) | Slide decks as web pages |

## Email

| Skill | Repo | Use |
|---|---|---|
| ★ react-email | [resend/resend-skills](https://github.com/resend/resend-skills) | Build email templates with React components |
| ★ email-best-practices | same repo | Deliverability, compliance, transactional and marketing patterns |
| ★ resend | same repo | Send, receive and manage email through the Resend API |

## Motion and video

| Skill | Repo | Use |
|---|---|---|
| ★ gsap-* (8 skills) | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | Official GSAP: core, timeline, ScrollTrigger, React, plugins |
| ★ motion-foundations, motion-patterns | affaan-m/ECC | Motion (framer-motion) tokens and patterns |
| motion-advanced | affaan-m/ECC | Drag, gestures, SVG drawing, `useAnimate` |
| ★ hyperframes, hyperframes-cli | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | HTML rendered to video |
| remotion-video-creation | affaan-m/ECC | Video in React with Remotion |
| lemo-opuscar | [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | 66 film styles made in code (watercolor, ukiyo-e, satellite briefing, documentary), narrated and scored, with no video model. A plugin: `claude plugin marketplace add lemomo-ai/lemo-opuscar`, then `claude plugin install lemo-opuscar@lemolab`. It keeps its library in `~/lemo-opuscar` and updates it from GitHub on every run |
| onetake | [feitangyuan/onetake](https://github.com/feitangyuan/onetake) | Launch films and feature demos in one continuous take, with a script that fails any beat that just replaces the last. **Noncommercial licence**: a film for a client or a business needs onetake Pro. Install: `git clone https://github.com/feitangyuan/onetake ~/.claude/skills/onetake` |
| gbro-collage-broll | [pyang5166/gbro-collage-broll](https://github.com/pyang5166/gbro-collage-broll) | 5-second halftone paper-collage B-roll for vertical reels, approved in three steps: the idea in words, a still, then the video. Built for Codex: the still needs Codex's `image_gen` and the video a billed `GEMINI_API_KEY`. Docs in Chinese |

## Stack

| Skill | Repo | Use |
|---|---|---|
| ★ vercel-react-best-practices | vercel-labs/agent-skills | Vercel React / Next.js performance rules |
| ★ react-patterns, react-performance | affaan-m/ECC | Hooks, server/client boundaries, Suspense |
| ★ prisma-patterns | affaan-m/ECC | Schema, queries, transaction and serverless traps |
| ★ react-native-patterns | affaan-m/ECC | Expo Router, TanStack Query, lists |
| postgres-patterns, database-migrations | affaan-m/ECC | Postgres and migrations |
| swiftui-patterns, swift-concurrency-6-2 | affaan-m/ECC | iOS |
| ★ error-handling | affaan-m/ECC | Typed errors, retries, user-facing messages |
| ★ conventional-commit-review | affaan-m/ECC | Commit messages |

## Workflow

| Skill | Repo | Use |
|---|---|---|
| ★ brainstorming, systematic-debugging, verification-before-completion | [obra/superpowers](https://github.com/obra/superpowers) | Think before building, debug with method, prove it works |
| writing-plans, executing-plans, test-driven-development, using-git-worktrees | obra/superpowers | Plan and execute larger changes |
| fullstack-guardian, spec-miner, the-fool, debugging-wizard | [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills) | Specialist roles |
| create-plans, debug-like-expert, create-agent-skills | [glittercowboy/taches-cc-resources](https://github.com/glittercowboy/taches-cc-resources) | Planning and skill authoring |
| gsd (Get Shit Done) | [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) | Phase-based project execution |
| obsidian-markdown, json-canvas, obsidian-bases | [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | Writing to an Obsidian vault (Dev-Brain) |
| skill-creator, docx, pdf, pptx, xlsx | [anthropics/skills](https://github.com/anthropics/skills) | Authoring skills, office files |

## Plugins (install with `/plugin` inside Claude Code)

| Plugin | Marketplace | Use |
|---|---|---|
| ponytail | `DietrichGebert/ponytail` | "Lazy senior dev": shortest working diff, no speculative code |
| ECC (agents, commands, hooks) | `affaan-m/ECC` | Reviewers and build resolvers per language (`/react-review`, `/review-pr`) |
| claude-mem | `thedotmack/claude-mem` | Memory across sessions |
