import type { AgentRow, BranchInfo, Checks, History, LongLine, Member, Merge, PrInfo, PrState, ProjectView, Release } from '../types'

import { COSTUME, CRAB_CSS, crab } from './crab'
import { fit, LABEL, xml } from './model'

// --- reading the repository

export type Run = (argv: string[]) => Promise<{ exitCode: number; stdout: string }>

/** Long-lived lines, from the most stable down; whichever of these the remote has. */
const LONG = ['prod', 'main', 'master', 'stable', 'snapshot', 'develop']
const BASES = ['snapshot', 'develop', 'main', 'master']
const MAX_BRANCHES = 24
const DAY = 86_400_000

/**
 * One key per person across the names git has for them (`anna.puig`,
 * `Anna Puig Serra`): no accents or case, separators as spaces, the first two words.
 */
const rawKey = (name: string): string =>
  splitCamel(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(' ')

let aliases: Record<string, string> = {}

/**
 * A login (`lsoler`) is the same person as the full name it spells from the initial
 * and the surname (`Laia Soler`), when the repository has exactly one such name.
 */
export function setAliases(names: string[]): void {
  const keys = [...new Set(names.map(rawKey))]
  const full = keys.filter(k => k.includes(' '))
  aliases = {}
  for (const login of keys.filter(k => !k.includes(' ') && k.length > 3)) {
    const match = full.filter(k => {
      const [first = '', last = ''] = k.split(' ')
      return login[0] === first[0] && last.length >= 3 && login.includes(last)
    })
    if (match.length === 1 && match[0]) aliases[login] = match[0]
  }
}

export const personKey = (name: string): string => {
  const key = rawKey(name)
  return aliases[key] ?? key
}

/** `NuriaFont` → `Nuria Font`. */
const splitCamel = (name: string): string => name.replace(/([a-z])([A-Z])/g, '$1 $2')

/** The fullest of a person's names: with a space and capitals before a login. */
const nicer = (a: string, b: string): string => {
  const score = (n: string) => (n.includes(' ') ? 2 : 0) + (/[A-Z]/.test(n) ? 1 : 0)
  return score(b) > score(a) || (score(b) === score(a) && b.length > a.length) ? b : a
}

/** How the team strip names someone: their first name, capitalised, even from a login. */
export const firstName = (name: string): string => {
  const first = personKey(name).split(' ')[0] ?? name
  return first.charAt(0).toUpperCase() + first.slice(1)
}

/** `~/code/app` → `/Users/me/code/app`; anything else as it is. */
export const expandHome = (path: string, home: string): string => (home ? path.replace(/^~(?=\/|$)/, home) : path)

export const refOf = (name: string): string => /TG-\d+/i.exec(name)?.[0]?.toUpperCase() ?? ''

export function repoOf(url: string): string {
  const m = /[:/]([^/:]+\/[^/]+?)(?:\.git)?\/?$/.exec(url.trim())
  return m?.[1] ?? ''
}

export function parseRefs(out: string): { name: string; lastAt: number; author: string; subject: string }[] {
  return out
    .split('\n')
    .map(line => line.split('\t'))
    .filter(([ref]) => ref?.startsWith('origin/') && ref !== 'origin/HEAD')
    .map(([ref = '', at = '0', author = '', ...subject]) => ({
      name: ref.slice('origin/'.length),
      lastAt: Number(at) * 1000,
      author,
      subject: subject.join('\t'),
    }))
}

export function parseWorktrees(out: string): Map<string, string> {
  const byBranch = new Map<string, string>()
  let path = ''
  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) path = line.slice('worktree '.length)
    else if (line.startsWith('branch refs/heads/')) byBranch.set(line.slice('branch refs/heads/'.length), path)
  }
  return byBranch
}

type GhPr = {
  number: number
  title: string
  url?: string
  createdAt?: string
  headRefName: string
  author?: { login?: string }
  reviewDecision?: string
  isDraft?: boolean
  statusCheckRollup?: { conclusion?: string | null; status?: string; state?: string }[]
}

export function prOf(pr: GhPr): PrInfo {
  const state: PrState = pr.isDraft
    ? 'draft'
    : pr.reviewDecision === 'APPROVED'
      ? 'approved'
      : pr.reviewDecision === 'CHANGES_REQUESTED'
        ? 'changes'
        : 'review'
  const results = (pr.statusCheckRollup ?? []).map(c => (c.conclusion ?? c.state ?? c.status ?? '').toUpperCase())
  const checks: Checks =
    results.length === 0
      ? 'none'
      : results.some(r => ['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED'].includes(r))
        ? 'fail'
        : results.every(r => ['SUCCESS', 'SKIPPED', 'NEUTRAL'].includes(r))
          ? 'pass'
          : 'pending'
  return { number: pr.number, title: pr.title, author: pr.author?.login ?? '', state, checks, url: pr.url ?? '', createdAt: pr.createdAt ? Date.parse(pr.createdAt) : 0 }
}

const empty = (error: string, at: number): ProjectView => ({
  root: '', repo: '', web: '', base: '', current: '', lines: [], branches: [], members: [],
  history: { start: at, merges: [], releases: [] }, colors: {}, fetchedAt: at, hasGh: false, error,
})

/** The repository's page on GitHub, or empty for any other host. */
export const webOf = (url: string): string => (/github\.com/.test(url) && repoOf(url) ? `https://github.com/${repoOf(url)}` : '')

/** `Merge pull request #35 from org/feature/TG-83-sessio`, `Merge branch 'x' into snapshot`. */
export function parseMerge(subject: string): { pr: number | null; branch: string } {
  const pr = /^Merge pull request #(\d+) from [^/\s]+\/(\S+)/.exec(subject)
  if (pr) return { pr: Number(pr[1]), branch: pr[2] ?? '' }
  const branch = /^Merge (?:remote-tracking )?branch '([^']+)'/.exec(subject)
  return { pr: null, branch: (branch?.[1] ?? subject).replace(/^origin\//, '') }
}

/** Who wrote a span of commits, most commits first, one name per person. */
const byCommits = (names: string[]): string[] => {
  const count = new Map<string, { name: string; n: number }>()
  for (const n of names) {
    const k = personKey(n)
    const c = count.get(k) ?? { name: n, n: 0 }
    c.name = nicer(c.name, n)
    c.n += 1
    count.set(k, c)
  }
  return [...count.values()].sort((a, b) => b.n - a.n).map(c => c.name)
}

const MAX_MERGES = 80

/** Every branch that landed on the base line, and every step down the more stable lines. */
async function historyOf(git: (...args: string[]) => ReturnType<Run>, base: string, longs: string[], now: number): Promise<History> {
  const [mergesOut, root] = await Promise.all([
    git('log', '--first-parent', '--merges', `--max-count=${MAX_MERGES}`, '--format=%H%x09%ct%x09%s', `origin/${base}`),
    git('log', '--max-parents=0', '--format=%ct', `origin/${base}`),
  ])
  const merges: Merge[] = (
    await Promise.all(
      mergesOut.stdout
        .split('\n')
        .map(l => l.split('\t'))
        .filter(([h, at]) => h && at)
        .map(async ([h = '', at = '0', ...subject]) => {
          const { pr, branch } = parseMerge(subject.join('\t'))
          const span = await git('log', '--format=%an%x09%ct', `${h}^1..${h}^2`)
          const rows = span.stdout.split('\n').map(r => r.split('\t')).filter(([n, t]) => n && t)
          const mergedAt = Number(at) * 1000
          const times = rows.map(([, t]) => Number(t) * 1000)
          return {
            pr,
            branch,
            ref: refOf(branch),
            start: Math.min(mergedAt, ...times),
            mergedAt,
            commits: rows.length,
            authors: byCommits(rows.map(([n = '']) => n)),
          }
        }),
    )
  ).filter(m => m.commits > 0)
  const releases: Release[] = (
    await Promise.all(
      longs
        .filter(l => l !== base)
        .map(async line =>
          (await git('log', '--first-parent', '--max-count=50', '--format=%ct%x09%s', `origin/${line}`)).stdout
            .split('\n')
            .map(r => r.split('\t'))
            .filter(([t]) => t)
            .map(([t = '0', ...subject]) => ({ line, at: Number(t) * 1000, subject: subject.join('\t') })),
        ),
    )
  ).flat()
  const firsts = root.stdout.split('\n').filter(Boolean).map(t => Number(t) * 1000)
  const start = Math.min(now, ...firsts, ...merges.map(m => m.start), ...releases.map(r => r.at))
  return { start, merges, releases }
}

/** Everything the pane draws, read from git (and from `gh` where it is installed and signed in). */
export async function collect(run: Run, now: number, fetch: boolean): Promise<ProjectView> {
  const git = (...args: string[]) => run(['git', ...args])
  const top = await git('rev-parse', '--show-toplevel')
  if (top.exitCode !== 0) return empty('no-git', now)
  if (fetch) await git('fetch', '--prune', '--quiet').catch(() => undefined)

  const [head, refsOut, url, trees] = await Promise.all([
    git('rev-parse', '--abbrev-ref', 'HEAD'),
    git('for-each-ref', '--sort=-committerdate', '--format=%(refname:short)%09%(committerdate:unix)%09%(authorname)%09%(subject)', 'refs/remotes/origin'),
    git('remote', 'get-url', 'origin'),
    git('worktree', 'list', '--porcelain'),
  ])
  const refs = parseRefs(refsOut.stdout)
  if (refs.length === 0) return { ...empty('no-remote', now), root: top.stdout.trim() }
  const has = new Set(refs.map(r => r.name))
  const base = BASES.find(b => has.has(b)) ?? refs[0]?.name ?? ''
  const worktrees = parseWorktrees(trees.stdout)
  // Every name git has for the people of this repository, so a login and a full name read as one person.
  setAliases((await git('log', '--max-count=3000', '--format=%an', `origin/${base}`, ...refs.map(r => `origin/${r.name}`))).stdout.split('\n').filter(Boolean))
  // Who landed work on the base line this week: their branches are gone, but they are at work too.
  const landed = parseLanded((await git('log', '--since=7.days', '--no-merges', '--format=%an%x09%ct', `origin/${base}`)).stdout)
  const current = head.stdout.trim()

  // Each long line, and what it holds that the more stable line below it has not got yet.
  const longs = LONG.filter(l => has.has(l))
  const lines: LongLine[] = await Promise.all(
    longs.map(async (name, i) => {
      const r = refs.find(x => x.name === name)
      const below = longs[i - 1]
      const ahead = below ? Number((await git('rev-list', '--count', `origin/${below}..origin/${name}`)).stdout.trim()) || 0 : 0
      return { name, lastAt: r?.lastAt ?? 0, subject: r?.subject ?? '', ahead }
    }),
  )

  const features = refs.filter(r => !LONG.includes(r.name)).slice(0, MAX_BRANCHES)
  const branches: BranchInfo[] = await Promise.all(
    features.map(async r => {
      const [counts, log] = await Promise.all([
        git('rev-list', '--left-right', '--count', `origin/${base}...origin/${r.name}`),
        git('log', '--format=%an%x09%ct', `origin/${base}..origin/${r.name}`),
      ])
      const [behind = 0, ahead = 0] = counts.stdout.trim().split(/\s+/).map(Number)
      const own = log.stdout.split('\n').map(l => l.split('\t')).filter(([n, t]) => n && t)
      return {
        name: r.name,
        ref: refOf(r.name),
        lastAt: r.lastAt,
        lastAuthor: r.author,
        subject: r.subject,
        firstAt: Math.min(r.lastAt, ...own.map(([, t]) => Number(t) * 1000)),
        ahead,
        behind,
        authors: byCommits(own.map(([n = '']) => n.trim())),
        pr: null,
        isCurrent: r.name === current,
        worktree: worktrees.get(r.name) ?? '',
      }
    }),
  )

  // Pull requests, where `gh` is there to ask; without it the pane draws the branches alone.
  let hasGh = false
  const gh = await run(['gh', 'pr', 'list', '--state', 'open', '--limit', '50', '--json', 'number,title,url,createdAt,headRefName,author,reviewDecision,isDraft,statusCheckRollup']).catch(() => null)
  if (gh && gh.exitCode === 0) {
    try {
      const prs = JSON.parse(gh.stdout) as GhPr[]
      hasGh = true
      for (const pr of prs) {
        const b = branches.find(x => x.name === pr.headRefName)
        if (b) b.pr = prOf(pr)
      }
    } catch {
      // ponytail: unreadable output reads as no gh; the branches still draw.
    }
  }

  const history = await historyOf(git, base, longs, now)
  const members = membersOf(branches, now, landed)
  const colors = paletteOf([...members.map(m => m.name), ...history.merges.flatMap(m => m.authors), ...branches.flatMap(b => b.authors)])

  return {
    root: top.stdout.trim(),
    repo: repoOf(url.stdout),
    web: webOf(url.stdout),
    base,
    current,
    lines,
    branches,
    members,
    history,
    colors,
    fetchedAt: now,
    hasGh,
    error: '',
  }
}

export const parseLanded = (out: string): { name: string; at: number }[] =>
  out
    .split('\n')
    .map(l => l.split('\t'))
    .filter(([name, at]) => name && at)
    .map(([name = '', at = '0']) => ({ name, at: Number(at) * 1000 }))

/**
 * Who works where: each author of a branch's own commits, with the branches and
 * their latest activity, and whoever landed work on the base line this week.
 */
export function membersOf(branches: BranchInfo[], now: number, landed: { name: string; at: number }[] = []): Member[] {
  const by = new Map<string, Member>()
  for (const l of landed) {
    const key = personKey(l.name)
    const m = by.get(key) ?? { name: l.name, branches: [], lastAt: 0, landed: 0 }
    m.name = nicer(m.name, l.name)
    m.landed += 1
    m.lastAt = Math.max(m.lastAt, l.at)
    by.set(key, m)
  }
  for (const b of branches) {
    if (b.ahead === 0 || now - b.lastAt > 14 * DAY) continue
    for (const name of b.authors) {
      const key = personKey(name)
      const m = by.get(key) ?? { name, branches: [], lastAt: 0, landed: 0 }
      m.name = nicer(m.name, name)
      m.branches.push(b.name)
      m.lastAt = Math.max(m.lastAt, personKey(b.lastAuthor) === key ? b.lastAt : b.lastAt - 1)
      by.set(key, m)
    }
  }
  return [...by.values()].sort((a, b) => b.lastAt - a.lastAt)
}

/**
 * Which branch an agent works on: the worktree its folder or its last file is in,
 * else the task its description names (TG-83, #35), else the checkout's own branch.
 */
export function branchOfAgent(a: Pick<AgentRow, 'cwd' | 'path' | 'description'>, view: ProjectView): string {
  const where = [a.path, a.cwd].filter(Boolean)
  const tree = view.branches
    .filter(b => b.worktree && b.worktree !== view.root && where.some(p => p === b.worktree || p.startsWith(b.worktree + '/')))
    .sort((x, y) => y.worktree.length - x.worktree.length)[0]
  if (tree) return tree.name
  const ref = refOf(a.description)
  const byRef = ref && view.branches.find(b => b.ref === ref)
  if (byRef) return byRef.name
  const pr = /#(\d+)/.exec(a.description)?.[1]
  const byPr = pr && view.branches.find(b => b.pr?.number === Number(pr))
  if (byPr) return byPr.name
  return view.current
}

// --- words

export function relTime(ms: number): string {
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return `${d} ${d === 1 ? 'day' : 'days'} ago`
}

export const shortBranch = (name: string): string => name.replace(/^(feature|docs|fix|hotfix|release|chore)\//, '')
export const kindOf = (name: string): string => /^(feature|docs|fix|hotfix|release|chore)\//.exec(name)?.[1] ?? ''

export const PR_LABEL: Record<PrState, string> = { approved: 'approved', changes: 'changes requested', review: 'in review', draft: 'draft' }

export type BranchState = 'active' | 'pr' | 'merged' | 'stale'

/** What a branch's dot says: an open PR, merged already (nothing of its own left), quiet for days, or at work. */
export function stateOf(b: BranchInfo, now: number): BranchState {
  if (b.pr) return 'pr'
  if (b.ahead === 0) return 'merged'
  if (now - b.lastAt > 3 * DAY) return 'stale'
  return 'active'
}

export const initials = (name: string): string => {
  const parts = splitCamel(name).replace(/[-_.]/g, ' ').split(/\s+/).filter(Boolean)
  const two = parts.length > 1 ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}` : (parts[0] ?? '?').slice(0, 2)
  return two.toUpperCase()
}

const AVATAR = ['#D97757', '#4F8FD6', '#3B9C5F', '#8A6FD1', '#C9873A', '#C66A8A', '#4FA2A0', '#7F8C3B']
let palette: Record<string, string> = {}

/** Each person a color of their own, in order: no two people share one until there are more people than colors. */
export function paletteOf(names: string[]): Record<string, string> {
  const keys = [...new Set(names.map(personKey))].sort()
  return Object.fromEntries(keys.map((k, i) => [k, AVATAR[i % AVATAR.length] ?? '#888780']))
}

/** The palette the drawings use: the view's, set before they draw. */
export const usePalette = (colors: Record<string, string>): void => {
  palette = colors
}

/** One color per person, the same whichever of their git names a commit carries. */
export const colorOf = (name: string): string =>
  palette[personKey(name)] ??
  AVATAR[[...personKey(name)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % AVATAR.length] ??
  '#888780'

// --- drawing (desktop): each block one SVG, stacked with no gaps so the tree runs on

const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"
const MONO = "ui-monospace,SFMono-Regular,Menlo,monospace"

const LINE_COLOR: Record<string, string> = {
  prod: '#8A6FD1', main: '#8A6FD1', master: '#8A6FD1', stable: '#3B9C5F', snapshot: '#4F8FD6', develop: '#4F8FD6',
}
const DOT: Record<BranchState, string> = { active: '#4F8FD6', pr: '#D97757', merged: '#9A9A96', stale: '#B8B6AE' }
const PR_COLOR: Record<PrState, string> = { approved: '#3B9C5F', changes: '#C77A1F', review: '#8A8A86', draft: '#A8A8A4' }

const CSS = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.m{fill:#9a9a96}.chip{fill:#f1f0ec}.ln{stroke:#e8e7e3}.trunk{stroke:#d4d3ce}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.m{fill:#7d7d79}.chip{fill:#2a2a29}.ln{stroke:#333331}.trunk{stroke:#3d3d3b}}
.pulse{animation:pulse 1s ease-in-out infinite}@keyframes pulse{50%{opacity:.35}}
@media (prefers-reduced-motion: reduce){.pulse{animation:none}}
</style>`

const svg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS}${CRAB_CSS}${body}</svg>`

const avatar = (x: number, y: number, name: string, r = 9): string =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${colorOf(name)}"/><text x="${x}" y="${y + r * 0.36}" text-anchor="middle" font-family="${FONT}" font-size="${r * 0.95}" font-weight="700" fill="#fff">${xml(initials(name))}</text>`

const chipW = (text: string, size = 11): number => Math.round([...text].length * size * 0.58 + 14)

const chip = (x: number, y: number, text: string, color: string, size = 11): string =>
  `<rect x="${x}" y="${y - size - 2}" width="${chipW(text, size)}" height="${size + 8}" rx="${(size + 8) / 2}" fill="${color}" opacity=".14"/><text x="${x + 7}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="600" fill="${color}">${xml(text)}</text>`

export const LINES_H = (n: number): number => 28 + n * 30

/** The long-lived lines as rails, the most stable at the bottom, with what waits to go down each step. */
export function linesSvg(W: number, view: ProjectView, now: number): string {
  const rows = [...view.lines].reverse()
  const H = LINES_H(rows.length)
  let body = `<text class="t" x="0" y="16" font-family="${FONT}" font-size="14" font-weight="700">${xml(view.repo || 'Repository')}</text>`
  rows.forEach((l, i) => {
    const y = 40 + i * 30
    const c = LINE_COLOR[l.name] ?? '#888780'
    body += `<line x1="18" y1="${y}" x2="${W - 8}" y2="${y}" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity=".85"/>`
    body += `<circle cx="18" cy="${y}" r="6" fill="${c}"/>`
    const labelW = chipW(l.name, 11.5)
    body += `<rect x="30" y="${y - 11}" width="${labelW + 4}" height="22" rx="11" class="chip"/>${chip(32, y + 4, l.name, c, 11.5)}`
    const x = 32 + labelW + 12
    const waits = l.ahead > 0 ? `${l.ahead} commits to promote to ${rows[i + 1]?.name ?? ''}` : rows[i + 1] ? `in sync with ${rows[i + 1]?.name}` : ''
    body += `<rect x="${x - 4}" y="${y - 11}" width="${Math.min(W - x - 10, 420)}" height="22" rx="6" class="chip"/>`
    body += `<text class="s" x="${x + 4}" y="${y + 4}" font-family="${FONT}" font-size="11">${xml(fit(`${relTime(now - l.lastAt)}${waits ? ' · ' + waits : ''}`, 11, Math.min(W - x - 22, 400)))}</text>`
  })
  return svg(W, H, body)
}

const CHIP_H = 30
const CHIP_GAP = 8

/** The team's chips, wrapped to the width: where each goes, and the height they take. */
function teamLayout(W: number, members: Member[], now: number) {
  const chips: { x: number; y: number; w: number; m: Member; label: string }[] = []
  let x = 0
  let y = 6
  for (const m of members) {
    const where = m.branches.length > 0 ? `${m.branches.length} ${m.branches.length === 1 ? 'branch' : 'branches'}` : `${m.landed} on base`
    const label = `${firstName(m.name)} · ${where} · ${relTime(now - m.lastAt)}`
    const w = Math.round(34 + [...label].length * 6)
    if (x > 0 && x + w > W) {
      x = 0
      y += CHIP_H + CHIP_GAP
    }
    chips.push({ x, y, w, m, label })
    x += w + CHIP_GAP
  }
  return { chips, H: y + CHIP_H + 6 }
}

export const teamHeight = (W: number, members: Member[], now: number): number => teamLayout(W, members, now).H

/** The team: who has commits of their own on a branch these two weeks, or landed work on the base line. */
export function teamSvg(W: number, members: Member[], now: number): string {
  const { chips, H } = teamLayout(W, members, now)
  const body = chips
    .map(
      c =>
        `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${CHIP_H}" rx="${CHIP_H / 2}" class="chip"/>${avatar(c.x + 15, c.y + 15, c.m.name, 10)}` +
        `<text class="t" x="${c.x + 30}" y="${c.y + 19}" font-family="${FONT}" font-size="11.5">${xml(c.label)}</text>`,
    )
    .join('')
  return svg(W, H, body)
}

export const BRANCH_H = 64

/** One branch off the base line: who works on it, how far it is, its PR, and the crabs of the agents on it. */
export function branchSvg(W: number, b: BranchInfo, agents: AgentRow[], now: number, isLast: boolean, base: string): string {
  const state = stateOf(b, now)
  const dim = state === 'merged' || state === 'stale'
  const trunk = LINE_COLOR[base] ?? '#4F8FD6'
  const crabs = agents.slice(0, 3)
  const crabW = crabs.length * 40 + (agents.length > 3 ? 22 : 0)
  const right = W - crabW - 8
  let body = `<line x1="18" y1="0" x2="18" y2="${isLast ? 24 : BRANCH_H}" stroke="${trunk}" stroke-width="3" opacity=".85"/>`
  body += `<path d="M18 8 C18 24 26 24 38 24" fill="none" stroke="${trunk}" stroke-width="2.4" opacity="${dim ? 0.45 : 0.85}"/>`
  body += `<circle cx="42" cy="24" r="6" fill="${DOT[state]}"${state === 'active' && agents.length ? ' class="pulse"' : ''}/>`
  body += `<g opacity="${dim ? 0.55 : 1}">`
  let x = 56
  if (b.ref) {
    body += chip(x, 28, b.ref, '#4F8FD6')
    x += chipW(b.ref) + 6
  }
  // Right of the title: the PR, or what the branch is if it has none.
  const badge = b.pr
    ? `#${b.pr.number} · ${PR_LABEL[b.pr.state]}${b.pr.checks === 'fail' ? ' · CI ✗' : ''}`
    : state === 'merged'
      ? 'merged · can be deleted'
      : state === 'stale'
        ? 'stale'
        : ''
  const badgeColor = b.pr ? (b.pr.checks === 'fail' ? '#D0453F' : PR_COLOR[b.pr.state]) : '#8A8A86'
  const badgeW = badge ? chipW(badge) : 0
  if (badge) body += chip(right - badgeW, 28, badge, badgeColor)
  const title = shortBranch(b.name).replace(/^TG-\d+-?/i, '') || b.name
  body += `<text class="t" x="${x}" y="28" font-family="${FONT}" font-size="13" font-weight="600">${xml(fit(title, 13, right - x - badgeW - 12))}${b.isCurrent ? '<tspan class="s" font-weight="400"> · here</tspan>' : ''}</text>`
  // Second line: avatars, how far it is from the base, the last commit.
  let ax = 62
  for (const name of b.authors.slice(0, 4)) {
    body += avatar(ax, 46, name, 8)
    ax += 14
  }
  const stats = `↑${b.ahead} ↓${b.behind} · ${relTime(now - b.lastAt)} · `
  body += `<text class="s" x="${ax + 6}" y="50" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(stats)}<tspan font-family="${MONO}">${xml(fit(b.subject, 10.5, Math.max(40, right - ax - 6 - stats.length * 6.2), () => 0.6))}</tspan></text>`
  body += `</g>`
  // The agents at work on it, each crab dressed for what it does now.
  crabs.forEach((a, i) => {
    body += crab(W - crabW + i * 40, 10, a.status === 'running' ? COSTUME[a.activity] : 'plain', a.status === 'running' && a.activity !== 'waiting', 1.15)
  })
  if (agents.length > 3) body += `<text class="s" x="${W - 18}" y="30" font-family="${FONT}" font-size="11">+${agents.length - 3}</text>`
  body += `<line class="ln" x1="56" y1="${BRANCH_H - 0.5}" x2="${W}" y2="${BRANCH_H - 0.5}"/>`
  return svg(W, BRANCH_H, body)
}

/** A one-line summary of an agent placed on a branch, for alt text and the terminal. */
export const agentLine = (a: AgentRow): string => `${a.description || a.type} (${LABEL[a.activity]})`

// --- what needs doing, as Markdown with links

const prLink = (view: ProjectView, pr: PrInfo, label: string): string =>
  pr.url ? `[${label}](${pr.url})` : view.web ? `[${label}](${view.web}/pull/${pr.number})` : label
const branchLink = (view: ProjectView, name: string, label = shortBranch(name)): string =>
  view.web ? `[${label}](${view.web}/tree/${name})` : label
const mdText = (s: string): string => s.replace(/([\\`*_[\]<>|])/g, '\\$1')

/** What to do now, most urgent first: one Markdown line each, linked to GitHub. */
export function attentionOf(view: ProjectView, now: number): string[] {
  const out: string[] = []
  const prs = view.branches.filter(b => b.pr).map(b => ({ b, pr: b.pr as PrInfo }))
  const name = (b: BranchInfo) => mdText(`${b.ref ? b.ref + ' ' : ''}${shortBranch(b.name).replace(/^TG-\d+-?/i, '')}`)
  for (const { b, pr } of prs.filter(x => x.pr.state === 'approved' && x.pr.checks !== 'fail'))
    out.push(`- **Ready to merge** · ${prLink(view, pr, `#${pr.number}`)} ${name(b)}: approved${pr.checks === 'pass' ? ' and CI is green' : ''}`)
  for (const { b, pr } of prs.filter(x => x.pr.checks === 'fail'))
    out.push(`- **CI failing** · ${prLink(view, pr, `#${pr.number}`)} ${name(b)}`)
  for (const { b, pr } of prs.filter(x => x.pr.state === 'changes'))
    out.push(`- **Changes requested** · ${prLink(view, pr, `#${pr.number}`)} ${name(b)}, by ${mdText(firstName(b.lastAuthor))}`)
  for (const { b, pr } of prs.filter(x => x.pr.state === 'review' && x.pr.checks !== 'fail'))
    out.push(`- **Needs review** · ${prLink(view, pr, `#${pr.number}`)} ${name(b)}${pr.createdAt ? `, opened ${relTime(now - pr.createdAt)}` : ''}`)
  const [stable, base] = [view.lines.at(-2), view.lines.at(-1)]
  if (stable && base && base.ahead > 0)
    out.push(`- **Release pending** · ${base.name} has ${base.ahead} commits not yet in ${stable.name}`)
  for (const b of view.branches.filter(x => stateOf(x, now) === 'active' && x.behind > 20))
    out.push(`- **Behind** · ${branchLink(view, b.name, name(b))} is ${b.behind} commits behind ${view.base}`)
  const gone = view.branches.filter(x => stateOf(x, now) === 'merged')
  if (gone.length)
    out.push(`- **To delete** · ${gone.length === 1 ? 'one merged branch' : `${gone.length} merged branches`}: ${gone.map(b => branchLink(view, b.name, name(b))).join(', ')}`)
  return out
}

const dayMonth = (t: number): string => {
  const d = new Date(t)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
const hourMin = (t: number): string => {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** The latest branches to land, newest first, linked to their PRs. */
export function mergesMarkdown(view: ProjectView, max = 8): string {
  return view.history.merges
    .slice(0, max)
    .map(m => {
      const pr = m.pr === null ? '' : view.web ? `[#${m.pr}](${view.web}/pull/${m.pr}) ` : `#${m.pr} `
      const title = mdText(`${m.ref ? m.ref + ' ' : ''}${shortBranch(m.branch).replace(/^TG-\d+-?/i, '')}`)
      const who = m.authors.map(firstName).slice(0, 2).join(', ')
      return `- ${dayMonth(m.mergedAt)} ${hourMin(m.mergedAt)} · ${pr}**${title}** · ${mdText(who)} · ${m.commits} ${m.commits === 1 ? 'commit' : 'commits'}`
    })
    .join('\n')
}

// --- the history: every branch as an arc over the base line, from its first commit to its merge

const labelWidth = (label: string): number => [...label].length * 5.8 + 6

type Arc = { x1: number; x2: number; lane: number; color: string; label: string; open: boolean; agents: AgentRow[]; state?: BranchState }

const LANE = 14
const MAX_LANES = 12

const dayStart = (t: number): number => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Time to x, a day at a time: each day is as wide as what happened on it (merges,
 * branches started), so the busy days spread out and the quiet ones close up.
 */
function axisOf(view: ProjectView, now: number, from: number, to: number): { x: (t: number) => number; days: number[] } {
  const first = dayStart(view.history.start)
  const days: number[] = []
  for (let d = first; d <= now; d = dayStart(d + DAY + 3_600_000)) days.push(d)
  const events = [...view.history.merges.flatMap(m => [m.start, m.mergedAt]), ...view.branches.filter(b => b.ahead > 0).map(b => b.firstAt)]
  const weight = days.map(d => 1 + Math.sqrt(events.filter(t => t >= d && t < d + DAY).length))
  const total = weight.reduce((a, b) => a + b, 0)
  const cum: number[] = []
  weight.reduce((acc, w, i) => ((cum[i] = acc), acc + w), 0)
  const x = (t: number) => {
    const c = Math.max(view.history.start, Math.min(now, t))
    const i = Math.max(0, Math.min(days.length - 1, days.findIndex((d, k) => c >= d && (k === days.length - 1 || c < (days[k + 1] ?? Infinity)))))
    const d = days[i] ?? first
    const end = i === days.length - 1 ? Math.max(now, d + 1) : (days[i + 1] ?? d + DAY)
    const frac = (c - d) / Math.max(1, end - d)
    return from + (((cum[i] ?? 0) + frac * (weight[i] ?? 1)) / total) * (to - from)
  }
  return { x, days }
}

function arcsOf(W: number, view: ProjectView, onBranch: Map<string, AgentRow[]>, now: number) {
  const L = 12
  const R = 64
  const { x, days } = axisOf(view, now, L, W - R)
  const raw = [
    ...view.history.merges.map(m => ({ x1: x(m.start), x2: x(m.mergedAt), color: colorOf(m.authors[0] ?? m.branch), label: m.ref || shortBranch(m.branch), open: false, agents: [] as AgentRow[], state: undefined as BranchState | undefined })),
    ...view.branches
      .filter(b => b.ahead > 0)
      .map(b => ({ x1: x(b.firstAt), x2: x(now), color: colorOf(b.authors[0] ?? b.lastAuthor), label: b.ref || shortBranch(b.name), open: true, agents: onBranch.get(b.name) ?? [], state: stateOf(b, now) })),
  ]
    .map(a => ({ ...a, x2: Math.max(a.x2, a.x1 + 8) }))
    .sort((a, b) => a.x1 - b.x1)
  // Lanes: each arc takes the lowest lane free where it starts, keeping room for its label.
  const ends: number[] = []
  const arcs: Arc[] = raw.map(a => {
    let lane = ends.findIndex(e => e + 6 < a.x1)
    if (lane === -1) lane = ends.length < MAX_LANES ? ends.length : MAX_LANES - 1
    ends[lane] = Math.max(ends[lane] ?? 0, a.x2, a.x1 + labelWidth(a.label))
    return { ...a, lane }
  })
  return { arcs, lanes: Math.max(1, ends.length), x, days, L, R }
}

export const historyHeight = (W: number, view: ProjectView, now: number): number => {
  const { lanes } = arcsOf(W, view, new Map(), now)
  return 34 + lanes * LANE + 58
}

export function historySvg(W: number, view: ProjectView, onBranch: Map<string, AgentRow[]>, now: number): string {
  usePalette(view.colors)
  const { arcs, lanes, x, days } = arcsOf(W, view, onBranch, now)
  const baseY = 34 + lanes * LANE
  const H = baseY + 58
  const trunk = LINE_COLOR[view.base] ?? '#4F8FD6'
  let body = `<text class="t" x="0" y="14" font-family="${FONT}" font-size="13" font-weight="700">${xml(view.base)}</text>`
  body += `<text class="s" x="${8 + [...view.base].length * 7.6}" y="14" font-family="${FONT}" font-size="11">${xml(`${view.history.merges.length} branches merged since ${dayMonth(view.history.start)} · ${arcs.filter(a => a.open).length} open`)}</text>`
  // Today.
  body += `<line x1="${x(now)}" y1="20" x2="${x(now)}" y2="${baseY + 6}" class="trunk" stroke-width="1" stroke-dasharray="2 3"/>`
  body += `<text class="m" x="${x(now) + 4}" y="28" font-family="${FONT}" font-size="10">today</text>`
  // The arcs, the oldest lanes lowest; each lands on the line where it merged.
  for (const a of arcs) {
    const y = baseY - 10 - a.lane * LANE
    const r = Math.min(5, (a.x2 - a.x1) / 2, baseY - y)
    const d = `M${a.x1} ${baseY} L${a.x1} ${y + r} Q${a.x1} ${y} ${a.x1 + r} ${y} L${a.x2 - r} ${y} Q${a.x2} ${y} ${a.x2} ${y + r}${a.open ? '' : ` L${a.x2} ${baseY}`}`
    const dim = a.state === 'stale' ? 0.45 : 1
    body += `<path d="${d}" fill="none" stroke="${a.color}" stroke-width="2" stroke-linecap="round" opacity="${0.9 * dim}"${a.open ? ' stroke-dasharray="4 3"' : ''}/>`
    if (a.open) body += `<circle cx="${a.x2}" cy="${y + r}" r="3.5" fill="none" stroke="${a.color}" stroke-width="2"${a.agents.length ? ' class="pulse"' : ''}/>`
    else body += `<circle cx="${a.x2}" cy="${baseY}" r="2.6" fill="${a.color}"/>`
    body += `<text x="${a.x1 + 2}" y="${y - 3}" font-family="${FONT}" font-size="9.5" font-weight="600" fill="${a.color}" opacity="${dim}">${xml(a.label)}</text>`
    a.agents.slice(0, 2).forEach((ag, i) => {
      body += crab(a.x2 + 6 + i * 22, y - 6, ag.status === 'running' ? COSTUME[ag.activity] : 'plain', ag.status === 'running', 0.6)
    })
  }
  // The base line itself.
  body += `<line x1="${x(view.history.start)}" y1="${baseY}" x2="${x(now)}" y2="${baseY}" stroke="${trunk}" stroke-width="3" stroke-linecap="round"/>`
  // Releases: each step down a more stable line, below it.
  const lineNames = [...new Set(view.history.releases.map(r => r.line))]
  for (const r of view.history.releases) {
    const rx = x(r.at)
    const c = LINE_COLOR[r.line] ?? '#888780'
    const ry = baseY + 12 + lineNames.indexOf(r.line) * 9
    body += `<line x1="${rx}" y1="${baseY + 2}" x2="${rx}" y2="${ry}" stroke="${c}" stroke-width="1.2"/><path d="M${rx} ${ry - 3.5} l3.5 3.5 -3.5 3.5 -3.5 -3.5z" fill="${c}"/>`
  }
  // Days along the bottom, as many as fit; a week at a time past six weeks.
  const step = days.length > 45 ? 7 : 1
  let lastX = -99
  for (const t of days.slice(1).filter((_, i) => (i + 1) % step === 0)) {
    const tx = x(t)
    body += `<line x1="${tx}" y1="${baseY - 3}" x2="${tx}" y2="${baseY + 3}" class="trunk" stroke-width="1"/>`
    if (tx - lastX > 38) {
      body += `<text class="m" x="${tx}" y="${baseY + 44}" text-anchor="middle" font-family="${FONT}" font-size="10" font-variant-numeric="tabular-nums">${dayMonth(t)}</text>`
      lastX = tx
    }
  }
  // Legend: the lines below, and who drew each color.
  let lx = 0
  const legendY = H - 2
  for (const name of lineNames) {
    const c = LINE_COLOR[name] ?? '#888780'
    body += `<path d="M${lx + 4} ${legendY - 7} l3.5 3.5 -3.5 3.5 -3.5 -3.5z" fill="${c}"/><text class="s" x="${lx + 12}" y="${legendY - 1}" font-family="${FONT}" font-size="10">${xml(name)}</text>`
    lx += 22 + [...name].length * 6
  }
  const people = byCommits(view.history.merges.flatMap(m => m.authors).concat(view.branches.flatMap(b => b.authors)))
  for (const name of people) {
    const w = 18 + [...firstName(name)].length * 6
    if (lx + w > W) break
    body += `<circle cx="${lx + 4}" cy="${legendY - 4}" r="4" fill="${colorOf(name)}"/><text class="s" x="${lx + 12}" y="${legendY - 1}" font-family="${FONT}" font-size="10">${xml(firstName(name))}</text>`
    lx += w
  }
  return svg(W, H, body)
}
