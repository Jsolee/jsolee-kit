import { describe, expect, mock, test } from 'claude-code/testing'

import { activityOf, agentSvg, detailOf, fit, modelName, statusFromEngine, xml } from '../hooks/model'
import type { AgentRow } from '../types'

const PANE_PROPS = { title: 'Agents', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} } as any

describe('què fa cada agent', () => {
  test('cada eina té la seva activitat', () => {
    expect(activityOf('Read')).toBe('reading')
    expect(activityOf('Grep')).toBe('searching')
    expect(activityOf('Edit')).toBe('writing')
    expect(activityOf('Bash')).toBe('terminal')
    expect(activityOf('WebSearch')).toBe('web')
    expect(activityOf('mcp__Claude_Browser__navigate')).toBe('web')
    expect(activityOf('Agent')).toBe('delegating')
    expect(activityOf('mcp__savvy-progress__step')).toBe('tool')
  })

  test('el detall és el fitxer, la cerca, l’ordre o la URL', () => {
    expect(detailOf('Read', { file_path: '/Users/me/proj/apps/web/src/app.ts' })).toBe('…/src/app.ts')
    expect(detailOf('Grep', { pattern: 'useAuth', path: '/a/b' })).toBe('useAuth · /a/b')
    expect(detailOf('Bash', { command: 'npm test\nnpm run lint' })).toBe('npm test')
    expect(detailOf('WebFetch', { url: 'https://supabase.com/docs/x?y=1' })).toBe('supabase.com/docs/x')
    expect(detailOf('mcp__savvy-progress__step', {})).toBe('step')
  })

  test('escapa el text de l’SVG i talla el que no hi cap', () => {
    expect(xml(`a <b> & "c" 'd'`)).toBe('a &lt;b&gt; &amp; &quot;c&quot; &#39;d&#39;')
    expect(fit('x'.repeat(200), 12, 60).endsWith('…')).toBe(true)
    expect(fit('curt', 12, 200)).toBe('curt')
    expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
    expect(statusFromEngine('killed')).toEqual({ status: 'stopped' })
    expect(statusFromEngine('running')).toBe(null)
  })

  test('cada activitat vesteix el cranc amb la seva disfressa, i quiet quan ha acabat', () => {
    const row = (over: Partial<AgentRow>): AgentRow => ({
      id: 'a', description: 'Tasca', type: 'Explore', model: 'claude-haiku-5-5', status: 'running', activity: 'thinking',
      tool: '', detail: '', inflight: 0, toolCount: 0, startedAt: 0, endedAt: null, cwd: '', path: '', ...over,
    })
    expect(agentSvg(400, row({ activity: 'reading' }), 0)).toContain('class="c-heavy run"')
    expect(agentSvg(400, row({ activity: 'searching' }), 0)).toContain('class="c-explore run"')
    expect(agentSvg(400, row({ activity: 'web' }), 0)).toContain('class="c-fable run"')
    expect(agentSvg(400, row({ activity: 'thinking' }), 0)).toContain('class="c-think run"')
    expect(agentSvg(400, row({ activity: 'waiting' }), 0)).toContain('class="c-wait"')
    expect(agentSvg(400, row({ status: 'done', endedAt: 1 }), 0)).toContain('class="c-plain"')
  })
})

test('segueix un subagent de l’inici al final i el dibuixa a cada superfície', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000 })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }) as any)
  on('command.register' as any, async () => ({ value: { command: 'comunitat' } }) as any)
  on('turn.complete', async () => ({ text: '' }))
  on('agent.spawn', async () => ({ model: 'claude-sonnet-5-5', agentId: 'a1' }))
  // La crida queda oberta fins que el test ha mirat el panell.
  let entered!: () => void
  let release!: () => void
  const inside = new Promise<void>(r => (entered = r))
  const gate = new Promise<void>(r => (release = r))
  on('tool.call', async () => {
    entered()
    await gate
    return { result: { stdout: '', stderr: '' } } as any
  })
  const draw = async (surface: 'terminal' | 'desktop' | 'vscode') => {
    const ui = await $.ui.mount({ plugin: 'comunitat', surface, component: 'Pane', requestId: 'comunitat', props: PANE_PROPS })
    const drawn = JSON.stringify(await ui.drawn())
    await ui.unmount()
    return drawn
  }

  await $.session.start({ cwd: '/w', surface: 'desktop', isInteractive: true } as any)
  await $.agent.spawn({ prompt: 'Revisa', description: 'Revisa la PR', subagentType: 'Explore' } as any)
  expect(await draw('desktop')).toContain('thinking')

  const call = $.tool.call({ tool: 'Read', file_path: '/w/apps/web/src/auth.ts', agentId: 'a1' } as any)
  await inside
  for (const surface of ['terminal', 'desktop', 'vscode'] as const) {
    const drawn = await draw(surface)
    expect(drawn).toContain('Revisa la PR')
    expect(drawn).toContain('reading')
    expect(drawn).toContain('…/src/auth.ts')
    expect(drawn).toContain('1 agent working')
  }
  release()
  await call
  await clock.advance(4_000)
  expect(await draw('terminal')).toContain('thinking')

  await $.turn.complete({ agentId: 'a1', reason: 'answer', answer: 'ok', durationMs: 4_000, isAborted: false, turnId: 't1' } as any)
  for (const surface of ['terminal', 'desktop', 'vscode'] as const) {
    const drawn = await draw(surface)
    expect(drawn).toContain('No agents running')
    expect(drawn).toContain('Finished · 1')
  }
})
