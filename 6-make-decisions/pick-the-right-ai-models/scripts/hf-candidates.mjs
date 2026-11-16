#!/usr/bin/env node
// Lists candidate open-weight models from the Hugging Face public API (no key needed) as a table
// you can paste into your research notes: id, task, size in billions of parameters, licence,
// gated or not, release date, downloads, likes and link.
//
//   node hf-candidates.mjs --task text-generation [--library gguf] [--search qwen]
//        [--sort trending|downloads|likes|created] [--limit 30] [--max-params 14] [--min-params 1]
//        [--since 2026-01-01] [--exclude "uncensor|abliterat"] [--json]
//
//   --task      a Hugging Face pipeline tag: text-generation, image-text-to-text, text-to-image,
//               text-to-video, text-to-speech, automatic-speech-recognition, feature-extraction, ...
//   --library   a runtime or format tag: gguf, mlx, onnx, transformers, diffusers, ...
//   --max-params / --min-params   size limits in billions of parameters (when the size is known)
//   --since     only models created on or after this date
//   --exclude   drop ids matching this regex
//   --json      print JSON instead of a markdown table
//
// Sizes come from the repo's safetensors or GGUF metadata. Unknown sizes show "?" and are kept.
const argv = process.argv.slice(2)
const opt = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback)
const flag = (name) => argv.includes(name)

const task = opt('--task')
const library = opt('--library')
const search = opt('--search')
const sortName = opt('--sort', 'trending')
const limit = Number(opt('--limit', '30'))
const maxParams = opt('--max-params') ? Number(opt('--max-params')) : Infinity
const minParams = opt('--min-params') ? Number(opt('--min-params')) : 0
const since = opt('--since')
const exclude = opt('--exclude') ? new RegExp(opt('--exclude'), 'i') : null

if (!task && !search && !library) {
  console.error('Give at least one of --task, --library or --search. Example: --task text-generation --library gguf')
  process.exit(2)
}

const SORTS = { trending: 'trendingScore', downloads: 'downloads', likes: 'likes', created: 'createdAt' }
const params = new URLSearchParams()
if (task) params.set('pipeline_tag', task)
if (library) params.set('filter', library)
if (search) params.set('search', search)
params.set('sort', SORTS[sortName] ?? sortName)
params.set('limit', String(Math.min(limit * 3, 300))) // fetch extra, some get filtered out
for (const field of ['downloads', 'likes', 'createdAt', 'cardData', 'safetensors', 'gguf', 'gated', 'pipeline_tag', 'library_name']) {
  params.append('expand[]', field)
}

const url = `https://huggingface.co/api/models?${params}`
const res = await fetch(url, { headers: { 'User-Agent': 'model-research-script' } })
if (!res.ok) {
  console.error(`Hugging Face API returned ${res.status}: ${(await res.text()).slice(0, 300)}`)
  process.exit(1)
}
const models = await res.json()

const billions = (m) => {
  const n = m.safetensors?.total ?? m.gguf?.total
  return typeof n === 'number' ? n / 1e9 : null
}
const licence = (m) => {
  const l = m.cardData?.license
  return Array.isArray(l) ? l.join('/') : l ?? '?'
}

const rows = models
  .map((m) => ({
    id: m.id,
    task: m.pipeline_tag ?? '?',
    library: m.library_name ?? (m.gguf ? 'gguf' : '?'),
    paramsB: billions(m),
    licence: licence(m),
    gated: Boolean(m.gated),
    created: (m.createdAt ?? '').slice(0, 10),
    downloads: m.downloads ?? 0,
    likes: m.likes ?? 0,
    baseModel: [].concat(m.cardData?.base_model ?? [])[0] ?? null,
    url: `https://huggingface.co/${m.id}`,
  }))
  .filter((r) => !exclude || !exclude.test(r.id))
  .filter((r) => r.paramsB === null || (r.paramsB <= maxParams && r.paramsB >= minParams))
  .filter((r) => !since || r.created >= since)
  .slice(0, limit)

if (flag('--json')) {
  process.stdout.write(`${JSON.stringify({ readAt: new Date().toISOString().slice(0, 10), query: url, models: rows }, null, 2)}\n`)
} else {
  const fmt = (n) => (n === null ? '?' : n >= 10 ? n.toFixed(0) : n.toFixed(1))
  console.log(`Read ${new Date().toISOString().slice(0, 10)} from ${url}\n`)
  console.log('| Model | Task | Format | Params (B) | Licence | Gated | Created | Downloads | Likes |')
  console.log('|---|---|---|---|---|---|---|---|---|')
  for (const r of rows) {
    console.log(`| [${r.id}](${r.url}) | ${r.task} | ${r.library} | ${fmt(r.paramsB)} | ${r.licence} | ${r.gated ? 'yes' : 'no'} | ${r.created} | ${r.downloads} | ${r.likes} |`)
  }
  if (!rows.length) console.log('| (no models matched) |||||||||')
}
