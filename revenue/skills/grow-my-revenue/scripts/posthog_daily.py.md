# posthog_daily.py

This is the `posthog_daily.py` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `posthog_daily.py` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~python
"""Daily product analytics from PostHog, read-only. Writes a CSV the merge step reads.

Usage:
  POSTHOG_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 python3 -I posthog_daily.py <out.csv>
      [--host us.posthog.com] [--days 120] [--tz Area/City] [--prefix web_] [--event signup_completed]...

Use a personal API key with read-only query access. Keys come from the environment only and are never printed.

Columns: date, <prefix>visitors (unique people with a $pageview), <prefix>pageviews, and for each --event:
<prefix><event>_people (unique people who sent it that day). Aggregates only: no emails, person ids or IPs.

Run it once per PostHog project (website and app, say) with a different --prefix so columns don't collide.
For anything else (sources, countries, funnels), write your own HogQL against the same endpoint and add `limit`.
"""
import argparse, csv, json, os, re, sys, urllib.request
from collections import defaultdict

ap = argparse.ArgumentParser()
ap.add_argument('out')
ap.add_argument('--host', default=os.environ.get('POSTHOG_HOST', 'us.posthog.com'))
ap.add_argument('--days', type=int, default=120)
ap.add_argument('--tz', default=os.environ.get('GROWTH_TZ', 'UTC'))
ap.add_argument('--prefix', default='')
ap.add_argument('--event', action='append', default=[])
a = ap.parse_args()
key, project = os.environ.get('POSTHOG_API_KEY'), os.environ.get('POSTHOG_PROJECT_ID')
if not key or not project:
    sys.exit('Set POSTHOG_API_KEY (read-only personal key) and POSTHOG_PROJECT_ID.')
if not re.fullmatch(r'[A-Za-z_]+/[A-Za-z_]+(/[A-Za-z_]+)?|UTC', a.tz):
    sys.exit('--tz must be an IANA zone like Europe/Berlin, or UTC')


def q(sql):
    req = urllib.request.Request(f'https://{a.host}/api/projects/{project}/query/', method='POST',
                                 data=json.dumps({'query': {'kind': 'HogQLQuery', 'query': sql}}).encode(),
                                 headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r).get('results') or []


D = f"toDate(toTimeZone(timestamp, '{a.tz}'))"
W = f'timestamp >= now() - interval {int(a.days)} day'
rows = defaultdict(dict)
for d, people, views in q(f"select {D} as d, count(distinct person_id), count() from events "
                          f"where event = '$pageview' and {W} group by d order by d limit 1000"):
    rows[str(d)][f'{a.prefix}visitors'] = people
    rows[str(d)][f'{a.prefix}pageviews'] = views
for ev in a.event:
    if not re.fullmatch(r'[\w$.:-]+', ev):
        sys.exit(f'Event name not allowed: {ev}')
    for d, people in q(f"select {D} as d, count(distinct person_id) from events "
                       f"where event = '{ev}' and {W} group by d order by d limit 1000"):
        rows[str(d)][f'{a.prefix}{ev}_people'] = people

cols = sorted({k for r in rows.values() for k in r})
with open(a.out, 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['date'] + cols)
    for d in sorted(rows):
        w.writerow([d] + [rows[d].get(k, '') for k in cols])
print(f'Wrote {a.out}: {len(rows)} days, columns {", ".join(cols)}')
~~~~~
