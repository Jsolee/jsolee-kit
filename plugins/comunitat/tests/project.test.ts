import { describe, expect, mock, test } from 'claude-code/testing'

import { attentionOf, branchOfAgent, collect, expandHome, historyHeight, historySvg, initials, mergesMarkdown, parseMerge, parseRefs, parseWorktrees, personKey, prOf, relTime, repoOf, setAliases, stateOf } from '../hooks/project'
import type { Run } from '../hooks/project'

const NOW = 1_792_100_000_000
const H = 3_600_000
const T = (msAgo: number) => String(Math.round((NOW - msAgo) / 1000))

const REFS = [
  `origin\t${T(H)}\tAnna Puig\tMerge pull request #35`,
  `origin/snapshot\t${T(H)}\tAnna Puig\tMerge pull request #35`,
  `origin/feature/TG-107-informes\t${T(4 * H)}\tMarc Riera\tfeat(api): genera informes`,
  `origin/feature/TG-101-calendari\t${T(9 * H)}\tLaia Soler\tfix(mobile): valor inicial`,
  `origin/feature/TG-65-gitflow\t${T(300 * H)}\tLsoler\tdocs: adopta Gitflow`,
  `origin/stable\t${T(400 * H)}\tLsoler\tchore: estructura`,
  `origin/prod\t${T(400 * H)}\tLsoler\tchore: estructura`,
].join('\n')

const MERGES = [
  `m1\t${T(H)}\tMerge pull request #35 from org/feature/TG-83-sessio`,
  `m2\t${T(300 * H)}\tMerge pull request #2 from lsoler/feature/TG-65-gitflow`,
].join('\n')

const PRS = JSON.stringify([
  { number: 34, title: 'informes', url: 'https://github.com/acme/app/pull/34', createdAt: new Date(NOW - 30 * H).toISOString(), headRefName: 'feature/TG-107-informes', author: { login: 'mriera' }, reviewDecision: 'CHANGES_REQUESTED', isDraft: false, statusCheckRollup: [{ conclusion: 'SUCCESS' }] },
  { number: 32, title: 'calendari', headRefName: 'feature/TG-101-calendari', author: { login: 'lsoler' }, reviewDecision: 'REVIEW_REQUIRED', isDraft: false, statusCheckRollup: [{ conclusion: 'FAILURE' }] },
])

/** A fake repository: what each git and gh call answers. */
const fakeRun = (overrides: Record<string, string> = {}): Run => async argv => {
  const key = argv.join(' ')
  const ok = (stdout: string) => ({ exitCode: 0, stdout })
  if (key in overrides) return ok(overrides[key] ?? '')
  if (key === 'git rev-parse --show-toplevel') return ok('/w/app\n')
  if (key === 'git rev-parse --abbrev-ref HEAD') return ok('feature/TG-101-calendari\n')
  if (key.startsWith('git for-each-ref')) return ok(REFS)
  if (key === 'git remote get-url origin') return ok('https://github.com/acme/app.git\n')
  if (key === 'git worktree list --porcelain') return ok('worktree /w/app\nbranch refs/heads/feature/TG-101-calendari\n\nworktree /w/app-pr34\nbranch refs/heads/feature/TG-107-informes\n')
  if (key === 'git rev-list --count origin/prod..origin/stable') return ok('0\n')
  if (key === 'git rev-list --count origin/stable..origin/snapshot') return ok('130\n')
  if (key.includes('--left-right') && key.includes('TG-65')) return ok('90\t0\n')
  if (key.includes('--left-right')) return ok('2\t3\n')
  if (key.startsWith('git log --format=%an') && key.includes('TG-107')) return ok(`Marc Riera\t${T(5 * H)}\nMarc Riera\t${T(6 * H)}\n`)
  if (key.startsWith('git log --format=%an') && key.includes('TG-101')) return ok(`Laia Soler\t${T(10 * H)}\n`)
  if (key.startsWith('git log --first-parent --merges')) return ok(MERGES)
  if (key.startsWith('git log --max-parents=0')) return ok(`${T(320 * H)}\n`)
  if (key === 'git log --format=%an%x09%ct m1^1..m1^2') return ok(`anna.puig\t${T(3 * H)}\nAnna Puig\t${T(2 * H)}\n`)
  if (key === 'git log --format=%an%x09%ct m2^1..m2^2') return ok(`Lsoler\t${T(310 * H)}\n`)
  if (key.startsWith('git log --first-parent --max-count=50') && key.endsWith('origin/stable')) return ok(`${T(400 * H)}\tchore: estructura\n`)
  if (key.startsWith('git log --format=%an')) return ok('')
  if (argv[0] === 'gh') return ok(PRS)
  return ok('')
}

describe('llegir el repositori', () => {
  test('refs, worktrees, URL i PR', () => {
    expect(parseRefs(REFS).map(r => r.name)).toEqual(['snapshot', 'feature/TG-107-informes', 'feature/TG-101-calendari', 'feature/TG-65-gitflow', 'stable', 'prod'])
    expect(parseWorktrees('worktree /a\nbranch refs/heads/x\n').get('x')).toBe('/a')
    expect(repoOf('git@github.com:Jsolee/claude-mods.git')).toBe('Jsolee/claude-mods')
    expect(repoOf('https://github.com/acme/app.git')).toBe('acme/app')
    expect(prOf(JSON.parse(PRS)[0])).toMatchObject({ number: 34, author: 'mriera', state: 'changes', checks: 'pass', url: 'https://github.com/acme/app/pull/34' })
    expect(prOf(JSON.parse(PRS)[1]).checks).toBe('fail')
  })

  test('el mapa: línies, branques, PR, equip i on és cada agent', async () => {
    const view = await collect(fakeRun(), NOW, false)
    expect(view.base).toBe('snapshot')
    expect(view.lines.map(l => [l.name, l.ahead])).toEqual([['prod', 0], ['stable', 0], ['snapshot', 130]])
    const byName = new Map(view.branches.map(b => [b.name, b]))
    expect(byName.get('feature/TG-107-informes')?.pr?.state).toBe('changes')
    expect(byName.get('feature/TG-101-calendari')?.isCurrent).toBe(true)
    expect(byName.get('feature/TG-107-informes')?.worktree).toBe('/w/app-pr34')
    expect(stateOf(byName.get('feature/TG-65-gitflow')!, NOW)).toBe('merged')
    expect(view.members.map(m => m.name)).toEqual(['Marc Riera', 'Laia Soler'])

    const agent = (description: string, path = '', cwd = '') => ({ description, path, cwd })
    expect(branchOfAgent(agent('Revisa', '/w/app-pr34/services/x.ts'), view)).toBe('feature/TG-107-informes')
    expect(branchOfAgent(agent('Revisa la PR #34'), view)).toBe('feature/TG-107-informes')
    expect(branchOfAgent(agent('Fes TG-101'), view)).toBe('feature/TG-101-calendari')
    expect(branchOfAgent(agent('Una altra cosa', '/w/app/apps/a.ts'), view)).toBe('feature/TG-101-calendari')
  })

  test('sense git, ni gh', async () => {
    const noGit: Run = async () => ({ exitCode: 128, stdout: '' })
    expect((await collect(noGit, NOW, false)).error).toBe('no-git')
    const noGh = fakeRun()
    const view = await collect(async argv => (argv[0] === 'gh' ? { exitCode: 1, stdout: '' } : noGh(argv)), NOW, false)
    expect(view.hasGh).toBe(false)
    expect(view.branches.every(b => b.pr === null)).toBe(true)
  })

  test('paraules', () => {
    expect(relTime(30_000)).toBe('ara')
    expect(relTime(5 * 60_000)).toBe('fa 5 min')
    expect(relTime(3 * H)).toBe('fa 3 h')
    expect(relTime(50 * H)).toBe('fa 2 dies')
    expect(initials('Anna Puig Serra')).toBe('AP')
    expect(initials('jordi-roca')).toBe('JR')
  })
})

test('el panell del projecte es dibuixa a cada superfície', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }) as any)
  on('command.register' as any, async () => ({ value: { command: 'x' } }) as any)
  const run = fakeRun()
  on('process.run', async (_$: any, e: any) => ({ value: { ...(await run([...e.argv])), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as any)
  await $.session.start({ cwd: '/w/app', surface: 'desktop', isInteractive: true } as any)
  const props = { title: 'Projecte', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } as any
  // «Actualitza» reads the repository; the press settles once the read has.
  const first = await $.ui.mount({ plugin: 'comunitat', surface: 'terminal', component: 'Pane', requestId: 'comunitat-projecte', props })
  await first.press({ key: 'refresh' })
  await first.unmount()
  for (const surface of ['terminal', 'desktop', 'vscode'] as const) {
    const ui = await $.ui.mount({ plugin: 'comunitat', surface, component: 'Pane', requestId: 'comunitat-projecte', props })
    const drawn = JSON.stringify(await ui.drawn())
    expect(drawn).toContain('acme/app')
    expect(drawn).toContain('TG-107')
    expect(drawn).toContain('canvis demanats')
    await ui.unmount()
  }
})

test('una persona amb diversos noms de git és una sola persona', () => {
  expect(personKey('anna.puig')).toBe(personKey('Anna Puig Serra'))
  expect(personKey('pau.mas')).toBe(personKey('Pau Mas'))
  expect(personKey('Laia Soler')).not.toBe(personKey('Lsoler'))
})

describe('la història i el que hi ha pendent', () => {
  test('fusions, releases i arcs sobre la mateixa línia', async () => {
    const view = await collect(fakeRun(), NOW, false)
    expect(parseMerge('Merge pull request #35 from org/feature/TG-83-sessio')).toEqual({ pr: 35, branch: 'feature/TG-83-sessio' })
    expect(parseMerge("Merge branch 'hotfix/x' into stable")).toEqual({ pr: null, branch: 'hotfix/x' })
    expect(view.web).toBe('https://github.com/acme/app')
    const [last, first] = view.history.merges
    expect(last).toMatchObject({ pr: 35, ref: 'TG-83', commits: 2 })
    expect(last?.authors).toHaveLength(1)
    expect(first?.ref).toBe('TG-65')
    expect(view.history.releases.map(r => r.line)).toEqual(['stable'])
    expect(view.history.start).toBe(NOW - 400 * H)
    const drawn = historySvg(800, view, new Map(), NOW)
    expect(drawn).toContain('TG-65')
    expect(drawn).toContain('stroke-dasharray="4 3"')
    expect(drawn).toContain('avui')
    expect(historyHeight(800, view, NOW)).toBeGreaterThan(90)
    // Every person a color of their own.
    expect(new Set(Object.values(view.colors)).size).toBe(Object.keys(view.colors).length)
  })

  test('el pendent, amb enllaços a GitHub', async () => {
    const view = await collect(fakeRun(), NOW, false)
    const todo = attentionOf(view, NOW).join('\n')
    expect(todo).toContain('**La CI falla** · [#32](https://github.com/acme/app/pull/32)')
    expect(todo).toContain('**Canvis demanats** · [#34](https://github.com/acme/app/pull/34)')
    expect(todo).toContain('**Release pendent** · snapshot té 130 commits')
    expect(todo).toContain('**Per esborrar** · una branca ja fusionada: [TG-65 gitflow](https://github.com/acme/app/tree/feature/TG-65-gitflow)')
    expect(mergesMarkdown(view)).toContain('[#35](https://github.com/acme/app/pull/35) **TG-83 sessio** · Anna · 2 commits')
  })
})

test('un login inicial+cognom és la mateixa persona que el seu nom complet', () => {
  setAliases(['Laia Soler Vidal', 'Lsoler', 'NuriaFont', 'jordi-roca'])
  expect(personKey('Lsoler')).toBe(personKey('Laia Soler Vidal'))
  expect(personKey('NuriaFont')).toBe('nuria font')
  setAliases([])
})

test('/projecte <ruta> accepta ~ per a la carpeta personal', () => {
  expect(expandHome('~/codi/app', '/Users/me')).toBe('/Users/me/codi/app')
  expect(expandHome('~', '/Users/me')).toBe('/Users/me')
  expect(expandHome('/w/app', '/Users/me')).toBe('/w/app')
  expect(expandHome('~altre/app', '/Users/me')).toBe('~altre/app')
})
