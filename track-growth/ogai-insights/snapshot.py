"""Build the one data file the Off Grid AI Insights dashboard reads.

Usage: python3 -I snapshot.py <days> <out.json> [collect_dir]
- Website detail from website PostHog (US project) and app detail from in-app PostHog (EU project); ids come from the env file.
- With collect_dir, it also folds in collect.mjs's output (Stripe revenue, price periods, App Store, GitHub, Argus
  caches), correlate.py's correlations.json and changes.py's timeline.json, so the dashboard has every source in one file.
Days are IST: the window ends at today's IST midnight, so the last day is complete. Aggregates only: no emails, person ids or IPs.
Everything under "extra" is for Claude's read, not drawn.
"""
import datetime, json, os, re, sys, urllib.request

days = int(sys.argv[1]) if len(sys.argv) > 1 else 28
out = sys.argv[2] if len(sys.argv) > 2 else 'snapshot.json'
collect_dir = sys.argv[3] if len(sys.argv) > 3 else None
env = open(os.environ.get('OGAI_ENV_FILE') or os.path.expanduser('~/.config/ogai-insights/keys.env')).read()
key = re.search(r'^POSTHOG_API_KEY=(.*)$', env, re.M).group(1).strip().strip('"\'')
app_key = re.search(r'^POSTHOG_EU_OGACONSUMER_IN_APP=(.*)$', env, re.M).group(1).strip().strip('"\'')
web_project = re.search(r'^POSTHOG_WEB_PROJECT_ID=(.*)$', env, re.M).group(1).strip()
app_project = re.search(r'^POSTHOG_APP_PROJECT_ID=(.*)$', env, re.M).group(1).strip()

end = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).date()
start = end - datetime.timedelta(days=days)
W = f"timestamp >= toDateTime('{start} 00:00:00', 'Asia/Kolkata') and timestamp < toDateTime('{end} 00:00:00', 'Asia/Kolkata')"
PV = "event='$pageview'"


def q(sql, host='us.posthog.com', project=None, k=None):
    project = project or web_project
    req = urllib.request.Request(
        f'https://{host}/api/projects/{project}/query/',
        data=json.dumps({'query': {'kind': 'HogQLQuery', 'query': sql}}).encode(),
        headers={'Authorization': 'Bearer ' + (k or key), 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=240))['results']


def qa(sql):
    return q(sql, 'eu.posthog.com', app_project, app_key)


def pct(a, b):
    return round(100 * a / b, 1) if b else 0


s = {'window': {'start': str(start), 'end': str(end - datetime.timedelta(days=1)), 'days': days}}
s['daily'] = [dict(date=str(d), visitors=v, pageviews=p, sales=c) for d, v, p, c in q(
    f"select toDate(toTimeZone(timestamp, 'Asia/Kolkata')) d, uniqIf(person_id,{PV}), countIf({PV}), uniqIf(person_id,event='pro_purchase_completed') "
    f"from events where {W} group by d order by d")]
s['heat'] = [dict(weekday=w, hour=h, visitors=v) for w, h, v in q(
    f"select toDayOfWeek(toTimeZone(timestamp,'Asia/Kolkata')) w, toHour(toTimeZone(timestamp,'Asia/Kolkata')) h, uniq(person_id) "
    f"from events where {PV} and {W} group by w,h order by w,h limit 500")]
s['pages'] = [dict(page=p, visitors=v) for p, v in q(
    f"select properties.$pathname p, uniq(person_id) v from events where {PV} and {W} group by p order by v desc limit 10")]
f = q(f"select uniqIf(person_id,{PV} and properties.$pathname='/pro/'), uniqIf(person_id,event='pro_buy_form_viewed'), "
      f"uniqIf(person_id,event='pro_checkout_started'), uniqIf(person_id,event='pro_purchase_completed') from events where {W}")[0]
s['funnel'] = [dict(step=n, people=v) for n, v in zip(['Saw /pro', 'Saw the buy box', 'Opened checkout', 'Bought'], f)]
s['country'] = [dict(country=c, opened=o, bought=b, rate=pct(b, o)) for c, o, b in q(
    f"select properties.$geoip_country_name c, uniqIf(person_id,event='pro_checkout_started') o, uniqIf(person_id,event='pro_purchase_completed') b "
    f"from events where {W} group by c order by o desc limit 8")]
s['leave'] = [dict(landing=l, sessions=n, left=one, rate=pct(one, n)) for l, n, one in q(
    f"select landing, count(), countIf(pv=1) from (select $session_id sid, argMin(properties.$pathname,timestamp) landing, count() pv "
    f"from events where {PV} and {W} group by sid) group by landing order by count() desc limit 7")]
s['buyers_country'] = [dict(country=c, visitors=v, buyers=b, buy_rate=pct(b, v), revenue=r) for c, v, b, r in q(
    f"select properties.$geoip_country_name c, uniqIf(person_id,{PV}), uniqIf(person_id,event='pro_purchase_completed'), "
    f"round(sumIf(toFloat(properties.value), event='pro_purchase_completed')) from events where {W} and c is not null "
    f"group by c order by 3 desc, 2 desc limit 10")]
s['device'] = [dict(device=d, visitors=v) for d, v in q(
    f"select properties.$device_type d, uniq(person_id) from events where {PV} and {W} and d is not null group by d order by 2 desc")]

x = s['extra'] = {}
x['referrers'] = q(f"select properties.$referring_domain, uniq(person_id) from events where {PV} and {W} group by 1 order by 2 desc limit 12")
x['utm_sources'] = q(f"select properties.utm_source, uniq(person_id) from events where {PV} and {W} and properties.utm_source is not null group by 1 order by 2 desc limit 12")
x['countries'] = q(f"select properties.$geoip_country_name, uniq(person_id) from events where {PV} and {W} group by 1 order by 2 desc limit 12")
x['events'] = q(f"select event, count(), uniq(person_id) from events where {W} group by event order by count() desc limit 45")
x['cta_clicks'] = q(f"select properties.$pathname, properties.label, uniq(person_id) from events where event='cta_click' and {W} group by 1,2 order by 3 desc limit 20")
x['rageclicks'] = q(f"select properties.$pathname, properties.$el_text, count() from events where event='$rageclick' and {W} group by 1,2 order by 3 desc limit 15")
x['nudge_by_page'] = q(f"select properties.$pathname, uniqIf(person_id,event='lifetime_offer_nudge_shown'), uniqIf(person_id,event='lifetime_offer_nudge_closed'), "
                       f"uniqIf(person_id,event='lifetime_offer_clicked') from events where {W} group by 1 order by 2 desc limit 12")
x['checkout_by_source_device'] = q(f"select coalesce(properties.utm_source,'(none)'), properties.$device_type, uniqIf(person_id,event='pro_checkout_started'), "
                                   f"uniqIf(person_id,event='pro_purchase_completed') from events where {W} group by 1,2 order by 3 desc limit 12")
x['landing_sources'] = q(f"select landing, src, count(), countIf(pv=1) from (select $session_id sid, argMin(properties.$pathname,timestamp) landing, "
                         f"argMin(coalesce(properties.utm_source, properties.$referring_domain),timestamp) src, count() pv from events where {PV} and {W} group by sid) "
                         f"group by landing, src order by count() desc limit 25")
x['paid_server'] = q(f"select properties.plan, count() from events where event='pro_purchase_paid' and {W} group by 1 order by 2 desc")

# Sessions: one row per visit, with where it came from, what it ran on and what it did.
S = f"""(select $session_id sid, any(person_id) pid, min(timestamp) t0, max(timestamp) t1, countIf(event='$pageview') pv,
  argMin(properties.$pathname, timestamp) landing, any(properties.$os) os,
  argMin(coalesce(properties.utm_source, properties.$referring_domain), timestamp) src,
  maxIf(1, event='pro_purchase_completed') bought,
  maxIf(1, event in ('desktop_download_click','docs_download_click','download_card_click')) dl
  from events where {W} and $session_id is not null group by sid having pv > 0)"""
s['sources'] = [dict(source=src or '(unknown)', visits=n, buy_rate=r, buys=b) for src, n, r, b in q(
    f"select src, count(), round(100*avg(bought),2), sum(bought) from {S} group by src having count() >= 100 order by sum(bought) desc, count() desc limit 8")]
s['platforms'] = [dict(platform=o, visits=n, buy_rate=r, buys=b) for o, n, r, b in q(
    f"select os, count(), round(100*avg(bought),2), sum(bought) from {S} where os is not null group by os having count() >= 100 order by count() desc limit 6")]
s['returning'] = [dict(visit=k, visits=n, buy_rate=r) for k, n, r in q(
    f"select if(rn=1,'First visit','Came back'), count(), round(100*avg(bought),2) from (select bought, row_number() over (partition by pid order by t0) rn from {S}) group by 1 order by 1 desc")]
s['visits_to_buy'] = [dict(visits=f"{n}" if n < 4 else '4+', buyers=c) for n, c in q(
    f"select least(n,4), count() from (select pid, count() n from {S} group by pid having max(bought)=1) group by 1 order by 1")]
s['duration'] = [dict(length=b[2:], visits=n, buy_rate=r) for b, n, r in q(
    f"select multiIf(d<10,'a Under 10s',d<60,'b 10s–1 min',d<180,'c 1–3 min',d<600,'d 3–10 min','e 10 min+') b, count(), round(100*avg(bought),2) "
    f"from (select dateDiff('second',t0,t1) d, bought from {S}) group by b order by b")]
s['weekday_buy'] = [dict(day=['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][w], visits=n, buy_rate=r) for w, n, r in q(
    f"select toDayOfWeek(toTimeZone(t0,'Asia/Kolkata')), count(), round(100*avg(bought),2) from {S} group by 1 order by 1")]
s['speed'] = [dict(page=p, lcp_ms=l, samples=n) for p, l, n in q(
    f"select properties.$pathname, round(quantile(0.75)(properties.$web_vitals_LCP_value)), count() from events where event='$web_vitals' "
    f"and properties.$device_type='Mobile' and properties.$web_vitals_LCP_value > 0 and {W} group by 1 order by 3 desc limit 7")]
# What each phone-app link earns: visits, purchases and revenue by link and landing page (read the app code for each link's intent).
s['app_link_buys'] = [dict(link=m or '(none)', page=p, visits=n, buys=b, rate=r, revenue=rv or 0, key=f"{m}|{p}") for m, p, n, b, r, rv in q(
    f"select med, landing, count(), sum(bought), round(100*avg(bought),1), round(sum(rev)) from (select $session_id sid, argMin(properties.utm_medium,timestamp) med, "
    f"argMin(properties.$pathname,timestamp) landing, maxIf(1,event='pro_purchase_completed') bought, sumIf(toFloat(properties.value),event='pro_purchase_completed') rev "
    f"from events where {W} and $session_id is not null group by sid having countIf(event='$pageview')>0 and argMin(properties.utm_source,timestamp)='off-grid-mobile-app') "
    f"group by 1,2 having count() >= 20 order by 3 desc limit 10")]
s['app_link_ios'] = [dict(key=f"{m}|{p}", visits=n, buys=b, rate=round(100 * b / n, 1) if n else 0) for m, p, n, b in q(
    f"select med, landing, count(), sum(bought) from (select $session_id sid, argMin(properties.utm_medium,timestamp) med, argMin(properties.$pathname,timestamp) landing, "
    f"any(properties.$os) os, maxIf(1,event='pro_purchase_completed') bought from events where {W} and $session_id is not null group by sid "
    f"having countIf(event='$pageview')>0 and argMin(properties.utm_source,timestamp)='off-grid-mobile-app') where os='iOS' group by 1,2 having count() >= 20 order by 3 desc limit 6")]
s['app_links'] = [dict(link=m or '(none)', page=p, visits=n) for m, p, n in q(
    f"select properties.utm_medium, properties.$pathname, count(distinct $session_id) from events where {PV} and properties.utm_source='off-grid-mobile-app' "
    f"and {W} group by 1,2 order by 3 desc limit 6")]
x['scroll_by_page'] = q(f"select properties.$prev_pageview_pathname, count(), round(median(properties.$prev_pageview_max_scroll_percentage)*100), "
                        f"round(median(properties.$prev_pageview_duration)) from events where event='$pageleave' and {W} group by 1 order by 2 desc limit 10")


# ---------- In the apps (in-app PostHog; only people who opted in to analytics) ----------
P = "if(properties.$lib = 'posthog-node', 'Desktop', 'Phone')"
AW = f"{W} and properties.$lib in ('posthog-react-native', 'posthog-node')"
s['app_users'] = [dict(date=str(dd), phone=ph, desktop=de) for dd, ph, de in qa(
    f"select toDate(toTimeZone(timestamp, 'Asia/Kolkata')) d, uniqIf(person_id, {P}='Phone'), uniqIf(person_id, {P}='Desktop') from events where {AW} group by d order by d limit 100")]
# No 'finished a download' step: the app never sent model_download_finished for chat or image models before its
# 2026-11-09 fix (mobile src/services/analytics/analytics.ts), so older versions undercount it badly.
steps = [('Opened the app', '1'), ('Started a model download', "event='model_download_started'"),
         ('Loaded a model', "event='model_loaded'"), ('Sent a message', "event in ('message_sent','first_message')"), ('Got a reply', "event='generation_finished'")]
s['app_funnel'] = []
for plat, *v in qa(f"select {P} p, " + ', '.join(f"uniqIf(person_id, {c})" for _, c in steps) + f" from events where {AW} group by p"):
    for (label, _), n in zip(steps, v):
        s['app_funnel'].append(dict(platform=plat, step=label, people=n))
s['app_downloads'] = [dict(platform=pl, started=a, hit_failure=b, failure_rate=pct(b, a), load_failed=c) for pl, a, b, c in qa(
    f"select {P}, uniqIf(person_id, event='model_download_started'), uniqIf(person_id, event='model_download_failed'), uniqIf(person_id, event='model_load_failed') "
    f"from events where {AW} group by 1 order by 2 desc")]
s['app_pro'] = [dict(platform=pl, pro=a, users=b, pro_rate=pct(a, b)) for pl, a, b in qa(
    f"select {P}, uniqIf(person_id, properties.pro = true), uniq(person_id) from events where {AW} and event in ('usage_snapshot','features_snapshot') group by 1 order by 3 desc")]
s['app_reply'] = [dict(platform=pl, users=a, got_reply=b, reply_rate=pct(b, a)) for pl, a, b in qa(
    f"select {P}, uniq(person_id), uniqIf(person_id, event='generation_finished') from events where {AW} group by 1 order by 2 desc")]
s['app_return'] = [dict(group=('Got a reply' if r else 'Never got a reply'), people=n, came_back=b, rate=pct(b, n)) for r, n, b in qa(
    f"select replied, count(), countIf(days > 1) from (select person_id, max(event='generation_finished') replied, count(distinct toDate(toTimeZone(timestamp, 'Asia/Kolkata'))) days, "
    f"min(timestamp) f from events where {AW} and properties.$lib='posthog-react-native' group by person_id having f < now() - interval 2 day) group by replied order by replied desc")]
x['app_failures'] = qa(f"select event, {P}, coalesce(properties.reason, properties.error, properties.error_type, ''), count() from events where {AW} "
                       f"and event in ('model_download_failed','model_load_failed','unclean_exit','$exception') group by 1,2,3 order by 4 desc limit 20")
x['app_features'] = qa(f"select {P}, coalesce(properties.feature, properties.name, ''), uniq(person_id), count() from events where {AW} and event='feature_used' group by 1,2 order by 3 desc limit 20")
x['app_pro_raw'] = qa(f"select {P}, uniqIf(person_id, properties.pro = true), uniq(person_id) from events where {AW} and event in ('usage_snapshot','features_snapshot') group by 1")

# ---------- Every other source (collect.mjs, correlate.py, changes.py) ----------
if collect_dir:
    def load(name):
        try:
            return json.load(open(os.path.join(collect_dir, name)))
        except Exception:
            return None
    daily_all = load('daily.json') or []
    keep = ['revenue', 'orders', 'site_visitors', 'cloudflare_visitors', 'app_new_users', 'app_active_users', 'model_downloads_finished',
            'github_stars', 'github_desktop_downloads', 'github_apk_downloads', 'ios_first_downloads', 'devto_views', 'mentions',
            'articles_published', 'marketing_emails_delivered', 'pro_activations']
    s['money'] = [dict(date=r['date'], revenue=r.get('revenue'), orders=r.get('orders')) for r in daily_all[-days:]]
    s['eras'] = [dict(period=e['era'], start=e['start'], end=e['end'], days=e['days'], revenue_per_day=e['revenuePerDay'],
                      orders_per_day=e['ordersPerDay'], revenue_per_visitor=e['revenuePerVisitor']) for e in (load('eras.json') or [])][-6:]
    store = load('store.json') or []
    s['store'] = [dict(source=f.get('source'), step=f.get('label'), count=f.get('count')) for f in store if f.get('kind') == 'funnel' and f.get('source') == 'all']
    corr = load('correlations.json') or {}
    x['correlations'] = [dict(metric=r['metric'], lag_days=r['lag_days'], r=r['r_within_price_period'], r_raw=r['r_raw'], days=r['days'])
                         for r in corr.get('rows', []) if r['target'] == 'orders'][:10]
    tl = load('timeline.json') or {}
    x['turning_points'] = [dict(date=t['date'], before=t['orders_per_day_before'], after=t['orders_per_day_after'],
                                shipped='; '.join(f"{i['where'] or i['kind']}: {i['label']}" for i in t['shipped_in_3_days_before'][:4]) or 'Nothing shipped in the 3 days before')
                           for t in tl.get('turning_points', [])][-8:]
    x['daily_all_keys'] = sorted({k for r in daily_all for k in r})
    x['summary_md_path'] = os.path.join(collect_dir, 'summary.md')

# Beyond the website: App Store trend and failed checkouts (from collect.mjs).
if collect_dir:
    allday = json.load(open(os.path.join(collect_dir, 'daily.json')))
    st = [r for r in allday if r.get('ios_impressions_search') is not None][-14:]
    def avg(rows, k): return round(sum(r.get(k) or 0 for r in rows) / len(rows)) if rows else None
    if len(st) == 14:
        s['store_trend'] = [dict(period=lbl, search_impressions=avg(rows, 'ios_impressions_search'), browse_impressions=avg(rows, 'ios_impressions_browse'),
                                 page_views=avg(rows, 'ios_page_views'), first_downloads=avg(rows, 'ios_first_downloads'), search_downloads=avg(rows, 'ios_first_downloads_search'),
                                 start=rows[0]['date'], end=rows[-1]['date']) for lbl, rows in (('Week before', st[:7]), ('Last week', st[7:]))]
    try:
        pay = json.load(open(os.path.join(collect_dir, 'payments.json')))
        s['payments'] = [dict(k='all', **{k: v for k, v in pay.items() if k != 'reasons'})]
        x['payment_fail_reasons'] = pay['reasons']
    except FileNotFoundError:
        pass
    # Desktop telemetry reach: tracked new desktop users vs GitHub desktop downloads, last 14 days.
    last = allday[-15:-1]
    s['reach'] = [dict(k='desktop', downloads=sum(r.get('github_desktop_downloads') or 0 for r in last), tracked=sum(r.get('app_new_users_desktop') or 0 for r in last))]

# Week over week (last 7 full days vs the 7 before) for the headline sentence.
if collect_dir:
    _d = [r for r in json.load(open(os.path.join(collect_dir, 'daily.json'))) if r['date'] < str(end)]
    _l, _p = _d[-7:], _d[-14:-7]
    def _t(rows, k): return round(sum(r.get(k) or 0 for r in rows))
    s['week'] = [dict(metric=k, last=_t(_l, k), prev=_t(_p, k), change=round(100 * (_t(_l, k) - _t(_p, k)) / _t(_p, k)) if _t(_p, k) else None)
                 for k in ['revenue', 'orders', 'site_visitors', 'mentions', 'github_stars', 'github_desktop_downloads', 'purchases_from_app', 'web_purchases', 'failed_payments']]

# Argus digest (argus.py): Play vitals, licences by platform; the rest goes to extra for Claude's read.
if collect_dir and os.path.exists(os.path.join(collect_dir, 'argus.json')):
    ag = json.load(open(os.path.join(collect_dir, 'argus.json')))
    if 'play' in ag:
        pl = ag['play']
        s['play'] = [dict(k='android', users=pl['users'], crash_pct=pl['crash_pct'], anr_pct=pl['anr_pct'], crash_line=pl['crash_line_pct'], anr_line=pl['anr_line_pct'],
                          newest_crash_pct=pl['newest_crash_pct'], newest_users=pl['newest_users'], top_crash_pct=round((ag.get('play_crashes') or [{}])[0].get('users_pct') or 0))]
        s['play_versions'] = [dict(build=v['version'], users=v['users'], crash_pct=v['crash_pct']) for v in pl['versions']]
    if ag.get('licences_14d'):
        lic = ag['licences_14d']
        s['licences'] = [dict(platform={'android': 'Android', 'ios': 'iPhone', 'windows': 'Windows', 'macos': 'Mac', 'linux': 'Linux'}.get(k, k), activations=v)
                         for k, v in sorted(lic.items(), key=lambda kv: -kv[1])]
        s['licences_total'] = [dict(k='all', total=sum(lic.values()), android=lic.get('android', 0))]
    if ag.get('licence_mix'):
        lm = ag['licence_mix']; t = lm['licences'] or 1
        s['licence_mix'] = [dict(k='all', licences=lm['licences'], both=lm['both'], both_pct=round(100 * lm['both'] / t), phone_only_pct=round(100 * lm['phone_only'] / t),
                                 computer_only_pct=round(100 * lm['computer_only'] / t))]
    x['argus'] = ag

json.dump(s, open(out, 'w'), indent=1)
print(f"wrote {out} (app days {len(s.get('app_users', []))}, collect {'yes' if collect_dir else 'no'}): {s['window']}, visitors={sum(d['visitors'] for d in s['device'])}, sales={s['funnel'][-1]['people']}")
