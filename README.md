# Stop babysitting your AI. Make it build, test and ship like a senior team.

I'm [Mac](https://github.com/alichherawalla), CTO and co-founder of Wednesday Solutions. I built [Off Grid AI](https://github.com/off-grid-ai/OGAM) with these exact skills: an offline AI app on iPhone, Android and Mac with 3,382 stars on GitHub. In the last 4 months I put 193B tokens through Claude Code and Codex with them and shipped 22,809 GitHub contributions.

[![Built with these skills: Off Grid AI, 3,382 GitHub stars, 22,809 contributions in 4 months, 193B tokens](assets/built-with-these-skills.png)](https://github.com/alichherawalla)

## What these skills do

Vibe coding gets you a demo in an afternoon. Then your AI breaks things that already worked, every screen looks like every other AI app, and you're asked to approve 50 changed files you can't read.

A skill is a short playbook your agent reads before it starts. These 42 give it the habits of a senior team. It maps everything a change will touch before it writes code, tests the real app the way a user taps through it, holds every screen to a design bar, and hands you one page with every screen before and after and only the calls that need you. They're free and work in Claude Code, Codex, Cursor and 60+ other agents.

- **[Review like a senior engineer, without reading code](review)**. Your AI changes 50 files and you can't tell what broke. Now you get one page with every screen it touched, before and after, and only the calls that need you.
- **[Your AI stops breaking things that already worked](testing)**. You fix one bug and two old features break. Now every change is tested by tapping through your app like a real user, with no fake mocks hiding the breakage.
- **[UI that looks like Stripe's designers made it](design)**. Vibe-coded apps all look the same. Now every screen clears a real design bar, reuses your best components, and one fix lands on every screen.
- **[An AI that thinks like your CTO](cto)**. No CTO? Your AI becomes one. It decides what's urgent, argues back when you're wrong, builds while you sleep, and never loses where you left off.
- **[Launch like a real startup](launch)**. It worked on your laptop and broke on your phone. Now every release is tested on real phones, shipped cleanly, and announced in notes people read.
- **[Get users without ads](growth)**. Your landing page reads like ChatGPT wrote it and nobody can find you. Now your copy sounds human, sells, and gets you recommended in AI answers.
- **[Know what makes you money](revenue)**. You have Stripe, analytics and store numbers and no idea what to change. Now you get the three moves that grow revenue most, and decisions you can make from one page.
- **[Make a game like a studio would](games)**. Making a game alone with AI? Now it has a director, an art director and a QA team that playtests every scene.

![How it works: you ask for a change, your agent maps everything it touches, makes it, checks it, and hands you one page with only the calls that need you](assets/how-it-works.png)

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
/plugin install review@off-grid-ai
```

**Codex**
```bash
codex plugin marketplace add off-grid-ai/skills
codex plugin add review@off-grid-ai
```

Plugin names: `review`, `testing`, `design`, `cto`, `launch`, `growth`, `revenue`, `games`.

**Any agent, no Node**
```bash
curl -fsSL https://raw.githubusercontent.com/off-grid-ai/skills/main/install.sh | bash
```
It links every skill into each agent it finds on your machine. Run it again to update.

</details>

## Try these first

**[graph-engineering](review/graph-engineering): review a 98-screen change on one page.** Ask for one change and you see every place it touches, every changed screen before and after, and only the calls that need you. [graph-engineering-loop](review/graph-engineering-loop) learns the rule behind each call and applies it everywhere.

![What your AI hands you after every change: every app it touches, the newest version, checks from 5 angles, every changed screen before and after, notes, and only the decisions that need you.](assets/review-page.png)

> *"Use graph-engineering to rename Folders to Projects across the app."*

**[test-like-a-user](testing/test-like-a-user): tests that catch what your users would hit.** It opens the real screen, taps the real button and checks what you'd see. No mocks of your own code, so a green test means it really works.

> *"/test-like-a-user the checkout flow"*

**[argue-with-me](cto/argue-with-me): an AI that tells you when you're wrong.** It checks the facts and keeps your whole goal in view instead of agreeing with whatever you said last.

> *"/argue-with-me we should rewrite the backend in Rust"*

**[resume-any-chat](cto/resume-any-chat): never lose a chat again.** Find any past session by its name, even from another account or from Codex, and carry on where it stopped.

> *"/resume-any-chat the onboarding redesign"*

## All 42 skills

### [Review like a senior engineer, without reading code](review)

Your AI changes 50 files and you can't tell what broke. Now you get one page with every screen it touched, before and after, and only the calls that need you.

![How review like a senior engineer, without reading code works](review/how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**graph-engineering**](review/graph-engineering) | Ask for one change. See every place it touches, every screen before and after, on one page. |
| [**graph-engineering-loop**](review/graph-engineering-loop) | Answer a few calls once. It learns your rule, applies it everywhere, and asks you less next time. |
| [**show-me**](review/show-me) | Every screen of your app on one page. Pin a note on the exact spot, like Figma comments. |
| [**safe-to-merge**](review/safe-to-merge) | Your pull request gets every review comment answered and fixed until it's safe to merge. |
| [**code-check**](review/code-check) | A pass or fail on every change before it ships, against one clear bar. |
| [**never-twice**](review/never-twice) | Every review teaches your AI, so the same mistake never comes back. |

### [Your AI stops breaking things that already worked](testing)

You fix one bug and two old features break. Now every change is tested by tapping through your app like a real user, with no fake mocks hiding the breakage.

![How your ai stops breaking things that already worked works](testing/how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**test-like-a-user**](testing/test-like-a-user) | Tests that open the real screen, tap the real button and check what you'd see. No mocks of your own code. |
| [**bug-trap**](testing/bug-trap) | Every bug gets a test that fails first, so it can't sneak back in. |
| [**dont-break-it**](testing/dont-break-it) | Your AI changes, checks and saves code so nothing half-done ships. |
| [**fix-it-for-real**](testing/fix-it-for-real) | It fixes the cause, not the symptom, and reuses what someone already solved. |
| [**click-everything**](testing/click-everything) | It clicks through every page of your web app and fixes what breaks. |

### [UI that looks like Stripe's designers made it](design)

Vibe-coded apps all look the same. Now every screen clears a real design bar, reuses your best components, and one fix lands on every screen.

![How ui that looks like stripe's designers made it works](design/how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**make-it-look-expensive**](design/make-it-look-expensive) | A design bar every screen has to clear before you see it: spacing, states, motion, polish. |
| [**match-the-design**](design/match-the-design) | It builds from your component library with its animations, so no screen looks one-off. |
| [**fix-it-everywhere**](design/fix-it-everywhere) | Leave notes on 3 screens. It turns them into one rule and fixes every screen. |

### [An AI that thinks like your CTO](cto)

No CTO? Your AI becomes one. It decides what's urgent, argues back when you're wrong, builds while you sleep, and never loses where you left off.

![How an ai that thinks like your cto works](cto/how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**be-my-cto**](cto/be-my-cto) | Your AI decides what's urgent, does the clear work, and only asks you the real calls. |
| [**build-while-you-sleep**](cto/build-while-you-sleep) | Several AI builders work at once while one checks everything that lands. |
| [**argue-with-me**](cto/argue-with-me) | Your AI argues back with facts instead of agreeing with your worst ideas. |
| [**resume-any-chat**](cto/resume-any-chat) | Pick up any past chat by its name and carry on. Works across Claude Code accounts and Codex. |
| [**no-fluff**](cto/no-fluff) | Short answers, result first, no essays. |

### [Launch like a real startup](launch)

It worked on your laptop and broke on your phone. Now every release is tested on real phones, shipped cleanly, and announced in notes people read.

![How launch like a real startup works](launch/how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**ship-it**](launch/ship-it) | Take any feature all the way to live: built, tested, seen working. |
| [**try-it-on-my-phone**](launch/try-it-on-my-phone) | Your AI checks every release on real phones before your users do. |
| [**run-on-any-device**](launch/run-on-any-device) | Your AI runs and taps through your app on a computer, an iPhone and an Android phone. |
| [**release-day**](launch/release-day) | Clean releases with screenshots on every pull request. |
| [**whats-new**](launch/whats-new) | Release notes your users actually read. |

### [Get users without ads](growth)

Your landing page reads like ChatGPT wrote it and nobody can find you. Now your copy sounds human, sells, and gets you recommended in AI answers.

![How get users without ads works](growth/how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**make-it-sell**](growth/make-it-sell) | Headlines and landing pages that sell, on the rules of the best ad writers ever. |
| [**sound-human**](growth/sound-human) | Copy that sounds like a person wrote it, with zero AI tells. |
| [**write-like-me**](growth/write-like-me) | Posts and emails in your own voice, learned from what you've already written. |
| [**get-cited-by-ai**](growth/get-cited-by-ai) | Articles that rank on Google and get you named in ChatGPT-style answers. |
| [**find-threads-to-join**](growth/find-threads-to-join) | The posts worth your reply each day, with two angles ready for each. |

### [Know what makes you money](revenue)

You have Stripe, analytics and store numbers and no idea what to change. Now you get the three moves that grow revenue most, and decisions you can make from one page.

![How know what makes you money works](revenue/how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**grow-my-revenue**](revenue/grow-my-revenue) | Connect Stripe and your analytics. Get the three moves that grow revenue most. |
| [**help-me-decide**](revenue/help-me-decide) | Any big decision on one page: the answer first, every claim sourced, options scored. |
| [**weekly-wins**](revenue/weekly-wins) | What you shipped this week against last week, and what's next. |
| [**pick-the-best-ai-model**](revenue/pick-the-best-ai-model) | The best AI models for your app on every device, backed by public benchmarks. |
| [**mission-control**](revenue/mission-control) | One page of everything in flight across your projects, with what needs you on top. |

### [Make a game like a studio would](games)

Making a game alone with AI? Now it has a director, an art director and a QA team that playtests every scene.

![How make a game like a studio would works](games/how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**game-director**](games/game-director) | Your AI runs the game like a director: what's fun, what's urgent, what waits. |
| [**art-director**](games/art-director) | Every screen, scene and animation held to one look. |
| [**playtest**](games/playtest) | It plays through every scene and hands you a pass or fail with pictures. |
| [**ship-the-feature**](games/ship-the-feature) | Any game feature taken all the way: built, seen working, pushed, shown. |
| [**prove-it**](games/prove-it) | Proof a change works, with compile checks and renders. |
| [**boot-game**](games/boot-game) | Your whole game stack started in the right order, every time. |
| [**devlog**](games/devlog) | Push, document and show off your progress. |
| [**game-calls**](games/game-calls) | Straight answers when you're making game decisions. |

## Good to know

- Each skill is a folder with a `SKILL.md`, plain Markdown your agent reads when your request matches it. Nothing runs until you ask.
- Review pages publish as Claude Artifacts when you have them, and as a local HTML page when you don't.
- Skills mention each other by name. Install the whole set to get everything working together.
- MIT licensed. Third-party files keep their own licenses (see `NOTICE` files).

Made by [Mac](https://github.com/alichherawalla). Follow me on GitHub for new skills as they ship.
