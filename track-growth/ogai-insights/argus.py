"""Everything Argus already collects, boiled down for the growth read. Writes argus.json next to collect.mjs's output.

Usage: python3 -I argus.py <collect_dir>

Reads ~/.olympus/argus/sources/*.json and cache/*.json (Argus refreshes them on its own schedule; each block carries
its `at` so stale data shows). Aggregates only. Argus's own one-line answers are kept as leads, never as findings:
check each against the raw numbers and the code first (its "510 of 510 leave at the email box" was a tracking gap).
"""
import json, os, sys

A = os.path.expanduser('~/.olympus/argus')
out = {}


def load(rel):
    try:
        return json.load(open(os.path.join(A, rel)))
    except Exception:
        return None


def src(name):
    d = load(f'sources/{name}.json')
    return (d or {}).get('data'), (d or {}).get('at')


# Play Store: Android vitals. Google lowers visibility above 1.09% user-perceived crashes or 0.47% ANRs.
pv = load('cache/play-vitals.json')
if pv:
    c, a = pv['vitals']['crash'], pv['vitals']['anr']
    newest = max(c['versions'], key=lambda v: v['version'])
    out['play'] = {'at': pv['at'], 'through': c['through'], 'users': c['users'], 'crash_pct': round(100 * c['userPerceivedCrashRate'], 2),
                   'anr_pct': round(100 * a['userPerceivedAnrRate'], 2), 'crash_line_pct': 1.09, 'anr_line_pct': 0.47,
                   'newest_build': newest['version'], 'newest_crash_pct': round(100 * newest['userPerceivedCrashRate'], 2), 'newest_users': newest['users'],
                   'versions': [{'version': v['version'], 'users': v['users'], 'crash_pct': round(100 * v['userPerceivedCrashRate'], 2)} for v in c['versions']]}
ip = load('cache/issues-play.json')
if ip:
    out['play_crashes'] = [{'title': i['title'][:110], 'users': i.get('users'), 'users_pct': i.get('usersPct'), 'last': i.get('last')}
                           for i in sorted(ip['data'], key=lambda i: -(i.get('users') or 0))[:6]]
ia = load('cache/issues-appstore.json')
if ia:
    out['ios_issues'] = [{'kind': i.get('kind'), 'title': i['title'][:110], 'weight': i.get('weight'), 'versions': i.get('versions', [])[:3]} for i in ia['data'][:6]]

# Stripe, as Argus slices it: plan mix, payers, new customers, revenue per customer, MRR.
s, at = src('stripe')
if s:
    out['stripe'] = {'at': at, 'payers': s['payers'], 'new_customers': s['newPayingCustomers'], 'arpc': s['arpc'], 'net_revenue': s['netRevenue'],
                     'refunds': s['refunds']['count'], 'monthly_prices': s['monthlyPrices'],
                     'plans': {k: {'revenue_now': v['revenue']['current'], 'count_now': v['count']['current'], 'count_12w': v['count']['last12w']} for k, v in s['plans'].items()}}
m, _ = src('money')
if m:
    out['money'] = {'answer': m['answer'], 'mrr': m['facts'].get('mrr'), 'mrr_prev': m['facts'].get('mrrPrev'), 'lifetime_share_12w': m['facts'].get('lifetimeSharePct12w')}

# Google Search Console (exported file; note its period, it can lag).
g, at = src('search')
if g:
    out['search_console'] = {'period': g['period'], 'clicks': g['clicks']['value'], 'impressions': g['impressions']['value'], 'ctr': g['ctr']['value'],
                             'position': g['position']['value'], 'queries': g['queries'][:15], 'pages': g['pages'][:8]}

# GitHub: stars, traffic, release downloads (desktop + APK; updates count too).
gh, at = src('github')
if gh:
    out['github'] = {'at': at, 'totals': gh['totals'], 'insights': [i['text'] for i in gh.get('insights', [])][:6]}
dh = load('cache/github-downloads-history.json')
if dh:
    out['github_downloads_history_tail'] = dh[-14:] if isinstance(dh, list) else {k: (v[-14:] if isinstance(v, list) else v) for k, v in list(dh.items())[:6]}

# Licences (Keygen machines by platform, last 14 days).
kg = load('cache/keygen.json')
if kg:
    import datetime
    cut = (datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - datetime.timedelta(days=14)).isoformat()
    plat = {}
    for mch in kg.get('machines', []):
        if mch.get('c', '') >= cut:
            plat[mch.get('p')] = plat.get(mch.get('p'), 0) + 1
    out['licences_14d'] = plat

# How Pro licences spread across devices: phone only, computer only, or both (the ecosystem).
if kg:
    by = {}
    for mch in kg.get('machines', []):
        by.setdefault(mch.get('l'), set()).add(mch.get('p'))
    ph, cp = {'android', 'ios'}, {'windows', 'macos', 'linux'}
    out['licence_mix'] = {'licences': len(by), 'both': sum(1 for v in by.values() if v & ph and v & cp),
                          'phone_only': sum(1 for v in by.values() if v <= ph), 'computer_only': sum(1 for v in by.values() if v <= cp)}

# Everything else Argus reads: traffic, buyers, demand, articles, mentions, community, social, email, companies, digest.
for name in ['traffic', 'buyers', 'demand', 'articles', 'mentions', 'loop', 'questions']:
    d, at = src(name)
    if d:
        out[name] = {'at': at, 'answer': d.get('answer'), 'facts': d.get('facts')}
r, at = src('resend')
if r:
    out['email'] = {'at': at, 'sent_14d': r['metrics'].get('sent', {}).get('value'), 'insights': [i['text'] for i in r.get('insights', [])][:5]}
co, at = src('companies')
if co:
    out['companies'] = {'period': co['period'], 'visits': co['visits'], 'matched': co['matchedCompanies'], 'insights': [i['text'] for i in co.get('insights', [])][:4]}
cm, at = src('community')
if cm:
    out['community'] = {'mentions_weekly': cm['metrics'].get('mentions_7d', {}).get('series'), 'leads': len(cm.get('leads', []))}
ph, at = src('posthog')
if ph:
    out['site_os'] = ph.get('os', [])[:8]
    out['site_countries'] = ph.get('countries', [])[:10]

json.dump(out, open(os.path.join(sys.argv[1], 'argus.json'), 'w'), indent=1, default=str)
print('argus.json:', ', '.join(out))
