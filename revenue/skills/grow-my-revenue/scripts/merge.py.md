# merge.py

This is the `merge.py` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `merge.py` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~python
"""Merge every source into one daily table. Writes daily.json, periods.json and events.json in <collect_dir>.

Usage: python3 -I merge.py <collect_dir> [--periods periods.csv] [--events events.csv] [--until YYYY-MM-DD]

Reads every *.csv in <collect_dir> that has a `date` column (YYYY-MM-DD, or anything starting with it) and numeric
columns: Stripe, PostHog, GA4, Search Console, App Store Connect, Play Console exports, or your own. Each column
becomes a metric. If two files have the same column name, the second is renamed <file stem>_<column> and a note says so.
Commas and % signs in numbers are stripped; empty cells stay empty (never zero).

periods.csv (optional): start,end,label. A period is a stretch with one price or plan setup. Leave end empty for
"still running". Without it there is one period covering everything.
events.csv (optional): date,kind,label. kind is price, launch, release, campaign, outage, tracking or anything else.
Price changes also become events automatically from periods.csv.

--until (default: yesterday) drops today's partial day and anything later, so no average includes a half day.
"""
import argparse, csv, datetime as dt, glob, json, os, re

ap = argparse.ArgumentParser()
ap.add_argument('dir')
ap.add_argument('--periods')
ap.add_argument('--events')
ap.add_argument('--until', default=(dt.date.today() - dt.timedelta(days=1)).isoformat())
a = ap.parse_args()
SKIP = {'periods.csv', 'events.csv'}
series, notes, used = {}, [], set()


def num(v):
    v = (v or '').strip().replace(',', '').replace('%', '').replace('$', '')
    try:
        return float(v)
    except ValueError:
        return None


for path in sorted(glob.glob(os.path.join(a.dir, '*.csv'))):
    if os.path.basename(path) in SKIP or (a.periods and os.path.abspath(path) == os.path.abspath(a.periods)) \
            or (a.events and os.path.abspath(path) == os.path.abspath(a.events)):
        continue
    stem = re.sub(r'\W+', '_', os.path.splitext(os.path.basename(path))[0]).strip('_').lower()
    with open(path, newline='', encoding='utf-8-sig') as f:
        rd = csv.DictReader(f)
        dcol = next((c for c in (rd.fieldnames or []) if c and c.strip().lower() in ('date', 'day')), None)
        if not dcol:
            notes.append(f'{os.path.basename(path)}: no date column, skipped')
            continue
        rename = {}
        for c in rd.fieldnames:
            if c == dcol or not c:
                continue
            name = re.sub(r'\W+', '_', c.strip()).strip('_').lower()
            if name in used:
                notes.append(f'{os.path.basename(path)}: column {name} already used, renamed {stem}_{name}')
                name = f'{stem}_{name}'
            rename[c] = name
        for row in rd:
            d = (row.get(dcol) or '')[:10]
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', d) or d > a.until:
                continue
            for c, name in rename.items():
                v = num(row.get(c))
                if v is not None:
                    series.setdefault(name, {})[d] = v
        used.update(n for n in rename.values() if n in series)

dates = sorted({d for s in series.values() for d in s})
if not dates:
    raise SystemExit('No dated rows found. Put CSV exports with a date column in the folder first.')
daily = [{'date': d, **{k: s[d] for k, s in series.items() if d in s}} for d in dates]

periods = []
if a.periods:
    with open(a.periods, newline='', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            periods.append({'start': r['start'][:10], 'end': (r.get('end') or a.until)[:10] or a.until, 'label': r['label']})
if not periods:
    periods = [{'start': dates[0], 'end': dates[-1], 'label': 'all'}]
for p in periods:
    p['end'] = min(p['end'], a.until)
    rs = [r for r in daily if p['start'] <= r['date'] <= p['end']]
    p['days'] = len(rs)
    for k in ('orders', 'revenue', 'visitors', 'web_visitors'):
        v = [r[k] for r in rs if k in r]
        if v:
            p[f'{k}_per_day'] = round(sum(v) / len(v), 2)
    vis = p.get('visitors_per_day') or p.get('web_visitors_per_day')
    if vis and p.get('revenue_per_day') is not None:
        p['revenue_per_visitor'] = round(p['revenue_per_day'] / vis, 3)

events = [{'date': p['start'], 'kind': 'price', 'label': f"Period starts: {p['label']}"} for p in periods[1:]]
if a.events:
    with open(a.events, newline='', encoding='utf-8-sig') as f:
        events += [{'date': r['date'][:10], 'kind': r.get('kind') or 'note', 'label': r.get('label') or ''} for r in csv.DictReader(f)]
events.sort(key=lambda e: e['date'])

for name, obj in (('daily.json', daily), ('periods.json', periods), ('events.json', events), ('merge-notes.json', notes)):
    with open(os.path.join(a.dir, name), 'w') as f:
        json.dump(obj, f, indent=1)
print(f'{len(daily)} days ({dates[0]} to {dates[-1]}), {len(series)} metrics, {len(periods)} periods, {len(events)} events')
for n in notes:
    print('note:', n)
~~~~~
