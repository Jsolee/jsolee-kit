export type Activity =
  | 'thinking'
  | 'reading'
  | 'searching'
  | 'writing'
  | 'terminal'
  | 'web'
  | 'delegating'
  | 'waiting'
  | 'tool'

export type RowStatus = 'running' | 'done' | 'failed' | 'stopped'

export type AgentRow = {
  /** The subagent's id: what its `tool.call`s carry as `agentId`. */
  id: string
  description: string
  type: string
  model: string
  status: RowStatus
  activity: Activity
  /** The tool it runs now; empty while it thinks. */
  tool: string
  /** The file, command, query or URL of that tool. */
  detail: string
  /** Tool calls in flight: back to `thinking` when the last one ends. */
  inflight: number
  toolCount: number
  startedAt: number
  endedAt: number | null
  /** Where it works: the folder it was spawned in and the last file it touched, whole, to place it on a branch. */
  cwd: string
  path: string
}

export type Panel = {
  /** True while the pane is open because a subagent opened it: it closes itself after the last one. */
  autoOpened: boolean
  showDone: boolean
  /** Which view the project map shows: the branches now, or their history on the base line. */
  projectView?: 'now' | 'history'
}

export type PrState = 'approved' | 'changes' | 'review' | 'draft'
export type Checks = 'pass' | 'fail' | 'pending' | 'none'

export type PrInfo = { number: number; title: string; author: string; state: PrState; checks: Checks; url: string; createdAt: number }

export type BranchInfo = {
  /** Without the remote: `feature/TG-83-sessio`. */
  name: string
  /** The Taiga ref the name carries (`TG-83`), or empty. */
  ref: string
  lastAt: number
  lastAuthor: string
  subject: string
  /** When its first commit of its own was made: where its arc starts in the history. */
  firstAt: number
  /** Commits ahead of and behind the base line (`snapshot`). */
  ahead: number
  behind: number
  /** Who wrote the commits only this branch has. */
  authors: string[]
  pr: PrInfo | null
  isCurrent: boolean
  /** The folder of a worktree that has it checked out, or empty. */
  worktree: string
}

/** A long-lived line (prod, stable, snapshot), and how many commits it holds that the line below it has not got yet. */
export type LongLine = { name: string; lastAt: number; subject: string; ahead: number }

/** `landed`: commits of theirs that reached the base line this week. */
export type Member = { name: string; branches: string[]; lastAt: number; landed: number }

/** A branch that landed on the base line: from its first commit to its merge. */
export type Merge = { pr: number | null; branch: string; ref: string; start: number; mergedAt: number; commits: number; authors: string[] }

/** A step down a long-lived line: each commit that reached it (stable, prod). */
export type Release = { line: string; at: number; subject: string }

export type History = { start: number; merges: Merge[]; releases: Release[] }

export type ProjectView = {
  root: string
  repo: string
  /** The repository's page (`https://github.com/owner/repo`), or empty off GitHub. */
  web: string
  base: string
  current: string
  lines: LongLine[]
  branches: BranchInfo[]
  members: Member[]
  history: History
  /** One color per person (by `personKey`), so no two people share one. */
  colors: Record<string, string>
  fetchedAt: number
  hasGh: boolean
  error: string
}

declare module 'claude-code' {
  interface PluginState {
    comunitat: { agents: AgentRow[]; panel: Panel; now: number; project: ProjectView | null; cwd: string }
  }
}
