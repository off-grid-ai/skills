# Skills

These are the agent skills I use every day to build, ship and sell my products.

Each skill is a folder with a `SKILL.md` and sometimes a few scripts or templates beside it. They work with Claude Code, Codex and any agent that reads skill folders.

## Start here

**graph-engineering** and **graph-engineering-loop** are the two I'd try first.

graph-engineering maps every place a change touches before you make it. Desktop, mobile, the paid tier, the website, whatever links to that feature. Then it builds one review page with every changed screen and only the calls that need you.

graph-engineering-loop reads your notes and choices on that page. It works out the rule behind them, writes it down once and applies it everywhere the map shows. So each round asks you less.

## The skills

### general/

| Skill | What it does |
| --- | --- |
| [graph-engineering](general/graph-engineering) | Maps every place a change touches, makes it in order and builds one review page for it. |
| [graph-engineering-loop](general/graph-engineering-loop) | Learns the rule behind your review calls and carries it to every place the change lives. |
| [screen-review](general/screen-review) | Captures every screen of an app and publishes a page where you pin notes on exact spots. |
| [review-loop](general/review-loop) | Turns your screen notes into a small design rule, then applies it to every screen. |
| [ceo-report](general/ceo-report) | Writes a one-page decision report a founder can approve from the first screen. |
| [discuss](general/discuss) | Makes the agent argue like a peer: facts over tone, holds the goal of the whole chat. |
| [hygiene](general/hygiene) | An engineering standard with setup, plan and audit modes, plus quality gates for a repo. |
| [hygiene-learn](general/hygiene-learn) | Folds the lessons from PR reviews back into the hygiene standard, without bloat. |
| [pr-review](general/pr-review) | Takes a PR from "diff exists" to "merge-ready": audit, triage every comment, fix, re-review. |
| [mac-voice](general/mac-voice) | My copy voice: plain, direct, outcome first. |
| [write-as-mac](general/write-as-mac) | Writes outreach and posts as me, with a hard check for AI tells before you see a draft. |
| [copywriting-rulebook](general/copywriting-rulebook) | Bly and Ogilvy's rules for copy that has to sell. |
| [linkedin-digest](general/linkedin-digest) | Ranks LinkedIn posts worth commenting on and drafts two comment angles for each. |
| [get-context](general/get-context) | Picks up a chat from another Claude account on the same Mac by its title. |
| [tajnees](general/tajnees) | Writes short Hindi-Urdu lines built on sound-alike word pairs. |

### off-grid-ai/

| Skill | What it does |
| --- | --- |
| [oga-cpto](off-grid-ai/oga-cpto) | The entry point: working rules for any Off Grid AI repo. |
| [oga-voice](off-grid-ai/oga-voice) | How the agent talks to me and makes decisions with me. |
| [oga-engineering](off-grid-ai/oga-engineering) | How code is changed, checked and committed. |
| [oga-tests](off-grid-ai/oga-tests) | How tests are written and fixed. |
| [oga-ux](off-grid-ai/oga-ux) | The product and design bar for every screen and flow. |
| [oga-devices](off-grid-ai/oga-devices) | How to run and drive the apps on a Mac, an iPhone and Android. |
| [oga-release](off-grid-ai/oga-release) | Release branch rules: branches, pushes, PR screenshots. |
| [get-it-live](off-grid-ai/get-it-live) | Takes a piece of work all the way to release-ready. |
| [hand-test](off-grid-ai/hand-test) | Verifies a release on real devices, with a long doctrine on what a good test is. |
| [tests](off-grid-ai/tests) | The testing standard: prove the whole user journey, no mocking our own code. |
| [offgrid-ui](off-grid-ai/offgrid-ui) | Picks or extends a shared library component instead of building a one-off. |
| [ui-module-sweep](off-grid-ai/ui-module-sweep) | When the queue is empty, tests a web console one module at a time from its router. |
| [release-notes](off-grid-ai/release-notes) | Turns review page comments into user-facing release notes. |
| [model-picks](off-grid-ai/model-picks) | Refreshes a board of which AI models each app should ship, per device and memory size. |
| [argus](off-grid-ai/argus) | Keeps my release and signals dashboard current: features, bugs, ideas, replies, research. |
| [ogai-insights](off-grid-ai/ogai-insights) | Pulls every growth signal, finds the three moves that grow revenue most and refreshes a dashboard. |
| [partners-one-pager](off-grid-ai/partners-one-pager) | Writes the weekly marketing and sales debrief for the partners meeting. |
| [seo-aeo-geo](off-grid-ai/seo-aeo-geo) | Plans and writes articles for search and AI answer engines. |

### game-of-crowns/

Game of Crowns is a medieval world sim I'm building in Godot on top of Freeciv.

| Skill | What it does |
| --- | --- |
| [goc-cpto](game-of-crowns/goc-cpto) | The entry point: working rules for the game. |
| [goc-voice](game-of-crowns/goc-voice) | How the agent talks to me and decides with me on the game. |
| [goc-engineering](game-of-crowns/goc-engineering) | How code is changed: find who already solved it, fix the system, never hack-fix. |
| [goc-throughput](game-of-crowns/goc-throughput) | Builders finish code; a supervisor tests what landed together every 12 minutes. |
| [goc-tests](game-of-crowns/goc-tests) | How a change is proven with bridge calls, compile checks and renders. |
| [goc-run](game-of-crowns/goc-run) | How to run the bridge, Freeciv, the Godot view and the local model. |
| [goc-ux](game-of-crowns/goc-ux) | The look and feel bar for every screen, scene and animation. |
| [goc-playtest](game-of-crowns/goc-playtest) | Checks the whole game scene by scene and reports pass or fail with pictures. |
| [goc-release](game-of-crowns/goc-release) | Pushes, docs and showing work. |
| [goc-get-it-live](game-of-crowns/goc-get-it-live) | Takes game work all the way to built, seen working, pushed and shown. |

## Install

Copy a skill folder into your agent's skills folder.

```bash
git clone https://github.com/alichherawalla/skills
cp -R skills/general/graph-engineering ~/.claude/skills/
```

- Claude Code: `~/.claude/skills/` for every project, or `.claude/skills/` inside one repo.
- Codex: `~/.codex/skills/`, or `.agents/skills/` inside one repo.
- Other agents: wherever they read skill folders from. The `SKILL.md` is plain Markdown, so you can also paste it into a system prompt.

Skills call each other by name (graph-engineering uses screen-review, review-loop and the oga-* skills). Copy the ones they name too.

## A few things to know

**These come from real daily use.** I wrote them for my own work, so many mention Off Grid AI, Wednesday, my repos and my tools (Argus and Olympus). Keep the method and swap the names and paths for yours. Some point at scripts in my product repos that aren't here. Those steps tell you what the script does, so you can write your own.

**Mac and Ali are both me.** I go by Mac. Some skills say Ali.

**Some steps assume a page host.** graph-engineering, graph-engineering-loop, screen-review and review-loop publish a page with Claude's Artifact tools (`Artifact`, `ArtifactData`, `ArtifactComments`). Those steps need a host that serves a page with comments and a small database. Any other agent can use any equivalent: a static page plus a small database, or a review tool with pinned comments.

**Third-party parts keep their licenses.** ceo-report includes files from two other skill packs under `general/ceo-report/vendor/`. Their licenses and credits are in `general/ceo-report/NOTICE`.

## License

MIT. See [LICENSE](LICENSE).

Made by Mac (@alichherawalla). Follow me on GitHub for more.
