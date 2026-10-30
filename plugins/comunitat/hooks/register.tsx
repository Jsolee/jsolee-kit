import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { AgentRow, Panel, ProjectView, RowStatus } from '../types'
import {
  activityOf,
  agentSvg,
  detailOf,
  DONE_H,
  doneSvg,
  GLYPH,
  LABEL,
  metaLine,
  ROW_H,
  STATUS_GLYPH,
  STATUS_LABEL,
  statusFromEngine,
} from './model'
import {
  agentLine,
  attentionOf,
  historyHeight,
  historySvg,
  mergesMarkdown,
  BRANCH_H,
  branchOfAgent,
  branchSvg,
  collect,
  expandHome,
  firstName,
  LINES_H,
  linesSvg,
  PR_LABEL,
  relTime,
  shortBranch,
  stateOf,
  teamHeight,
  teamSvg,
  usePalette,
} from './project'

const PANE = 'comunitat'
const TITLE = 'Agents'
const CLOSE_AFTER_MS = 10_000
const MAX_ROWS = 100

const agents = atom({ plugin: 'comunitat', key: 'agents' } as const, [] as AgentRow[])
const panel = atom({ plugin: 'comunitat', key: 'panel' } as const, { autoOpened: false, showDone: true } as Panel)
const now = atom({ plugin: 'comunitat', key: 'now' } as const, 0)
const project = atom({ plugin: 'comunitat', key: 'project' } as const, null as ProjectView | null)
const sessionCwd = atom({ plugin: 'comunitat', key: 'cwd' } as const, '')

const PROJECT_PANE = 'comunitat-projecte'
const PROJECT_TITLE = 'Project'
const PROJECT_EVERY_MS = 120_000

// A failure here must never get in the way of a tool call or a spawn.
const safe = async (work: () => Promise<unknown>): Promise<void> => {
  try {
    await work()
  } catch {
    // ponytail: the panel can lag a step; the agent's own work matters more.
  }
}

const isOpen = async ($: EngineInterface, id = PANE): Promise<boolean> => (await $.ui.panes()).some(p => p.id === id)

let refreshing: Promise<void> | undefined

/** Reads the repository again; `fetch` asks the remote first. One read at a time. */
function refreshProject($: EngineInterface, fetch: boolean): Promise<void> {
  refreshing ??= safe(async () => {
    const cwd = (await read($, sessionCwd)) || undefined
    const run = async (argv: string[]) => {
      const r = await $.process.run(argv, { cwd, timeoutMs: argv[1] === 'fetch' ? 30_000 : 15_000 })
      return { exitCode: r.exitCode, stdout: r.stdout }
    }
    const view = await collect(run, await $.clock.now(), fetch)
    await update($, project, () => view)
  }).finally(() => {
    refreshing = undefined
  })
  return refreshing
}

const isRunning = (a: AgentRow) => a.status === 'running'

let closeTimer: Timer | undefined

function scheduleClose($: EngineInterface): void {
  closeTimer?.cancel()
  closeTimer = $.clock.after(CLOSE_AFTER_MS, () => {
    void safe(async () => {
      const [list, p] = [await read($, agents), await read($, panel)]
      if (list.some(isRunning) || !p.autoOpened) return
      await $.ui.close({ id: PANE })
      await update($, panel, x => ({ ...x, autoOpened: false }))
    })
  })
}

// Catches what no event told us: an agent that started before this mod loaded,
// or one whose end we missed. The engine's list is the source of truth.
async function reconcile($: EngineInterface): Promise<void> {
  const known = await $.agent.list()
  const at = await $.clock.now()
  await update($, agents, list => {
    const byId = new Map(list.map(a => [a.id, a]))
    for (const info of known) {
      const row = byId.get(info.id)
      const engine = statusFromEngine(info.status)
      if (!row) {
        if (info.status !== 'running' && info.status !== 'waiting') continue
        byId.set(info.id, {
          id: info.id,
          description: info.description,
          type: info.type,
          model: '',
          status: 'running',
          activity: info.status === 'waiting' ? 'waiting' : 'thinking',
          tool: '',
          detail: '',
          inflight: 0,
          toolCount: 0,
          startedAt: at,
          endedAt: null,
          cwd: '',
          path: '',
        })
        continue
      }
      if (!engine || !isRunning(row)) continue
      if (engine.waiting) {
        if (row.inflight === 0) byId.set(row.id, { ...row, activity: 'waiting', tool: '', detail: '' })
      } else byId.set(row.id, { ...row, status: engine.status, endedAt: at, inflight: 0 })
    }
    return [...byId.values()].slice(-MAX_ROWS)
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({
      name: 'comunitat',
      description: 'Show or hide the panel of running subagents and what each one is doing',
    })
    await update($, sessionCwd, () => e.cwd ?? '')
    await $.command.register({
      name: 'projecte',
      description: 'Show or hide the project map: branches, team, PRs and the agents on each branch',
      argumentHint: '[repository path]',
    })
    // The map reads git again every two minutes while it is open, and asks the remote every ten.
    let rounds = 0
    $.clock.every(PROJECT_EVERY_MS, () => {
      void safe(async () => {
        if (!(await isOpen($, PROJECT_PANE))) return
        await refreshProject($, ++rounds % 5 === 0)
      })
    })
    let ticks = 0
    $.clock.every(1000, () => {
      void safe(async () => {
        const list = await read($, agents)
        if (!list.some(isRunning)) return
        const at = await $.clock.now()
        await update($, now, () => at)
        if (++ticks % 3 === 0) await reconcile($)
      })
    })
    return started
  })

  on('command.run', { command: 'comunitat' }, async $ => {
    if (await isOpen($)) {
      await $.ui.close({ id: PANE })
      return { text: 'Agents panel closed.' }
    }
    const at = await $.clock.now()
    await update($, now, () => at)
    await update($, panel, p => ({ ...p, autoOpened: false }))
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Agents panel opened.' }
  })

  on('command.run', { command: 'projecte' }, async ($, e) => {
    // `/projecte <path>` switches repository: the session's folder is not always the project's.
    const arg = e.args.trim()
    if (arg) {
      const path = expandHome(arg, (await $.env.get('HOME')) ?? '')
      const top = await $.process.run(['git', '-C', path, 'rev-parse', '--show-toplevel'], { timeoutMs: 10_000 }).catch(() => null)
      if (!top || top.exitCode !== 0) return { text: `${arg} is not inside a git repository.` }
      const root = top.stdout.trim()
      await update($, sessionCwd, () => root)
      await update($, project, () => null)
      if (!(await isOpen($, PROJECT_PANE))) await $.ui.open({ id: PROJECT_PANE, title: PROJECT_TITLE })
      void refreshProject($, true)
      return { text: `Project map: ${root}` }
    }
    if (await isOpen($, PROJECT_PANE)) {
      await $.ui.close({ id: PROJECT_PANE })
      return { text: 'Project map closed.' }
    }
    const at = await $.clock.now()
    await update($, now, () => at)
    await $.ui.open({ id: PROJECT_PANE, title: PROJECT_TITLE })
    void refreshProject($, true)
    return { text: 'Project map opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.deny !== undefined || !started.agentId) return started
    const id = started.agentId
    await safe(async () => {
      const at = await $.clock.now()
      const wasIdle = !(await read($, agents)).some(isRunning)
      const row: AgentRow = {
        id,
        description: e.description || e.subagentType,
        type: e.subagentType,
        model: started.model,
        status: 'running',
        activity: 'thinking',
        tool: '',
        detail: '',
        inflight: 0,
        toolCount: 0,
        startedAt: at,
        endedAt: null,
        cwd: e.cwd ?? '',
        path: '',
      }
      await update($, agents, list => [...list.filter(a => a.id !== id), row].slice(-MAX_ROWS))
      await update($, now, () => at)
      closeTimer?.cancel()
      closeTimer = undefined
      // The first agent of a run opens the pane; once the person closes it, later ones leave it closed.
      if (wasIdle && !(await isOpen($))) {
        await $.ui.open({ id: PANE, title: TITLE })
        await update($, panel, p => ({ ...p, autoOpened: true }))
      }
    })
    return started
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    if (!id) return next(e)
    const activity = activityOf(e.tool)
    const args = e as unknown as Record<string, unknown>
    const detail = detailOf(e.tool, args)
    const full = [args.file_path, args.notebook_path, args.path].find((v): v is string => typeof v === 'string' && v.startsWith('/')) ?? ''
    await safe(() =>
      update($, agents, list =>
        list.map((a): AgentRow =>
          a.id !== id
            ? a
            : {
                ...a,
                status: 'running',
                endedAt: null,
                activity,
                tool: e.tool,
                detail,
                path: full || a.path,
                inflight: a.inflight + 1,
                toolCount: a.toolCount + 1,
              },
        ),
      ),
    )
    try {
      return await next(e)
    } finally {
      await safe(() =>
        update($, agents, list =>
          list.map((a): AgentRow => {
            if (a.id !== id) return a
            const inflight = Math.max(0, a.inflight - 1)
            return inflight > 0 ? { ...a, inflight } : { ...a, inflight, activity: 'thinking', tool: '', detail: '' }
          }),
        ),
      )
    }
  })

  on('turn.complete', async ($, e, next) => {
    const id = e.agentId
    if (id) {
      await safe(async () => {
        const at = await $.clock.now()
        const status: RowStatus = e.reason === 'answer' ? 'done' : e.reason === 'aborted' ? 'stopped' : 'failed'
        await update($, agents, list =>
          list.map(a => (a.id !== id ? a : { ...a, status, endedAt: at, inflight: 0, tool: '', detail: '' })),
        )
        await update($, now, () => at)
        if (!(await read($, agents)).some(isRunning)) scheduleClose($)
      })
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, agents)
    const p = await read($, panel)
    const at = Math.max(await read($, now), ...list.map(a => a.startedAt), 0)
    const running = list.filter(isRunning).reverse()
    const finished = list.filter(a => !isRunning(a)).reverse()

    const header = (
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold>
          {running.length === 0 ? 'No agents running' : running.length === 1 ? '1 agent working' : `${running.length} agents working`}
        </Text>
        {finished.length > 0 ? (
          <Button
            key="clear"
            label="Clear"
            plain
            onPress={() => update($, agents, l => l.filter(isRunning))}
          />
        ) : null}
      </Box>
    )
    const toggleDone =
      finished.length > 0 ? (
        <Button
          key="done"
          label={`${p.showDone ? '▾' : '▸'} Finished · ${finished.length}`}
          plain
          onPress={() => update($, panel, x => ({ ...x, showDone: !x.showDone }))}
        />
      ) : null
    const empty =
      list.length === 0 ? <Text dimColor>The panel opens by itself when a subagent starts.</Text> : null

    // The crabs on the desktop app; elsewhere (the terminal, VS Code, whose pane drops the SVG) text rows.
    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(260, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      return (
        <Box flexDirection="column" gap={1}>
          {header}
          {empty}
          <Box flexDirection="column">
            {running.map(a => (
              <Svg
                key={a.id}
                source={agentSvg(W, a, at)}
                alt={`${a.description}: ${LABEL[a.activity]}${a.detail ? ' ' + a.detail : ''}`}
                width={W}
                height={ROW_H}
              />
            ))}
          </Box>
          {toggleDone}
          {p.showDone && finished.length > 0 ? (
            <Box flexDirection="column">
              {finished.map(a => (
                <Svg
                  key={a.id}
                  source={doneSvg(W, a, at)}
                  alt={`${a.description}: ${STATUS_LABEL[a.status]}`}
                  width={W}
                  height={DONE_H}
                />
              ))}
            </Box>
          ) : null}
        </Box>
      )
    }

    // Terminal and the rest: the same, in text rows.
    return (
      <Box flexDirection="column" gap={1}>
        {header}
        {empty}
        {running.map(a => (
          <Box key={a.id} flexDirection="column">
            <Text bold wrap="truncate-end">
              <Text color="cyan">{GLYPH[a.activity]}</Text> {a.description || a.type}
            </Text>
            <Text wrap="truncate-end">
              {'  '}
              <Text color="cyan">{LABEL[a.activity]}</Text>
              <Text dimColor>{a.detail ? `  ${a.detail}` : ''}</Text>
            </Text>
            <Text dimColor wrap="truncate-end">
              {'  '}
              {metaLine(a, at)}
            </Text>
          </Box>
        ))}
        {toggleDone}
        {p.showDone &&
          finished.map(a => (
            <Text key={a.id} wrap="truncate-end">
              <Text color={a.status === 'done' ? 'green' : a.status === 'failed' ? 'red' : 'gray'}>
                {STATUS_GLYPH[a.status]}
              </Text>{' '}
              {a.description || a.type}
              <Text dimColor> · {metaLine(a, at)}</Text>
            </Text>
          ))}
      </Box>
    )
  })
  on('ui.render', { component: 'Pane', requestId: PROJECT_PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button, Markdown } = ui
    const view = await read($, project)
    const list = await read($, agents)
    const at = Math.max(await read($, now), view?.fetchedAt ?? 0)
    const refresh = (
      <Button key="refresh" label="Refresh" plain onPress={() => refreshProject($, true)} />
    )
    if (!view) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>Reading the repository…</Text>
          {refresh}
        </Box>
      )
    }
    if (view.error) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text>
            {view.error === 'no-git'
              ? 'This session is not inside a git repository: open Claude Code in the project folder, or run /projecte <path>.'
              : 'The repository has no branches on origin.'}
          </Text>
          {refresh}
        </Box>
      )
    }
    usePalette(view.colors)
    // Each running agent, on the branch it works on.
    const running = list.filter(isRunning)
    const onBranch = new Map<string, AgentRow[]>()
    for (const a of running) {
      const b = branchOfAgent(a, view)
      onBranch.set(b, [...(onBranch.get(b) ?? []), a])
    }
    const branches = [...view.branches].sort(
      (x, y) => (onBranch.get(y.name)?.length ?? 0) - (onBranch.get(x.name)?.length ?? 0) || y.lastAt - x.lastAt,
    )
    const onLines = view.lines.flatMap(l => onBranch.get(l.name) ?? [])
    const prs = branches.filter(b => b.pr).length
    const footer = (
      <Box flexDirection="row" justifyContent="space-between">
        <Text dimColor>
          {`${branches.length} branches · ${prs} open PRs · ${running.length} agents · read ${relTime(at - view.fetchedAt)}`}
          {view.hasGh ? '' : ' · no gh, so no PRs'}
        </Text>
        {refresh}
      </Box>
    )
    const mode = (await read($, panel)).projectView ?? 'now'
    const tab = (id: 'now' | 'history', label: string) => (
      <Button
        key={`tab-${id}`}
        label={`${mode === id ? '●' : '○'} ${label}`}
        plain
        onPress={() => update($, panel, x => ({ ...x, projectView: id }))}
      />
    )
    const tabs = (
      <Box flexDirection="row" gap={2}>
        {tab('now', 'Now')}
        {tab('history', 'History')}
      </Box>
    )
    const todo = attentionOf(view, at)
    const attention =
      todo.length > 0 ? (
        <Markdown key="todo" text={`**To do**\n\n${todo.join('\n')}`} />
      ) : (
        <Text dimColor>Nothing pending: everything is up to date.</Text>
      )
    const recent =
      view.history.merges.length > 0 ? (
        <Markdown key="merges" text={`**Latest merges**\n\n${mergesMarkdown(view)}`} />
      ) : null

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(320, Math.min(980, (e.props.bodyColumns || 50) * 8 - 8))
      if (mode === 'history') {
        return (
          <Box flexDirection="column" gap={1}>
            {tabs}
            <Svg
              key="history"
              source={historySvg(W, view, onBranch, at)}
              alt={`${view.history.merges.length} branches merged into ${view.base}`}
              width={W}
              height={historyHeight(W, view, at)}
            />
            {recent}
            {footer}
          </Box>
        )
      }
      return (
        <Box flexDirection="column" gap={1}>
          {tabs}
          {attention}
          <Svg
            key="lines"
            source={linesSvg(W, view, at)}
            alt={view.lines.map(l => `${l.name}: ${l.ahead} commits to promote`).join(', ')}
            width={W}
            height={LINES_H(view.lines.length)}
          />
          {onLines.length > 0 ? (
            <Text dimColor>{`On ${view.lines.map(l => l.name).join('/')}: ${onLines.map(agentLine).join(' · ')}`}</Text>
          ) : null}
          {view.members.length > 0 ? (
            <Svg
              key="team"
              source={teamSvg(W, view.members, at)}
              alt={view.members.map(m => `${m.name}: ${m.branches.map(shortBranch).join(', ')}`).join('; ')}
              width={W}
              height={teamHeight(W, view.members, at)}
            />
          ) : null}
          <Box flexDirection="column">
            {branches.map((b, i) => (
              <Svg
                key={b.name}
                source={branchSvg(W, b, onBranch.get(b.name) ?? [], at, i === branches.length - 1, view.base)}
                alt={`${b.name}: ${b.authors.join(', ')}${b.pr ? `, PR #${b.pr.number} ${PR_LABEL[b.pr.state]}` : ''}${
                  onBranch.get(b.name)?.length ? `, agents: ${(onBranch.get(b.name) ?? []).map(agentLine).join(', ')}` : ''
                }`}
                width={W}
                height={BRANCH_H}
              />
            ))}
          </Box>
          {footer}
        </Box>
      )
    }

    // Terminal and the rest: the same map, in text.
    if (mode === 'history') {
      return (
        <Box flexDirection="column" gap={1}>
          {tabs}
          <Text bold>{`${view.base}: ${view.history.merges.length} branches merged`}</Text>
          {recent}
          {footer}
        </Box>
      )
    }
    return (
      <Box flexDirection="column" gap={1}>
        {tabs}
        <Text bold>{view.repo || view.root}</Text>
        {attention}
        {[...view.lines].reverse().map(l => (
          <Text key={l.name} wrap="truncate-end">
            <Text color="blue">━━ {l.name}</Text>
            <Text dimColor>{` ${relTime(at - l.lastAt)}${l.ahead ? ` · ${l.ahead} commits to promote` : ''}`}</Text>
          </Text>
        ))}
        {view.members.length > 0 ? (
          <Text wrap="truncate-end" dimColor>
            {view.members.map(m => `${firstName(m.name)} (${m.branches.length > 0 ? m.branches.length : `${m.landed} on base`})`).join(' · ')}
          </Text>
        ) : null}
        {branches.map(b => (
          <Box key={b.name} flexDirection="column">
            <Text wrap="truncate-end">
              <Text color={stateOf(b, at) === 'active' ? 'blue' : 'gray'}>├─● </Text>
              <Text bold>{shortBranch(b.name)}</Text>
              <Text dimColor>{` ↑${b.ahead} ↓${b.behind} · ${relTime(at - b.lastAt)}`}</Text>
              {b.pr ? <Text color="yellow">{`  #${b.pr.number} ${PR_LABEL[b.pr.state]}`}</Text> : null}
            </Text>
            <Text wrap="truncate-end" dimColor>
              {'│   '}
              {b.authors.join(', ') || b.lastAuthor}
              {onBranch.get(b.name)?.length ? `  ·  ${(onBranch.get(b.name) ?? []).map(agentLine).join(', ')}` : ''}
            </Text>
          </Box>
        ))}
        {footer}
      </Box>
    )
  })
}
