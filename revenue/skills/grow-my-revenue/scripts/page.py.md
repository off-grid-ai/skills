# page.py

This is the `page.py` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `page.py` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~python
"""Build the growth dashboard: one self-contained HTML page, moves first, proof below, all data folded at the end.

Usage: python3 -I page.py <collect_dir> <decision.json> <out.html>

decision.json (the agent writes it after the call is made):
{
  "title": "Growth moves",                      # optional
  "currency": "$",                              # optional, for |money
  "headline": "Revenue {avg7:revenue|money}/day, {chg7:revenue} on last week. Activation is the leak.",
  "moves": [                                    # three, biggest money first
    {"title": "Fix the signup step on phones",
     "proof": "{avg7:mobile_signup_people} phone signups a day vs {avg7:desktop_signup_people} on desktop",
     "why": "Phones are most of the traffic; lifting signup by a third is about {money}/month.",
     "charts": [{"metric": "mobile_signup_people", "vs": "desktop_signup_people",
                 "title": "Phone signups fell after the new form", "so": "Down {chg7:mobile_signup_people} in a week."}]}
  ],
  "also": ["Smaller move, one line", "..."],
  "big_picture": {"metric": "revenue", "title": "Money per day by price period", "so": "..."}
}

Numbers are never typed: write a mark and the page fills it from daily.json, so a card cannot drift from its data.
Marks: {sum7:m} {avg7:m} {chg7:m} {sum28:m} {avg28:m} {last:m}, with an optional format |money |pct |n |dec.
chg7 is the last 7 days against the 7 before, as a signed percent. A mark for a metric that is missing prints "?"
and is listed at the end of the run: fix it before you share the page.
"""
import html, json, os, re, sys

C, DEC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
daily = json.load(open(os.path.join(C, 'daily.json')))
dec = json.load(open(DEC))


def load(name, default):
    try:
        return json.load(open(os.path.join(C, name)))
    except FileNotFoundError:
        return default


periods, events = load('periods.json', []), load('events.json', [])
cur = dec.get('currency', '$')
missing = []


def vals(m, rows):
    return [r[m] for r in rows if m in r]


def stat(kind, m):
    if kind == 'last':
        v = vals(m, daily)
        return v[-1] if v else None
    n = 28 if kind.endswith('28') else 7
    cur_rows = vals(m, daily[-n:])
    if not cur_rows:
        return None
    if kind.startswith('sum'):
        return sum(cur_rows)
    if kind.startswith('avg'):
        return sum(cur_rows) / len(cur_rows)
    prev = vals(m, daily[-2 * n:-n])
    if not prev or not sum(prev):
        return None
    return 100 * (sum(cur_rows) - sum(prev)) / sum(prev)


def fmt(v, f, kind):
    if v is None:
        return '?'
    if kind.startswith('chg') or f == 'pct':
        return f'{v:+.0f}%' if kind.startswith('chg') else f'{v:.1f}%'
    if f == 'money':
        return f'{cur}{v:,.0f}' if abs(v) >= 100 else f'{cur}{v:,.2f}'
    if f == 'dec':
        return f'{v:,.2f}'
    return f'{v:,.0f}' if abs(v) >= 10 or f == 'n' else f'{v:,.1f}'


def fill(text):
    def sub(mo):
        kind, m, f = mo.group(1), mo.group(2), (mo.group(3) or '')
        v = stat(kind, m)
        if v is None:
            missing.append(mo.group(0))
        return f'<b class="num" title="{kind} of {m}">{fmt(v, f, kind)}</b>'
    return re.sub(r'\{(sum7|avg7|chg7|sum28|avg28|last):(\w+)(?:\|(money|pct|n|dec))?\}', sub, html.escape(text or ''))


def chart(m, vs=None, h=150):
    rows = daily[-90:]
    W, H, pad = 640, h, 28
    series = [(m, 'var(--a)')] + ([(vs, 'var(--b)')] if vs else [])
    allv = [r[k] for k, _ in series for r in rows if k in r]
    if not allv:
        missing.append(f'chart:{m}')
        return f'<p class="muted">No data for {html.escape(m)}.</p>'
    top = max(allv) or 1
    x = lambda i: pad + i * (W - 2 * pad) / max(1, len(rows) - 1)
    y = lambda v: H - pad - v * (H - 2 * pad) / top
    parts = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{html.escape(m)} per day">']
    for p in periods[1:]:
        idx = next((i for i, r in enumerate(rows) if r['date'] >= p['start']), None)
        if idx:
            parts.append(f'<line x1="{x(idx):.1f}" x2="{x(idx):.1f}" y1="{pad / 2}" y2="{H - pad}" class="ev"/>'
                         f'<text x="{x(idx) + 3:.1f}" y="{pad / 2 + 8}" class="lab">{html.escape(p["label"])}</text>')
    for k, color in series:
        raw = [(i, r[k]) for i, r in enumerate(rows) if k in r]
        avg = []
        for j, (i, _) in enumerate(raw):
            win = [v for _, v in raw[max(0, j - 6):j + 1]]
            avg.append((i, sum(win) / len(win)))
        parts.append('<polyline fill="none" stroke="%s" stroke-opacity=".25" points="%s"/>' % (
            color, ' '.join(f'{x(i):.1f},{y(v):.1f}' for i, v in raw)))
        parts.append('<polyline fill="none" stroke="%s" stroke-width="2" points="%s"/>' % (
            color, ' '.join(f'{x(i):.1f},{y(v):.1f}' for i, v in avg)))
    parts.append(f'<text x="{pad}" y="{H - 8}" class="lab">{rows[0]["date"]}</text>'
                 f'<text x="{W - pad}" y="{H - 8}" class="lab" text-anchor="end">{rows[-1]["date"]}</text>'
                 f'<text x="{pad}" y="{pad - 4}" class="lab">max {fmt(top, "", "")}</text></svg>')
    key = f'<span class="k a">{html.escape(m)}</span>' + (f' <span class="k b">{html.escape(vs)}</span>' if vs else '')
    return ''.join(parts) + f'<div class="muted">{key} (faint: daily, bold: 7-day average; lines mark period starts)</div>'


moves = dec.get('moves', [])[:3]
cards, proofs = [], []
for i, mv in enumerate(moves, 1):
    cards.append(f'<a class="move" href="#why{i}"><span class="n">{i}</span><h3>{fill(mv.get("title"))}</h3>'
                 f'<p>{fill(mv.get("proof"))}</p><p class="muted">{fill(mv.get("why"))}</p></a>')
    figs = ''.join(f'<figure><figcaption>{fill(c.get("title"))}</figcaption>{chart(c["metric"], c.get("vs"))}'
                   f'<p class="so">{fill(c.get("so"))}</p></figure>' for c in mv.get('charts', []))
    proofs.append(f'<section class="proof" id="why{i}"><h2>{i}. {fill(mv.get("title"))}</h2>{figs}</section>')
also = ''.join(f'<li>{fill(t)}</li>' for t in dec.get('also', []))
bp = dec.get('big_picture') or {}
big = (f'<section><h2>{fill(bp.get("title", "The big picture"))}</h2>{chart(bp["metric"])}<p class="so">{fill(bp.get("so"))}</p></section>'
       if bp.get('metric') else '')
metrics = sorted({k for r in daily for k in r if k != 'date'})
more = ''.join(f'<figure><figcaption>{html.escape(k)}: last 7d {fmt(stat("sum7", k), "", "sum7")}, '
               f'{fmt(stat("chg7", k), "", "chg7")}</figcaption>{chart(k, h=110)}</figure>' for k in metrics)
ptable = ''.join('<tr>' + ''.join(f'<td>{html.escape(str(p.get(c, "")))}</td>' for c in
                 ('label', 'start', 'end', 'days', 'orders_per_day', 'revenue_per_day', 'revenue_per_visitor')) + '</tr>'
                 for p in periods)
evlist = ''.join(f'<li>{html.escape(e["date"])} {html.escape(e["kind"])}: {html.escape(e["label"])}</li>' for e in events[-40:])
title = html.escape(dec.get('title', 'Growth moves'))

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><style>
:root{{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6a66;--line:#e4e1da;--card:#fff;--a:#2f6fb0;--b:#c2662d}}
@media (prefers-color-scheme:dark){{:root:not([data-theme=light]){{--bg:#151514;--fg:#ecebe7;--mut:#9c9a94;--line:#2c2b29;--card:#1d1d1b;--a:#6aa6e0;--b:#e69a62}}}}
:root[data-theme=dark]{{--bg:#151514;--fg:#ecebe7;--mut:#9c9a94;--line:#2c2b29;--card:#1d1d1b;--a:#6aa6e0;--b:#e69a62}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}}
main{{max-width:1100px;margin:0 auto;padding:24px 16px 64px}}
h1{{font-size:22px;margin:0 0 4px}} h2{{font-size:17px;margin:32px 0 8px}} h3{{font-size:16px;margin:4px 0}}
.muted{{color:var(--mut);font-size:13px}} .num{{font-variant-numeric:tabular-nums}}
#bluf{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:16px}}
.move{{display:block;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;color:inherit;text-decoration:none}}
.move .n{{display:inline-block;width:22px;height:22px;border-radius:50%;background:var(--a);color:var(--bg);text-align:center;font-size:13px;line-height:22px}}
.also{{margin:12px 0 0;padding-left:18px}} figure{{margin:12px 0;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px}}
figcaption{{font-weight:600;margin-bottom:6px}} svg{{width:100%;height:auto}} .so{{margin:6px 0 0}}
.ev{{stroke:var(--mut);stroke-dasharray:3 3}} .lab{{fill:var(--mut);font-size:11px}}
.k{{display:inline-block;padding-left:14px;position:relative}} .k:before{{content:"";position:absolute;left:0;top:8px;width:10px;height:3px}}
.k.a:before{{background:var(--a)}} .k.b:before{{background:var(--b)}}
table{{border-collapse:collapse;width:100%;font-size:13px}} td{{border-bottom:1px solid var(--line);padding:4px 6px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:8px}} details summary{{cursor:pointer;margin-top:32px;font-weight:600}}
</style></head><body><main>
<h1>{title}</h1><p class="muted">Data to {html.escape(daily[-1]["date"])}. Full days only.</p>
<p>{fill(dec.get("headline"))}</p>
<div id="bluf">{"".join(cards)}</div>{f'<ul class="also">{also}</ul>' if also else ''}
{"".join(proofs)}{big}
<details id="more"><summary>All data</summary>
<h2>Periods</h2><table><tr><td>period</td><td>start</td><td>end</td><td>days</td><td>orders/day</td><td>revenue/day</td><td>revenue/visitor</td></tr>{ptable}</table>
<h2>Events</h2><ul>{evlist}</ul><h2>Every metric</h2><div class="grid">{more}</div></details>
</main></body></html>'''
open(OUT, 'w').write(page)
print(f'Wrote {OUT}: {len(moves)} moves, {len(metrics)} metrics folded below')
if missing:
    print('Missing data for:', ', '.join(sorted(set(missing))))
    sys.exit(2)
~~~~~
