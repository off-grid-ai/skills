"""What moves with sales. Reads collect.mjs's daily.json and eras.json and writes correlations.json.

Usage: python3 -I correlate.py <collect_dir> [days=120]

For every daily series it asks: when this goes up, do orders (and revenue) go up the same day or up to 7 days
later? Each series is smoothed over 7 days (to drop the weekday rhythm) and then has its price-period average taken
out, so a price change can't fake a link between two series that both jumped on the same day. A result is a lead
to check, not proof: Claude reads it next to what shipped and what else changed.
"""
import json, math, os, sys

d = sys.argv[1]
days = int(sys.argv[2]) if len(sys.argv) > 2 else 120
daily = json.load(open(os.path.join(d, 'daily.json')))[-days:]
eras = json.load(open(os.path.join(d, 'eras.json')))
TARGETS = ['orders', 'revenue']
# Series that are sales themselves, or parts of them, would just correlate with themselves.
SKIP = ('orders', 'revenue', 'net_revenue', 'refunds', 'web_purchases', 'purchases_from_app', 'failed_payments')


def era_of(date):
    for i, e in enumerate(eras):
        if e['start'] <= date <= e['end']:
            return i
    return -1


def smooth(xs, w=7):
    out = []
    for i in range(len(xs)):
        win = [x for x in xs[max(0, i - w + 1):i + 1] if x is not None]
        out.append(sum(win) / len(win) if len(win) >= 4 else None)
    return out


def demean_by_era(xs, dates):
    groups = {}
    for x, dt in zip(xs, dates):
        if x is not None:
            groups.setdefault(era_of(dt), []).append(x)
    means = {k: sum(v) / len(v) for k, v in groups.items()}
    return [None if x is None else x - means[era_of(dt)] for x, dt in zip(xs, dates)]


def pearson(a, b):
    pts = [(x, y) for x, y in zip(a, b) if x is not None and y is not None]
    n = len(pts)
    if n < 30:
        return None, n
    mx = sum(p[0] for p in pts) / n
    my = sum(p[1] for p in pts) / n
    sx = math.sqrt(sum((p[0] - mx) ** 2 for p in pts))
    sy = math.sqrt(sum((p[1] - my) ** 2 for p in pts))
    if not sx or not sy:
        return None, n
    return sum((p[0] - mx) * (p[1] - my) for p in pts) / (sx * sy), n


dates = [r['date'] for r in daily]
metrics = sorted({k for r in daily for k in r if k != 'date' and not k.startswith(SKIP)})
out = []
for target in TARGETS:
    ty = [r.get(target) for r in daily]
    t_raw, t_in = smooth(ty), demean_by_era(smooth(ty), dates)
    for m in metrics:
        mx = [r.get(m) for r in daily]
        if sum(1 for x in mx if x) < 20:
            continue
        m_raw, m_in = smooth(mx), demean_by_era(smooth(mx), dates)
        best = None
        for lag in range(0, 8):
            # The metric leads: compare its value `lag` days earlier with the target today.
            a = m_in[:len(m_in) - lag] if lag else m_in
            b = t_in[lag:]
            r_in, n = pearson(a, b)
            if r_in is None:
                continue
            r_raw, _ = pearson(m_raw[:len(m_raw) - lag] if lag else m_raw, t_raw[lag:])
            if best is None or abs(r_in) > abs(best['r_within_price_period']):
                best = {'target': target, 'metric': m, 'lag_days': lag, 'r_within_price_period': round(r_in, 2),
                        'r_raw': None if r_raw is None else round(r_raw, 2), 'days': n}
        if best:
            out.append(best)

out.sort(key=lambda x: -abs(x['r_within_price_period']))
json.dump({'window_days': days, 'from': dates[0], 'to': dates[-1], 'note': 'r is Pearson on 7-day averages with each price '
           'period\'s average removed; lag = days the metric leads. |r| >= 0.5 is strong, 0.3-0.5 moderate. Leads to check, not proof.',
           'rows': out}, open(os.path.join(d, 'correlations.json'), 'w'), indent=1)
for r in [x for x in out if x['target'] == 'orders'][:15]:
    print(f"{r['metric']:<40} lag {r['lag_days']}d  r(within)={r['r_within_price_period']:+.2f}  r(raw)={r['r_raw']}  n={r['days']}")
