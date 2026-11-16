---
name: argus
description: Keep Olympus Argus current. Use when the user says "update argus" or "/argus", or when a session starts with "Pick up the Argus feature <key>", "Fix Argus backlog item <key>", "Pick up the Argus idea <id>", "Research and plan the Argus idea <id>", "Triage the Argus backlog", "Handle Argus item <id>", "Handle the Argus release finding <id>", "Handle the Argus release findings <id> <id>…" or "Run the Argus web sweep".
---

# Argus

Argus is the CPTO's dashboard in Olympus. It reads only `~/.olympus/argus/`. Read `~/olympus-repo/ARGUS.md` first:
it has the feature-notes and signal schemas. Follow them exactly.

**Every session Argus starts applies `/oga-cpto` first** (load it with the Skill tool): every flow below, not only the
release ones. It points to the focused skills that decide how the work is done: `oga-tests`, `oga-devices` (verify
live), `oga-ux` (product bar, every platform).

## Words

Use only these: **feature** (one piece of work, named by its git branch, the same branch name in every repo it
touches), **local**, **in review**, **on main**, **in nightly**, **in stable**, **planned**. Never say epic, project or
beta (say nightly).

## Rules

- Off Grid repos live under `~/code/off-grid-ai/`: `desktop` (OGAD), `mobile` (OGAM), `mobile/pro` (mobile-pro),
  `desktop/pro` (desktop-pro), `shared`, `browser-extension`, `website`, `ui-library`. PRs are written `repo#n`
  with those GitHub names (`OGAD#205`, `desktop-pro#114`, `shared#56`).
- Where a feature is comes from git and GitHub, not from you: `sources/features.json` (written every 15 minutes by
  `argus-sources/features.mjs`) has its stage, repos, worktrees, PRs and sessions. You write only the notes: what it
  is for, what is next, what blocks it, when it is due.
- A feature's notes file is `~/.olympus/argus/features/<key>.json` with every `/` in the key replaced by `__`
  (`feature/runtime-latest` → `features/feature__runtime-latest.json`). Planned work with no branch yet uses
  `plan/<slug>` (`features/plan__<slug>.json`).
- Write every file atomically: write `<file>.tmp` in the same folder, then `mv` it over the file.
- Edit only the notes or signal file you are working on. Keep every field you do not change.
- `facts.json` and `sources/*.json` are read-only. `epics/` is legacy and read-only: never write it.
- Never put a key, token, password or message body in the folder.
- Never send a message, email, Slack post, reaction or label. Draft only; Ali sends.
- `by` is `claude <session id>`; `at` is now, in UTC ISO (`date -u +%Y-%m-%dT%H:%M:%SZ`).

## "update argus" / "/argus"

1. Find this session's feature: its key is the branch, `git -C <cwd> rev-parse --abbrev-ref HEAD`. If the session
   also worked on other Off Grid repos or branches, each branch is its own feature (the same branch name across repos
   is one feature).
2. Read `features/<key with / as __>.json` if it exists, and the feature's entry in `sources/features.json`.
3. Write the notes file: `{ key, title, goal, next, blockers, target, due, work, features, by, at }`. `features` is the
   list of Off Grid AI feature keys the branch changes, from `@offgrid/features` (shared repo,
   `packages/features/src/features.json`), so Argus links the branch to its issues, messages and posts by a declared key. `title` is plain (what a user
   gets, not the branch name); `goal` one line; `next` one line; `blockers` short, only real ones, remove resolved
   ones; `target` a roadmap release such as `R1` and `due` a date (`YYYY-MM-DD`) only if known.
   If this branch does the work of a roadmap item noted under another key (a `plan/<slug>` note, or an older branch's
   note with a `target`/`due`), add this branch to that note's `work` list instead of copying its target or due here:
   one item, one note. A release branch that ships several items goes in each of their `work` lists.
4. Say in one line which feature notes you wrote.

## Matching fixes to crashes and reviews

Store crashes, freezes and bad reviews (`sources/issues.json`, origin `system` and store reviews) count as open until a
`triage/` or `links/` file says fixed. Commits often fix them without saying the item key, so read the commits: for
each product repo, `git log origin/main --since=<14 days ago>` with full messages (subject and body). A commit fixes an
item only when its message names that crash (exception and class, native frame, or the screen and fault of a review)
or its diff changes the code in the item's stack; a shared root cause the message states (one use-after-free behind
several native frames) covers those frames too. Check the commit is in a released build (`git merge-base
--is-ancestor <sha> <tag>`), then write `links/<item>.json` with `state: fixed`, `commits` (`REPO@sha`), `release`
(the first stable that carries it, e.g. `Mobile 0.0.117`) and a one-line `why` quoting what the commit fixed. Similar
names are not enough: `DidNotStartInTime` is not `DidNotStopInTime`. When unsure, link nothing. Never overwrite a
link or triage file Ali wrote.

## Linking roadmap work

A roadmap item (a `features/` note with `target`/`due`, or any `plan/` note) knows its work only through `work`, the
branches doing it. With none linked, Argus can only say "no branch linked", and the meetings call it at risk. So: for
each item in `sources/features.json` `roadmap` with an empty `work`, look for branches that do it, in flight or shipped
in the last 42 days (`features` and `shipped` there, PR titles in `facts.json` github.merged/open, `git log` on main of
the repos it names). Match on what the change does, not on shared words: "One price everywhere" is done by the PRs that
set the price ($79.99 lifetime, website#89), not by every pricing page edit. Add each branch to the note's `work` and set
`updated` (write `.tmp`, then `mv`). When unsure, link nothing and say why in the run's last line. Never change `target`
or `due`; those are Ali's.

## Fixing a backlog item

When a session works on an item from a product's `docs/GAPS_BACKLOG.md` or `docs/PRODUCT_BACKLOG.md`, find the
item's `key` in `~/.olympus/argus/sources/backlog.json` and write `links/<key with : as __>.json` (schema in
ARGUS.md): when the work starts (`state: "in progress"`, the branch as `feature`) and when it merges (`state: "fixed"`,
its PRs or commits). Put the key in the PR description too (`Fixes OGAD:CU-015`). Remove the item from the gaps file
in the fix's own PR, as the file asks.

## "Research and plan the Argus idea <id>"

Ali's feature ideas are `~/.olympus/argus/ideas/<id>.json` (`title`, `products`, `note`; schema in ARGUS.md). This
researches one and writes a plan into its file, which Argus shows on the idea. Read-only everywhere else: never edit a
repo, branch, push or open a PR.

1. Set `status: "researching"` in the idea file (atomically, keeping every other field), so Argus shows it.
2. Research how others do it: the products the note names, and the two or three closest competitors. Use web search
   and their docs, help pages and changelogs; note what they do and why it works or annoys people. Keep every URL
   you rely on.
3. Research where we are: on `origin/main` of each product repo the idea names (`git fetch -q`, then
   `git show origin/main:<file>`, `git grep`), find the screens, stores and services involved and what they do
   today. Read each repo's CLAUDE.md, Argus feature notes, and check premises as in triage (remote models are
   supported; settings sync follows its option; the chat queue works like Claude Code's).
4. Write the plan into the idea file, keeping every other field: `plan` (Markdown, under ~1,500 words),
   `sources` (the URLs), `status: "planned"`, `planBy: "claude <session id>"`, `planAt` (now, UTC ISO). The plan's
   sections, in this order:
   - `## Summary`: what the user gets, in two or three sentences.
   - `## How others do it`: one bullet per product, with a link.
   - `## Where we are`: what our apps do today, naming files (`src/...`) per repo.
   - `## Proposal`: the experience, step by step, as a user meets it; what is in the first version and what waits.
   - `## Work`: the pieces per repo (desktop, mobile, shared…), small enough to be one PR each, in order.
   - `## Questions for Ali`: the product decisions only Ali can make. Do not guess them.
   - `## Risks`: what could go wrong (data migration, sync, performance), briefly.
5. Say in one line that the plan is on the idea in Argus, and list the questions for Ali.

## "Pick up the Argus idea <id>"

Build it from its plan. If the idea has no `plan`, do "Research and plan" first and stop there for Ali's answers.
Once Ali agrees, branch (`feature/<slug>`, the same name in every repo it touches), write the feature's notes
(`features/feature__<slug>.json`, its `goal` from the plan's summary) and delete the idea file: the feature carries it
now.

## "Triage the Argus backlog"

Check backlog items against reality, so Argus never asks Ali to fix something that isn't real or isn't worth it.
Read-only on every repo: never edit, push or open a PR here.

1. Items: `~/.olympus/argus/sources/backlog.json` (`data.defects`, `data.backlog`) and `sources/issues.json`
   (`data.items`; skip `origin: system` items with `users` under 5 and `weight` under 5). Pick the ones that need a check:
   no `triage/<key with : as __>.json`, or its `hash` differs from the item's, or its `at` is over 7 days old. Skip
   items whose `links/` file says `fixed`. Never redo a check whose `by` starts with `Ali` unless the hash changed.
   An item that moved to another repo's file keeps its ID or heading: a `triage/` or `links/` file with the same
   part after `REPO__` is its file; move it to the new name (`mv`), keeping its content.
   At most the number the prompt gives (default 30): P0/P1 first, then newest.
   Issues: largest `users` first, then user and team reports. An issue that is the same problem as another (a review,
   an email and the crash behind them) gets `same: <that key>` in its triage file; check the one with most reach.
   For crashes, the `detail` names the exception and the code; find it on `origin/main` of the item's product repo.
2. Fetch once per repo (`git -C <repo> fetch -q`), then for each item, read its heading at `url`:
   - **Premise first.** Many entries were written by agents and rest on a "rule" (a constraint, a contract, a policy).
     Is that rule a real product decision? Look for it in the repo's CLAUDE.md and docs, Argus feature notes, and
     what the product actually ships. Off Grid supports remote models on purpose (OpenRouter, custom servers, the
     OGAD remote API): a "local only" premise is wrong.
     Model settings sync follows the user's "Model settings" sharing option (off by default), hardware settings
     included. The chat queue (Desktop, extension, Mobile) works like Claude Code's: an error never holds it; Stop puts the
     waiting messages back in the text box, unsent. Verdicts in
     `triage/` by Ali are product decisions: reuse them as premises. An invented or unverifiable rule means `still: "not a defect"`
     (drop) or, if it needs Ali's call, `recommend: "ask"`.
   - **Still real on main?** Look at the code it names on `origin/main` (`git show origin/main:<file>`, `git log -S`,
     `gh pr list --search`). If a merged change fixed it, `still: "fixed"` with the PR or commit.
   - **Worth doing?** Who it hurts and how much: user reports in `signals/*.json`, crashes and ratings in
     `facts.json` (`stores`), how many people use that product or platform, whether it blocks a feature on the
     roadmap (`features/*.json` targets) or revenue (Pro). The file's own priority is a hint, not a fact.
   - **Effort:** `S` (hours), `M` (a day or two), `L` (more).
3. Record the evidence kind: `seen` is `users` only when a ticket, review, email, Slack message or issue describes
   this problem (a vague complaint that might be related is not it), `testing` when someone saw it on a device or
   build, `code` when it rests on reading code (a hypothesis), `none` when it is not a problem claim; `seenWhere`
   says what and when. General numbers (a crash rate, a rating) are context, never evidence that THIS problem exists.
   Write `triage/<key with : as __>.json` atomically (schema in ARGUS.md): `recommend` is `now` (seen by users or in
   testing, and worth high, or worth medium and effort S; never for `code` or `none`), `later`, `drop` (fixed, not a defect, or not worth it), or `ask` (needs a
   product decision from Ali). `why` is one plain sentence Ali can act on; `evidence` names files, commits or PRs.
4. Say in one line: how many checked, and how many now, later, drop, ask.

## "Fix Argus backlog item <key>"

1. Find the item by `key` in `~/.olympus/argus/sources/backlog.json` (`data.defects` or `data.backlog`) or
   `sources/issues.json` (`data.items`: its `url` is the crash, review, email or GitHub issue), and any
   `links/<key with : as __>.json`. Open its `url`: the heading in the repo's `docs/GAPS_BACKLOG.md` or
   `docs/PRODUCT_BACKLOG.md` says what is wrong, the evidence, and what done looks like.
2. If a link names a feature, continue on that branch; else make a new branch in the item's repo (follow the repo's
   own rules) and write the link at once (`state: "in progress"`).
3. Fix it, with the repo's tests. In the same PR, remove the item from the gaps file (or mark the product backlog
   item done) and put `Fixes <key>` in the PR description. For a GitHub issue, also `Fixes <repo>#<n>`.
4. Update the link with the PR, and `state: "fixed"` once it merges. Say in one line what you linked.

## "Pick up the Argus feature <key>"

1. Read `features/<key with / as __>.json`, the feature in `sources/features.json`, and ARGUS.md.
2. Open each repo and worktree it lists (`repos[].local.path`, or check out the branch). Check its PRs' state, CI and
   review comments (`gh pr view`, `gh pr checks`) and the branch's diff against main.
3. Continue the work toward `next`. Clear `blockers` you resolve; add ones you hit.
4. At the end, update the notes file: fresh `next`, `blockers`, `by`, `at`. For a `plan/<slug>` key, once a branch
   exists, write the notes under the branch's key and keep the plan file's title and dates there.

## "Handle the Argus release finding <id>"

Argus judged the release being prepared (`sources/release.json`, written by `argus-sources/release.mjs`) on Tech,
Design, Product and Business, and Ali handed you one finding.

1. Find the finding: `features[].cells[].findings[]` whose `id` is `<id>`. Read its `title`, `rule`, `quote` (Ali's
   own words), `items` (each place it happens) and `brief`. The brief is the work; do all of it, nothing beyond it.
2. Work on the release branch named in the brief, in the repo the session opened in. Follow `/oga-cpto`.
3. Prove it the way the brief asks: integration tests with no mocks of our own code, and before and after screens of
   each changed screen in light mode in `docs/pr-screenshots/<branch>/`, from the running app.
4. Record it: `node ~/olympus-repo/argus-report.mjs --session <your session id> --finding <id> --built "<what
   changed, where>" --proof <screen or test path>` (one `--proof` per file). Argus checks each proof is on the branch
   on its next run. Commit locally; push only when asked.

## "Handle the Argus release findings <id> <id>…"

Ali handed you a whole cell (one feature on one lens) at once. Each id is a finding as above. Do them yourself, in
this session, one after another: no sub-agents or extra sessions (see `/oga-cpto`). Older prompts may still say "a
separate thread for each"; treat that the same way.
1. Read every finding first. List the files each one touches, and order them so findings that share a file run back
   to back.
2. Work each finding through the four steps above, in its own repo, before starting the next.
3. When all are done, check each diff and each proof, then report each finding with its own
   `argus-report.mjs --finding <id>` line. Commit locally, one commit per finding; push only when asked.

## The release report (end-of-turn hook)

On a `release/*` branch, when a turn changed code, the Stop hook asks you once to record what the turn did for the
release, with `node ~/olympus-repo/argus-report.mjs --session <id>` from the repo you worked in:
- each of Ali's asks the work serves: `--ask "<his words, exactly as he wrote them>" --built "<what, where>" --proof <path>`;
- a finding you worked on: `--finding <id> --built "…" --proof <path>`;
- a decision Ali made in the session: `--decision "<what he decided>"`; a risk you see: `--risk "…"`;
- one of Ali's messages that is not a product ask for this release (a process step, a question, another product or an
  earlier release): `--not-ask "<his words>" --why "<which>"`, so it leaves his open asks;
- nothing that serves an ask: `--none`.
Quote only words Ali really wrote; Argus flags any quote it cannot find in his sessions. Proof is a file on the branch
(a screen in `docs/pr-screenshots/`, a test); a claim without one stays "claimed", not "proven".

## "Handle Argus item <id>"

Ids starting `ios:` are App Store reviews: find them in `~/.olympus/argus/facts.json` under `stores.ios.reviews` (reply in App Store Connect yourself is not possible: put suggested text in a signals/stores.json item with the same id). All other ids are in `~/.olympus/argus/signals/*.json`.

1. Find the item in `~/.olympus/argus/signals/*.json` by `id`. Open its `url` source read-only (Slack thread via
   the Slack read tools, Gmail thread via `get_thread`).
2. Investigate: the related feature, recent releases in `facts.json`, logs the user sent, and the code.
3. If it is a bug: reproduce or locate the cause, then fix it on a new branch in the right repo and open a PR
   (follow the repo's own rules). Link the item to its feature via `"feature"`: the branch name of the existing
   feature it belongs to, or of the new fix branch (write that feature's notes file too).
4. Draft a reply, never send it:
   - Gmail: `create_draft` in the original thread (reply-to the sender, from the company address). Put the draft's
     https URL in the item's `"draft"`.
   - Slack or store: put the text (≤600 characters, plain, Ali's voice) in the item's `"reply"`.
5. Set `status` (`open`, `answered`, or `fixed` with `fixed_in` such as `Desktop v0.0.55` only when the fix is in
   a published release). Write the signal file atomically, changing only that item.

## Run the Argus web sweep

Follow `~/olympus-repo/argus-web-sweep.md` exactly: search X and LinkedIn in Brave (the default browser; the
`claude-in-chrome` tools drive it) and the web with WebSearch for new
mentions of Off Grid AI, read only, and write `~/.olympus/argus/signals/{x,linkedin,web}.json`.

## "Draft the Argus post <id>"

Argus's Today queue and Features hand over a post or guide to draft. `slot:<n>` is this week's Social slot
(`~/.olympus/argus/sources/social.json` → `data.week.slots[n]`, its feature in `data.pillars`); `<feature>:<kind>` is a
feature-map action (`sources/feature-map.json` → `data.actions`, its evidence and the feature's rows in `data.features`).
Read-only on every repo.

1. Read the item and its evidence. Open the links it names (the model, the search query's page, the shipped PR).
2. Load `/copywriting-rulebook` and `/no-ai-slop`, and read `~/code/off-grid-ai/brand/` for what Off Grid AI says.
3. A post: write it for X, LinkedIn and Instagram (and a TikTok/YouTube Short script when the post is a demo), plus
   what to record (the screen, the hardware, the numbers to show). A jab teaches what changed; it never recommends a
   competitor's app. A hook shows Off Grid AI doing the job, with the guide link.
   A guide: an outline and first draft for getoffgridai.co in the house article pattern (see `/seo-aeo-geo`).
4. Write the draft to `~/code/off-grid-ai/brand/drafts/<date>-<id with : and / as ->.md` and say where it is.
   Never post or publish; Ali does.

## "Research the Argus wave <id>"

Ali chose a wave on Content → Waves. He writes; you do the discovery and research. His aim: join conversations on
privacy, AI, and privacy + AI on X (quotes and replies), and leave readers thinking "that makes sense, I learned
something". Borrowing someone else's work is fine when it is credited and Ali adds a genuine insight; reposting is not.
The wave is in `~/.olympus/argus/sources/waves.json` → `data.waves`. Its file is
`~/.olympus/argus/waves/<id with every non-alphanumeric as ->.json`. Read-only on every repo. Never post.

1. Write the file at once: `{ "status": "researching", "at": <now> }` (atomically: `.tmp`, then `mv`).
2. Find the live conversation on X: the biggest recent posts about it (views, replies, age), and what the top replies
   already say, so Ali does not repeat them. Read the primary source (the release, paper, filing, code, the creator's
   own post). Check the story's real date: a Reddit or X post can be about something months old.
3. Write the brief, for Ali to read in two minutes. No drafted posts, no angles, no hooks:
   - `what`: what happened, two plain sentences. `when`: the real date of the event, as a date ("2 Nov 2026"),
     not a timeline.
   - `who`: who made or found it, with a link, so Ali can credit them.
   - `facts`: 3–5 facts that matter, each with its source URL. Numbers where they exist. For an engine, model or
     hardware story (the craft, ARGUS-NEWSROOM.md), the facts are the measurements: model, hardware, prefill and decode
     tokens/s, memory and context, against the baseline; read the release notes, the repo's benchmarks and the people
     reporting their own runs. Mark anything unconfirmed as unconfirmed.
   - `take`: your opinion on the whole story in one sentence, with why. Ali forms his own; a clear stance helps him.
   - `missing` (at most two sentences, under 300 characters): what the conversation is missing: the non-obvious consequence, the number nobody quoted, what it
     means for an ordinary person's data or what they can now do. This is Ali's insight to build on. If there is none,
     say so plainly.
   - `join`: the 1–3 posts to quote or reply to (URL, author, views, replies, age), best first.
4. Write `{ "status": "ready", "at", "what", "when", "who", "facts", "missing", "join", "sources" }` to the file, then
   run `node ~/olympus-repo/argus-sources.mjs waves` so Argus shows it.

## "Package the Argus wave <id> angle <n>"

Ali picked angle `<n>` of a researched wave (its file as above). Make the full package from that angle, in Ali's voice,
by the same rules: an X post or thread, a LinkedIn post, a 30–60 second reel/Short script with a shot list (what to
show, what to say), carousel slides (one line each, 6–8 slides), and a quote-post or reply version for the original
thread. Write it to `~/code/off-grid-ai/brand/drafts/<date>-wave-<id>-<n>.md`, set
`angles[n].package` to that path in the wave's file, run `node ~/olympus-repo/argus-sources.mjs waves`, and say where
it is. Never post anything.

## "Answer the Argus question <id>"

A question people ask, from Customers → Questions (`~/.olympus/argus/sources/questions.json` → `data.questions`,
`text`, `from`, `why`). Ali teaches the answer. Read-only on every repo.

1. Research the real answer from primary sources (docs, papers, the projects themselves); keep every URL.
2. Write, in Ali's voice by the newsroom's rules (`~/olympus-repo/ARGUS-NEWSROOM.md`: WIIFY, "so what?" three times,
   outcome first; `/copywriting-rulebook`, `/no-ai-slop`, `~/code/off-grid-ai/brand/`): an X post or thread, a
   LinkedIn post, a reel script with a shot list, and an outline for a getoffgridai.co guide (`/seo-aeo-geo`).
   Never name or recommend an app that competes with Off Grid AI; mention Off Grid AI only where it truly answers.
3. Write it to `~/code/off-grid-ai/brand/drafts/<date>-question-<id without q:>.md` and say where it is. Never post.


## Tracked links (every draft)

Every getoffgridai.co link in a post, guide or package Claude drafts carries
`?utm_source=<x|linkedin|instagram|youtube|tiktok>&utm_medium=social&utm_campaign=<the draft's id>` (the wave, question
or slot id, with `:` as `-`), one link per platform version. PostHog's `demand.byCampaign` then shows the visits,
downloads and buyers each post brought (ARGUS-DESIGN.md §4). Never post a bare link.

## "Prepare Argus Today"

Each morning (scheduled task `argus-today`), and whenever Ali asks. Read `~/olympus-repo/ARGUS-NEWSROOM.md` first:
it is the ethos. Ali writes; you research. Read-only everywhere; never post, like, reply or follow.

1. `node ~/olympus-repo/argus-sources.mjs engines waves today --force` (about 10 minutes; Reddit is slow logged out).
2. Read `~/.olympus/argus/sources/today.json` → `data.items` (5 things new or growing in the field). For each item
   without a `brief`, research it the way "Research the Argus wave" says (the primary sources, the real date, who to
   credit, 3–5 facts with sources and the numbers where it is the craft, anything unconfirmed marked so, and what the
   conversation is missing), using the item's `mentions` as leads.
3. Where to join: in Brave (the claude-in-chrome tools; Ali is signed in to X), search X `Top` for the thing, last 48
   hours. Keep only posts where joining helps Ali's readers, at most 3, often fewer; none is a fine answer:
   - his readers are there: English, an account people in AI and privacy follow (not a translation, not hype or crypto);
   - the post is the source or the main conversation: the builder who ran it, the launch, the claim everyone repeats;
   - `wiify`: one line, "You learn …", what his reader gains from his quote or reply. If it cannot be said, drop the post.
   Most views first among those that pass. For each, the call: `do` = `reply` when the thread is live and has room (under 24 hours, under 60
   replies), else `quote`; `bring` = the one fact or insight from this brief that this post does not have (a number
   that answers its question, a correction with proof); `take` = your opinion on it in one sentence, as a peer who
   read all the research: a stance Ali can agree with or argue against, never a drafted post.
   Copy rules for every `bring` and `take` (load `/copywriting-rulebook` and `/no-ai-slop` first): WIIFY (what is in it
   for the reader), ask "so what?" three times and keep the last answer, outcome first, less is more. `bring` at most
   20 words with its number; `take` at most 15 words, written to the reader ("your", "you"). No hedging, no filler. `join`: `[ { "url", "author", "views",
   "replies", "at", "text", "do", "wiify", "bring", "take", "rank" } ]`. `rank` orders the day's posts across all five items,
   best first (1 = the strongest fact for the biggest live conversation): the Today page shows them as the plan.
4. Write `~/.olympus/argus/waves/<item id>.json` (`today-<name>`): `{ "status": "ready", "at", "what", "when", "who",
   "facts", "missing", "join", "sources" }`, atomically. Then `node ~/olympus-repo/argus-sources.mjs today`.
5. Close the tabs you opened. Report in one line per item: its name and what the conversation is missing.
