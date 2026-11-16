"""One page with every source side by side, so the call is made on the whole picture. Writes brief.md.

Usage: python3 -I brief.py <collect_dir>

Reads daily.json, periods.json, events.json (merge.py), correlations.json (correlate.py) and timeline.json
(changes.py) if they exist. Each metric line: last 7 full days against the 7 before, the change, how many days had
data, and the last day seen, so stale or thin sources show. This page is for the agent's call, not for the user.
"""
import json, os, sys

C = sys.argv[1]


def load(name, default):
    try:
        return json.load(open(os.path.join(C, name)))
    except FileNotFoundError:
        return default


daily = load('daily.json', [])
periods, events = load('periods.json', []), load('events.json', [])
corr, timeline = load('correlations.json', {}), load('timeline.json', {})
notes = load('merge-notes.json', [])
if not daily:
    sys.exit('daily.json is missing or empty: run merge.py first.')
last_day = daily[-1]['date']
L7, P7 = daily[-7:], daily[-14:-7]
out = []
w = out.append


def tot(rows, k):
    v = [r[k] for r in rows if k in r]
    return (sum(v), len(v)) if v else (None, 0)


w(f'# Growth brief, data to {last_day}\n')
w('Weeks are the last 7 full days against the 7 before. Read every line before deciding.\n')
w('## Every metric\n')
w('| metric | last 7d | 7d before | change | days with data | last seen |')
w('| --- | --- | --- | --- | --- | --- |')
metrics = sorted({k for r in daily for k in r if k != 'date'})
stale = []
for k in metrics:
    (a, na), (b, _) = tot(L7, k), tot(P7, k)
    seen = max(r['date'] for r in daily if k in r)
    if seen < L7[0]['date']:
        stale.append(f'{k} (last {seen})')
    ch = f'{round(100 * (a - b) / b):+d}%' if a is not None and b else ''
    fmt = lambda v: '' if v is None else (f'{v:,.0f}' if abs(v) >= 100 else f'{v:,.2f}')
    w(f'| {k} | {fmt(a)} | {fmt(b)} | {ch} | {na}/7 | {seen} |')
if stale:
    w(f'\nStale (no data in the last 7 days): {", ".join(stale)}. Say so before using them.')
if notes:
    w('\nMerge notes: ' + '; '.join(notes))

w('\n## Periods (price or plan setups)\n')
w('Compare money per day at similar traffic. Do not judge a period under 7 full days.\n')
keys = [k for k in ('days', 'orders_per_day', 'revenue_per_day', 'visitors_per_day', 'web_visitors_per_day',
                    'revenue_per_visitor') if any(k in p for p in periods)]
w('| period | start | end | ' + ' | '.join(keys) + ' |')
w('| --- | --- | --- | ' + ' | '.join('---' for _ in keys) + ' |')
for p in periods:
    w(f"| {p['label']} | {p['start']} | {p['end']} | " + ' | '.join(str(p.get(k, '')) for k in keys) + ' |')

if corr.get('rows'):
    w(f"\n## What moves with sales ({corr['from']} to {corr['to']})\n")
    w(corr['note'] + ' Drop ones that are consequences of a sale, not causes.\n')
    for r in corr['rows'][:20]:
        w(f"- {r['metric']} -> {r['target']}: r {r['r_within_price_period']:+.2f} within periods "
          f"(raw {r['r_raw']}), leads by {r['lag_days']}d, {r['days']} days")

if timeline.get('turning_points'):
    w('\n## Turning points and what shipped just before\n')
    for t in timeline['turning_points']:
        nums = [v for k, v in t.items() if k.endswith('_before') or k.endswith('_after')]
        w(f"- {t['date']}: {nums[0]} -> {nums[1]} a day")
        for s in t['shipped_in_3_days_before'][:8]:
            w(f"  - {s['date']} {s['where'] or s['kind']}: {s['label'][:100]}")
recent = [e for e in events if e['date'] >= daily[max(0, len(daily) - 30)]['date']]
if recent:
    w('\n## Events in the last 30 days\n')
    for e in recent:
        w(f"- {e['date']} {e['kind']}: {e['label']}")

open(os.path.join(C, 'brief.md'), 'w').write('\n'.join(out) + '\n')
print(f'Wrote {os.path.join(C, "brief.md")}: {len(metrics)} metrics, {len(periods)} periods')
