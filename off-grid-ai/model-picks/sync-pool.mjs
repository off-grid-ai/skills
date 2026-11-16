#!/usr/bin/env node
// Builds the model pool for the Model Picks board: every model a phone or desktop could be given, of
// every kind (chat, image, video, voice, transcription, computer use), from the bundled catalog,
// both apps' catalog/models.json, the few entries each app keeps in its own code, Argus's recent
// launches and Hugging Face's trending GGUF repos. Writes one JSON file per model into OUT_DIR, in
// the shape the board's `pool` collection stores, ready for an ArtifactData batch, plus `_meta.json`
// (the board's `meta/sync` doc: which ref the catalog files came from).
//
//   node sync-pool.mjs [outDir] [--ref <git ref> | --worktree] [--offline]
//
//   --ref <ref>   read catalog/models.json and the in-code entries from this git ref in the mobile
//                 and desktop repos (default origin/main). e.g. --ref release/analytics-video
//   --worktree    read them from the local working trees instead (uncommitted edits included)
//   --offline     skip Argus and Hugging Face (catalogs and in-code entries only)
//
// Env: OFFGRID_ROOT (default ~/code/off-grid-ai). No keys: Hugging Face's public API only.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--ref')

const ROOT = process.env.OFFGRID_ROOT ?? path.join(os.homedir(), 'code/off-grid-ai')
const OUT = path.resolve(positional[0] ?? path.join(os.tmpdir(), 'model-picks-pool'))
const WORKTREE = flag('--worktree')
const REF = WORKTREE ? 'worktree' : (opt('--ref') ?? 'origin/main')
const OFFLINE = flag('--offline')
const ARGUS = path.join(os.homedir(), '.olympus/argus/sources/models.json')
const HF = 'https://huggingface.co/api/models'
const KINDS = new Set(['text', 'vision', 'image', 'video', 'voice', 'transcription', 'computer_use'])
// Never offered in either app (Ali, 2026-10-20): uncensored, abliterated or explicit variants.
const BLOCKED = /abliterat|uncensor|heretic|obliterat|dealign|nsfw|explicit/i

const require = createRequire(import.meta.url)
const M = require(path.join(ROOT, 'shared/packages/models'))
const { CATALOG } = M

const pool = new Map()
const seen = {}
const keyOf = (id) => id.replace(/[^A-Za-z0-9_.~:@+-]/g, '~')
const gb = (bytes) => +(bytes / 1e9).toFixed(3)

/** A file of `repo` at the chosen ref (or the working tree), or null. */
function readRepoFile(repo, file) {
  try {
    if (WORKTREE) return fs.readFileSync(path.join(ROOT, repo, file), 'utf8')
    if (file.startsWith('pro/')) {
      // pro is a submodule: read it at the commit the ref pins.
      const sha = execFileSync('git', ['-C', path.join(ROOT, repo), 'ls-tree', REF, 'pro'], { encoding: 'utf8' }).split(/\s+/)[2]
      return execFileSync('git', ['-C', path.join(ROOT, repo, 'pro'), 'show', `${sha}:${file.slice(4)}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    }
    return execFileSync('git', ['-C', path.join(ROOT, repo), 'show', `${REF}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
  }
}
const commitOf = (repo) => {
  try {
    return execFileSync('git', ['-C', path.join(ROOT, repo), 'rev-parse', '--short', WORKTREE ? 'HEAD' : REF], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

/** The facts the board's per-kind views need, read once here with the shared package's own rules. */
function facts(entry) {
  const files = entry.files ?? []
  const primary = files.find((f) => f.role === 'primary') ?? files.find((f) => !f.role)
  const total = files.reduce((s, f) => s + (f.sizeBytes ?? 0), 0)
  const out = {
    totalGB: gb(total),
    totalBytes: total,
    fileCount: files.length,
    primaryFile: primary?.name ?? null,
    minRamGb: entry.minRamGb ?? null,
    tags: entry.tags ?? [],
    quantOf: entry.quantOf ?? null,
    availability: entry.availability ?? null,
    grounder: entry.grounder ?? null,
    sourceModelId: entry.sourceModelId ?? null,
    minLlamaBuild: entry.minLlamaBuild ?? null,
    nonCommercial: entry.nonCommercial ?? null,
    engine: entry.engine ?? null,
    ours: M.isOffGridHfRepo(entry.id),
  }
  if (entry.kind === 'video' && primary) {
    out.video = {
      arch: M.videoArchitecture(primary.name),
      startImage: M.videoTakesStartImage(primary.name),
      packOk: !M.videoPackError(files) && files.every((f) => (f.sizeBytes ?? 0) > 0),
      support: Object.fromEntries(['android', 'ios', 'macos', 'windows', 'linux'].map((p) => [p, M.videoSupportLevel(primary.name, p)])),
    }
  }
  return out
}

/** Add or enrich one pool entry; sources accumulate, the first full entry wins. */
function add(entry, source, extra = {}) {
  if (!KINDS.has(entry.kind) || BLOCKED.test(`${entry.id} ${entry.name}`)) return
  const primary = entry.files?.find((f) => f.role === 'primary') ?? entry.files?.find((f) => !f.role)
  const mmproj = entry.files?.find((f) => f.role === 'mmproj')
  if (!primary?.sizeBytes) return
  const key = keyOf(entry.id)
  const prev = pool.get(key)
  // Chat: what a phone downloads (weights + vision file). Other kinds: every file (totalGB).
  const sizeGB = +((primary.sizeBytes + (mmproj?.sizeBytes ?? 0)) / 1e9).toFixed(2)
  const doc = prev ?? {
    id: entry.id,
    name: entry.name,
    org: entry.org ?? entry.id.split('/')[0],
    kind: entry.kind,
    params: entry.params ?? null,
    activeParams: entry.activeParams ?? null,
    quant: entry.quant ?? null,
    quality: entry.quality ?? null,
    sizeGB,
    supersededBy: entry.supersededBy ?? null,
    ...facts(entry),
    sources: [],
    entry,
  }
  if (!doc.sources.includes(source)) doc.sources.push(source)
  // Where the entry sits in each list it came from: the apps merge lists in order, and the pick
  // rule keeps that order between models of equal size.
  doc.order = { ...(doc.order ?? {}), [source]: doc.order?.[source] ?? (seen[source] = (seen[source] ?? -1) + 1) }
  Object.assign(doc, extra)
  pool.set(key, doc)
}

/** A repo's catalog/models.json sections, parsed by the same shared parser the app uses. */
function catalogSections(repo) {
  const raw = readRepoFile(repo, 'catalog/models.json')
  if (!raw) return {}
  const parse = repo === 'mobile' ? M.parseMobileCatalogSections : M.parseDesktopCatalogSections
  return M.parseCatalogEnvelope(JSON.parse(raw), parse)?.sections ?? {}
}

/** `export const NAME: ModelEntry = { … }` literals from a TS file (plain object literals only). */
function literalEntries(source, names) {
  const out = []
  for (const name of names) {
    const at = source.indexOf(`export const ${name}: ModelEntry = {`)
    if (at < 0) continue
    let i = source.indexOf('{', at), depth = 0, end = i
    for (; end < source.length; end++) {
      if (source[end] === '{') depth++
      else if (source[end] === '}' && --depth === 0) break
    }
    try {
      out.push(new Function(`return (${source.slice(i, end + 1)})`)())
    } catch (e) {
      console.error('[desktop-code]', name, e.message)
    }
  }
  return out
}

const mobileSections = catalogSections('mobile')
const desktopSections = catalogSections('desktop')

for (const e of CATALOG) add(e, 'bundled')
for (const e of mobileSections.models ?? []) add(e, 'catalog-mobile')
for (const e of desktopSections.models ?? []) add(e, 'catalog-desktop')

// Desktop keeps a few entries in its own code (models-manager.ts DESKTOP_CATALOG): Bonsai 2 (Prism
// engine) and the Decider task models. Kev is built by a helper and is not read here.
const mm = readRepoFile('desktop', 'src/main/models-manager.ts')
if (mm) for (const e of literalEntries(mm, ['BONSAI_2', 'BONSAI_2_9B', 'DECIDER_2B', 'DECIDER_2B_VISION'])) add(e, 'desktop-code')

// Mobile keeps its speech-to-text list (whisperModels.ts, sizes in MB) and its one voice (Kokoro,
// pro/audio) in code, outside the shared catalog.
const whisper = readRepoFile('mobile', 'src/services/whisperModels.ts') ?? ''
const mobileWhisper = [...whisper.matchAll(/\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*size:\s*(\d+),\s*lang:\s*'(\w+)',\s*url:\s*`\$\{GGML_BASE\}\/([^`]+)`/g)]
  .map(([, id, name, size, lang, file]) => ({ id, name, size: +size, lang, url: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${file}` }))
for (const w of [...mobileWhisper, ...(mobileSections.transcription ?? [])]) {
  const src = mobileWhisper.includes(w) ? 'mobile-code' : 'catalog-mobile'
  add(
    { id: `mobile/whisper/${w.id}`, name: `Whisper ${w.name}${w.lang === 'en' ? ' (English)' : ''}`, kind: 'transcription', org: 'ggerganov',
      files: [{ name: w.url.split('/').pop(), url: w.url, sizeBytes: w.size * 1e6, role: 'primary' }] },
    src,
    { lang: w.lang, mobileId: w.id },
  )
}
const kokoro = readRepoFile('mobile', 'pro/audio/engine/tts/engines/kokoro/KokoroEngine.ts') ?? ''
const kokoroSize = kokoro.match(/sizeBytes:\s*([\d\s*]+),/)?.[1]
if (kokoroSize) {
  const warn = +(readRepoFile('mobile', 'pro/audio/constants/ttsModels.ts') ?? '').match(/TTS_WARN_RAM_GB = (\d+)/)?.[1] || null
  add(
    { id: 'mobile/tts/kokoro', name: 'Kokoro TTS', kind: 'voice', org: 'hexgrad',
      files: [{ name: 'kokoro-medium', url: '', sizeBytes: Function(`return ${kokoroSize}`)(), role: 'primary' }] },
    'mobile-code',
    { warnBelowRamGb: warn },
  )
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'off-grid-model-picks' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

/** A GGUF repo's Q4_K_M weights (else the closest Q4) and its mmproj, as catalog files. */
async function ggufFiles(repo) {
  const info = await getJSON(`${HF}/${repo}?blobs=true`)
  const ggufs = (info.siblings ?? []).filter((s) => s.rfilename.endsWith('.gguf') && s.size)
  const weights = ggufs.filter((s) => !/mmproj/i.test(s.rfilename) && !s.rfilename.includes('/'))
  const pick =
    weights.find((s) => /Q4_K_M/i.test(s.rfilename)) ??
    weights.find((s) => /Q4/i.test(s.rfilename)) ??
    weights.sort((a, b) => a.size - b.size)[Math.floor(weights.length / 2)]
  if (!pick) return null
  const mm = ggufs
    .filter((s) => /mmproj/i.test(s.rfilename))
    .sort((a, b) => (/f16/i.test(b.rfilename) ? 1 : 0) - (/f16/i.test(a.rfilename) ? 1 : 0))[0]
  const url = (f) => `https://huggingface.co/${repo}/resolve/main/${f}`
  const quant = pick.rfilename.match(/(I?Q\d[A-Z0-9_]*|F16|BF16)/i)?.[1]?.toUpperCase() ?? null
  return {
    quant,
    files: [
      { name: pick.rfilename, url: url(pick.rfilename), sizeBytes: pick.size, role: 'primary' },
      ...(mm ? [{ name: mm.rfilename, url: url(mm.rfilename), sizeBytes: mm.size, role: 'mmproj' }] : []),
    ],
  }
}

const paramsFrom = (id) => {
  const m = id.match(/(\d+(?:\.\d+)?)B(?![a-z])/i)
  return m ? +m[1] : null
}

if (!OFFLINE) {
  // Argus: recent first-party launches, already filtered to chat models people talk about.
  try {
    const launches = JSON.parse(fs.readFileSync(ARGUS, 'utf8')).data?.launches ?? []
    for (const l of launches.filter((x) => x.kind === 'chat')) {
      const repo = l.gguf?.official?.find((r) => /gguf/i.test(r)) ?? l.gguf?.community?.[0] ?? l.gguf?.official?.[0]
      if (!repo) continue
      try {
        const g = await ggufFiles(repo)
        if (!g) continue
        add(
          { id: repo, name: l.name, kind: 'text', org: l.maker, params: l.params ?? paramsFrom(l.id), activeParams: l.activeParams ?? undefined, quant: g.quant, files: g.files },
          'argus',
          { launched: l.launched, likes: l.likes, url: l.url },
        )
      } catch (e) {
        console.error('[argus]', repo, e.message)
      }
    }
  } catch (e) {
    console.error('[argus] no feed:', e.message)
  }

  // Hugging Face: trending GGUF text-generation repos right now.
  try {
    const trending = await getJSON(`${HF}?filter=gguf&pipeline_tag=text-generation&sort=trendingScore&limit=40`)
    for (const t of trending) {
      if (pool.has(keyOf(t.id))) {
        const d = pool.get(keyOf(t.id))
        if (!d.sources.includes('hf-trending')) d.sources.push('hf-trending')
        continue
      }
      try {
        const g = await ggufFiles(t.id)
        if (!g) continue
        add(
          { id: t.id, name: t.id.split('/')[1].replace(/-GGUF$/i, ''), kind: 'text', org: t.id.split('/')[0], params: paramsFrom(t.id), quant: g.quant, files: g.files },
          'hf-trending',
          { likes: t.likes, url: `https://huggingface.co/${t.id}` },
        )
      } catch (e) {
        console.error('[hf]', t.id, e.message)
      }
    }
  } catch (e) {
    console.error('[hf] trending failed:', e.message)
  }
}

// Research decisions (suggestions.json beside this script): a suggested model joins the pool with
// files read from Hugging Face; one whose files cannot be resolved stays a suggestion with no entry.
let suggestions = { items: [] }
try {
  suggestions = JSON.parse(fs.readFileSync(new URL('./suggestions.json', import.meta.url), 'utf8'))
} catch (e) {
  console.error('[suggestions]', e.message)
}
for (const it of suggestions.items ?? []) {
  const { id, kind, name, org, repo, files: wanted, sourceModelId, ...decision } = it
  if (!pool.has(keyOf(id)) && repo && wanted && !OFFLINE) {
    try {
      const info = await getJSON(`${HF}/${repo}?blobs=true`)
      const files = wanted.map((w) => {
        const f = (info.siblings ?? []).find((x) => new RegExp(w.match).test(x.rfilename))
        return f && { name: f.rfilename, url: `https://huggingface.co/${repo}/resolve/main/${f.rfilename}`, sizeBytes: f.lfs?.size ?? f.size, role: w.role }
      })
      if (files.every((f) => f?.sizeBytes)) add({ id, name, kind, org, sourceModelId, files }, 'suggested')
    } catch (e) {
      console.error('[suggested]', id, e.message)
    }
  }
  if (!pool.has(keyOf(id)) && name) {
    pool.set(keyOf(id), { id, name, org: org ?? id.split('/')[0], kind, params: null, activeParams: null, quant: null, quality: null, sizeGB: null, totalGB: null,
      supersededBy: null, sourceModelId: sourceModelId ?? null, ours: M.isOffGridHfRepo(id), tags: [], fileCount: 0, sources: ['research'], entry: null })
  }
  const doc = pool.get(keyOf(id))
  if (doc) doc.decision = { ...decision, readAt: suggestions.readAt }
}

// Which platforms list an image model today, by the apps' own rules: Desktop lists every catalog image
// model its sd.cpp build loads; phones list the sd.cpp packs getSDImageModels (mobile
// huggingFaceModelBrowser.ts) keeps, minus those a newer model replaces.
const mobileMerged = new Map(M.mergeCatalogEntries(CATALOG, mobileSections.models, (m) => m.id).map((m) => [m.id, m]))
const mobileListedImages = new Set((mobileSections.models ?? []).filter((m) => m.kind === 'image').map((m) => m.id))
const HOST = { macos: 'darwin', windows: 'win32', linux: 'linux', android: 'android', ios: 'ios' }
for (const d of pool.values()) {
  if (d.kind !== 'image' || !d.entry) continue
  const e = mobileMerged.get(d.id) ?? d.entry
  const first = e.files[0]?.name ?? ''
  const pack = M.sdImagePackFor?.(first)
  const phoneOk = (p) => M.isImageWeightAvailableOn(first, p) && !e.supersededBy &&
    (pack ? pack.family !== 'qwen-image-2.1' || e.id === 'leejet/Qwen-Image-2.1-GGUF'
      : e.files.length === 1 && (mobileListedImages.has(e.id) || /^(off-?grid-ai\/|mzwing\/SDXL-Lightning|OlegSkutte\/sdxl-turbo)/i.test(e.id)))
  d.mobileSd = { android: phoneOk('android'), ios: phoneOk('ios') }
  d.imageHosts = Object.fromEntries(Object.entries(HOST).map(([k, h]) => [k, M.isImageWeightAvailableOn(first, h)]))
}

// Release date next to each name: the catalog's releaseDate, Argus's launch date, else the Hugging
// Face creation date of the upstream model (sourceModelId when set, else the repo itself).
const releaseOf = new Map()
for (const d of pool.values()) {
  if (d.entry?.releaseDate) d.released = { date: d.entry.releaseDate, source: 'catalog releaseDate' }
  else if (d.launched) d.released = { date: d.launched.slice(0, 10), source: 'Argus launch' }
}
if (!OFFLINE) {
  for (const d of pool.values()) {
    if (d.released || d.quantOf) continue
    const repo = d.sourceModelId ?? d.id
    if (repo.split('/').length !== 2 || repo.startsWith('mobile/')) continue
    try {
      const info = releaseOf.get(repo) ?? (await getJSON(`${HF}/${repo}`))
      releaseOf.set(repo, info)
      if (info.createdAt) d.released = { date: info.createdAt.slice(0, 10), source: `Hugging Face ${repo} created`, url: `https://huggingface.co/${repo}` }
    } catch (e) {
      console.error('[released]', repo, e.message)
    }
  }
}
// A Light build is the same model: it shows its full build's date.
for (const d of pool.values()) if (!d.released && d.quantOf) d.released = pool.get(keyOf(d.quantOf))?.released ?? null

// One benchmark per kind (benchmarks.json beside this script, kept by hand from the leaderboards).
let benchmarks = {}
try {
  benchmarks = JSON.parse(fs.readFileSync(new URL('./benchmarks.json', import.meta.url), 'utf8'))
} catch (e) {
  console.error('[benchmarks]', e.message)
}
for (const d of pool.values()) {
  const b = benchmarks[d.id] ?? (d.sourceModelId ? benchmarks[d.sourceModelId] : undefined)
  const edit = benchmarks[`edit:${d.id}`]
  d.editBench = edit ? { score: edit.score, benchmark: edit.benchmark, url: edit.url, readAt: edit.readAt, matched: edit.matched ?? null } : null
  d.bench = b ? { score: b.score, benchmark: b.benchmark, url: b.url, readAt: b.readAt, matched: b.matched ?? null, estimated: !!b.estimated } : null
}

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
const syncedAt = new Date().toISOString()
for (const [key, doc] of pool) fs.writeFileSync(path.join(OUT, `${key}.json`), JSON.stringify({ ...doc, syncedAt }))
const bySource = {}, byKind = {}
for (const d of pool.values()) {
  byKind[d.kind] = (byKind[d.kind] ?? 0) + 1
  for (const s of d.sources) bySource[s] = (bySource[s] ?? 0) + 1
}
const imagePicks = Object.fromEntries([8, 16, 24, 32, 64, 128].map((ram) => [ram, M.desktopImagePicks(ram)]))
const meta = { imagePicks, benchmarks: benchmarks._benchmarks ?? null, ref: REF, commits: { mobile: commitOf('mobile'), desktop: commitOf('desktop'), shared: commitOf('shared') }, syncedAt, models: pool.size, byKind, bySource }
fs.writeFileSync(path.join(OUT, '_meta.json'), JSON.stringify(meta))
console.log(JSON.stringify({ out: OUT, ...meta }))
