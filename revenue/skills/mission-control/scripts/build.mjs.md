# build.mjs

This is the `build.mjs` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `build.mjs` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~javascript
#!/usr/bin/env node
// Build one local dashboard of what is in flight across your repos. Git and GitHub are the source of truth;
// the only thing a person or agent writes is notes (goal, next, blockers, due) per feature.
//
// Usage: node build.mjs [--home DIR] [--fetch] [--days 14]
//   --home   the dashboard folder (default $DASHBOARD_HOME or ~/.repo-dashboard). It holds:
//              config.json   { "repos": ["/abs/path/to/repo", ...], "staleDays": 14, "releaseTag": "^v?\\d" }
//              notes/<key>.json   one per feature, key = branch name with every "/" as "__"
//            and the script writes state.json and dashboard.html there.
//   --fetch  run `git fetch --prune --tags -q` in each repo first (otherwise it reads what is already fetched).
//   --days   how far back "shipped" looks (default 14).
// Needs git. Uses the GitHub CLI (`gh`, signed in) for PRs, CI and releases when the repo is on GitHub; without it,
// the page still shows branches, worktrees, tags and unreleased commits. Read-only on every repo apart from --fetch.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d }
const HOME = path.resolve(arg('--home', process.env.DASHBOARD_HOME || path.join(os.homedir(), '.repo-dashboard')))
const FETCH = process.argv.includes('--fetch')
const DAYS = Number(arg('--days', 14))
const cfgPath = path.join(HOME, 'config.json')
if (!fs.existsSync(cfgPath)) {
  fs.mkdirSync(path.join(HOME, 'notes'), { recursive: true })
  fs.writeFileSync(cfgPath, JSON.stringify({ repos: [], staleDays: 14, releaseTag: '^v?\\d' }, null, 2) + '\n')
  console.error(`Created ${cfgPath}. Add your repo paths to "repos" and run again.`)
  process.exit(1)
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
const STALE = cfg.staleDays ?? 14
const TAG_RE = new RegExp(cfg.releaseTag ?? '^v?\\d')
const now = Date.now(), DAY = 86400000
const since = new Date(now - DAYS * DAY).toISOString().slice(0, 10)

const run = (cmd, args, cwd) => { try { return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 120000 }).trim() } catch { return null } }
const git = (repo, ...a) => run('git', a, repo)
const ghOk = run('gh', ['auth', 'status']) !== null || run('gh', ['--version']) !== null
const ghJson = (repo, args) => { if (!ghOk) return null; const o = run('gh', args, repo); try { return o ? JSON.parse(o) : null } catch { return null } }
const ageDays = (iso) => iso ? Math.floor((now - Date.parse(iso)) / DAY) : null

const repos = [], features = new Map(), problems = []
const feature = (key) => { if (!features.has(key)) features.set(key, { key, repos: [], prs: [], stage: 'local', last: null }); return features.get(key) }
const touch = (f, iso) => { if (iso && (!f.last || iso > f.last)) f.last = iso }

for (const p of cfg.repos || []) {
  const dir = path.resolve(p.replace(/^~/, os.homedir()))
  if (!git(dir, 'rev-parse', '--git-dir')) { problems.push({ kind: 'repo missing', repo: dir, why: 'not a git repo' }); continue }
  if (FETCH) git(dir, 'fetch', '--prune', '--tags', '-q')
  const remote = git(dir, 'remote', 'get-url', 'origin') || ''
  const slug = (remote.match(/github\.com[:/](.+?)(\.git)?$/) || [])[1] || null
  const name = slug ? slug.split('/')[1] : path.basename(dir)
  const main = (git(dir, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD') || '').replace(/^origin\//, '') ||
    (git(dir, 'rev-parse', '--verify', '-q', 'main') ? 'main' : 'master')
  const base = git(dir, 'rev-parse', '--verify', '-q', `origin/${main}`) ? `origin/${main}` : main
  const r = { name, dir, slug, main, dirty: (git(dir, 'status', '--porcelain') || '').split('\n').filter(Boolean).length }

  // Releases: newest matching tag, and what on main is not in it yet.
  const tags = (git(dir, 'tag', '--sort=-creatordate', '--format=%(refname:short)|%(creatordate:iso-strict)') || '')
    .split('\n').filter(Boolean).map((l) => { const [tag, at] = l.split('|'); return { tag, at } }).filter((t) => TAG_RE.test(t.tag))
  r.tags = tags.slice(0, 5)
  const lastTag = tags[0]?.tag
  r.unreleased = lastTag ? Number(git(dir, 'rev-list', '--count', `${lastTag}..${base}`) || 0) : null
  r.oldestUnreleased = lastTag && r.unreleased ? (git(dir, 'log', '--reverse', '--format=%cI', `${lastTag}..${base}`) || '').split('\n')[0] : null
  const rel = ghJson(dir, ['release', 'list', '--limit', '5', '--json', 'tagName,publishedAt,isPrerelease,isDraft'])
  if (rel) r.releases = rel
  if (r.unreleased && ageDays(r.oldestUnreleased) > STALE) problems.push({ kind: 'unreleased', repo: name, why: `${r.unreleased} commits on ${main} not in ${lastTag}, oldest ${ageDays(r.oldestUnreleased)} days` })

  // CI on main.
  const ci = ghJson(dir, ['run', 'list', '--branch', main, '--limit', '1', '--json', 'conclusion,status,url,workflowName,createdAt'])?.[0]
  if (ci) { r.ci = ci; if (ci.conclusion === 'failure') problems.push({ kind: 'main is red', repo: name, why: `${ci.workflowName} failed`, url: ci.url }) }

  // Branches and worktrees.
  const wt = {}
  let cur = null
  for (const l of (git(dir, 'worktree', 'list', '--porcelain') || '').split('\n')) {
    if (l.startsWith('worktree ')) cur = l.slice(9)
    if (l.startsWith('branch ')) wt[l.slice(7).replace('refs/heads/', '')] = cur
  }
  const refs = (git(dir, 'for-each-ref', '--format=%(refname)|%(committerdate:iso-strict)|%(subject)', 'refs/heads', 'refs/remotes/origin') || '').split('\n').filter(Boolean)
  const branches = new Map()
  for (const l of refs) {
    const [ref, at, subject] = l.split('|')
    const isRemote = ref.startsWith('refs/remotes/')
    const b = ref.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\/origin\//, '')
    if (b === 'HEAD' || b === main) continue
    const e = branches.get(b) || { branch: b, local: false, pushed: false, at, subject }
    if (isRemote) e.pushed = true; else e.local = true
    if (at > e.at) { e.at = at; e.subject = subject }
    branches.set(b, e)
  }
  for (const b of branches.values()) {
    const ref = b.local ? b.branch : `origin/${b.branch}`
    const [, ahead] = (git(dir, 'rev-list', '--left-right', '--count', `${base}...${ref}`) || '0 0').split(/\s+/).map(Number)
    if (!ahead) continue // nothing on it that is not on main
    const f = feature(b.branch)
    f.repos.push({ repo: name, ahead, pushed: b.pushed, worktree: wt[b.branch] || null, subject: b.subject, at: b.at })
    if (b.pushed && f.stage === 'local') f.stage = 'pushed'
    touch(f, b.at)
  }

  // Pull requests.
  const open = ghJson(dir, ['pr', 'list', '--state', 'open', '--limit', '100', '--json', 'number,title,headRefName,isDraft,reviewDecision,statusCheckRollup,updatedAt,createdAt,url']) || []
  for (const pr of open) {
    const f = feature(pr.headRefName)
    const checks = pr.statusCheckRollup || []
    const failing = checks.filter((c) => ['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED'].includes(c.conclusion || c.state)).length
    const pending = checks.filter((c) => ['PENDING', 'QUEUED', 'IN_PROGRESS', 'EXPECTED'].includes(c.status || c.state)).length
    const p = { repo: name, number: pr.number, title: pr.title, url: pr.url, draft: pr.isDraft, review: pr.reviewDecision || 'NONE', failing, pending, updatedAt: pr.updatedAt, state: 'open' }
    f.prs.push(p); f.stage = 'in review'; touch(f, pr.updatedAt)
    const ref = `${name}#${pr.number}`
    if (failing) problems.push({ kind: 'checks failing', repo: name, why: `${ref} ${pr.title}`, url: pr.url, feature: f.key })
    else if (pr.reviewDecision === 'CHANGES_REQUESTED') problems.push({ kind: 'changes requested', repo: name, why: `${ref} ${pr.title}`, url: pr.url, feature: f.key })
    else if (pr.reviewDecision === 'APPROVED' && !pending && !pr.isDraft) problems.push({ kind: 'ready to merge', repo: name, why: `${ref} ${pr.title}`, url: pr.url, feature: f.key })
    else if (!pr.isDraft && ageDays(pr.createdAt) >= 2 && pr.reviewDecision !== 'APPROVED') problems.push({ kind: 'waiting for review', repo: name, why: `${ref} open ${ageDays(pr.createdAt)} days`, url: pr.url, feature: f.key })
  }
  const merged = ghJson(dir, ['pr', 'list', '--state', 'merged', '--limit', '100', '--search', `merged:>=${since}`, '--json', 'number,title,headRefName,mergedAt,url,mergeCommit,baseRefName']) || []
  r.shipped = []
  for (const pr of merged) {
    const sha = pr.mergeCommit?.oid
    const inRelease = lastTag && sha ? git(dir, 'merge-base', '--is-ancestor', sha, lastTag) !== null : false
    const onMain = pr.baseRefName === main
    const p = { repo: name, number: pr.number, title: pr.title, url: pr.url, mergedAt: pr.mergedAt, state: inRelease ? 'released' : onMain ? 'on main' : `merged into ${pr.baseRefName}` }
    r.shipped.push(p)
    const f = features.get(pr.headRefName) || feature(pr.headRefName)
    f.prs.push(p); touch(f, pr.mergedAt)
    if (f.stage !== 'in review') f.stage = f.prs.every((x) => x.state === 'released') ? 'released' : 'on main'
  }
  repos.push(r)
}

// Notes: what a person or agent knows that git does not.
const notesDir = path.join(HOME, 'notes')
fs.mkdirSync(notesDir, { recursive: true })
for (const file of fs.readdirSync(notesDir).filter((f) => f.endsWith('.json'))) {
  let n; try { n = JSON.parse(fs.readFileSync(path.join(notesDir, file), 'utf8')) } catch { problems.push({ kind: 'bad notes file', why: file }); continue }
  const key = n.key || file.replace(/\.json$/, '').replaceAll('__', '/')
  const f = features.get(key) || feature(key)
  if (!f.repos.length && !f.prs.length) f.stage = 'planned'
  f.notes = n
  // Planned items that name branches doing their work inherit those branches' stage.
  for (const b of n.work || []) { const w = features.get(b); if (w && w !== f) { f.work = [...(f.work || []), { key: b, stage: w.stage }]; w.partOf = key } }
  for (const b of n.blockers || []) problems.push({ kind: 'blocked', why: `${n.title || key}: ${b}`, feature: key })
  if (n.due && n.due < new Date().toISOString().slice(0, 10) && !['released'].includes(f.stage)) problems.push({ kind: 'past due', why: `${n.title || key} was due ${n.due}`, feature: key })
  if (n.due && f.stage === 'planned' && !(n.work || []).length) problems.push({ kind: 'no branch linked', why: `${n.title || key} is due ${n.due} and nothing is doing it`, feature: key })
}
for (const f of features.values()) {
  if (['local', 'pushed'].includes(f.stage) && ageDays(f.last) > STALE) problems.push({ kind: 'stale branch', why: `${f.key} untouched ${ageDays(f.last)} days (${f.repos.map((x) => x.repo).join(', ')})`, feature: f.key })
}

const ORDER = ['main is red', 'checks failing', 'changes requested', 'ready to merge', 'past due', 'blocked', 'waiting for review', 'no branch linked', 'unreleased', 'stale branch', 'repo missing', 'bad notes file']
problems.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
const STAGES = ['in review', 'pushed', 'local', 'planned', 'on main', 'released']
const list = [...features.values()].filter((f) => f.stage !== 'released' || ageDays(f.last) <= DAYS)
  .sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || (b.last || '').localeCompare(a.last || ''))
const state = { at: new Date().toISOString(), repos, features: list, problems }
fs.writeFileSync(path.join(HOME, 'state.json.tmp'), JSON.stringify(state, null, 1))
fs.renameSync(path.join(HOME, 'state.json.tmp'), path.join(HOME, 'state.json'))

// ---------- page ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const ago = (iso) => { const d = ageDays(iso); return d == null ? '' : d === 0 ? 'today' : `${d}d` }
const link = (u, t) => u ? `<a href="${esc(u)}">${esc(t)}</a>` : esc(t)
const counts = STAGES.map((s) => [s, list.filter((f) => f.stage === s).length])
const headline = problems.length
  ? `${problems.length} thing${problems.length > 1 ? 's' : ''} need${problems.length > 1 ? '' : 's'} you. First: ${problems[0].kind}, ${problems[0].why}.`
  : 'Nothing needs you right now.'
const prCell = (f) => f.prs.map((p) => {
  const tag = p.state !== 'open' ? p.state : p.failing ? 'checks failing' : p.pending ? 'checks running' : p.draft ? 'draft' : p.review.toLowerCase().replace('_', ' ')
  return `${link(p.url, `${p.repo}#${p.number}`)} <span class="pill ${p.failing ? 'bad' : p.review === 'APPROVED' ? 'good' : ''}">${esc(tag)}</span>`
}).join('<br>')
const rows = list.map((f) => `<tr><td><b>${esc(f.notes?.title || f.key)}</b><div class="mut">${esc(f.key)}${f.partOf ? ` · part of ${esc(f.partOf)}` : ''}</div></td>
<td><span class="stage s-${f.stage.replace(' ', '-')}">${esc(f.stage)}</span></td>
<td>${f.repos.map((r) => `${esc(r.repo)} <span class="mut">+${r.ahead}${r.worktree ? ' · worktree' : ''}</span>`).join('<br>')}${(f.work || []).map((w) => `<div class="mut">${esc(w.key)}: ${esc(w.stage)}</div>`).join('')}</td>
<td>${prCell(f)}</td><td>${esc(f.notes?.next || '')}${(f.notes?.blockers || []).map((b) => `<div class="bad-t">${esc(b)}</div>`).join('')}</td>
<td>${esc(f.notes?.due || '')}</td><td class="mut">${ago(f.last)}</td></tr>`).join('')
const tiles = repos.map((r) => `<div class="tile"><b>${esc(r.name)}</b>
<div>${r.ci ? `${link(r.ci.url, r.ci.conclusion || r.ci.status)} on ${esc(r.main)}` : '<span class="mut">no CI read</span>'}</div>
<div class="mut">${r.tags[0] ? `${esc(r.tags[0].tag)} ${ago(r.tags[0].at)} ago` : 'no release tag'}${r.unreleased ? ` · ${r.unreleased} unreleased` : ''}${r.dirty ? ` · ${r.dirty} uncommitted` : ''}</div></div>`).join('')
const shipped = repos.flatMap((r) => r.shipped || []).sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>In flight</title><style>
:root{--bg:#fafaf8;--fg:#1c1c1a;--mut:#6d6c68;--line:#e3e1db;--card:#fff;--bad:#b3261e;--good:#2e7d32;--acc:#2f6fb0}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#141413;--fg:#ebeae6;--mut:#9a9893;--line:#2b2a28;--card:#1c1c1a;--bad:#f2867e;--good:#7cc47f;--acc:#6aa6e0}}
:root[data-theme=dark]{--bg:#141413;--fg:#ebeae6;--mut:#9a9893;--line:#2b2a28;--card:#1c1c1a;--bad:#f2867e;--good:#7cc47f;--acc:#6aa6e0}
body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.4 system-ui,sans-serif}main{max-width:1600px;margin:0 auto;padding:16px}
h1{font-size:18px;margin:0}h2{font-size:14px;margin:20px 0 6px}a{color:var(--acc)}.mut{color:var(--mut)}.bad-t{color:var(--bad)}
.tiles{display:flex;gap:8px;overflow-x:auto;margin:10px 0}.tile{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px;min-width:180px}
.needs{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 10px;columns:2 420px}.needs div{break-inside:avoid;padding:2px 0}
.k{display:inline-block;min-width:130px;font-weight:600}table{width:100%;border-collapse:collapse;background:var(--card)}
th,td{text-align:left;vertical-align:top;padding:5px 8px;border-bottom:1px solid var(--line)}th{color:var(--mut);font-weight:500}
.pill{font-size:11px;padding:0 5px;border-radius:6px;border:1px solid var(--line)}.pill.bad{color:var(--bad)}.pill.good{color:var(--good)}
.stage{font-weight:600}.s-in-review{color:var(--acc)}.s-released,.s-on-main{color:var(--good)}.s-planned{color:var(--mut)}
.wrap{overflow-x:auto}</style></head><body><main>
<h1>${esc(headline)}</h1><div class="mut">Built ${esc(state.at.slice(0, 16).replace('T', ' '))} UTC from git${ghOk ? ' and GitHub' : ''} · ${counts.map(([s, n]) => `${n} ${s}`).join(' · ')}</div>
<div class="tiles">${tiles}</div>
<h2>Needs you</h2><div class="needs">${problems.map((p) => `<div><span class="k">${esc(p.kind)}</span>${link(p.url, p.why)}</div>`).join('') || '<div class="mut">Nothing.</div>'}</div>
<h2>In flight</h2><div class="wrap"><table><tr><th>Feature</th><th>Stage</th><th>Repos</th><th>PRs</th><th>Next / blockers</th><th>Due</th><th>Last</th></tr>${rows}</table></div>
<h2>Shipped in the last ${DAYS} days</h2><div class="wrap"><table>${shipped.map((p) => `<tr><td>${link(p.url, `${p.repo}#${p.number}`)}</td><td>${esc(p.title)}</td><td>${esc(p.state)}</td><td class="mut">${ago(p.mergedAt)}</td></tr>`).join('') || '<tr><td class="mut">Nothing merged.</td></tr>'}</table></div>
</main></body></html>`
fs.writeFileSync(path.join(HOME, 'dashboard.html.tmp'), html)
fs.renameSync(path.join(HOME, 'dashboard.html.tmp'), path.join(HOME, 'dashboard.html'))
console.log(`${headline}\nWrote ${path.join(HOME, 'dashboard.html')} (${list.length} features, ${repos.length} repos, ${problems.length} items need you)`)
~~~~~
