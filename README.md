<a href="#quick-start">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.svg">
    <img alt="jsolee-kit: workflow, house rules, references and mods so Claude stops shipping the AI-made look" src="assets/banner-light.svg" width="100%">
  </picture>
</a>

<p align="center">
  <a href="https://github.com/Jsolee/jsolee-kit/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/Jsolee/jsolee-kit?style=flat-square&labelColor=0E0E0E&color=E5482D"></a>
  <img alt="Claude Code" src="https://img.shields.io/badge/Claude_Code-skill_%2B_mods-F2EEE6?style=flat-square&labelColor=0E0E0E">
  <img alt="31 skills" src="https://img.shields.io/badge/skills-31-F2EEE6?style=flat-square&labelColor=0E0E0E">
  <img alt="19 references" src="https://img.shields.io/badge/references-19-F2EEE6?style=flat-square&labelColor=0E0E0E">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-F2EEE6?style=flat-square&labelColor=0E0E0E"></a>
  <a href="#contributing"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-F2EEE6?style=flat-square&labelColor=0E0E0E"></a>
</p>

<p align="center">
  <a href="#quick-start"><b>Quick start</b></a> ·
  <a href="#does-it-make-a-difference">Examples</a> ·
  <a href="#the-workflow">Workflow</a> ·
  <a href="#house-rules">House rules</a> ·
  <a href="#ship-checklist">Checklist</a> ·
  <a href="#reference-library">References</a> ·
  <a href="#skill-map">Skill map</a> ·
  <a href="#mods">Mods</a> ·
  <a href="#prompts-to-try">Prompts</a> ·
  <a href="#faq">FAQ</a>
</p>

<br>

Models got good at landing pages. They still drift to the same tells: a pill that says "New" above the headline, two buttons where one would do, four accent colors, em dashes all over the copy, nothing you'd remember. Each one is small. Together they're why a page feels generated.

**jsolee-kit is how I catch them.** It's the skill I load for frontend work in Claude Code: a six-step workflow, eleven house rules, a ship checklist, 19 reference sites sorted by the section you're designing, and a map of the 31 skills I actually use, each linked to its source. It also ships the mod I built to watch Claude's subagents work. [Here's the difference it makes](#does-it-make-a-difference) on the same prompt.

It's opinionated on purpose. Fork it and make the rules yours.

<a href="assets/demo.mp4">
  <img alt="24-second demo: the same prompt built with and without the kit, then the comunitat crabs" src="assets/demo.jpg" width="100%">
</a>
<p align="center"><sub>▶ <a href="assets/demo.mp4">Watch the 24-second demo</a>, with sound</sub></p>

<a href="#does-it-make-a-difference">
  <img alt="Four pages Claude built with the kit: a landing, a pricing page, a dashboard and a portfolio" src="assets/gallery.png" width="100%">
</a>
<p align="center"><sub>Four pages Claude built with the kit, one prompt each. <a href="#does-it-make-a-difference">See them next to the same prompt without it.</a></sub></p>

<br>

## Quick start

Pick one. All three take under a minute.

**1 · The skill alone** (works with any agent the [`skills`](https://github.com/vercel-labs/skills) CLI supports)

```bash
npx skills add Jsolee/jsolee-kit --skill jsolee-kit -g -a claude-code
```

**2 · The skill plus the 31 skills it points to**: impeccable, taste, Emil Kowalski's design engineering, the official GSAP skills, Vercel's guidelines, React / Prisma / Expo patterns from ECC, superpowers…

```bash
curl -fsSL https://raw.githubusercontent.com/Jsolee/jsolee-kit/main/install.sh | bash
```

> [!TIP]
> Never pipe a script you haven't read. [`install.sh`](install.sh) is 30 lines: one `npx skills add` per upstream repo. Comment out what you don't want.

**3 · As a Claude Code plugin**, with the mod

```text
/plugin install jsolee-kit --marketplace Jsolee/jsolee-kit
/plugin install comunitat --marketplace Jsolee/jsolee-kit
```

Answer `y` to add the marketplace, then pick a scope. From a shell, use `claude plugin install <name> --marketplace Jsolee/jsolee-kit`. In the desktop app, click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `Jsolee/jsolee-kit`, then **Add plugin**.

Then restart Claude Code and ask for UI work. The skill loads on its own when you ask to design, redesign or polish an interface, or when you ask for inspiration. You can also call it by name: `/jsolee-kit`.

<details>
<summary><b>Installing it for a whole team</b></summary>
<br>

Drop `-g` and the skills land in the project instead of your home folder. Add `--copy` so they're real files you can commit:

```bash
npx skills add Jsolee/jsolee-kit --skill jsolee-kit -a claude-code --copy
```

Everyone who clones the repo gets the same rules, without installing anything.

</details>

<br>

## Does it make a difference?

Four prompts, same model (Claude Opus 5.5), one run each, nothing cherry-picked. The pages on the left are good: today's models don't ship the indigo gradient anymore. What the kit changes is what a page leads with and what it leaves out. Every page is in [`examples/`](examples), so open them and judge for yourself.

### A landing page

<p align="center">
  <img alt="Fieldnote landing page built without skills on the left and with jsolee-kit on the right" src="assets/before-after.png" width="100%">
</p>

| | No skills | With jsolee-kit |
|---|---|---|
| Above the headline | a "NEW" pill | nothing |
| Hero actions | two buttons | one button and a text link |
| Color | red underline, green, yellow and pink tags | one committed yellow |
| Em dashes in the copy | 6 | 0 |
| Something to remember | a polished app mockup | the same mockup, with each transcript line wired to the email point it became |

### A pricing page

<p align="center">
  <img alt="Relay pricing page built without skills on the left and with jsolee-kit on the right" src="assets/compare-pricing.png" width="100%">
</p>

| | No skills | With jsolee-kit |
|---|---|---|
| Leads with | "Pay for the texts that arrive" and a request log | "Know the price before you send" and a working calculator: type a message, see its segments and what it costs per plan |
| Proof | a row of numbers the page can't back up (99.99% uptime, 190+ countries) | no proof row |
| Plan badge | a "Best for production" pill | no badge |
| Em dashes in the copy | 12 | 0 |

### A dashboard

<p align="center">
  <img alt="Ledger dashboard built without skills on the left and with jsolee-kit on the right" src="assets/compare-dashboard.png" width="100%">
</p>

The closest of the four: both are clean, and neither has an em dash.

| | No skills | With jsolee-kit |
|---|---|---|
| Top of the screen | four KPI cards with sparklines | one sum: gross sales − refunds = net sales |
| What to do next | three refund requests, in a card | a "Needs you" panel: 7 orders to pack, 2 refund requests, 4 mugs running out, each with its button |
| Status | colored pills | dots, in one accent plus red |

### A portfolio

<p align="center">
  <img alt="Mara Ilić portfolio built without skills on the left and with jsolee-kit on the right" src="assets/compare-portfolio.png" width="100%">
</p>

| | No skills | With jsolee-kit |
|---|---|---|
| Headline | serif and italics, with two decorated underlines | one plain sentence |
| Above the fold | three stats and a row of client logos | the work itself: the first project's dispatch board |
| Em dashes in the copy | 25 | 0 |

**What it costs:** across the four pairs, the runs with the kit used about 1.7× the tokens and 1.8× the time: they read the rules, load design skills and take more passes (41 to 75 tool calls against 2 to 10).

<details>
<summary><b>The prompts</b></summary>

```text
Build a landing page for Fieldnote, an app that records your meetings and writes the follow-up email for you.
Build a pricing page for Relay, an API for sending transactional SMS. Three plans.
Build the main dashboard screen for Ledger, an app where a small online shop owner sees revenue, orders and refunds.
Build a personal portfolio site for Mara Ilić, an independent product designer.
```

Every run got the same constraints: one self-contained HTML file, Tailwind and Google Fonts from a CDN, no images, everything visible on load. The runs on the left were told not to use skills. The runs on the right were told to read the jsolee-kit skill and its references and follow its workflow, house rules and checklist, and could load the design skills it maps. All of them were told not to browse the web.

</details>

<br>

## What's inside

```text
jsolee-kit/
├── skills/jsolee-kit/
│   ├── SKILL.md                 workflow, skill map, house rules, ship checklist, motion tokens
│   └── references/
│       ├── inspiration.md       19 reference sites, sorted by section
│       └── skills.md            every skill and plugin I use, with its source repo
├── plugins/comunitat/           the mod: subagents drawn as crabs, plus a map of the repo
├── examples/                    four pages, each built with and without the kit
├── install.sh                   the kit and the 31 skills, in one go
└── .claude-plugin/              the marketplace behind /plugin install
```

`SKILL.md` stays under 70 lines on purpose. Claude reads it whole on every UI task, and the long lists sit in `references/` until a step needs them.

<br>

## The workflow

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/workflow-dark.svg">
  <img alt="Direction, References, Build, Motion, Polish, Audit" src="assets/workflow-light.svg" width="100%">
</picture>

| Step | What happens | Reach for |
|---|---|---|
| **01 Direction** | Read `PRODUCT.md` / `DESIGN.md` if the repo has them. Decide the register (brand page or product UI), one committed accent per surface, a type pair. No code yet. | `impeccable`, `design-taste-frontend` |
| **02 References** | Two or three sites per section from the [reference library](#reference-library). Write one line per site about what you're taking: layout, rhythm, type or motion. Never copy a page. | `jsolee-kit` references |
| **03 Build** | Real product, real data, real copy. Stack skills for the code. | `react-patterns`, `prisma-patterns`, `react-native-patterns` |
| **04 Motion** | One signature moment, not everything moving. GSAP for scroll and timelines, Motion for component state. | `gsap-scrolltrigger`, `motion-patterns` |
| **05 Polish** | Hit areas, focus states, optical alignment, text wrapping, the details people feel and can't name. | `emil-design-eng`, `make-interfaces-feel-better`, `web-design-guidelines` |
| **06 Audit** | Accessibility, a copy pass that removes sentences that sound like AI, and every claim checked against the product. | `impeccable` audit, `frontend-a11y` |

<br>

## House rules

Each rule is an AI tell I've caught in my own projects, followed by what we do instead.

| The tell | What we do instead |
|---|---|
| Gradient text, buttons that blend two brand colors | One solid color. Emphasis comes from weight and size. |
| Glassmorphism as the default surface | Solid surfaces. `backdrop-filter` only for legibility over a busy image. |
| SaaS pill eyebrows (`bg-color/8` + `border-color/18`) | A small editorial kicker, or nothing. |
| Colored shadows (`shadow-indigo-200`) | `0 1px 3px rgba(0,0,0,.03)` on cards, `0 8px 40px rgba(0,0,0,.08)` when elevated. |
| Cards inside cards, colored side stripes | One surface level. Hierarchy comes from spacing. |
| `rounded-[2.5rem]` bubbles, `rounded-full` cards | `rounded-2xl` cards, `rounded-xl` buttons, `rounded-lg` small parts. |
| Bouncy, elastic easing | Ease-out exponential: `cubic-bezier(0.22, 1, 0.36, 1)`. |
| Indigo-only palette, radial blobs behind every hero | A neutral base and one committed accent per surface. |
| `font-black` on UI text, bold descriptions | One family, two weights, headings at `-0.02em` to `-0.04em`. |
| Hover that swaps colors | Hover that lifts: `-translate-y-0.5`. |
| Em dashes in UI copy | Commas, colons and periods. |

In practice:

```diff
- <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1
-   text-xs font-semibold uppercase tracking-widest text-indigo-600">✨ New</span>
- <h1 className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text
-   text-6xl font-black text-transparent">Supercharge your workflow</h1>
- <div className="rounded-[2.5rem] bg-white/10 backdrop-blur-xl shadow-2xl shadow-indigo-200">
+ <p className="font-mono text-xs text-neutral-500">Now in beta</p>
+ <h1 className="text-6xl font-semibold tracking-[-0.04em] text-neutral-950">
+   Your invoices, sent before lunch</h1>
+ <div className="rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_3px_rgba(0,0,0,.03)]">
```

<br>

## Ship checklist

What I check before a landing goes out. Every item comes from a page I had to fix.

- [ ] The hero headline fits in two lines at 1440 px, and the hero shows the actual product.
- [ ] Sections don't all open with the same eyebrow + giant title + subtitle block.
- [ ] No invented testimonials, logos, ratings or metrics.
- [ ] Prices, trial terms and structured data match what billing actually charges.
- [ ] Skip link and visible focus states.
- [ ] `translate="no"` on brand and person names.
- [ ] Non-breaking spaces between numbers and units (`14&nbsp;MB`).
- [ ] `scroll-margin-top` on anchor targets under a sticky nav.
- [ ] `touch-action` and `overscroll-behavior` wherever scroll is custom.
- [ ] Anything that loops for more than five seconds has a pause control ([WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)).
- [ ] `prefers-reduced-motion` turns the signature moment into a cut.

<br>

## Motion tokens

| Name | Value | Use |
|---|---|---|
| Smooth out | `cubic-bezier(0.25, 0.4, 0.25, 1)` | General reveals |
| Expo out | `cubic-bezier(0.22, 1, 0.36, 1)` | Hero entrances, emphasis |
| GSAP | `power3.out` / `power4.out` | Card entrances / text reveals |

The reveal I reuse everywhere, with [Motion](https://motion.dev):

```tsx
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

<br>

## Reference library

Pick by the section you're designing. Open two or three, write down what you're taking from each, then close the tabs and build.

| Section | Where | What to take from it |
|---|---|---|
| Whole landings | [land-book](https://land-book.com) · [One Page Love](https://onepagelove.com) · [Awwwards](https://www.awwwards.com) | Section order, pacing, how much fits above the fold |
| Heroes | [supahero.io](https://supahero.io) | Headline length, how the product shows in the first screen |
| Navbars | [navbar.gallery](https://www.navbar.gallery) | Scroll states, mobile menus, where the CTA sits |
| Social proof | [socialproofexamples.com](https://socialproofexamples.com) | Real quotes with faces, roles and numbers |
| Pricing | [pricingpages.design](https://pricingpages.design) | Plan naming, the comparison table, the annual toggle |
| Share images | [ogimage.gallery](https://www.ogimage.gallery) | OG cards that still read at 600 px |
| Email | [reallygoodemails.com](https://reallygoodemails.com) | Transactional and lifecycle emails |
| Decks | [deck.gallery](https://www.deck.gallery) | One idea per slide |
| Social posts | [posts.design](https://posts.design) | Carousel and post layouts |
| Ads | [adfolio.design](https://adfolio.design) | Ad layouts and hooks |

**Motion, 3D and components**

| Where | Why it's here |
|---|---|
| [igloo.inc](https://www.igloo.inc) | One 3D object that transforms with scroll, HUD labels anchored to it with lines. |
| [motionsites.ai](https://motionsites.ai) | Motion-heavy sites; "Particle Self", a bust made of particles. |
| [21st.dev](https://21st.dev) | React components and backgrounds to drop in. |
| [docs.pmnd.rs](https://docs.pmnd.rs) | React Three Fiber and drei. |
| [storytold/effectcraft](https://github.com/storytold/effectcraft) | Open source motion graphics and compositing. |
| [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) | Code-rendered videos and the prompts behind them. The best ones are Three.js with shaders, canvas effects and long, iterated prompts. |

**Guidelines**: [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines), the checklist behind step 05.

<br>

## Skill map

When you need something, this is the skill to reach for.

| You need | Reach for |
|---|---|
| Art direction, critique, audit, polish | [`impeccable`](https://github.com/pbakaus/impeccable), [`design-taste-frontend`](https://github.com/Leonxlnx/taste-skill) |
| Palettes, type pairings, UI styles per product type | [`ui-ux-pro-max`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| Micro-interactions and feel | [`emil-design-eng`](https://github.com/emilkowalski/skills), [`make-interfaces-feel-better`](https://github.com/affaan-m/ECC) |
| Vercel's interface checklist | [`web-design-guidelines`](https://github.com/vercel-labs/agent-skills) |
| Scroll, timelines, text and SVG animation | [`gsap-scrolltrigger`, `gsap-timeline`, `gsap-react`](https://github.com/greensock/gsap-skills) |
| Component and page transitions in React | `motion-foundations`, `motion-patterns` ([ECC](https://github.com/affaan-m/ECC)) |
| Accessibility | `frontend-a11y` ([ECC](https://github.com/affaan-m/ECC)) |
| React and Next.js code and performance | `react-patterns` ([ECC](https://github.com/affaan-m/ECC)), [`vercel-react-best-practices`](https://github.com/vercel-labs/agent-skills) |
| Prisma schemas and queries | `prisma-patterns` ([ECC](https://github.com/affaan-m/ECC)) |
| Expo and React Native | `react-native-patterns` ([ECC](https://github.com/affaan-m/ECC)) |
| A launch video from HTML | [`hyperframes`](https://github.com/heygen-com/hyperframes) |
| A slide deck in the browser | [`frontend-slides`](https://github.com/zarazhangrui/frontend-slides) |
| Plan, debug, prove it works | [`brainstorming`, `systematic-debugging`, `verification-before-completion`](https://github.com/obra/superpowers) |

<details>
<summary><b>The full catalog</b>: everything I have installed, by category</summary>
<br>

★ means `install.sh` installs it. Anything else: `npx skills add <repo> --skill <name> -g -a claude-code`.

**Design and UI**

| Skill | Repo | Use |
|---|---|---|
| ★ impeccable | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Design vocabulary: shape, critique, audit, polish, bolder, quieter |
| ★ design-taste-frontend | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Anti-slop art direction with variance, motion and density dials |
| ★ emil-design-eng | [emilkowalski/skills](https://github.com/emilkowalski/skills) | UI polish and animation decisions |
| ★ ui-ux-pro-max | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Styles, palettes and font pairings per product type |
| design, brand, ui-styling, design-system, slides, banner-design | same repo | Brand identity, tokens, banners, HTML slides |
| ★ web-design-guidelines | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Vercel's interface checklist |
| ★ make-interfaces-feel-better | [affaan-m/ECC](https://github.com/affaan-m/ECC) | Concrete design-engineering details |
| ★ frontend-a11y · accessibility | affaan-m/ECC | WCAG 2.2 for React, Next.js and native |
| liquid-glass-design | affaan-m/ECC | iOS 26 Liquid Glass in SwiftUI |
| ★ frontend-slides | [zarazhangrui/frontend-slides](https://github.com/zarazhangrui/frontend-slides) | Slide decks as web pages |

**Motion and video**

| Skill | Repo | Use |
|---|---|---|
| ★ gsap-* (8 skills) | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | The official GSAP skills: core, timeline, ScrollTrigger, React, plugins |
| ★ motion-foundations · motion-patterns | affaan-m/ECC | Motion tokens and patterns |
| motion-advanced | affaan-m/ECC | Drag, gestures, SVG drawing, `useAnimate` |
| ★ hyperframes · hyperframes-cli | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | HTML rendered to video |
| remotion-video-creation | affaan-m/ECC | Video in React with Remotion |

**Stack**

| Skill | Repo | Use |
|---|---|---|
| ★ vercel-react-best-practices | vercel-labs/agent-skills | Vercel's React and Next.js performance rules |
| ★ react-patterns · react-performance | affaan-m/ECC | Hooks, server/client boundaries, Suspense |
| ★ prisma-patterns | affaan-m/ECC | Schemas, queries, transaction and serverless traps |
| ★ react-native-patterns | affaan-m/ECC | Expo Router, TanStack Query, lists |
| postgres-patterns · database-migrations | affaan-m/ECC | Postgres and migrations |
| swiftui-patterns · swift-concurrency-6-2 | affaan-m/ECC | iOS |
| ★ error-handling | affaan-m/ECC | Typed errors, retries, messages users can act on |
| ★ conventional-commit-review | affaan-m/ECC | Commit messages |

**Workflow**

| Skill | Repo | Use |
|---|---|---|
| ★ brainstorming · systematic-debugging · verification-before-completion | [obra/superpowers](https://github.com/obra/superpowers) | Think before building, debug with method, prove it works |
| writing-plans · executing-plans · test-driven-development · using-git-worktrees | obra/superpowers | Plan and execute larger changes |
| fullstack-guardian · spec-miner · the-fool · debugging-wizard | [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills) | Specialist roles |
| create-plans · debug-like-expert · create-agent-skills | [glittercowboy/taches-cc-resources](https://github.com/glittercowboy/taches-cc-resources) | Planning and writing skills |
| gsd (Get Shit Done) | [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) | Phase-based project execution |
| obsidian-markdown · json-canvas · obsidian-bases | [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | Writing to an Obsidian vault |
| skill-creator · docx · pdf · pptx · xlsx | [anthropics/skills](https://github.com/anthropics/skills) | Writing skills, office files |

</details>

<br>

## Mods

Mods change Claude Code itself: panes beside the chat, bands above the prompt, hooks on every tool call.

### comunitat

<p align="center">
  <img alt="One Claude crab per running subagent, dressed for the tool it is using" src="assets/comunitat-crabs.svg" width="100%">
</p>

My mod. When Claude starts subagents, a panel opens and each one shows up as the Claude crab, **dressed for the tool it's using right now**: a detective reading, a pirate searching, an engineer at the terminal, an astronaut on the web. Next to each crab: its task, the file or command it's on, the model, how long it's been running and how many tools it has used. Finished agents fold into a list marked ✓, ✗ or ■.

`/projecte` opens a second panel: a live map of the repository.

- **Now**: what needs you, each item linked to GitHub. PRs ready to merge, failing CI, changes requested, PRs waiting for review and for how long, unreleased commits, stale branches, merged branches to delete. Also the team (one color per person, git identities merged) and every branch with its task, PR, CI and the agents working on it.
- **History**: the project's whole life on the base branch. Each branch is an arc in its author's color, from its first commit to its merge. Releases sit underneath.

It refreshes every two minutes while open, and fetches from GitHub every ten. Animated crabs in the desktop app, a text version in the terminal and VS Code, and the animations stop when the system asks for reduced motion.

```text
/plugin install comunitat --marketplace Jsolee/jsolee-kit
```

> [!NOTE]
> PR data needs [`gh`](https://cli.github.com) signed in; without it the panel still shows branches.

### Mods I run

Other people's mods I keep on every day.

| Mod | What it does | Install |
|---|---|---|
| **filetree** · [data-goblin](https://github.com/data-goblin/claude-code-filetree) | File tree of the session with git status, lines changed, and a shimmer on files Claude touches | `/plugin install filetree --marketplace data-goblin/claude-code-filetree` |
| **savvy-progress** · [JohnnyVizz](https://github.com/JohnnyVizz/claude-kit) | Progress bar above the prompt and a live agents panel. comunitat's crabs come from here. | `/plugin install savvy-progress --marketplace JohnnyVizz/claude-kit` |
| **cache-tax** · [karanb192](https://github.com/karanb192/claude-code-mods) | Stops a cold send once and shows its price, keeps the one-hour prompt cache warm for as long as you set | `/plugin install cache-tax --marketplace karanb192/claude-code-mods` |
| **ponytail** · [DietrichGebert](https://github.com/DietrichGebert/ponytail) | Forces the laziest solution that works: YAGNI, stdlib first, the shortest diff | `/plugin install ponytail --marketplace DietrichGebert/ponytail` |
| **blast-radius** · [Anthropic playground](https://github.com/anthropics/claude-code-playground) | Holds risky shell commands (`rm -rf`, `reset --hard`, force push, migrations) and shows what they'd change, with Proceed and Cancel | see below |
| **replay-theater** · [Anthropic playground](https://github.com/anthropics/claude-code-playground) | Steps through the file edits of the last turn, one diff at a time | see below |

<details>
<summary>Installing the playground mods</summary>
<br>

Their marketplace lives in a subfolder of the repo, so add it from a clone:

```bash
git clone --depth 1 https://github.com/anthropics/claude-code-playground
```

```text
/plugin marketplace add ./claude-code-playground/claude-code/mods
/plugin install blast-radius@claude-code-playground-mods
/plugin install replay-theater@claude-code-playground-mods
```

</details>

<br>

## Prompts to try

Paste these into Claude Code with the kit installed.

```text
Use jsolee-kit to redesign the hero. Pull three references from supahero and land-book,
tell me in one line what you take from each, then build it.
```

```text
Audit this landing against the jsolee-kit house rules and the ship checklist.
List every violation with file and line, then fix them.
```

```text
Add one signature motion moment to the pricing page with GSAP ScrollTrigger.
Honor prefers-reduced-motion and keep everything else still.
```

```text
I'm about to build an onboarding flow in Expo. Which skills from jsolee-kit should I use, and in what order?
```

<br>

## FAQ

<details>
<summary><b>Does it work with Cursor, Codex or other agents?</b></summary>
<br>

The skill does: `SKILL.md` is plain Markdown, and the `skills` CLI installs it into many agents (drop `-a claude-code` and it asks which). The mods are Claude Code only.

</details>

<details>
<summary><b>Why not copy the 31 skills into this repo?</b></summary>
<br>

Licenses, and freshness. Each skill installs from its author's repo, keeps its license, and stays current with `npx skills update`. This repo only holds what's mine.

</details>

<details>
<summary><b>How do I see or remove what <code>install.sh</code> added?</b></summary>
<br>

`npx skills list` shows what's installed, `npx skills remove <name>` takes one out.

</details>

<details>
<summary><b>Some rules are too strict for my brand.</b></summary>
<br>

They're mine, built from the tells I kept catching in my own projects. Fork the repo, edit `skills/jsolee-kit/SKILL.md`, and install from your fork. The workflow and the checklist hold up whatever your taste.

</details>

<details>
<summary><b>Will it slow Claude down or eat my context?</b></summary>
<br>

The skill is under 70 lines and only loads for UI work. The catalogs in `references/` load only when a step needs them.

</details>

<br>

## Contributing

PRs welcome. For a quick idea, [open a suggestion](https://github.com/Jsolee/jsolee-kit/issues/new?template=suggest-reference.yml) instead. Especially wanted:

- **A reference site**, with one line on what to take from it.
- **A house rule**, with the tell and the fix, ideally as a `diff`.
- **A skill you use every day**, with its repo and when to reach for it.

Keep `SKILL.md` short: if it grows past 100 lines, the extra goes into `references/`.

<br>

## Credits

The skills this kit points to belong to their authors: [Paul Bakaus](https://github.com/pbakaus/impeccable), [Leonxlnx](https://github.com/Leonxlnx/taste-skill), [Emil Kowalski](https://github.com/emilkowalski/skills), [nextlevelbuilder](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [GreenSock](https://github.com/greensock/gsap-skills), [HeyGen](https://github.com/heygen-com/hyperframes), [Vercel](https://github.com/vercel-labs/agent-skills), [affaan-m](https://github.com/affaan-m/ECC), [obra](https://github.com/obra/superpowers), [zarazhangrui](https://github.com/zarazhangrui/frontend-slides), [Jeffallan](https://github.com/Jeffallan/claude-skills), [glittercowboy](https://github.com/glittercowboy/taches-cc-resources), [kepano](https://github.com/kepano/obsidian-skills) and [Anthropic](https://github.com/anthropics/skills). comunitat's pixel crab and its costumes come from [savvy-progress](https://github.com/JohnnyVizz/claude-kit) by johnnyvizz (MIT; the notice is in [`crab.ts`](plugins/comunitat/hooks/crab.ts)).

<br>

## Star history

<a href="https://star-history.com/#Jsolee/jsolee-kit&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Jsolee/jsolee-kit&type=Date&theme=dark">
    <img alt="Star history" src="https://api.star-history.com/svg?repos=Jsolee/jsolee-kit&type=Date" width="100%">
  </picture>
</a>

If the kit saved you from one more indigo gradient, a ⭐ helps other people find it.

<br>

<p align="center">
  <sub>MIT · Made by <a href="https://joan-sole.com">Joan Solé</a>, fullstack developer</sub>
</p>
