# changes.py

This is the `changes.py` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `changes.py` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~python
"""What shipped, and when sales moved. Writes timeline.json next to merge.py's output.

Usage: python3 -I changes.py <collect_dir> [--repo owner/name[=Label]]... [--days 120] [--tz Area/City] [--target orders]

1. Every merged pull request in each --repo (title, merge day in --tz), read with the GitHub CLI (`gh`, signed in),
   plus events.json (price periods, releases, launches, campaigns). Read these before saying why a number moved.
   With no --repo, it uses the GitHub repo of the current folder if there is one.
2. Turning points: days where the target's 7-day average rose or fell by 40%+ against the 7 days before. Each one
   lists what shipped in the 3 days before it, so a cause is checked against the record, never guessed.
"""
import argparse, json, os, subprocess, sys, datetime as dt
from zoneinfo import ZoneInfo

ap = argparse.ArgumentParser()
ap.add_argument('dir')
ap.add_argument('--repo', action='append', default=[])
ap.add_argument('--days', type=int, default=120)
ap.add_argument('--tz', default=os.environ.get('GROWTH_TZ', 'UTC'))
ap.add_argument('--target', default='orders')
a = ap.parse_args()
d, tz = a.dir, ZoneInfo(a.tz)
since = (dt.date.today() - dt.timedelta(days=a.days)).isoformat()

repos = {}
for r in a.repo:
    name, _, label = r.partition('=')
    repos[name] = label or name.split('/')[-1]
if not repos:
    try:
        here = subprocess.run(['gh', 'repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'],
                              capture_output=True, text=True, timeout=30).stdout.strip()
        if here:
            repos[here] = here.split('/')[-1]
    except Exception:
        pass

ships = []
for repo, name in repos.items():
    try:
        out = subprocess.run(['gh', 'pr', 'list', '-R', repo, '--state', 'merged', '--limit', '400', '--search',
                              f'merged:>={since}', '--json', 'number,title,mergedAt'],
                             capture_output=True, text=True, timeout=120)
        for p in json.loads(out.stdout or '[]'):
            when = dt.datetime.fromisoformat(p['mergedAt'].replace('Z', '+00:00')).astimezone(tz).date().isoformat()
            ships.append({'date': when, 'kind': 'merged PR', 'where': name, 'label': f"#{p['number']} {p['title']}"})
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
RANK = {'price': 0, 'launch': 1, 'release': 2, 'campaign': 3, 'tracking': 4, 'merged PR': 5}

daily = [r for r in json.load(open(os.path.join(d, 'daily.json'))) if r['date'] >= since]
if not any(a.target in r for r in daily):
    sys.exit(f'No {a.target} column in daily.json; pass --target with your sales column.')
o = [r.get(a.target) or 0 for r in daily]
turns = []
for i in range(13, len(daily)):
    now, before = sum(o[i - 6:i + 1]) / 7, sum(o[i - 13:i - 6]) / 7
    if before > 0 and abs(now - before) / before >= 0.4:
        day = daily[i - 6]['date']  # first day of the new 7-day window
        if turns and (dt.date.fromisoformat(day) - dt.date.fromisoformat(turns[-1]['date'])).days < 7:
            continue
        lo = (dt.date.fromisoformat(day) - dt.timedelta(days=3)).isoformat()
        hi = (dt.date.fromisoformat(day) + dt.timedelta(days=1)).isoformat()
        turns.append({'date': day, f'{a.target}_per_day_before': round(before, 2), f'{a.target}_per_day_after': round(now, 2),
                      'shipped_in_3_days_before': sorted([s for s in ships if lo <= s['date'] <= hi],
                                                         key=lambda s: (RANK.get(s['kind'], 9), s['date']))})

json.dump({'since': since, 'repos': list(repos), 'shipped': ships, 'turning_points': turns},
          open(os.path.join(d, 'timeline.json'), 'w'), indent=1)
print(f'{len(ships)} shipped items since {since} from {len(repos)} repos; {len(turns)} turning points')
for t in turns:
    print(f"- {t['date']}: {a.target}/day {t[f'{a.target}_per_day_before']} -> {t[f'{a.target}_per_day_after']}")
    for s in t['shipped_in_3_days_before'][:8]:
        print(f"    {s['date']} {s['where'] or s['kind']}: {s['label'][:90]}")
~~~~~
