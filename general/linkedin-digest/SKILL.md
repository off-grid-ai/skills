---
name: linkedin-digest
description: Fetch latest LinkedIn posts from PhantomBuster, filter for BFSI/AI digital-play relevance, draft Mac-voice comment angles, post a ranked digest to Slack. Use when the user says `/linkedin-digest` or asks for a fresh batch of posts to comment on.
---

# LinkedIn engagement digest

You are running a pipeline that turns the raw output of Mac's LinkedIn Activity Extractor into a ranked Slack digest of posts worth commenting on, with two ready-to-paste comment angles per post written in Mac's voice.

The user (Mac) may run this multiple times a day. The dedupe store handles "don't show me posts you already digested" — your job is to make each batch high-signal and ready to act on.

## Pipeline

Run these steps in order. Do not skip.

### 1. Fetch new posts — via the PhantomBuster MCP

The data source is the **PhantomBuster MCP server** (`mcp__phantombuster__*`), not the old API-key + S3 path. The MCP tools are called by you in-session; `fetch.py` only does the mechanical filter / merge / dedupe / window. There is no `PHANTOMBUSTER_API_KEY` anymore — if the MCP isn't connected, tell Mac to run `/mcp` and authenticate `phantombuster`, then stop.

The activity-extractor agent is **`<activity-extractor-id>`** ("CXO Board Mandate Executors - LinkedIn Activity Extractor" — its input sheet is the full tracked list; it's the only Activity Extractor).

Steps:

1. **Pick the latest *successful* scrape.** Call `mcp__phantombuster__containers_fetch_all` with `agentId: "<activity-extractor-id>"`, `mode: "finalized"`, `limit: "5"`. Choose the newest container with `exitCode == 0`. The most recent run is often a failed/short one (`exitCode: 1`) — do NOT use it; its result object is empty. If *every* recent container failed, tell Mac the scrape is failing and stop (don't post an empty digest).
2. **Pull its rows.** Call `mcp__phantombuster__containers_fetch_result_object` with that container `id`. The result is large and auto-saves to a file on disk — note the returned path (it stays out of context; do not read the whole blob).
3. **Process.** Run:
   ```bash
   python3 tools/linkedin-digest/fetch.py --result-object <saved-path>
   ```
   `fetch.py` reads the `{"resultObject": "<json-array>"}` wrapper, keeps every row where a tracked profile authored OR engaged (reacted / commented / reposted / replied), groups by post so one post engaged-with by multiple tracked profiles becomes one record with all engagers listed, dedupes against `tools/linkedin-digest/seen_posts.json`, windows to the last 2 days (`--days N` / `--all` to override), and prints JSON to stdout.

Each item has a `strongest_engagement` field (`authored` | `commented` | `replied` | `reposted` | `reacted`) and an `engagers` array listing every tracked profile that engaged, with their `name`, `handle`, and the engagement type.

**Why we keep reactions and reposts:** if a BFSI-orbit person Mac tracks is liking, commenting, or resharing a post, the post is almost certainly in the BFSI/AI conversation. The engager themself becomes social proof — multiple tracked engagers on one post is a strong signal.

If `new_in_window` is 0: tell Mac "No new posts since last run" and stop. Do not post to Slack. (The agent scrapes daily on a schedule; a scrape takes ~2.4h, so do NOT launch one synchronously mid-digest. If the latest run failed and Mac wants fresh data, you can fire `mcp__phantombuster__agents_launch` with `id: "<activity-extractor-id>"` in the background — it runs server-side — and pick it up on a later digest.)

### 2. Resolve identities — four sources, merged into one dossier per person

The PhantomBuster activity CSV has no names or headlines, only LinkedIn handles. You have four richer sources. Use all of them in parallel for the author *and* every unique engager across the batch.

**2a. Outbound tracks (PhantomBuster MCP + Python helper, do this first)**

The four outbound-invite phantoms (Fractional CTOs ex-BFSI, AI co partnership leads, BFSI independent directors, CXO board-mandate executors) hold each tracked profile's name, title, firm, connection degree, and invite status. Pull them via the MCP, same pattern as step 1 — for each of the four agents, find the newest `exitCode == 0` container and fetch its result object:

| Phantom ID | Track |
|---|---|
| `<ctos-track-id>` | Fractional CTOs / Strategic Advisors (ex-BFSI) |
| `<partners-track-id>` | Partnership leads at AI companies |
| `<directors-track-id>` | Independent directors on BFSI boards |
| `<cxos-track-id>` | CXO Board-mandate executors |

For each: `mcp__phantombuster__containers_fetch_all` (`agentId`, `mode: "finalized"`, `limit: "5"`) → newest `exitCode 0` container → `mcp__phantombuster__containers_fetch_result_object` (note the saved file path). Then feed all four files to the helper:

```bash
python3 tools/linkedin-digest/outbound_state.py \
  --track <ctos-track-id>=<ctos-path> \
  --track <partners-track-id>=<partners-path> \
  --track <directors-track-id>=<directors-path> \
  --track <cxos-track-id>=<cxos-path>
```

It emits `{count, by_profile: {<normalized-url>: {track, full_name, job_title, headline, company, connection_degree, invitation_sent, invitation_date, request_accepted, acceptance_date, connection_status, ...}}}`. (Append a `profileUrl` after the `--track` args to print just that one profile's state.) The four MCP fetches can run in parallel.

Cache this map for the whole digest run — one fetch, many lookups. Normalize each profile URL the same way (`lowercased, trailing slash + query stripped`) before lookup.

If the profile is in the map, you already have their real name, title, firm, connection degree, and invite status — no need to guess from the handle slug.

**2b. Attio — relationship history**

For every profile not already fully known, run `mcp__claude_ai_Attio__search-records` in parallel:
- Object: `People`
- Search by LinkedIn URL when supported, otherwise by full name + company derived from 2a.

If a match returns: pull `mcp__claude_ai_Attio__list-comments` / `semantic-search-notes` to see the last note date, the owner, and any conversation context. An Attio record with recent notes is a much warmer signal than one with no notes since 2024.

**2c. Smartlead — email outbound state**

For every author/engager, run `mcp__smartlead__get_lead_by_email` if Attio surfaced an email, OR `mcp__smartlead__get_global_leads` searching by name. Pull: which campaign they're in, lead category (positive / interested / not interested), last reply timestamp, whether they've gone cold.

A profile that replied positively on Smartlead two weeks ago and is now engaging with a BFSI post on LinkedIn is **gold** — that's the moment the comment lands warmest.

**2d. Mempalace — prior conversations, in-person notes, anything tier-1 misses**

In the same parallel batch, run `mcp__mempalace__mempalace_search`:
- The handle (`first-last`)
- Their resolved real name from 2a (e.g. `"First Last"`)
- Their firm if known (e.g. `"Example Finance"`)

Wing is `ai-transformation-bfsi`. Useful rooms: `in_person_meetings`, `proposals_without_fluff`, `case_studies`, `email_campaigns`.

**Merge all four into one dossier per profile:**

```
{
  identity: {name, headline, company, connection_degree},     // from 2a primarily
  outbound: {track, invite_status, invite_age_days, accepted}, // from 2a
  attio: {record_id, last_note_date, owner, note_excerpts},    // from 2b
  smartlead: {campaign, last_reply_at, category, status},      // from 2c
  mempalace: [<memory excerpts>],                              // from 2d
  is_known_to_mac: bool   // true if any of attio/mempalace/smartlead returned anything
}
```

Don't fabricate names from handle slugs in the final digest. If all four sources come up empty, the person is unknown — say so explicitly.

### 3. Rank — split into two tiers

The digest has **two tiers**, each filtered separately. The Slack payload carries both: `items` (comment-worthy) and `intel_items` (leadership moves).

#### Tier 1: Comment-worthy — `items[]`

**The bridge gate (hard filter, applied before warmth scoring):**

A post is comment-worthy only if **both** are true:

1. **The author makes a thesis** Mac can build on. Not a milestone, not a welcome, not an award, not a birthday thanks. A claim, an observation, a story with a point, a structural take, a piece of news with implied stakes the post argues.
2. **Wednesday can credibly bridge** — the post sits on a topic where Wednesday adds value through Mac's commentary: production AI for BFSI, agentic workflows, governance, data plane, field sales AI, lending AI, claims AI, payments automation, model selection for regulated workloads. See `knowledge/positioning.md` + `knowledge/architecture.md`.

#### Tier 2: Intel — `intel_items[]` (BFSI leadership moves)

**Separate bucket for "who is moving where" inside BFSI** — appointments, promotions, role transitions of relevant persons at relevant firms. Mac uses these for cold-outreach intel, not for public comments. No comment drafts needed.

**Keep in intel if:**
- Person is moving into a BFSI role (CXO, head of business unit, head of distribution, head of risk, head of digital/AI, head of credit/underwriting/claims, head of partnerships, founding team at a BFSI startup, etc.).
- Firm is in scope: Indian mid-market BFSI (banking, NBFC, insurance, wealth, asset mgmt, brokerage, payments, credit rating, collections, depositories, fintech adjacent to those).
- Even if Mac has no warmth signal — the move itself is intel.

**Drop from intel:**
- Off-vertical moves (auto, pharma, telecom, FMCG, hospitality, entertainment).
- Pure career milestones with no role/firm transition (anniversaries, course completions, graduations).
- "Hiring for" posts (those are job ads, not personnel moves).
- Award announcements (the person stays put; not a move).

**Intel payload shape per item:**
```json
{
  "name": "<Full Name>",
  "role": "<Role>",
  "firm": "<Firm>",
  "sub_segment": "Insurance · Bancassurance distribution",
  "warmth": "2 CXO-track engagers (1 accepted, 1 invite sent)",
  "engagement": "473L · 2d",
  "post_url": "https://www.linkedin.com/feed/update/..."
}
```

Slack renders intel items as compact one-liners in a separate section at the bottom of the digest. Mac scans, picks the ones he wants to act on, cold-reaches outside LinkedIn.

#### Calibration

**Sample-checked reality on this pipeline:** out of any given 200-post batch, expect roughly 3–7 posts to pass Tier 1 (the bridge gate is strict) plus 5–15 intel items in Tier 2. The dataset skews heavily ceremonial; Tier 2 captures the ceremonial-but-useful BFSI moves that don't merit a comment.

If the curator is shipping 8+ Tier 1 items, the bridge gate isn't being applied. If shipping 0 Tier 1 items, look harder for substance in the long tail (Mac noticed both failure modes already).

**Warmth alone does not survive the gate.** A warm connection + a ceremonial post = drop. The substance Mac brings has to be a *sharpening of what the author already said*, not invented from scratch on a thin announcement. If Mac would have to *invent* the substance, the post is wrong; skip it.

**Drop these without exception (regardless of warmth):**
- Welcomes / appointments / promotions ("we are happy to welcome", "thrilled to share I have been promoted", "delighted to share I've started a new role")
- Awards / recognitions ("honoured to receive", "named Best Fintech Insurance")
- Birthday / anniversary / milestone thanks
- Job postings / hiring announcements
- Markets daily-recap commentary (no comment surface beyond chiming in)
- News re-shares without authorial stake (publication posts that report without arguing)
- Motivational / philosophical (dog stories, "art of repair", weeks-of-life reflections)
- Personal / political / emotional content unrelated to BFSI/AI
- Career milestones, graduations, course certifications
- Generic career advice with no specific take
- Substance posts where Wednesday has nothing distinctive to add (HR talent retention, hospitality ops, pharma, etc.)

**Keep:** posts where the author argues something load-bearing — a 2-sentence claim with a real point is enough. Stories with a thesis. Industry takes with a specific number. Articles with a frame. News with implied stakes Mac can sharpen toward a Wednesday service.

**Sample-checked reality on this pipeline:** out of any given 200-post batch, expect roughly 3–7 posts to pass the gate. The dataset skews heavily ceremonial. If the curator is shipping 8+ items, the gate isn't being applied; if shipping 0, look harder for substance in the long tail (Mac noticed both failure modes already).

**For posts that pass the gate**, then score on warmth:
- **5** — accepted within last 14 days, or Attio/Smartlead positive within 14 days
- **4** — invite pending 7–21 days
- **3** — already connected (>14d ago)
- **2** — in an outbound track, invite not yet sent
- **1** — known only via Attio/mempalace
- **0** — completely unknown

**Sort order:** warmth (desc) → engager-stack count (desc) → reach (desc) → recency (desc).

For each kept post, write a one-line `why_matters` naming **the BFSI/AI angle + the Wednesday service bridge**.

See the project's memory file on digest curation for the calibration history behind this gate.

### 4. Pull comment context from mempalace + knowledge/ (parallel)

For each kept post, run more `mcp__mempalace__mempalace_search` calls in parallel — different searches than step 2, this time about the *topic* of the post not the *person*:

- Mac's prior takes on the topic (search the topic + "Mac" or the relevant keyword)
- Client patterns / case studies that map to the post (search by sub-segment: brokerage, insurance, wealth, fintech, etc.)
- Proof points with specific numbers (e.g., "$3B insurer 4 hours daily downtime to zero")
- Prior content / phrasings that nail the same point

Also pull from `knowledge/` files when relevant (positioning, proof_points, competitive-intel-bfsi, bfsi-ladders, architecture). The CLAUDE.md rule: tier-1 for the frame, mempalace for the receipts. Fire 3-6 searches per post in parallel.

Track which memory IDs / knowledge files informed each comment — those go in `mempalace_refs` so Mac can audit the source.

### 5. Draft two comment angles per post — through the `write-as-mac` skill

**You must invoke the `write-as-mac` skill for every draft.** That skill owns Mac's full voice spec (posture, sentence mechanics, anti-AI-slop audit) and is the canonical source. Do not bypass it and don't paraphrase his voice rules from memory — the audit gate lives in that skill and catches drift that inline rules don't.

**Before drafting**, read these two files in full — they are the LinkedIn-comment-specific voice rules that *override* the general voice spec:

- `knowledge/linkedin-comment-voice.md` — canonical voice spec for LinkedIn comments.
- the project's memory file on LinkedIn comment voice — the auto-memory mirror (covers the "no looking down at contemporaries" rule with concrete killed phrases as examples).

Key constraints from those files, summarized inline because they are the most-violated rules:

- **No looking down at contemporaries.** Don't pronounce on what an industry "should" do, what the "next moat" is, what "most platforms" are getting wrong. Even without "I track" credentialing, this posture grades the conversation from outside it. Speak from inside the structure as a peer.
- **Name structural reasons, don't prescribe.** "The compliance backbone was built on the form shape, so rebuilding for judgment is an operating model change" — names *why it's hard*. Do not write "they should rebuild the operating model."
- **No closing question.** No "curious what you're seeing on your side" / "doing anything in that direction." Add value, stop.
- **No "worth X-ing" frames** ("worth sitting with", "worth noting", "worth flagging") — AI fingerprint, banned.
- **No constructed-rhetorical closers** ("Different equilibrium two years out" / "Most are still on yesterday's batch architecture"). Let the body land; stop without a punchline OR land on a concrete image, not an analytical assertion.

**Hard rule for LinkedIn comments specifically — "be helpful, not heroic":**

A LinkedIn comment is a public thought given to the author and the thread. It is not an email, not a 1:1, not a sales call. The reader judges Mac by the quality of the thought itself. The reader does not need credibility signals.

This means: **no case-study or experience references in comments.** Strip every variation of:
- "Two of the larger Indian brokerages I track..."
- "One mid-tier Indian NBFC I track moved..."
- "Inside one Indian bank I track..."
- "Most banks I see have customers..."
- "The teams I see moving here..."
- "We worked with a client who..."
- Any "I've seen" / "we've shipped" / "in our experience" framing.

These are peer-discreet and CLAUDE.md permits them in 1:1 correspondence. In public LinkedIn comments they read as promotional — "look at me, I've worked with X" — even when peer-discreet. Drop them entirely.

What replaces them: **just the thought**. The useful observation, the sharper question, the second-order effect, the named structural issue. Let the substance prove itself. Mac's voice is strong enough that he doesn't need the credibility scaffolding.

Examples of the rewrite:
- BAD: "One Indian life insurer I track moved grievance intake from 4 hours of daily downtime to zero in 3 weeks. That's the unit-economics shift Sushma is pointing at."
- GOOD: "The lever isn't in pricing math. It's in claim operations. Cut intake time and the same headcount handles double the volume. The premium math eases without touching premiums."

- BAD: "Two of the larger Indian brokerages I track are still stuck in retrofit because they ran the other way."
- GOOD: "The institutional reflex to design every new feature against the license is the actual moat. The reflex compounds. By year three a competitor with the same license has a checkbox; you have an org that ships compliantly without thinking about it."

If the draft would lose its punch when you strip the "I track" anchor, the thought wasn't load-bearing — rework it until the substance carries it.

For each kept post, call `write-as-mac` once with a prompt that gives it:

- The post text (full)
- The author's resolved identity from step 2 (name, role, firm, prior context, whether they're in one of the four outbound tracks)
- The engager stack and what it means (e.g. "two of the BFSI CXOs Mac met in the May offsite reacted to this")
- The mempalace + knowledge context pulled in step 4 (Mac's prior takes on this topic, client patterns, proof points)
- Instruction: draft **two distinct LinkedIn comment angles**, paste-ready, peer-exchange posture, give something real

The two angles must be **distinct** — different argument, different opening move. Not paraphrases. Useful starting templates:
- **Angle A — agree + extend:** the post's core claim is right; Mac adds a specific number, named pattern, or peer-discreet client observation that sharpens it
- **Angle B — reframe:** name the second-order effect the post missed, the failure mode in the pattern being celebrated, or the contradiction the data implies

Length: 2-5 sentences per angle. The constraint forces real or cut.

If the engagement type isn't `authored` (e.g. it's a post Mac's tracked engager reacted to, not authored by anyone Mac follows), the comment goes on the original post — same voice rules, but the social context Mac brings is "I noticed [engager] engaging here," used implicitly to shape what's worth saying, not stated explicitly.

### 6. Build the Slack payload and post

Construct the JSON for `post_to_slack.py`. The payload still includes both comment angles (for local audit + record), but **Slack output is just the ranked link + context** — `post_to_slack.py` intentionally omits `comment_angle_*` from the blocks it posts. Drafts surface in the chat reply to Mac; Slack stays clean.

```json
{
  "header": "LinkedIn digest — <YYYY-MM-DD HH:MM IST>, N posts",
  "items": [
    {
      "rank": 1,
      "author_name": "...",                       // from dossier (outbound_state first, mempalace fallback)
      "author_headline": "role · firm",           // from dossier
      "post_url": "...",
      "post_excerpt": "first ~200 chars, single line, no newlines",
      "why_matters": "one line: BFSI/AI angle + warmth context (e.g. 'CXO-track invite pending 9d; reacted to today')",
      "engagement": "120 likes · 14 comments · 2d ago · authored OR engaged-by: <names>",
      "outbound_state": "CXO track · invite pending 9d · Attio: 2 notes · last 12d ago",  // condensed dossier
      "comment_angle_1": "<paste-ready comment from write-as-mac skill — for chat + audit, NOT posted to Slack>",
      "comment_angle_2": "<paste-ready comment from write-as-mac skill — for chat + audit, NOT posted to Slack>",
      "mempalace_refs": ["memory-slug-or-knowledge-file", "..."]
    }
  ]
}
```

Order items by overall score (best first). Use the current date and IST timezone in the header.

**After Slack posts:** include the comment drafts in your chat reply to Mac so he can copy them. Slack gets links, chat gets drafts.

Pipe the JSON to:

```bash
python3 tools/linkedin-digest/post_to_slack.py
```

The script returns `posted_urls` on success.

### 7. Mark posted URLs as seen

Only after the Slack POST returns 200, mark every posted URL as seen so the next `/linkedin-digest` skips them:

```bash
python3 tools/linkedin-digest/fetch.py --mark <url1> <url2> ...
```

Pass URLs as separate args.

### 8. Report to Mac

One short message in chat:
- N posts posted to #<channel>
- Authors (just names, comma-separated)
- Any posts the pipeline dropped + one-line reason if the drop is non-obvious (e.g., "dropped 3: 2 reshares, 1 motivational with no BFSI angle")

That's the whole loop. Keep ranking and drafting tight — Mac runs this multiple times a day, so latency matters.
