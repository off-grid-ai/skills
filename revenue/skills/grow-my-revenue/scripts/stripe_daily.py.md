# stripe_daily.py

This is the `stripe_daily.py` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `stripe_daily.py` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~python
"""Daily sales from Stripe, read-only. Writes a CSV the merge step reads.

Usage:
  STRIPE_API_KEY=rk_... python3 -I stripe_daily.py <out.csv> [--since YYYY-MM-DD] [--tz Area/City]
                                                   [--currency usd] [--product prod_...]...

Use a restricted key with read access to charges and invoices. The key is read from the environment only and never
printed.

Columns: date, orders, revenue, refunds, failed_payments, new_customers, subscription_orders, one_time_orders,
plus avg_order (revenue / orders). Amounts are in the currency's main unit (dollars, not cents), one currency only:
charges in other currencies are counted in `other_currency_orders` so you can see what was left out.

--product keeps only charges whose invoice lines name one of these product ids, or whose metadata.product matches.
Leave it out if the Stripe account sells one product.

It also prints each distinct order amount with its first and last day, so you can mark price periods in periods.csv.
"""
import argparse, csv, datetime as dt, json, os, sys, urllib.parse, urllib.request
from collections import defaultdict
from zoneinfo import ZoneInfo

ap = argparse.ArgumentParser()
ap.add_argument('out')
ap.add_argument('--since', default=(dt.date.today() - dt.timedelta(days=180)).isoformat())
ap.add_argument('--tz', default=os.environ.get('GROWTH_TZ', 'UTC'))
ap.add_argument('--currency', default='usd')
ap.add_argument('--product', action='append', default=[])
a = ap.parse_args()
key = os.environ.get('STRIPE_API_KEY')
if not key:
    sys.exit('Set STRIPE_API_KEY to a read-only (restricted) Stripe key.')
tz = ZoneInfo(a.tz)


def get_all(path, params):
    rows, after = [], None
    while True:
        p = dict(params, limit=100)
        if after:
            p['starting_after'] = after
        req = urllib.request.Request(f'https://api.stripe.com/v1/{path}?{urllib.parse.urlencode(p)}',
                                     headers={'Authorization': f'Bearer {key}'})
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.load(r)
        rows += d['data']
        if not d.get('has_more'):
            return rows
        after = d['data'][-1]['id']


since_ts = int(dt.datetime.fromisoformat(a.since).replace(tzinfo=tz).timestamp())
charges = get_all('charges', {'created[gte]': since_ts})
products = set(a.product)
ours_invoice = set()
if products:
    for inv in get_all('invoices', {'created[gte]': since_ts, 'expand[]': 'data.lines'}):
        for line in (inv.get('lines') or {}).get('data', []):
            pr = (line.get('price') or {}).get('product')
            if (pr if isinstance(pr, str) else (pr or {}).get('id')) in products:
                ours_invoice.add(inv['id'])


def ours(c):
    if not products:
        return True
    return c.get('invoice') in ours_invoice or (c.get('metadata') or {}).get('product') in products


day = lambda ts: dt.datetime.fromtimestamp(ts, tz).date().isoformat()
rows = defaultdict(lambda: defaultdict(float))
amounts = defaultdict(lambda: [None, None, 0])
seen_customers = set()
for c in sorted(charges, key=lambda c: c['created']):
    if not ours(c):
        continue
    d = rows[day(c['created'])]
    if c['status'] == 'failed':
        d['failed_payments'] += 1
        continue
    if c['status'] != 'succeeded' or not c.get('paid'):
        continue
    if c['currency'] != a.currency:
        d['other_currency_orders'] += 1
        continue
    amt = c['amount'] / 100
    d['orders'] += 1
    d['revenue'] += amt
    d['refunds'] += c.get('amount_refunded', 0) / 100
    d['subscription_orders' if c.get('invoice') else 'one_time_orders'] += 1
    cust = c.get('customer') or (c.get('billing_details') or {}).get('email')
    if cust and cust not in seen_customers:
        seen_customers.add(cust)
        d['new_customers'] += 1
    s = amounts[amt]
    s[0] = s[0] or day(c['created'])
    s[1] = day(c['created'])
    s[2] += 1

cols = ['orders', 'revenue', 'refunds', 'failed_payments', 'new_customers', 'subscription_orders', 'one_time_orders',
        'other_currency_orders', 'avg_order']
with open(a.out, 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['date'] + cols)
    for date in sorted(rows):
        r = rows[date]
        r['avg_order'] = round(r['revenue'] / r['orders'], 2) if r['orders'] else 0
        w.writerow([date] + [round(r.get(k, 0), 2) for k in cols])
print(f'Wrote {a.out}: {len(rows)} days, {sum(r["orders"] for r in rows.values()):.0f} orders in {a.currency.upper()}')
print('Order amounts seen (amount: first day - last day, orders). Use these to write periods.csv:')
for amt, (first, last, n) in sorted(amounts.items(), key=lambda x: x[1][0]):
    print(f'  {amt:>10.2f}: {first} - {last}, {n}')
~~~~~
