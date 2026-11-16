"""One page with every source side by side, so the call is made on the whole picture. Writes brief.md.

Usage: python3 -I brief.py <collect_dir> <snapshot.json>

Each line: the number, the change from the period before, how many people it covers, and how fresh it is.
Weeks are the last 7 full days (today left out) against the 7 before. This page is for Claude's call, not for Ali.
"""
import json, os, sys, datetime as dt

C, S = sys.argv[1], sys.argv[2]
daily = json.load(open(os.path.join(C, 'daily.json')))
snap = json.load(open(S))
ag = snap.get('extra', {}).get('argus', {})
today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5, minutes=30))).date().isoformat()  # IST
full = [r for r in daily if r['date'] < today]
L7, P7 = full[-7:], full[-14:-7]
out = []


def w(*a):
    out.append(' '.join(str(x) for x in a))


def tot(rows, k):
    v = [r.get(k) for r in rows if r.get(k) is not None]
    return round(sum(v), 1) if v else None


def wk(k, label, money=False):
    a, b = tot(L7, k), tot(P7, k)
    if a is None:
        return f'{label}: no data'
    ch = f' ({"+" if a >= b else ""}{round(100 * (a - b) / b)}%)' if b else ''
    f = (lambda v: f'${v:,.0f}') if money else (lambda v: f'{v:,.0f}')
    return f'{label} {f(a)} vs {f(b) if b is not None else "-"}{ch}'


def rows(key):
    return snap.get(key) or []


def find(key, col, val):
    return next((r for r in rows(key) if str(r.get(col)) == val), {})


w(f'# Brief, {today} — last 7 full days ({L7[0]["date"]}–{L7[-1]["date"]}) vs the 7 before')
w()
w('## Money (Stripe)')
w('-', wk('revenue', 'Revenue', True), '·', wk('orders', 'orders'), '·', wk('orders_monthly', 'monthly orders'), '·', wk('failed_payments', 'failed payments'))
st = ag.get('stripe', {})
if st:
    w(f"- Payers {st['payers']['current']} vs {st['payers']['previous']} · revenue per payer ${st['arpc']['current']} vs ${st['arpc']['previous']} · MRR ${ag.get('money', {}).get('mrr')} · lifetime share of orders (12w) {ag.get('money', {}).get('lifetime_share_12w')}% · monthly prices {st['monthly_prices']}")
for p in rows('payments'):
    w(f"- Failed checkouts, 28d: {p['failed_buyers']} buyers failed, {p['recovered']} then paid, {p['lost']} never did (of {p['paid_buyers']} paying) · reasons {[(r['reason'], r['count']) for r in snap['extra'].get('payment_fail_reasons', [])[:3]]}")
w('- Price periods (full days): ' + '; '.join(f"{e['period']} {e['days']}d ${e['revenue_per_day']}/day {e['orders_per_day']} orders/day" for e in rows('eras')))
w()
w('## Phone and desktop apps (in-app PostHog, EU)')
w('-', wk('app_active_users_mobile', 'Phone users-days'), '·', wk('app_new_users_mobile', 'new phone users'), '·', wk('app_new_users_desktop', 'new desktop users'))
w('-', wk('model_downloads_started_mobile', 'phone download starts'), '·', wk('model_downloads_failed_mobile', 'failed'), '·', wk('model_downloads_finished_mobile', 'finished'),
  '(finish tracking only on builds after the 2026-11-09 fix; starts include retries)')
fun = [r for r in rows('app_funnel') if r['platform'] == 'Phone']
if fun:
    w('- Phone funnel (people, since tracking began): ' + ' → '.join(f"{r['step']} {r['people']}" for r in fun))
for r in rows('app_return'):
    w(f"- Came back another day: {r['group']} {r['rate']}% of {r['people']}")
w('- Pro by app: ' + ', '.join(f"{r['platform']} {r['pro']}/{r['users']} ({r['pro_rate']}%)" for r in rows('app_pro')) + ' — desktop sample is tiny')
w()
w('## Stores')
for r in rows('store_trend'):
    w(f"- App Store {r['period']} ({r['start']}–{r['end']}): search views {r['search_impressions']}/day, browse {r['browse_impressions']}, page views {r['page_views']}, first downloads {r['first_downloads']}/day")
sa = {r['step']: r['count'] for r in rows('store') if r['source'] == 'all'}
if sa:
    w(f"- App Store 28d: seen {sa.get('Seen in the store')} → page {sa.get('Opened the product page')} → downloads {sa.get('Downloaded (first time)')}")
for p in rows('play'):
    w(f"- Play: {p['users']} Android users · crash {p['crash_pct']}% (line {p['crash_line']}%) · ANR {p['anr_pct']}% (line {p['anr_line']}%) · newest build {p['newest_crash_pct']}% on {p['newest_users']} users")
for c in ag.get('play_crashes', [])[:3]:
    w(f"  - crash: {c['title'][:80]} — {c['users']} users ({round(c['users_pct'] or 0)}% of crashing)")
w('- New Pro licences, 14d: ' + ', '.join(f"{r['platform']} {r['activations']}" for r in rows('licences')))
w()
w('## Website (PostHog, US)')
w('-', wk('site_visitors', 'Visitors'), '·', wk('pro_page_visitors', 'Pro page'), '·', wk('pay_forms_shown', 'pay forms'), '·', wk('web_purchases', 'web buys'), '·', wk('purchases_from_app', 'buys from app links'))
w('- Buy rate by source: ' + ', '.join(f"{r['source']} {r['buy_rate']}% of {r['visits']}" for r in rows('sources')[:5]))
w('- Checkout→sale by country: ' + ', '.join(f"{r['country']} {r['rate']}% of {r['opened']}" for r in rows('country')[:5]))
w('- One-page exits: ' + ', '.join(f"{r['landing']} {r['rate']}% of {r['sessions']}" for r in rows('leave')[:4]))
w('- App links land on: ' + ', '.join(f"{r['link']}→{r['page']} {r['visits']}" for r in rows('app_links')[:4]))
w()
w('## Reach')
w('-', wk('github_stars', 'GitHub stars'), '·', wk('github_desktop_downloads', 'desktop downloads (incl. updates)'), '·', wk('github_apk_downloads', 'APK downloads'), '·', wk('mentions', 'mentions'), '·', wk('devto_views', 'dev.to views'))
sc = ag.get('search_console')
if sc:
    nb = [q for q in sc['queries'] if 'off' not in q['name'] and 'grid' not in q['name']][:4]
    w(f"- Search Console ({sc['period']}): {sc['clicks']} clicks, {sc['impressions']} impressions, CTR {sc['ctr']}%, pos {sc['position']} · top non-brand: " + ', '.join(f"{q['name']} {q['impressions']} imp {q['ctr']}% pos {q['position']}" for q in nb))
for k in ['articles', 'demand', 'mentions']:
    if ag.get(k, {}).get('answer'):
        w(f"- {k} (Argus, a lead): {ag[k]['answer'][:220]}")
em = ag.get('email', {})
if em:
    w(f"- Email: {em.get('sent_14d')} sent in 14d · " + ' · '.join(em.get('insights', [])[:2]))
w()
w('## What shipped near sales turning points')
try:
    tl = json.load(open(os.path.join(C, 'timeline.json')))
    for t in tl['turning_points'][-4:]:
        w(f"- {t['date']}: orders/day {t['orders_per_day_before']} → {t['orders_per_day_after']} · " + '; '.join(s['label'][:60] for s in t['shipped_in_3_days_before'][:3]))
except Exception:
    pass
w()
w('## Known traps')
w('- Download finishes undercounted before 2026-11-09 builds · pro_checkout_started = saw the pay form · pro_email_entered misses most buyers · desktop analytics sees ~1% of installs · today is partial · Search Console lags.')

open(os.path.join(C, 'brief.md'), 'w').write('\n'.join(out) + '\n')
print('\n'.join(out))
