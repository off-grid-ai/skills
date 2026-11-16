---
name: partners-one-pager
description: Make the weekly BLUF (bottom line up front) debrief of Off Grid AI marketing and sales for the partners meeting (Mac and his business partner). Covers the last 7 days against the 7 before, from every Claude chat on this Mac, git, and the ogai-insights data, and publishes one page in Mac's voice. Use when Mac says "partners one pager", "/partners-one-pager", "weekly one pager", "one pager for the partners meeting", "what did we do in marketing and sales this week", or "BLUF of marketing and sales".
---

# Partners one-pager (weekly)

One page Mac puts in front of his business partner each week. **It's a debrief of what happened this week: the bottom line first,
then what we got right, then the experiments and how each went.** It never asks for decisions, recommends bets or says
"decide today" (Mac, 16 Nov: "there is nothing to decide... this is a debrief about whats been happening, thats it").

**Window: the last 7 days** (Mac, 16 Nov: "from next time onwards, I'll just need the weekly data"). Use a different
window only when Mac names one. **It's about what we did and what's working, not X vs Y** (Mac, 16 Nov). Don't build
the page as a this-week-against-last-week scorecard. Show this week's numbers as they are, and use a before → after only
to prove that a specific thing we did is working (e.g. "checkout in /pro: 3.0 → 4.4 sales a day"). The first page (16 Nov) covered 21 Oct to 16 Nov as the
starting baseline.
Reference build: the first week's page in `~/olympus-repo/docs/partners/` (kept private, not in this repo). Copy its layout, tokens and tone.

## 1. This week's numbers (run in the background, about 3 minutes)
```bash
D=<scratchpad>; cd ~/.claude/skills/ogai-insights
node collect.mjs "$D/collect" && python3 -I argus.py "$D/collect" && python3 -I snapshot.py 14 "$D/snapshot.json" "$D/collect"
```
From `$D/collect/daily.json` sum this week: revenue, orders, website visitors, pay-form views, iPhone first downloads,
Pro activations, app share of sales. Pull earlier days only to show that a specific change worked. Use `argus.json` for Search Console, GitHub, Resend and
mentions. If a source didn't refresh, say which and leave its tile out. Never guess a number.
Live counts: `gh api 'repos/off-grid-ai/private-ai-apps/git/trees/HEAD?recursive=1'` (lists), the website's new
`articles/` files in git, the dev.to stats dashboard (website `.claude/launch.json` → `devto-stats`), Medium posts.

## 2. What happened this week
1. `python3 ~/.claude/skills/partners-one-pager/gather.py <7 days ago, YYYY-MM-DD> $D/chats.txt` and read it whole:
   marketing chats by title, other chats where Mac asked about marketing, and git logs of the website, license worker
   and Argus, plus the private-ai-apps list count.
2. Read the chats that matter in full with `python3 ~/.claude/skills/get-context/find.py "<title>" 150`.
   Newer numbers beat older ones. If two chats disagree, use the one that says it corrected the other.
3. **Count things from git or the live source, never from a mid-chat message** (a chat said "11 lists"; the repo had 24).
4. Everything below counts as marketing (Mac, 16 Nov): Pro and Boost pricing and sales, Boost plans and checkout,
   articles, dev.to, Medium, the GitHub lists, llms.txt and robots, AI answers runs (named in N of M clean answers),
   store listings, emails sent and list size, X replies and quotes (Boost included: check `~/.olympus/argus/signals/posts.json`
   and Codex/Claude transcripts), Argus Engage/Research changes, and /ogai-insights reads.
   Also count (Mac, 16 Nov: "its not right to ignore" these):
   - **X reach.** The reply-and-quote "news bulletin" strategy is a win to report. Read X analytics for @AliChherawalla in
     Brave through the extension, in the background (`x.com/i/account_analytics`, 7D view: impressions, engagements,
     profile visits, follows; close the tab and switch the account back after). Count replies, quotes and posts, and the
     Boost ones, from `~/.olympus/argus/signals/x-mine.json` (`items`, `followers`, `newFollowers`).
   - **Listings and directories.** Every place we went live this week (stores, add-on sites, AppSumo, directories,
     GitHub, Medium), plus sites and newsletters that asked to feature us. Search the company inbox
     (Gmail connector, read only) for "listed", "feature", "directory", "submission".
   - **Newsletters.** Every issue sent (Shipped, This week in private AI, Wednesday's This week in applied AI, product
     emails), with list size from Resend, and any replies thanking us. Wednesday's newsletter sends from another
     address, so ask Mac for its reception if the inbox has none. Never claim appreciation you didn't find.
5. Skip side projects (Game of Crowns and the like) and pure engineering unless Mac says otherwise.
6. Read last week's page in `~/olympus-repo/docs/partners/` so "Still running" items get their result this week.

## 3. Write (load `/copywriting-rulebook`, then `/mac-voice`, then `/no-ai-slop` last)
Tone (Mac, 16 Nov): **positive and confident, never defensive, anxious or cautious.** Lead with what we got right.
What isn't working is stated plainly as fact, in one short list, never as worry. All facts right, all data-driven.
- **Headline:** the week's biggest true win, with its number.
- **Bottom line:** three short paragraphs. What we did this week, what's working (with numbers), and what the week produced (revenue, orders, articles, lists, emails).
- **What's working:** 8 tiles, each this week's number with a short note on what it came from.
- **What we got right:** 4–6 numbered wins, each a bold label plus one sentence with its numbers.
- **Sales experiments** and **Reach experiments:** two tables of when, experiment, what happened (with numbers) and a call tag:
  Worked, Shipped, Learned, Running, Growing, Baseline set, Live early. No warning-coloured tags.
  Include last week's "Still running" items with their result.
- **Still running** and **What hasn't worked yet** side by side. Each "hasn't worked" line says what we did about it when we did something.
- **Footer note:** which chats and repos it came from, that revenue is before Stripe fees, and the exact dates.
No em dashes, no colon reveals, no recap ending.

## 4. Publish
- Write `~/olympus-repo/docs/partners/<YYYY-MM-DD>-marketing-sales-one-pager.html` from the reference file, then publish
  it with the Artifact tool as a **new** artifact (icon `memo`) so each week keeps its own link.
- Remind Mac it's private until he shares it with his partner from the page's Share menu.
- **Don't commit it.** It holds live revenue, and Mac removed live revenue from storage-watch's git history on 16 Nov.
  Keep `docs/partners/` untracked.
