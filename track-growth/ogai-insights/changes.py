"""What shipped, and when sales moved. Writes timeline.json next to collect.mjs's output.

Usage: python3 -I changes.py <collect_dir> [days=120]

1. Every merged pull request in the website, desktop and mobile repos (title, merge date), plus collect.mjs's events
   (app releases, price periods, articles, launches). Read these before saying why a number moved.
2. Turning points: days where orders' 7-day average rose or fell by 40%+ against the 7 days before. Each one lists
   what shipped in the 3 days before it, so a cause is checked against the record, never guessed.
"""
import json, os, subprocess, sys, datetime as dt

d = sys.argv[1]
days = int(sys.argv[2]) if len(sys.argv) > 2 else 120
since = (dt.date.today() - dt.timedelta(days=days)).isoformat()
REPOS = {'off-grid-ai/website': 'Website', 'off-grid-ai/OGAD': 'Desktop app', 'off-grid-ai/OGAM': 'Mobile app'}

ships = []
for repo, name in REPOS.items():
    try:
        out = subprocess.run(['gh', 'pr', 'list', '-R', repo, '--state', 'merged', '--limit', '400', '--search', f'merged:>={since}',
                              '--json', 'number,title,mergedAt'], capture_output=True, text=True, timeout=120)
        for p in json.loads(out.stdout or '[]'):
            ships.append({'date': (dt.datetime.fromisoformat(p['mergedAt'].replace('Z', '+00:00')) + dt.timedelta(hours=5, minutes=30)).date().isoformat(), 'kind': 'merged PR', 'where': name, 'label': f"#{p['number']} {p['title']}"})
    except Exception as e:
        ships.append({'date': dt.date.today().isoformat(), 'kind': 'note', 'where': name, 'label': f'PR list unavailable: {e}'})
try:
    for e in json.load(open(os.path.join(d, 'events.json'))):
        if e['date'] >= since:
            ships.append({'date': e['date'], 'kind': e['kind'], 'where': '', 'label': e['label']})
except FileNotFoundError:
    pass
ships.sort(key=lambda x: x['date'])
# Price changes and releases explain more than one PR among many, so they lead each list.
RANK = {'price': 0, 'launch': 1, 'release': 2, 'merged PR': 3}

daily = [r for r in json.load(open(os.path.join(d, 'daily.json'))) if r['date'] >= since]
o = [r.get('orders') or 0 for r in daily]
turns = []
for i in range(14, len(daily)):
    now, before = sum(o[i - 6:i + 1]) / 7, sum(o[i - 13:i - 6]) / 7
    if before >= 1 and abs(now - before) / before >= 0.4:
        day = daily[i - 6]['date']  # first day of the new 7-day window
        if turns and (dt.date.fromisoformat(day) - dt.date.fromisoformat(turns[-1]['date'])).days < 7:
            continue
        lo = (dt.date.fromisoformat(day) - dt.timedelta(days=3)).isoformat()
        hi = (dt.date.fromisoformat(day) + dt.timedelta(days=1)).isoformat()
        turns.append({'date': day, 'orders_per_day_before': round(before, 1), 'orders_per_day_after': round(now, 1),
                      'shipped_in_3_days_before': sorted([s for s in ships if lo <= s['date'] <= hi and s['kind'] != 'article'], key=lambda s: (RANK.get(s['kind'], 9), s['date']))})

json.dump({'since': since, 'shipped': ships, 'turning_points': turns}, open(os.path.join(d, 'timeline.json'), 'w'), indent=1)
print(f'{len(ships)} shipped items since {since}; {len(turns)} turning points')
for t in turns:
    print(f"- {t['date']}: orders/day {t['orders_per_day_before']} -> {t['orders_per_day_after']}")
    for s in t['shipped_in_3_days_before'][:8]:
        print(f"    {s['date']} {s['where'] or s['kind']}: {s['label'][:90]}")
