# Your AI agent does the work. You just make the calls.

43 skills that make any AI agent check its own work, show you only what changed, and ask you only what matters. Free, and they work in Claude Code, Codex, Cursor, Gemini CLI, Copilot and 60+ other agents.

[![Built with these skills: 193B tokens, 22,809 GitHub contributions in 4 months](assets/built-with-these-skills.png)](https://github.com/alichherawalla)

## Install in one line

Paste this into your agent:

```text
Install the skills from github.com/off-grid-ai/skills
```

Or run it yourself:

```bash
npx skills add off-grid-ai/skills
```

<details>
<summary>Other ways: Claude Code plugin, Codex plugin, no Node</summary>

**Claude Code**
```text
/plugin marketplace add off-grid-ai/skills
/plugin install review-ai-work@off-grid-ai
```

**Codex**
```bash
codex plugin marketplace add off-grid-ai/skills
codex plugin add review-ai-work@off-grid-ai
```

Plugin names: `review-ai-work`, `get-the-best-from-agents`, `ship-with-confidence`, `run-a-product-team`, `write-copy-that-sells`, `make-decisions`, `track-growth`, `build-a-game`.

**Any agent, no Node**
```bash
curl -fsSL https://raw.githubusercontent.com/off-grid-ai/skills/main/install.sh | bash
```
It links every skill into each agent it finds on your machine. Run it again to update.

</details>

## Start with these three

**1. Review a big change on one page.** [graph-engineering](1-review-ai-work/graph-engineering) maps every place a change touches, then shows you each changed screen before and after, with only the calls that need you. [graph-engineering-loop](1-review-ai-work/graph-engineering-loop) learns the rule behind each call and applies it everywhere.

![What your agent hands you after every change: every app it touches, the newest version, checks from 5 angles, every changed screen before and after, notes, and only the decisions that need you.](assets/review-page.png)

> Try it: *"Use graph-engineering to rename Folders to Projects across the app."*

**2. Get an agent that argues back.** [push-back-with-facts](2-get-the-best-from-agents/push-back-with-facts) stops your agent from agreeing with whatever you said last. It checks the facts, keeps your whole goal in view, and tells you when you're wrong.

> Try it: *"/push-back-with-facts we should rewrite the backend in Rust"*

**3. Never lose a chat again.** [pick-up-any-chat](2-get-the-best-from-agents/pick-up-any-chat) finds any past session by its name, even from another account or from Codex, and carries on where it stopped.

> Try it: *"/pick-up-any-chat the onboarding redesign"*

## All 43 skills

### [Review AI work in minutes, not days](1-review-ai-work)

Your agent writes code faster than you can read it. See only what changed, and make only the calls that need you.

| Skill | What you get |
| --- | --- |
| [**graph-engineering**](1-review-ai-work/graph-engineering) | Change one thing and see every place it touches, then review the whole change on one page. |
| [**graph-engineering-loop**](1-review-ai-work/graph-engineering-loop) | Make a few calls and it learns the rule behind them, applies it everywhere, and asks you less next time. |
| [**review-every-screen**](1-review-ai-work/review-every-screen) | Every screen of your app on one page, with notes you pin on the exact spot. |
| [**apply-feedback-everywhere**](1-review-ai-work/apply-feedback-everywhere) | Turn your notes on a few screens into one rule, applied to every screen. |
| [**get-prs-merge-ready**](1-review-ai-work/get-prs-merge-ready) | Take a pull request to ready-to-merge, with every review comment answered. |
| [**check-code-before-merge**](1-review-ai-work/check-code-before-merge) | A pass or fail on every change against one engineering standard. |
| [**learn-from-every-review**](1-review-ai-work/learn-from-every-review) | Each review makes the standard sharper, so the same mistake doesn't come back. |
| [**test-every-page**](1-review-ai-work/test-every-page) | Test a web app one page at a time and fix what breaks. |

### [Get the best out of every agent](2-get-the-best-from-agents)

Better answers and no lost work, in every session.

| Skill | What you get |
| --- | --- |
| [**push-back-with-facts**](2-get-the-best-from-agents/push-back-with-facts) | Your agent argues back with facts instead of agreeing with you, and keeps your whole goal in view. |
| [**pick-up-any-chat**](2-get-the-best-from-agents/pick-up-any-chat) | Pick up any past chat by its name and carry on where it stopped. Works across Claude Code accounts and Codex. |
| [**short-straight-answers**](2-get-the-best-from-agents/short-straight-answers) | Short answers, result first, and it disagrees when it should. |
| [**run-agents-in-parallel**](2-get-the-best-from-agents/run-agents-in-parallel) | Keep several agents building at once while one checks what landed. |

### [Ship releases you trust](3-ship-with-confidence)

Proof it works on real devices before anyone else sees it.

| Skill | What you get |
| --- | --- |
| [**get-it-live**](3-ship-with-confidence/get-it-live) | Take a piece of work all the way to release-ready: built, tested and seen working. |
| [**test-on-real-phones**](3-ship-with-confidence/test-on-real-phones) | Check a release on real phones and computers, with a clear bar for a good test. |
| [**tests-that-follow-the-user**](3-ship-with-confidence/tests-that-follow-the-user) | Tests that prove the whole user journey, not just one function. |
| [**tests-that-catch-bugs**](3-ship-with-confidence/tests-that-catch-bugs) | Tests that catch real bugs instead of passing by default. |
| [**run-on-real-devices**](3-ship-with-confidence/run-on-real-devices) | Your agent runs and drives your app on a computer, an iPhone and an Android phone. |
| [**release-notes-people-read**](3-ship-with-confidence/release-notes-people-read) | Release notes your users actually read, written from what changed. |
| [**ship-releases-cleanly**](3-ship-with-confidence/ship-releases-cleanly) | Clean release branches, with screenshots on every pull request. |

### [Run a product team of agents](4-run-a-product-team)

Your agent works like a senior team: it knows what's urgent, what good looks like, and when to ask.

| Skill | What you get |
| --- | --- |
| [**act-like-a-cto**](4-run-a-product-team/act-like-a-cto) | Your agent decides what's urgent, does the clear work, and asks you only the real calls. |
| [**make-it-look-great**](4-run-a-product-team/make-it-look-great) | A design bar every screen and flow has to clear. |
| [**change-code-safely**](4-run-a-product-team/change-code-safely) | Code that's changed, checked and committed so nothing half-done ships. |
| [**fix-the-real-problem**](4-run-a-product-team/fix-the-real-problem) | Fix the cause, not the symptom, and reuse what others already solved. |
| [**reuse-ui-components**](4-run-a-product-team/reuse-ui-components) | Reuse your component library instead of building one-off screens. |

### [Write copy that sells](5-write-copy-that-sells)

Plain, specific words that get read and acted on, with no AI tells.

| Skill | What you get |
| --- | --- |
| [**write-like-a-human**](5-write-copy-that-sells/write-like-a-human) | Write like a real person: outcome first, short sentences, no AI tells. |
| [**copy-that-sells**](5-write-copy-that-sells/copy-that-sells) | Headlines, landing pages and emails that sell, on Bly and Ogilvy's rules. |
| [**write-as-a-founder**](5-write-copy-that-sells/write-as-a-founder) | Posts and outreach in your own voice, learned from what you've already written. |
| [**get-found-by-ai-search**](5-write-copy-that-sells/get-found-by-ai-search) | Articles that rank in search and get quoted in AI answers. |
| [**find-posts-worth-replying-to**](5-write-copy-that-sells/find-posts-worth-replying-to) | The posts worth your comment each day, with two angles for each. |
| [**urdu-wordplay**](5-write-copy-that-sells/urdu-wordplay) | Short Hindi-Urdu lines built on sound-alike word pairs. |

### [Make decisions faster](6-make-decisions)

The answer first, every claim sourced, every option scored.

| Skill | What you get |
| --- | --- |
| [**one-page-decision-report**](6-make-decisions/one-page-decision-report) | A decision you can approve from one page, fact-checked by separate reviewers. |
| [**weekly-debrief**](6-make-decisions/weekly-debrief) | This week against last week: what worked, what didn't, what's next. |
| [**pick-the-right-ai-models**](6-make-decisions/pick-the-right-ai-models) | Which AI models your app should ship, for each device, backed by public benchmarks. |

### [Know what moves revenue](7-track-growth)

All your numbers in one place, and the few moves that matter.

| Skill | What you get |
| --- | --- |
| [**find-what-grows-revenue**](7-track-growth/find-what-grows-revenue) | Connect your sales and analytics, and get the three moves that grow revenue most. |
| [**one-dashboard-for-everything**](7-track-growth/one-dashboard-for-everything) | One page of everything in flight across your repos, with what needs you at the top. |

### [Build a game with agents](8-build-a-game)

The same bar, set up for games in Godot, Unity, Unreal or the web.

| Skill | What you get |
| --- | --- |
| [**act-like-a-game-director**](8-build-a-game/act-like-a-game-director) | Your agent runs the game like a director: what's fun, what's urgent, what waits. |
| [**make-the-game-look-great**](8-build-a-game/make-the-game-look-great) | A look-and-feel bar for every screen, scene and animation. |
| [**finish-game-features**](8-build-a-game/finish-game-features) | Take a game feature all the way: built, seen working, pushed and shown. |
| [**playtest-every-scene**](8-build-a-game/playtest-every-scene) | Play through every scene and get a pass or fail with pictures. |
| [**prove-game-changes**](8-build-a-game/prove-game-changes) | Prove a change works with compile checks and renders. |
| [**start-your-game**](8-build-a-game/start-your-game) | Start every part of your game stack in the right order. |
| [**show-your-game-work**](8-build-a-game/show-your-game-work) | Push, document and show your game work. |
| [**talk-game-decisions**](8-build-a-game/talk-game-decisions) | Clear, short answers when you're making game decisions. |

## Good to know

- Each skill is a folder with a `SKILL.md`, plain Markdown your agent reads when your request matches it. Nothing runs until you ask.
- Review pages publish as Claude Artifacts when you have them, and as a local HTML page when you don't.
- Skills mention each other by name. Install the whole set to get everything working together.
- MIT licensed. Third-party files keep their own licenses (see `NOTICE` files).

Made by [Mac](https://github.com/alichherawalla). Follow me on GitHub for new skills as they ship.
