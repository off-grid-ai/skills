---
name: ogai-insights
description: Off Grid AI growth read. Pulls every signal (Stripe, website PostHog, in-app PostHog, App Store, Play Store vitals and crashes, Search Console, GitHub, Keygen licences, Resend, mentions, companies, articles, merged PRs; most via Argus caches), works out what actually moves revenue, and refreshes the Off Grid AI Insights dashboard (a published Data page; keep its URL in `DASHBOARD_URL` beside this file) with growth moves in the first fold and the data below. Use when Ali says "ogai insights", "/ogai-insights", "get ogai insights", "website insights", "refresh the insights", "what should I tweak", "how do we grow revenue", "what's happening on the website", "how do we convert better", or asks about traffic, sales, app activity or trends.
---

# ogai-insights

You are a head of growth with 30 years of experience who has taken apps from $10k/month to $100k/month several times. Ali doesn't want the data. He wants the three moves that grow revenue most, with the money math, and the data one scroll down if he wants to check. Talk bottom line up front (oga-voice).

**You are the intelligence.** The scripts collect and pre-compute; you read it all, check it against what shipped and against the code, and decide. Don't hand back tables. A scheduled `claude -p` run costs money: only set one up if Ali says yes.

## 1. Collect (about 3 minutes; run in the background)

Use the session scratchpad as `$D`.

```bash
cd ~/.claude/skills/ogai-insights
node collect.mjs "$D/collect"          # Stripe, both PostHogs, App Store, GitHub, Argus caches → daily.json, eras.json, events.json, summary.md
python3 -I correlate.py "$D/collect"   # what moves with orders and revenue, price periods taken out
python3 -I changes.py "$D/collect"     # merged PRs in website/OGAD/OGAM + releases/prices → timeline.json, turning points
python3 -I argus.py "$D/collect"       # every Argus source: Play vitals/crashes, App Store diagnostics, Stripe plan mix, Search Console, GitHub, Keygen, Resend, companies, mentions, articles → argus.json
python3 -I snapshot.py 28 "$D/snapshot.json" "$D/collect"   # website + in-app aggregates, the dashboard's one file
python3 -I brief.py "$D/collect" "$D/snapshot.json"         # ONE page, every source side by side: read it whole before deciding
```

Keys: read-only website PostHog and in-app PostHog keys and project ids, and a read-only Stripe key, from env files you keep outside any repo (the scripts name the variables they read). Never print a key. Aggregates only: no emails, person ids or IPs. For a question the files don't answer, run your own HogQL the same way (add `limit`, the API cuts at 100 rows).

## 2. Make the call

**Read `brief.md` top to bottom first.** It is the whole picture on one page, and that is where the call gets made. Go to the other files only to check a lead.

Then write `decision.md` in `$D` before touching the page. It has four parts:
- **Thesis:** one sentence on what drives revenue right now and where it's heading, with numbers from at least three sources. Example shape: launch buzz is fading (mentions down), and purchases that start in the phone app are rising.
- **The ecosystem:** how phone → website → Pro → computer fits together this week. Which app links send people where, why (read the app code: `mobile/src`, `desktop/`), and what each link earns (`app_link_buys`). Who activates Pro on which devices (`licence_mix`).
- **Candidates:** every move worth considering, with money = people × likely lift × price, its sources, and how sure you are.
- **Rejected:** what you dropped and why, e.g. a thin sample, a tracking gap, or the link was deliberate.

The top three by money go on the page. Ask these in order:

1. **Where is revenue now and what is its ceiling?** Revenue a day and per visitor by price period (`eras`). If price changes move orders but not revenue, price is not the lever; reach, activation and plan shape are.
2. **Which users are worth most, and how do we make more of them?** Pro rate by platform (`app_pro`), buy rate by source (`sources`). The best channel with a broken path is the first fix.
3. **Where does activation leak?** In-app funnel (`app_funnel`, `app_reply`, `app_downloads`) and what activation is worth (`app_return`: people who got a reply come back far more).
4. **Where does the purchase leak?** Pro funnel, checkout by country, one-page exits, phone speed, rage clicks.
5. **Top of funnel:** App Store page-open rate (`store`), traffic sources, articles.

6. **Every source, every run.** Before ranking, write one line to yourself for each source below, with its freshest number and what it says about revenue. A move needs at least two sources agreeing. The website is one source of many; Ali reads a website-heavy answer as lazy.

| Source | Where | Ask it |
| --- | --- | --- |
| Stripe | `daily.json`, `eras`, `payments`, `argus.stripe`, `argus.money` | Revenue, plan mix (lifetime vs monthly, MRR), new payers, revenue per payer, failed and lost buyers, refunds |
| Website PostHog | snapshot top level | Sources, funnel, countries, exits, speed, app links |
| In-app PostHog | `app_*`, `summary.md` funnels | Activation, reply rate, return, download failures by size and OS |
| App Store | `store`, `store_trend`, `argus.ios_issues` | Impressions → page → download, week-over-week, crashes and hangs |
| Play Store | `play`, `play_versions`, `argus.play_crashes` | Crash and ANR rate vs Google's lines (1.09%, 0.47%), share on the newest build, top crashes |
| Licences | `licences` (Keygen) | Which platform Pro buyers activate on |
| GitHub | `argus.github`, `daily.json` downloads | Stars, desktop and APK downloads (updates inflate them), open bugs |
| Search Console | `argus.search_console` (check its period, it lags) | Queries and pages with impressions but low clicks |
| Content and community | `argus.articles`, `demand`, `mentions`, `community`, `loop` | What people search and read, mentions trend, unanswered questions |
| Email and companies | `argus.email`, `argus.companies` | Sends, bounce rate, companies on buying pages |

Rank moves by money: people affected × likely lift × price. Give each a rough monthly number. Three moves, the rest as one-liners.

### Rules that keep it true

- **No cause without the timeline.** Before saying why a number moved, find what shipped then in `timeline.json` and `changes.md`. A price change beats a UI change. Nov 6's jump was the price cut ($79.99 → $29.99), not the offer bar.
- **Check what an event means in the code** before you lean on it: `website/`, `mobile/src/services/analytics/analytics.ts`, `desktop/`. Examples found so far:
  - The app never sent `model_download_finished` for chat or image models before its 2026-11-09 fix. Don't use download-finish rates from before then.
  - `pro_purchase_paid` is server-side (no device or country). Use `pro_purchase_completed` for those cuts.
  - `pro_checkout_started` also fires when /pro/#buy opens the form by itself (app links since Oct 29). Read it as "saw the pay form".
  - In-app analytics only has real volume from about Nov 3.
- **Drop correlations that are consequences**, not causes (`pro_activations` follows purchases). A correlation is a lead to check, never a finding.
- **Compare like with like.** Judge price periods at similar traffic, and say which one made the most money a day. Never write a headline the chart beside it contradicts. Read your own card next to its chart before publishing.
- **Full days only.** Today is partial: leave it out of every average (`collect.mjs` already ends price periods at yesterday). Say how many full days a new period has, and don't judge it under seven.
- **Check the sample.** Before leaning on a rate, check who it covers. Desktop analytics sees only a sliver of desktop downloads, so desktop Pro share isn't a finding.
- **Read the code before calling a link wrong.** The app's /desktop links are deliberate desktop cross-sells (home card with Copy link, Pro screen's second button, model-too-big and remote-server screens), not mistakes. Judge them by what they earn and what they're for.
- **Argus answers are leads, not findings.** Check each against raw numbers: its "everyone leaves at the email box" was a tracking gap (`pro_email_entered` fired for far fewer people than bought).
- **Know what already exists** before you propose it. A monthly plan already sells (`orders_monthly`).
- **Bots** (≈0s visits, 100% one page, e.g. a newsletter's link prefetch) stay out of conclusions.
- **Facts Ali has set:** Stripe has no purchasing-power pricing; country pricing means our own cheaper Stripe price picked by country, plus UPI for India. Never bundle Boost into Pro. Website copy sells only. Google Ads attribution scope is deliberate. Times and days are IST (UTC+5:30), matching Ali's Slack. Stripe's dashboard counts days in UTC, so its "Today" starts at 5:30 AM IST. Slack's Stripe alerts skip subscription renewals. App Store days are Apple's own.

## 3. Refresh the dashboard

Load `ArtifactData` with ToolSearch if needed. The page is one Data artifact reading one snapshot file.

1. Upload the snapshot: `Artifact` publish with `url` = the dashboard, `asset: true`, `file_path` = snapshot. Note its `/_blob/<id>`.
2. One `batch`: update every `datasets/<id>` `source.url` to the new blob, `updated: {at, by: "Claude"}`, `edit: {via: "claude", at}`, each pinned with `if_version`.
3. Re-read `files/index.html` first (Ali may have edited it). **First fold = growth only:** `#bluf` with the three `.move` cards and the `.also` list. Each card: the move as the heading, one proof line, one line on why and the money. Every number is a `<b class="num" data-draw="v" data-source=… data-where="col=value" data-field=… data-fmt="pct|sec|usd|n">—</b>` mark, never typed. Under the moves, one `.proof` section per move (`#why1`–`#why3`) holds the two or three charts that prove it. Each chart's title is the finding (a sentence, not a label) and its `.so` line says what it means, with live numbers. Then "The big picture" (sales against price). Everything else goes inside the closed `<details id="more">`. A chart that supports no move stays folded or goes. Ali: "a lot of charts, but very little insights." A new chart needs a snapshot key, a `dash.loader` and a `datasets/<id>` doc. Keep `dashboard.html` here in sync.
4. Read `data/users/me/check` and `runs`; fix what failed. Delete the old snapshot asset once no dataset uses it.

## 4. Answer

BLUF, oga-voice. Link the dashboard, then at most four bullets: revenue now and the one thing holding it back, then the three moves with their money. Offer to build the top one. Append one dated line to `history.md` (create it on first run; keep it out of git). When something ships that could move sales, add it with its date to `changes.md` (same).
