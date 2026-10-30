import type { Activity, AgentRow, RowStatus } from '../types'

import { COSTUME, COSTUME_COLOR, CRAB_CSS, crab } from './crab'

// --- what an agent is doing, from the tool it calls

const BY_TOOL: Record<string, Activity> = {
  Read: 'reading',
  NotebookRead: 'reading',
  Grep: 'searching',
  Glob: 'searching',
  LS: 'searching',
  Edit: 'writing',
  MultiEdit: 'writing',
  Write: 'writing',
  NotebookEdit: 'writing',
  Bash: 'terminal',
  BashOutput: 'terminal',
  KillShell: 'terminal',
  Monitor: 'terminal',
  WebFetch: 'web',
  WebSearch: 'web',
  Agent: 'delegating',
  Task: 'delegating',
  SendMessage: 'delegating',
  Workflow: 'delegating',
}

export function activityOf(tool: string): Activity {
  return BY_TOOL[tool] ?? (/browser|navigate|playwright|chrome/i.test(tool) ? 'web' : 'tool')
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export const shortPath = (p: string): string => {
  const parts = p.split('/').filter(Boolean)
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : p
}

const firstLine = (s: string): string => s.trim().split('\n')[0] ?? ''

const shortUrl = (u: string): string => u.replace(/^https?:\/\//, '').replace(/[?#].*$/, '')

/** What the call works on: the file, the search, the command, the query or the URL. */
export function detailOf(tool: string, a: Record<string, unknown>): string {
  switch (activityOf(tool)) {
    case 'reading':
    case 'writing':
      return shortPath(str(a.file_path) || str(a.notebook_path) || str(a.path))
    case 'searching':
      return [str(a.pattern), shortPath(str(a.path))].filter(Boolean).join(' · ')
    case 'terminal':
      return firstLine(str(a.command) || str(a.description))
    case 'web':
      return str(a.query) || shortUrl(str(a.url))
    case 'delegating':
      return str(a.description) || str(a.to)
    default:
      return tool === 'Skill' ? str(a.skill) : (tool.split('__').pop() ?? tool)
  }
}

/** Where the engine says an agent stands, read into a row's status, or null to keep ours. */
export function statusFromEngine(s: string): { status: RowStatus; waiting?: boolean } | null {
  if (s === 'completed' || s === 'idle') return { status: 'done' }
  if (s === 'failed') return { status: 'failed' }
  if (s === 'killed') return { status: 'stopped' }
  if (s === 'waiting') return { status: 'running', waiting: true }
  return null
}

// --- words

export const LABEL: Record<Activity, string> = {
  thinking: 'thinking',
  reading: 'reading',
  searching: 'searching',
  writing: 'writing',
  terminal: 'terminal',
  web: 'on the web',
  delegating: 'delegating',
  waiting: 'waiting',
  tool: 'tool',
}

export const STATUS_LABEL: Record<RowStatus, string> = {
  running: 'working',
  done: 'done',
  failed: 'failed',
  stopped: 'stopped',
}

export const GLYPH: Record<Activity, string> = {
  thinking: '…',
  reading: '◎',
  searching: '◎',
  writing: '✎',
  terminal: '›',
  web: '✦',
  delegating: '⇢',
  waiting: '◷',
  tool: '⚙',
}

export const STATUS_GLYPH: Record<RowStatus, string> = { running: '●', done: '✓', failed: '✗', stopped: '■' }

export function modelName(id: string): string {
  const m = /claude-([a-z]+)-(\d+)-(\d+)/.exec(id)
  if (!m) return id
  const [, family = '', major, minor] = m
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`
}

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
}

export const elapsed = (a: AgentRow, now: number): number => (a.endedAt ?? Math.max(now, a.startedAt)) - a.startedAt

export const metaLine = (a: AgentRow, now: number): string =>
  [a.type, modelName(a.model), fmtTime(elapsed(a, now)), `${a.toolCount} ${a.toolCount === 1 ? 'tool' : 'tools'}`]
    .filter(Boolean)
    .join(' · ')

// --- desktop drawing: one SVG per row, animated with CSS only

export const xml = (s: string): string =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)

// Rough advance of system UI text, in em: enough to cut a line to its slot.
const charEm = (ch: string): number => (/[il.,:;'|!·\s]/.test(ch) ? 0.3 : /[A-ZmwMW@]/.test(ch) ? 0.75 : 0.56)

export function fit(s: string, size: number, maxW: number, em = charEm): string {
  const width = (t: string) => [...t].reduce((w, ch) => w + em(ch) * size, 0)
  if (width(s) <= maxW) return s
  let out = ''
  for (const ch of s) {
    if (width(out + ch + '…') > maxW) break
    out += ch
  }
  return out + '…'
}

const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"
const MONO = "ui-monospace,SFMono-Regular,Menlo,monospace"

const STATUS_COLOR: Record<Exclude<RowStatus, 'running'>, string> = { done: '#3B9C5F', failed: '#D0453F', stopped: '#9A9A96' }

/** The color an agent's label is written in: its costume's while it works. */
export const accentOf = (a: Pick<AgentRow, 'status' | 'activity'>): string =>
  a.status === 'running' ? COSTUME_COLOR[COSTUME[a.activity]] : STATUS_COLOR[a.status]

const CSS = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.ln{stroke:#e8e7e3}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.ln{stroke:#333331}}
</style>`

const svg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS}${CRAB_CSS}${body}</svg>`

const mark = (x: number, y: number, status: RowStatus): string => {
  if (status === 'done') return `<path d="M${x - 5} ${y}l3.5 3.5 6.5-7" fill="none" stroke="${STATUS_COLOR.done}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
  if (status === 'failed') return `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="${STATUS_COLOR.failed}" stroke-width="1.8" stroke-linecap="round"/>`
  if (status === 'stopped') return `<rect x="${x - 4}" y="${y - 4}" width="2.4" height="8" rx="1" fill="${STATUS_COLOR.stopped}"/><rect x="${x + 1.6}" y="${y - 4}" width="2.4" height="8" rx="1" fill="${STATUS_COLOR.stopped}"/>`
  return ''
}

/** The crab alone, dressed for what the agent does now; still once it has ended. */
export function scene(a: Pick<AgentRow, 'status' | 'activity'>, x: number, y: number, scale?: number): string {
  const running = a.status === 'running'
  return crab(x, y, running ? COSTUME[a.activity] : 'plain', running && a.activity !== 'waiting', scale, !running)
}

export const ROW_H = 62
const TEXT_X = 52

export function agentSvg(W: number, a: AgentRow, now: number): string {
  const textW = W - TEXT_X - 8
  const running = a.status === 'running'
  const label = running ? LABEL[a.activity] : STATUS_LABEL[a.status]
  const detailW = Math.max(0, textW - [...label].length * 7 - 10)
  return svg(
    W,
    ROW_H,
    `${scene(a, 4, 12)}
<text class="t" x="${TEXT_X}" y="17" font-family="${FONT}" font-size="13" font-weight="600">${xml(fit(a.description || a.type, 13, textW))}</text>
<text x="${TEXT_X}" y="34" font-size="11.5"><tspan font-family="${FONT}" font-weight="600" fill="${accentOf(a)}">${xml(label)}</tspan>${
      running && a.detail
        ? `<tspan class="s" font-family="${MONO}" dx="8">${xml(fit(a.detail, 11.5, detailW, () => 0.6))}</tspan>`
        : ''
    }</text>
<text class="s" x="${TEXT_X}" y="50" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(fit(metaLine(a, now), 11, textW))}</text>
<line class="ln" x1="0" y1="${ROW_H - 0.5}" x2="${W}" y2="${ROW_H - 0.5}"/>`,
  )
}

export const DONE_H = 30

/** A finished agent: a small still crab, the task, how long it took and its mark. */
export function doneSvg(W: number, a: AgentRow, now: number): string {
  const right = `${fmtTime(elapsed(a, now))} · ${a.toolCount} ${a.toolCount === 1 ? 'tool' : 'tools'}`
  return svg(
    W,
    DONE_H,
    `${scene(a, 2, 3, 0.8)}
<text class="t" x="32" y="19" font-family="${FONT}" font-size="12.5">${xml(fit(a.description || a.type, 12.5, W - 32 - 140))}</text>
<text class="s" x="${W - 22}" y="19" text-anchor="end" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(right)}</text>
${mark(W - 10, 15, a.status)}`,
  )
}
