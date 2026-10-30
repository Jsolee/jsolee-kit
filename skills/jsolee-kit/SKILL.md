---
name: jsolee-kit
description: Joan's frontend and fullstack working kit. Which skill to reach for at each step of UI work, where to pull visual references (section galleries, motion and 3D sites), and the house rules that keep interfaces from looking AI-generated. Use when starting or redesigning a landing page, app screen or component; when asked for inspiration, references, "wow factor" or "make it not look AI-made"; when designing an email, a logo or a brand identity; or when choosing between design, animation and stack skills.
---

# jsolee-kit

How we build interfaces: direction first, real references, one signature moment, then polish and audit. Stack: TypeScript, Next.js App Router, React, Prisma + Postgres/Supabase, Expo for mobile.

## Workflow

1. **Direction before code.** Read `PRODUCT.md` / `DESIGN.md` if the repo has them. Write three directions that differ in type, color and layout, each from something true about this product. Throw away the first one you thought of: it's the default. Keep the one a competitor couldn't wear and name it in one line. Then fix the register (brand page vs product UI), one committed color, a type pair. Use `impeccable` (shape, critique) or `design-taste-frontend` (variance / motion / density dials).
2. **Pull 2-3 references per section** from [references/inspiration.md](references/inspiration.md). Say what you take from each one (layout, rhythm, type, motion). Never copy a page.
3. **Build** with the stack skills (see map below).
4. **One signature motion moment**, not everything moving. GSAP for scroll and timelines, Motion for component state. Honor `prefers-reduced-motion`; anything looping more than 5 s gets a pause control (WCAG 2.2.2).
5. **Polish** with `emil-design-eng` and `make-interfaces-feel-better`, then the `web-design-guidelines` checklist.
6. **Audit**: `impeccable` audit, `frontend-a11y`, and a copy pass that removes phrases that sound like AI.

## Skill map

| Need | Reach for |
|---|---|
| Art direction, critique, audit, polish | `impeccable`, `design-taste-frontend` |
| Palettes, type pairings, UI styles by product type | `ui-ux-pro-max` |
| Micro-interactions, feel, details | `emil-design-eng`, `make-interfaces-feel-better` |
| Vercel interface checklist | `web-design-guidelines` |
| Scroll, timelines, text/SVG animation | `gsap-scrolltrigger`, `gsap-timeline`, `gsap-react` |
| Component and page transitions in React | `motion-foundations`, `motion-patterns` |
| Accessibility | `frontend-a11y` |
| React / Next.js code and perf | `react-patterns`, `vercel-react-best-practices` |
| Prisma schema and queries | `prisma-patterns` |
| Expo / React Native | `react-native-patterns` |
| Launch video or motion piece from HTML | `hyperframes` |
| Slide deck in the browser | `frontend-slides` |
| Emails: transactional, lifecycle, launches | [references/email.md](references/email.md), then `react-email`, `email-best-practices`, `resend` |
| Logo and brand identity | [references/brand.md](references/brand.md), then `brand`, `design`, `banner-design`, `ios-icon-gen` |
| Plan, debug, verify | `brainstorming`, `systematic-debugging`, `verification-before-completion` |

Full catalog with source repos: [references/skills.md](references/skills.md).

## The default look

Left alone, today's models converge on one look. If your work could wear it, start over, unless the brand truly calls for it:

- A warm off-white background (`#f5f3ee` and friends), ruled lines or paper grain.
- A serif headline with one phrase in italics or underlined by hand.
- Tiny mono captions, numbered eyebrows, hairline rules, one vermilion dot or underline.
- Nav, headline left, blurb right, an app mockup in a card below.
- Geist, Geist Mono, Inter, Newsreader, Fraunces, Instrument Serif, DM Mono, Schibsted Grotesk, Space Grotesk.
- The usual escape is a default too: a flat yellow field with a black grotesk.

## Commit

Make it obvious from across the room:

- One move you can say in five words, big enough to carry the page: a full-bleed color field, display type above 120 px, a layout that breaks nav-hero-cards, the product filling the first screen.
- One working thing, not a picture of it: a calculator, a live demo, a control that changes the page.
- Type from a specific place: a foundry, an era, a sign, a manual. Not the first font that comes to mind.

## House rules (the anti AI look)

- No gradient text, no gradient buttons mixing two brand colors.
- No glassmorphism or `backdrop-filter` as decoration; only for legibility over busy backgrounds.
- No SaaS pill eyebrows (`bg-color/8` + `border-color/18`); use a small editorial kicker or nothing.
- No colored shadows. Cards `0 1px 3px rgba(0,0,0,0.03)`, elevated `0 8px 40px rgba(0,0,0,0.08)`.
- No nested cards, no colored side-stripe borders, no `rounded-full` cards or `rounded-[2.5rem]` bubbles.
- No bouncy or elastic easing. Ease-out exponential only.
- No indigo-only palette, no decorative radial-gradient blobs on every hero.
- No `font-black` / `font-extrabold` on UI text, no bold descriptions. One family, two weights; headings with negative tracking (`-0.02em` to `-0.04em`).
- One accent for interactive elements. Borders almost invisible (`black/[0.04]`, `black/[0.08]` on hover).
- Hover lifts (`-translate-y-0.5`) instead of color swaps. No uppercase button labels.
- No em dashes in UI copy.

## Before shipping a landing

- The hero headline fits in two lines at 1440 px and the hero shows the actual product.
- Sections do not all open with the same eyebrow + giant title + subtitle block.
- No invented testimonials, logos, ratings or metrics. Prices, trials and structured data match billing.
- Skip link, focus states, `translate="no"` on brand and person names, non-breaking spaces in units, `scroll-margin-top` on anchors, `touch-action` and `overscroll-behavior` where scroll is custom.

## Motion tokens

| Name | Value | Use |
|---|---|---|
| Smooth out | `cubic-bezier(0.25, 0.4, 0.25, 1)` | General reveals |
| Expo out | `cubic-bezier(0.22, 1, 0.36, 1)` | Hero entrances, emphasis |
| GSAP | `power3.out` / `power4.out` | Card entrances / text reveals |

Reveal: `opacity 0 → 1`, `y 32 → 0`, 0.7 s, once, viewport margin `-80px`.
