#!/usr/bin/env python3
"""Rebuild the root README and each set's README from scripts/catalog.json.

    python3 scripts/build-readmes.py

Edit the catalog, not the READMEs. Skill READMEs (inside each skill folder) are written by hand.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cat = json.load(open(os.path.join(ROOT, "scripts", "catalog.json")))
sets = cat["sets"]
total = sum(len(s["skills"]) for s in sets)
plug = lambda s: s["dir"]


def table(s, prefix=""):
    rows = ["| Skill | What you get |", "| --- | --- |"]
    for name, line in s["skills"]:
        rows.append(f"| [**{name}**]({prefix}{name}) | {line} |")
    return "\n".join(rows)


img = lambda s, pre="": (f"![How {s['title'].lower()} works]({pre}how-it-works.png)\n\n"
                         if os.path.exists(os.path.join(ROOT, s["dir"], "how-it-works.png")) else "")

for s in sets:
    body = f"""# {s['title']}

{s['pitch']}

{img(s)}{table(s)}

## Install just this set

```bash
npx skills add off-grid-ai/skills --skill {' '.join(n for n, _ in s['skills'])}
```

Claude Code: `/plugin marketplace add off-grid-ai/skills` then `/plugin install {plug(s)}@off-grid-ai`.
Codex: `codex plugin marketplace add off-grid-ai/skills` then `codex plugin add {plug(s)}@off-grid-ai`.

[All skills](../README.md)
"""
    open(os.path.join(ROOT, s["dir"], "README.md"), "w").write(body)

img = lambda s, pre="": (f"![How {s['title'].lower()} works]({pre}how-it-works.png)\n\n"
                         if os.path.exists(os.path.join(ROOT, s["dir"], "how-it-works.png")) else "")
sections = "\n\n".join(
    f"### [{s['title']}]({s['dir']})\n\n{s['pitch']}\n\n{img(s, s['dir'] + '/')}{table(s, s['dir'] + '/')}" for s in sets)
hero = ("![How it works: you ask for a change, your agent maps everything it touches, makes it, checks it, and hands you one page with only the calls that need you](assets/how-it-works.png)\n\n"
        if os.path.exists(os.path.join(ROOT, "assets", "how-it-works.png")) else "")

where = {n: f"{s['dir']}/{n}" for s in sets for n, _ in s["skills"]}
hooks = "\n".join(f"- **[{s['title']}]({s['dir']})**. {s['pitch']}" for s in sets)

readme = f"""# Stop babysitting your AI. Make it build, test and ship like a senior team.

I'm [Mac](https://github.com/alichherawalla), CTO and co-founder of [Wednesday Solutions](https://www.wednesday.is). We build apps for 10%% of India's unicorns, including Rapido, PharmEasy, PayU and Kotak Securities, and for Kalshi, Zalora and Ninja Van.

This year I built [Off Grid AI](https://github.com/off-grid-ai/OGAM) with these exact skills: a private AI app that runs offline on iPhone, Android and Mac. It went to #1 on Hacker News, got written up by [GIGAZINE](https://www.gigazine.net/gsc_news/en/20260401-off-grid-mobile-ai), and has 3,382 stars on GitHub. In the last 4 months the same skills turned 193B tokens of Claude Code and Codex into 22,809 GitHub contributions.

[![Built with these skills: Off Grid AI, 3,382 GitHub stars, #1 on Hacker News, 22,809 contributions in 4 months, 193B tokens](assets/built-with-these-skills.png)](https://github.com/alichherawalla)

## What these skills do

Vibe coding gets you a demo in an afternoon. Then your AI breaks things that already worked, every screen looks like every other AI app, and you're asked to approve 50 changed files you can't read.

A skill is a short playbook your agent reads before it starts. These {total} give it the habits of a senior team. It maps everything a change will touch before it writes code, tests the real app the way a user taps through it, holds every screen to a design bar, and hands you one page with every screen before and after and only the calls that need you. They're free and work in Claude Code, Codex, Cursor and 60+ other agents.

{hooks}

{hero}## Install in one line

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
/plugin install {plug(sets[0])}@off-grid-ai
```

**Codex**
```bash
codex plugin marketplace add off-grid-ai/skills
codex plugin add {plug(sets[0])}@off-grid-ai
```

Plugin names: {', '.join('`' + plug(s) + '`' for s in sets)}.

**Any agent, no Node**
```bash
curl -fsSL https://raw.githubusercontent.com/off-grid-ai/skills/main/install.sh | bash
```
It links every skill into each agent it finds on your machine. Run it again to update.

</details>

## Try these first

**[graph-engineering](%(ge)s): review a 98-screen change on one page.** Ask for one change and you see every place it touches, every changed screen before and after, and only the calls that need you. [graph-engineering-loop](%(gel)s) learns the rule behind each call and applies it everywhere.

![What your AI hands you after every change: every app it touches, the newest version, checks from 5 angles, every changed screen before and after, notes, and only the decisions that need you.](assets/review-page.png)

> *"Use graph-engineering to rename Folders to Projects across the app."*

**[test-like-a-user](%(tlu)s): tests that catch what your users would hit.** It opens the real screen, taps the real button and checks what you'd see. No mocks of your own code, so a green test means it really works.

> *"/test-like-a-user the checkout flow"*

**[argue-with-me](%(awm)s): an AI that tells you when you're wrong.** It checks the facts and keeps your whole goal in view instead of agreeing with whatever you said last.

> *"/argue-with-me we should rewrite the backend in Rust"*

**[resume-any-chat](%(rac)s): never lose a chat again.** Find any past session by its name, even from another account or from Codex, and carry on where it stopped.

> *"/resume-any-chat the onboarding redesign"*

## All {total} skills

{sections}

## Good to know

- Each skill is a folder with a `SKILL.md`, plain Markdown your agent reads when your request matches it. Nothing runs until you ask.
- Review pages publish as Claude Artifacts when you have them, and as a local HTML page when you don't.
- Skills mention each other by name. Install the whole set to get everything working together.
- MIT licensed. Third-party files keep their own licenses (see `NOTICE` files).

Made by [Mac](https://github.com/alichherawalla). Follow me on GitHub for new skills as they ship.
""" % dict(ge=where["graph-engineering"], gel=where["graph-engineering-loop"], tlu=where["test-like-a-user"], awm=where["argue-with-me"], rac=where["resume-any-chat"])
open(os.path.join(ROOT, "README.md"), "w").write(readme)
print("README +", len(sets), "set READMEs,", total, "skills")
