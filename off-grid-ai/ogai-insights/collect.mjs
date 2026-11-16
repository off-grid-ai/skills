// ogai-insights collector. Pulls every daily signal Off Grid AI has into one folder:
//   daily.json    one row per day, a column per metric (Stripe, website PostHog, in-app PostHog, GitHub, apps, content, social)
//   prices.json   one row per lifetime price point sold: when it ran, orders, revenue
//   eras.json     price periods: price points sold side by side (the $10/$30/$50 launch cohorts) form one period; each
//                 period's revenue, orders, visitors and checkout rate per day, so prices compare on money per day
//   funnels.json  website checkout funnel (last 7d vs the 7d before), app activation funnel, download outcomes, return rate
//   store.json    App Store acquisition, last 28 days: impressions → product page views → Get taps → first downloads by
//                 source (search, browse, web referrer, app referrer), and the named websites and apps that sent downloads
//   sources.json  where people who saw the pay form came from (utm_source on the /pro URL, last 30 days) and how many paid
// Website: every Get Pro button links to /pro/#buy, which opens the Stripe pay form by itself and fires
// pro_checkout_started (website commit 5d4536dd, 29 Oct). So that event means 'saw the pay form', not 'clicked buy'.
//   events.json   releases, articles, launches: markers for the charts
//   summary.md    weekly table and the above in text, for Claude to read and reason over
// Stripe and both PostHog projects are queried live (read-only keys). Everything else is read from Argus's caches in
// ~/.olympus/argus, so run Argus first if those look stale. Aggregates only: no emails, names or person ids are written.
// Usage: node collect.mjs [outDir]   (default ~/.olympus/insights/latest)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import zlib from 'node:zlib'

const HOME = os.homedir(), A = path.join(HOME, '.olympus/argus')
const OUT = process.argv[2] || path.join(HOME, '.olympus/insights/latest')
const START = '2026-04-01'
fs.mkdirSync(OUT, { recursive: true })

const readEnv = (f) => { try { return Object.fromEntries(fs.readFileSync(f, 'utf8').split('\n').map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')])) } catch { return {} } }
const env = { ...readEnv(process.env.OGAI_ENV_FILE || path.join(HOME, '.config/ogai-insights/keys.env')), ...readEnv(path.join(A, 'keys.env')) }
const J = (f) => { try { return JSON.parse(fs.readFileSync(path.join(A, f), 'utf8')) } catch { return null } }
// Days are India days (IST, UTC+5:30): Ali reads sales in IST. Stripe's dashboard uses UTC, so its 'Today' differs.
const day = (t) => new Date(new Date(t).getTime() + 19800000).toISOString().slice(0, 10)
const series = {}, events = [], notes = []
const S = (name, d, v) => { if (d < START || v == null || Number.isNaN(v)) return; (series[name] ||= {})[d] = (series[name][d] || 0) + v }
const write = (f, v) => fs.writeFileSync(path.join(OUT, f), typeof v === 'string' ? v : JSON.stringify(v))
const soft = async (name, fn) => { try { return await fn() } catch (e) { notes.push(`${name} unavailable: ${String(e.message || e).slice(0, 140)}`); return null } }

// ---------- Stripe: Off Grid AI only (ownership rule from the Olympus repo argus-sources/stripe.mjs) ----------
const OGAI = new Set((env.STRIPE_PRODUCT_IDS || '').split(',').filter(Boolean)) // your Stripe product ids, comma-separated
const stripeAll = async (p) => {
  const r = []; let after = ''
  for (;;) {
    const res = await fetch(`https://api.stripe.com/v1/${p}${p.includes('?') ? '&' : '?'}limit=100${after ? `&starting_after=${after}` : ''}`, { headers: { Authorization: `Bearer ${env.STRIPE_READ_KEY}` } })
    if (!res.ok) throw new Error(`Stripe ${p.split('?')[0]} ${res.status}`)
    const d = await res.json(); r.push(...d.data); if (!d.has_more) break; after = d.data.at(-1).id
  }
  return r
}
const prices = new Map(), lifetimeSales = [], salesAt = []
await soft('Stripe', async () => {
  const since = Math.floor(Date.parse(START) / 1000)
  const [charges, invoices] = await Promise.all([stripeAll(`charges?created[gte]=${since}`), stripeAll(`invoices?created[gte]=${since}`).catch(() => [])])
  const invOurs = new Set(), piOurs = new Set()
  for (const i of invoices) if ((i.lines?.data || []).some((l) => { const p = l.price?.product || l.pricing?.price_details?.product; return OGAI.has(typeof p === 'string' ? p : p?.id) })) { invOurs.add(i.id); if (i.payment_intent) piOurs.add(i.payment_intent) }
  const ours = (c) => c.metadata?.owner === 'offgrid-pro' || /off ?grid/i.test(c.description || '') || invOurs.has(c.invoice) || piOurs.has(c.payment_intent)
  const mine = charges.filter(ours)
  const planOf = (c) => { const s = `${c.metadata?.rc_product_identifier || ''} ${c.metadata?.plan || ''} ${c.description || ''}`.toLowerCase(); return /one_day/.test(s) ? 'day pass' : /monthly/.test(s) || (c.invoice && !c.metadata?.plan) ? 'monthly' : /annual|yearly/.test(s) ? 'annual' : 'lifetime' }
  // Every sale is on the website. rc_* metadata means RevenueCat's web checkout (used until mid-Oct), not an in-app purchase.
  const channelOf = (c) => c.metadata?.rc_product_identifier ? 'RevenueCat checkout' : c.invoice ? 'subscription' : 'Stripe checkout'
  for (const c of mine) {
    const d = day(c.created * 1000)
    if (c.status === 'succeeded' && c.paid) {
      const plan = planOf(c), ch = channelOf(c)
      salesAt.push({ t: c.created, amount: c.amount / 100, plan })
      S('revenue', d, c.amount / 100); S('net_revenue', d, (c.amount - c.amount_refunded) / 100); S('orders', d, 1)
      S(`orders_${plan.replace(' ', '_')}`, d, 1); S(`orders_${ch.toLowerCase().replace(/ /g, '_')}`, d, 1)
      if (c.amount_refunded) S('refunds', d, c.amount_refunded / 100)
      if (plan === 'lifetime') {
        lifetimeSales.push({ d, price: c.amount / 100 })
        const k = `${ch}|$${(c.amount / 100).toFixed(2)}`
        const p = prices.get(k) || { price: c.amount / 100, channel: ch, first: d, last: d, days: new Set(), orders: 0, revenue: 0 }
        p.first = d < p.first ? d : p.first; p.last = d > p.last ? d : p.last; p.days.add(d); p.orders++; p.revenue += c.amount / 100; prices.set(k, p)
      }
    } else if (c.status === 'failed') S('failed_payments', d, 1)
  }
  // Failed checkouts, last 28 days: how many buyers failed and never paid. Buyer keys stay in memory; only counts are written.
  const cut = Date.now() / 1000 - 28 * 864e5 / 1000, recent = mine.filter((c) => c.created >= cut)
  const who = (c) => c.billing_details?.email || c.customer || c.payment_intent
  const paidBy = new Set(recent.filter((c) => c.status === 'succeeded').map(who))
  const failedBy = new Set(recent.filter((c) => c.status === 'failed').map(who))
  const reasons = {}
  for (const c of recent) if (c.status === 'failed') { const r = c.outcome?.reason || c.failure_code || 'other'; reasons[r] = (reasons[r] || 0) + 1 }
  write('payments.json', { days: 28, paid_buyers: paidBy.size, failed_buyers: failedBy.size, recovered: [...failedBy].filter((x) => paidBy.has(x)).length,
    lost: [...failedBy].filter((x) => !paidBy.has(x)).length, reasons: Object.entries(reasons).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([reason, count]) => ({ reason, count })) })
  notes.push(`Stripe: ${mine.length} Off Grid charges since ${START}; ${charges.length - mine.length} other Wednesday charges left out.`)
})

// ---------- PostHog ----------
const hog = async (host, project, key, query, tries = 6) => {
  for (let i = 1; ; i++) { try { return await hog1(host, project, key, query) } catch (e) { if (i >= tries || / 4\d\d$/.test(e.message)) throw e; await new Promise((r) => setTimeout(r, 5000 * i)) } }
}
const hog1 = async (host, project, key, query) => {
  const r = await fetch(`https://${host}/api/projects/${project}/query/`, { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }) })
  if (!r.ok) throw new Error(`${host} ${r.status}`)
  return (await r.json()).results || []
}
const web = (q) => hog('us.posthog.com', env.POSTHOG_WEB_PROJECT_ID, env.POSTHOG_API_KEY, q)
const inApp = (q) => hog('eu.posthog.com', env.POSTHOG_APP_PROJECT_ID, env.POSTHOG_EU_OGACONSUMER_IN_APP, q)
const REAL = "properties.$host IS NOT NULL AND NOT match(properties.$host, '^(localhost|127\\\\.|\\\\[::1\\\\])') AND NOT properties.$host LIKE '%translate.goog'"
const u = (cond) => `count(DISTINCT if(${cond}, person_id, NULL))`
const funnels = [], sources = []

await soft('Website PostHog', async () => {
  // Daily counts in 30-day windows: one query over every month at once times out (504).
  const windows = []; for (let t = Date.parse(START); t < Date.now(); t += 30 * 864e5) windows.push([day(t), day(Math.min(t + 30 * 864e5, Date.now() + 864e5))])
  const dailyRows = []
  for (const [a, b] of windows) dailyRows.push(...await web(`SELECT toDate(toTimeZone(timestamp, 'Asia/Kolkata')) d, ${u("event = '$pageview'")}, ${u("event = '$pageview' AND properties.$pathname LIKE '/pro%'")},
      ${u("event = 'pro_checkout_started'")}, ${u("event = 'pro_purchase_completed'")}, ${u("event = 'desktop_download_click'")},
      ${u("event = 'pro_checkout_started' AND properties.$current_url LIKE '%off-grid-mobile-app%'")},
      ${u("event = 'docs_download_click' AND (properties.platform IN ('android','ios') OR properties.href LIKE '%play.google.com%' OR properties.href LIKE '%apps.apple.com%')")},
      ${u("event = 'newsletter_signup'")}
      FROM events WHERE ${REAL} AND timestamp >= toDateTime('${a} 00:00:00', 'Asia/Kolkata') AND timestamp < toDateTime('${b} 00:00:00', 'Asia/Kolkata') GROUP BY d ORDER BY d LIMIT 10000`))
  for (const [d, ...v] of dailyRows) {
    ;['site_visitors', 'pro_page_visitors', 'pay_forms_shown', 'web_purchases', 'desktop_download_clicks', 'pay_forms_from_app', 'store_clicks', 'newsletter_signups'].forEach((k, i) => S(k, d, v[i]))
  }
})

await soft('Website app purchases', async () => {
  // Purchases by people the app sent to the pay form (the app links carry utm_source=off-grid-mobile-app).
  for (const [d, n] of await web(`SELECT toDate(toTimeZone(timestamp, 'Asia/Kolkata')) d, count(DISTINCT person_id) FROM events WHERE event = 'pro_purchase_completed' AND timestamp >= toDateTime('${START} 00:00:00', 'Asia/Kolkata')
      AND person_id IN (SELECT DISTINCT person_id FROM events WHERE event = 'pro_checkout_started' AND properties.$current_url LIKE '%off-grid-mobile-app%' AND timestamp >= toDateTime('${START} 00:00:00', 'Asia/Kolkata')) GROUP BY d LIMIT 1000`)) S('purchases_from_app', d, n)
})
await soft('Website funnel', async () => {
  const steps = [['Visited the site', "event = '$pageview'"], ['Opened a Pro page', "event = '$pageview' AND properties.$pathname LIKE '/pro%'"], ['Saw the pay form', "event = 'pro_checkout_started'"], ['Paid', "event = 'pro_purchase_completed'"]]
  const rows = await web(`SELECT if(timestamp > now() - INTERVAL 7 DAY, 'last 7 days', '7 days before') w, ${steps.map(([, c]) => u(c)).join(', ')} FROM events WHERE ${REAL} AND timestamp > now() - INTERVAL 14 DAY GROUP BY w`)
  for (const [w, ...v] of rows) steps.forEach(([label], i) => funnels.push({ funnel: 'Website checkout', window: w, step: i + 1, label, users: v[i] }))
})
await soft('Website pay form sources', async () => {
  for (const [src, shown, paid] of await web(`SELECT src, count(), countIf(paid) FROM (SELECT person_id,
      argMinIf(coalesce(extract(properties.$current_url, 'utm_source=([^&#]+)'), if(match(properties.$current_url, '[?&]m=\\\\d'), 'email', 'website')), timestamp, event = 'pro_checkout_started') src,
      max(event = 'pro_purchase_completed') paid FROM events WHERE ${REAL} AND timestamp > now() - INTERVAL 30 DAY AND event IN ('pro_checkout_started', 'pro_purchase_completed')
      GROUP BY person_id HAVING max(event = 'pro_checkout_started')) GROUP BY src ORDER BY 2 DESC LIMIT 25`)) sources.push({ source: src || 'website', shown, paid, payRate: shown ? Math.round((paid / shown) * 1000) / 1000 : null })
})

await soft('In-app PostHog', async () => {
  const P = "if(properties.$lib = 'posthog-node', 'desktop', 'mobile')"
  for (const [d, p, ...v] of await inApp(`SELECT toDate(toTimeZone(timestamp, 'Asia/Kolkata')) d, ${P} p, ${u('1')}, ${u("event = 'analytics_opted_in'")}, countIf(event = 'message_sent'), countIf(event = 'generation_finished'),
      countIf(event = 'model_download_started'), countIf(event = 'model_download_finished'), countIf(event = 'model_download_failed')
      FROM events WHERE properties.$lib IN ('posthog-react-native', 'posthog-node') GROUP BY d, p ORDER BY d LIMIT 10000`)) {
    ;['app_active_users', 'app_new_users', 'app_messages', 'app_replies', 'model_downloads_started', 'model_downloads_finished', 'model_downloads_failed'].forEach((k, i) => { S(k, d, v[i]); S(`${k}_${p}`, d, v[i]) })
  }
  const steps = [['Opened the app', '1'], ['Started a model download', "event = 'model_download_started'"], ['Finished a download', "event = 'model_download_finished'"], ['Loaded a model', "event = 'model_loaded'"], ['Sent a message', "event IN ('message_sent', 'first_message')"], ['Got a reply', "event = 'generation_finished'"]]
  for (const [p, ...v] of await inApp(`SELECT ${P} p, ${steps.map(([, c]) => u(c)).join(', ')} FROM events WHERE properties.$lib IN ('posthog-react-native', 'posthog-node') GROUP BY p`))
    steps.forEach(([label], i) => funnels.push({ funnel: 'App activation', window: p, step: i + 1, label, users: v[i] }))
  for (const [platform, size, started, finished, failed] of await inApp(`SELECT properties.platform, properties.size_bucket, countIf(event = 'model_download_started'), countIf(event = 'model_download_finished'), countIf(event = 'model_download_failed')
      FROM events WHERE event LIKE 'model_download_%' AND properties.size_bucket IS NOT NULL GROUP BY 1, 2 HAVING countIf(event = 'model_download_started') >= 10 ORDER BY 3 DESC`))
    funnels.push({ funnel: 'Model downloads', window: `${platform} ${size}`, step: 0, label: 'started/finished/failed', users: started, finished, failed })
  for (const [replied, users, returned] of await inApp(`SELECT replied, count(), countIf(days > 1) FROM (SELECT person_id, max(event = 'generation_finished') replied, count(DISTINCT toDate(toTimeZone(timestamp, 'Asia/Kolkata'))) days, min(timestamp) f
      FROM events WHERE properties.$lib = 'posthog-react-native' GROUP BY person_id HAVING f < now() - INTERVAL 2 DAY) GROUP BY replied`))
    funnels.push({ funnel: 'Came back another day', window: replied ? 'got a reply' : 'never got a reply', step: 0, label: 'users/returned', users, returned })
  const [[pro, all]] = await inApp(`SELECT ${u("properties.pro = true")}, ${u('1')} FROM events WHERE event IN ('usage_snapshot', 'features_snapshot')`)
  funnels.push({ funnel: 'Pro in the app', window: 'all', step: 0, label: 'pro/all', users: all, pro })
})

// ---------- GitHub ----------
for (const f of fs.readdirSync(path.join(A, 'cache')).filter((f) => /^github-stars-/.test(f) && !/OGAC/.test(f))) for (const t of J('cache/' + f)?.data || []) S('github_stars', day(t), 1)
for (const f of fs.readdirSync(path.join(A, 'cache')).filter((f) => /^github-traffic-/.test(f) && !/OGAC/.test(f))) for (const [d, v] of Object.entries(J('cache/' + f)?.data || {})) { S('github_visitors', d, v.viewUniques); S('github_cloners', d, v.cloneUniques) }
const dl = Object.entries(J('cache/github-downloads-history.json')?.data || {}).sort()
for (let i = 1; i < dl.length; i++) {
  const [d, v] = dl[i], [d0, v0] = dl[i - 1], gap = (Date.parse(d) - Date.parse(d0)) / 864e5
  for (const [r, k] of [['OGAD', 'github_desktop_downloads'], ['OGAM', 'github_apk_downloads']]) if (v[r] != null && v0[r] != null) S(k, d, Math.round((v[r] - v0[r]) / gap))
}
await soft('GitHub releases', async () => {
  for (const repo of ['OGAD', 'OGAM']) {
    const rel = JSON.parse(execFileSync('gh', ['api', `repos/off-grid-ai/${repo}/releases?per_page=100`, '--paginate', '--jq', '[.[] | {t: .tag_name, d: .published_at, pre: .prerelease, draft: .draft}]'], { encoding: 'utf8' }).replace(/\]\s*\[/g, ','))
    for (const r of rel) if (!r.draft && !r.pre && r.d && day(r.d) >= START) events.push({ date: day(r.d), kind: 'release', label: `${repo === 'OGAD' ? 'Desktop' : 'Mobile'} ${r.t}` })
  }
})

// ---------- App Store acquisition (App Store Connect Analytics Reports, the app's ONGOING request) ----------
// Keys are fastlane's (your app's fastlane .env): ASC_KEY_ID, ASC_ISSUER_ID, ASC_API_KEY_P8. Each daily report file restates
// the day before, so a date's rows come from the newest file that has it. Files never change, so each one is parsed once
// and kept in ~/.olympus/insights/cache. Standard reports have every row; Detailed ones (used only for named referrers)
// leave out rows under 5. Apple gives no search terms.
const store = { funnel: [], referrers: [] }
let iosOk = false
await soft('App Store', async () => {
  const e = readEnv(process.env.ASC_ENV_FILE || path.join(HOME, '.config/ogai-insights/asc.env'))
  if (!e.ASC_KEY_ID || !e.ASC_ISSUER_ID || !e.ASC_API_KEY_P8) throw new Error('no ASC keys in the ASC env file')
  const pem = e.ASC_API_KEY_P8.includes('BEGIN') ? e.ASC_API_KEY_P8.replace(/\\n/g, '\n') : Buffer.from(e.ASC_API_KEY_P8, 'base64').toString('utf8')
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url'), now = Math.floor(Date.now() / 1000)
  const un = `${b64({ alg: 'ES256', kid: e.ASC_KEY_ID, typ: 'JWT' })}.${b64({ iss: e.ASC_ISSUER_ID, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' })}`
  const h = { Authorization: `Bearer ${un}.${crypto.sign('sha256', Buffer.from(un), { key: pem, dsaEncoding: 'ieee-p1363' }).toString('base64url')}` }
  const retry = async (f) => { for (let t = 1; ; t++) { try { return await f() } catch (err) { if (t >= 4) throw err; await new Promise((r) => setTimeout(r, 4000 * t)) } } }
  const api = (p) => retry(async () => { const r = await fetch(p.startsWith('http') ? p : `https://api.appstoreconnect.apple.com${p}`, { headers: h, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(`ASC ${r.status}`); return r.json() })
  const CACHE = path.join(HOME, '.olympus/insights/cache'); fs.mkdirSync(CACHE, { recursive: true })
  const req = (await api(`/v1/apps/${e.ASC_APP_ID}/analyticsReportRequests`)).data.find((r) => r.attributes.accessType === 'ONGOING' && !r.attributes.stoppedDueToInactivity)
  if (!req) throw new Error('no ONGOING analytics report request')
  const reports = []; for (let p = `/v1/analyticsReportRequests/${req.id}/reports?limit=200`; p;) { const d = await api(p); reports.push(...d.data); p = d.links?.next }
  // Rows of one report by date, from the newest daily file that has each date.
  const rowsByDate = async (name, keep) => {
    const rep = reports.find((r) => r.attributes.name === name); if (!rep) throw new Error(`no report "${name}"`)
    const inst = (await api(`/v1/analyticsReports/${rep.id}/instances?filter[granularity]=DAILY&limit=60`)).data.sort((a, b) => (a.attributes.processingDate < b.attributes.processingDate ? 1 : -1))
    const out = {}
    for (const i of inst) {
      const f = path.join(CACHE, `asc-${i.id}.json`)
      let rows = null; try { rows = JSON.parse(fs.readFileSync(f, 'utf8')) } catch {}
      if (!rows) {
        rows = []
        for (const sgm of (await api(`/v1/analyticsReportInstances/${i.id}/segments`)).data || []) {
          const body = await retry(async () => Buffer.from(await (await fetch(sgm.attributes.url, { signal: AbortSignal.timeout(60000) })).arrayBuffer()))
          const lines = zlib.gunzipSync(body).toString('utf8').split('\n'), cols = lines[0].split('\t')
          for (const l of lines.slice(1)) { if (!l) continue; const v = l.split('\t'), row = Object.fromEntries(cols.map((c, k) => [c, v[k]])); if (keep(row)) rows.push(row) }
        }
        fs.writeFileSync(f, JSON.stringify(rows))
      }
      const got = {}; for (const r of rows) (got[r.Date] ||= []).push(r)
      for (const [d, rs] of Object.entries(got)) if (!out[d]) out[d] = rs
    }
    return out
  }
  const SRC = { 'App Store search': 'search', 'App Store browse': 'browse', 'Web referrer': 'web', 'App referrer': 'app', Unavailable: 'other' }
  const src = (r) => SRC[r['Source Type']] || 'other'
  const disc = await rowsByDate('App Store Discovery and Engagement Standard', (r) => r.Event === 'Impression' || r.Event === 'Page view' || (r.Event === 'Tap' && r['Engagement Type'] === 'Get'))
  const dls = await rowsByDate('App Downloads Standard', (r) => r['Download Type'] === 'First-time download')
  const ref = await rowsByDate('App Downloads Detailed', (r) => r['Download Type'] === 'First-time download' && /referrer/.test(r['Source Type']))
  const EV = { Impression: 'ios_impressions', 'Page view': 'ios_page_views', Tap: 'ios_get_taps' }
  for (const [d, rs] of Object.entries(disc)) for (const r of rs) { S(EV[r.Event], d, +r.Counts || 0); S(`${EV[r.Event]}_${src(r)}`, d, +r.Counts || 0) }
  for (const [d, rs] of Object.entries(dls)) for (const r of rs) { S('ios_first_downloads', d, +r.Counts || 0); S(`ios_first_downloads_${src(r)}`, d, +r.Counts || 0) }
  iosOk = true
  const last = Object.keys(dls).sort().slice(-28), from = last[0], inWin = (d) => d >= from
  const sum = (byDate, f) => Object.entries(byDate).filter(([d]) => inWin(d)).flatMap(([, rs]) => rs).reduce((t, r) => t + (f(r) ? +r.Counts || 0 : 0), 0)
  for (const s of ['search', 'browse', 'web', 'app', 'all']) {
    const m = (r) => s === 'all' || src(r) === s
    const steps = [['Seen in the store', sum(disc, (r) => r.Event === 'Impression' && m(r))], ['Opened the product page', sum(disc, (r) => r.Event === 'Page view' && m(r))],
      ['Tapped Get', sum(disc, (r) => r.Event === 'Tap' && m(r))], ['Downloaded (first time)', sum(dls, m)]]
    steps.forEach(([label, n], i) => store.funnel.push({ source: s, step: i + 1, label, count: n }))
  }
  const R = {}; for (const [d, rs] of Object.entries(ref)) if (inWin(d)) for (const r of rs) { const k = `${src(r)}|${r['Source Info'] || '(not named)'}`; R[k] = (R[k] || 0) + (+r.Counts || 0) }
  store.referrers = Object.entries(R).map(([k, n]) => ({ kind: k.split('|')[0], name: k.split('|')[1], downloads: n })).sort((a, b) => b.downloads - a.downloads).slice(0, 20)
  store.window = { from, to: last.at(-1), days: last.length }
  const T = {}; for (const [d, rs] of Object.entries(dls)) if (inWin(d)) for (const r of rs) T[r.Territory] = (T[r.Territory] || 0) + (+r.Counts || 0)
  store.countries = Object.entries(T).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([country, downloads]) => ({ country, downloads }))
})

// ---------- Apps, website, content, social (Argus caches) ----------
if (!iosOk) for (const [d, v] of Object.entries(J('cache/appstore-analytics.json')?.downloads || {})) S('ios_first_downloads', d, v.first || 0)
for (const m of J('cache/keygen.json')?.machines || []) { S('pro_activations', day(m.c), 1); S(`pro_activations_${m.p}`, day(m.c), 1) }
const cf = J('cache/cloudflare-zone-getoffgridai.json')
if (cf) { const end = Date.parse(cf.at.slice(0, 10)); cf.data.uniques?.forEach((v, i, a) => S('cloudflare_visitors', day(end - (a.length - 1 - i) * 864e5), v)) }
for (const per of Object.values(J('cache/devto-daily.json')?.byId || {})) for (const [d, v] of Object.entries(per)) S('devto_views', d, v)
for (const it of J('articles/queue.json')?.items || []) if (it.status === 'published' && it.at) { S('articles_published', day(it.at), 1); events.push({ date: day(it.at), kind: 'article', label: it.title }) }
for (const m of J('sources/community.json')?.data?.mentions || []) if (m.relevance === 'ours') S('mentions', day(m.at), 1)
for (const [url, byDay] of Object.entries(J('cache/followers.json') || {})) {
  const k = 'followers_' + (url.match(/x\.com\/(\w+)/)?.[1] ? 'x_' + url.match(/x\.com\/(\w+)/)[1] : url.includes('linkedin') ? 'linkedin' : url.includes('instagram') ? 'instagram' : url.includes('youtube') ? 'youtube' : 'other').toLowerCase()
  for (const [d, v] of Object.entries(byDay)) (series[k] ||= {})[d] = v
}
for (const e of J('cache/resend-emails.json')?.data || []) if (e.event === 'delivered' && e.kind === 'marketing') S('marketing_emails_delivered', e.day, 1)
events.push({ date: '2026-10-27', kind: 'launch', label: 'Product Hunt launch' })

// ---------- Price points and price periods ----------
const span = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5 + 1
const priceRows = [...prices.values()].map((p) => ({ price: p.price, channel: p.channel, first: p.first, last: p.last, orders: p.orders, revenue: Math.round(p.revenue * 100) / 100 }))
  .filter((p) => p.orders >= 5).sort((a, b) => a.first.localeCompare(b.first))
// A price with 10+ sales holds the dates between its 10th and 90th percentile sale. Prices whose ranges overlap were on
// sale together (cohorts, or a price and its coupons) and form one period. Every lifetime sale then falls in the period
// running on its date, so one-off discounts count toward the price they were cut from.
const byPrice = d3group(lifetimeSales, (s) => s.price)
const cores = [...byPrice].filter(([, v]) => v.length >= 10).map(([price, v]) => { const ds = v.map((s) => s.d).sort(); return { prices: [price], first: ds[2], start: ds[Math.floor(ds.length * 0.1)], end: ds[Math.floor(ds.length * 0.9)] } })
  .sort((a, b) => a.start.localeCompare(b.start))
const periods = []
// A same-day handover (old price's last sales and new price's first on one day) is a switch, not two prices sold together.
for (const c of cores) { const p = periods.at(-1); if (p && c.start < p.end) { p.prices.push(...c.prices); p.end = c.end > p.end ? c.end : p.end } else periods.push({ ...c }) }
// A period begins on its price's third sale (the first two can be tests), so the period before ends the day before.
for (const p of periods) p.start = p.prices.map((pr) => cores.find((c) => c.prices[0] === pr).first).sort()[0]
// The current period ends yesterday: today is a partial day and would drag its daily averages down.
const today0 = day(Date.now() - 864e5)
const eras = periods.filter((p, i) => i === 0 || p.start <= today0).map((p, i) => {
  const start = i ? p.start : [...lifetimeSales].map((s) => s.d).sort()[0], end = periods[i + 1] ? day(Date.parse(periods[i + 1].start) - 864e5) : today0
  const sales = lifetimeSales.filter((s) => s.d >= start && s.d <= end), days = span(start, end)
  const mix = [...d3group(sales, (s) => s.price)].sort((a, b) => b[1].length - a[1].length).filter(([, v]) => v.length >= Math.max(5, sales.length * 0.05))
  const sum = (k) => { let t = 0, any = false; for (const [d, v] of Object.entries(series[k] || {})) if (d >= start && d <= end) { t += v; any = true } return any ? t : null }
  const rev = sum('revenue') || 0, vis = sum('site_visitors'), co = sum('pay_forms_shown'), buys = sum('web_purchases')
  return { era: mix.map(([pr]) => '$' + pr).join(' + '), mix: mix.map(([pr, v]) => `${v.length} at $${pr}`).join(', '), start, end, days,
    lifetimeOrders: sales.length, lifetimeRevenue: Math.round(sales.reduce((a, s) => a + s.price, 0)), revenue: Math.round(rev),
    revenuePerDay: Math.round(rev / days), ordersPerDay: Math.round(((sum('orders') || 0) / days) * 10) / 10,
    visitorsPerDay: vis == null ? null : Math.round(vis / days), revenuePerVisitor: vis ? Math.round((rev / vis) * 100) / 100 : null,
    checkoutToPaid: co && buys ? Math.round((buys / co) * 1000) / 1000 : null, current: !periods[i + 1] }
})
for (const e of eras) events.push({ date: e.start, kind: 'price', label: `Price period: ${e.era}` })
function d3group(arr, f) { const m = new Map(); for (const x of arr) { const k = f(x); m.set(k, [...(m.get(k) || []), x]) } return m }

// ---------- Write ----------
const today = day(Date.now()), dates = []
for (let t = Date.parse(START); day(t) <= today; t += 864e5) dates.push(day(t))
const keys = Object.keys(series).sort()
const daily = dates.map((d) => Object.fromEntries([['date', d], ...keys.map((k) => [k, series[k][d] ?? (Object.keys(series[k]).sort()[0] <= d ? 0 : null)])]))
for (const k of keys.filter((k) => k.startsWith('followers_'))) daily.forEach((r) => { if (series[k][r.date] == null) r[k] = null })
// Sources that publish a day or two late (Apple) stay empty after their last reported day, not zero.
for (const k of keys.filter((k) => k.startsWith('ios_'))) { const lastDay = Object.keys(series[k]).sort().at(-1); daily.forEach((r) => { if (r.date > lastDay) r[k] = null }) }
{ const lastDisc = ['ios_impressions', 'ios_page_views', 'ios_get_taps'].map((k) => Object.entries(series[k] || {}).filter(([, v]) => v > 0).map(([d]) => d).sort().at(-1)).sort()[0]
  if (lastDisc) for (const k of keys.filter((k) => /^ios_(impressions|page_views|get_taps)/.test(k))) daily.forEach((r) => { if (r.date > lastDisc) r[k] = null }) }
// One row per paid sale with its local date, weekday and hour in three time zones, for the hour/weekday/date view.
// Only time, amount and plan: no customer fields.
const TZS = { ist: 'Asia/Kolkata', et: 'America/New_York', utc: 'UTC' }
const fmts = Object.fromEntries(Object.entries(TZS).map(([k, tz]) => [k, new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' })]))
const sales = salesAt.sort((a, b) => a.t - b.t).map((x) => {
  const r = { at: new Date(x.t * 1000).toISOString(), amount: x.amount, plan: x.plan }
  for (const [k, f] of Object.entries(fmts)) { const p = Object.fromEntries(f.formatToParts(new Date(x.t * 1000)).map((q) => [q.type, q.value])); r[k + '_date'] = `${p.year}-${p.month}-${p.day}`; r[k + '_hour'] = +p.hour; r[k + '_dow'] = p.weekday }
  return r
})
write('sales.json', sales)
write('daily.json', daily); write('prices.json', priceRows); write('eras.json', eras); write('funnels.json', funnels); write('sources.json', sources); write('store.json', [...store.funnel.map((f) => ({ kind: 'funnel', ...f })), ...store.referrers.map((r) => ({ kind: 'referrer', source: r.kind, label: r.name, count: r.downloads })), ...(store.countries || []).map((c) => ({ kind: 'country', source: 'all', label: c.country, count: c.downloads }))]); write('events.json', events.sort((a, b) => a.date.localeCompare(b.date)))

// summary.md: what Claude reads to write insights.json
const wk = (d) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return day(x) }
const W = new Map(); for (const r of daily) { const w = wk(r.date); const o = W.get(w) || {}; for (const k of keys) if (r[k] != null && !k.startsWith('followers_')) o[k] = (o[k] || 0) + r[k]; W.set(w, o) }
const cols = ['revenue', 'orders', 'site_visitors', 'pro_page_visitors', 'pay_forms_shown', 'pay_forms_from_app', 'web_purchases', 'purchases_from_app', 'store_clicks', 'desktop_download_clicks', 'github_stars', 'pro_activations', 'ios_impressions', 'ios_page_views', 'ios_first_downloads', 'devto_views', 'mentions', 'app_new_users', 'app_active_users', 'model_downloads_started', 'model_downloads_finished']
const tbl = (rows) => rows.map((r) => '| ' + r.join(' | ') + ' |').join('\n')
const md = [`# Off Grid AI data, ${today}`, '', ...notes.map((n) => `- ${n}`), '', '## Weekly (Monday start; last row is a partial week)', '',
  tbl([['week', ...cols, 'AOV'], ['---', ...cols.map(() => '---'), '---'], ...[...W].filter(([w]) => w >= '2026-06-08').map(([w, o]) => [w, ...cols.map((c) => o[c] == null ? '' : Math.round(o[c])), o.orders ? Math.round(o.revenue / o.orders) : ''])]),
  '', '## Price periods (cohorts sold together count as one period; revenue is all Off Grid revenue in the period)', '', tbl([['period', 'mix', 'start', 'end', 'days', 'revenue/day', 'orders/day', 'visitors/day', '$/visitor', 'checkout→paid'], Array(10).fill('---'), ...eras.map((e) => [e.era, e.mix, e.start, e.end, e.days, e.revenuePerDay, e.ordersPerDay, e.visitorsPerDay ?? '', e.revenuePerVisitor ?? '', e.checkoutToPaid ?? ''])]),
  '', '## Lifetime price points (5+ orders)', '', tbl([['price', 'channel', 'first', 'last', 'orders', 'revenue'], Array(6).fill('---'), ...priceRows.map((p) => [p.price, p.channel, p.first, p.last, p.orders, p.revenue])]),
  '', '## Last 21 days, daily', '', tbl([['date', 'revenue', 'orders', 'visitors', 'pay forms', 'web buys', 'app new', 'app active', 'dl started', 'dl finished'], Array(10).fill('---'), ...daily.slice(-21).map((r) => [r.date, Math.round(r.revenue ?? 0), r.orders, r.site_visitors, r.pay_forms_shown, r.web_purchases, r.app_new_users, r.app_active_users, r.model_downloads_started, r.model_downloads_finished])]),
  '', `## App Store acquisition, ${store.window?.from} to ${store.window?.to} (Apple gives no search terms)`, '',
  ...['all', 'search', 'browse', 'web', 'app'].map((s) => `- ${s}: ` + store.funnel.filter((f) => f.source === s).map((f) => `${f.label} ${f.count}`).join(' → ')),
  `- named referrers (Apple hides rows under 5): ${store.referrers.map((r) => `${r.name} (${r.kind}) ${r.downloads}`).join(', ') || 'none'}`,
  `- countries: ${(store.countries || []).map((c) => `${c.country} ${c.downloads}`).join(', ')}`,
  '', '## When sales happen (IST; all paid Off Grid sales since ' + START + ')', '',
  ...(() => { const by = (f) => { const m = new Map(); for (const x of sales) { const k = f(x); const o = m.get(k) || { n: 0, rev: 0 }; o.n++; o.rev += x.amount; m.set(k, o) } return m }
    const H = by((x) => x.ist_hour), D = by((x) => x.ist_dow), T = by((x) => x.ist_date), M = by((x) => +x.ist_date.slice(8))
    const fmt = (m, ks) => ks.map((k) => `${k}: ${m.get(k)?.n || 0} sales, $${Math.round(m.get(k)?.rev || 0)}`).join('; ')
    return [`- by hour: ${fmt(H, [...Array(24).keys()])}`, `- by weekday: ${fmt(D, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])}`,
      `- by day of month: ${fmt(M, [...Array(31).keys()].map((i) => i + 1))}`,
      `- best 15 dates: ${[...T].sort((a, b) => b[1].rev - a[1].rev).slice(0, 15).map(([d, o]) => `${d} ${new Date(d + 'T12:00Z').toUTCString().slice(0, 3)} $${Math.round(o.rev)} (${o.n})`).join(', ')}`] })(),
  '', '## Funnels', '', ...funnels.map((f) => `- ${f.funnel} / ${f.window} / ${f.step ? f.step + '. ' : ''}${f.label}: ${f.users}${f.finished != null ? ` started, ${f.finished} finished, ${f.failed} failed` : ''}${f.returned != null ? ` users, ${f.returned} returned` : ''}${f.pro != null ? ` users, ${f.pro} pro` : ''}`),
  '', '## Who saw the pay form, by where they came from (30 days; pay form opens by itself from any Get Pro link)', '', ...sources.map((s) => `- ${s.source}: ${s.shown} saw it, ${s.paid} paid`),
  '', '## Events', '', ...events.filter((e) => e.kind !== 'article').map((e) => `- ${e.date} ${e.kind}: ${e.label}`), `- articles published: ${events.filter((e) => e.kind === 'article').length} (${[...new Set(events.filter((e) => e.kind === 'article').map((e) => e.date))].join(', ')})`,
].join('\n')
write('summary.md', md)
console.log(`Wrote ${OUT}: daily.json (${daily.length} days × ${keys.length} metrics), prices.json, eras.json, funnels.json, sources.json, store.json, events.json, sales.json (${sales.length} sales), summary.md`)
if (notes.length) console.log(notes.join('\n'))
