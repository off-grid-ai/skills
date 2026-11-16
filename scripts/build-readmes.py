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
hooks = "\n".join(f"- [{s['title']}]({s['dir']})" for s in sets)

readme = f"""# Stop babysitting your AI. Make it build, test and ship like a senior team.

These are the skills I use every day. I built [Off Grid AI](https://github.com/off-grid-ai/OGAM) on my own with them, and it reached 250,000+ downloads on 7 platforms without spending a dollar on ads. Install them and your AI works the way mine does.

[![Off Grid AI, built by one person with these skills: 250,000+ organic downloads on 7 platforms](assets/built-with-these-skills.png)](https://github.com/alichherawalla)

## What these skills do

Vibe coding gets you a demo in an afternoon. Then your AI breaks things that already worked, every screen looks like every other AI app, and you're asked to approve 50 changed files you can't read.

Each skill is a short playbook your agent reads before it starts, so it tests every change in your real app and checks the design before you see anything. What you get back is one page with every screen before and after, and only the decisions that need you. They're free, MIT licensed, and work in Claude Code, Codex, Cursor and 60+ other agents.

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

## Get all {total}

```bash
npx skills add off-grid-ai/skills
```

Or paste "Install the skills from github.com/off-grid-ai/skills" into your agent.

## Good to know

- Each skill is a folder with a `SKILL.md`, plain Markdown your agent reads when your request matches it. Nothing runs until you ask.
- Review pages publish as Claude Artifacts when you have them, and as a local HTML page when you don't.
- Skills mention each other by name. Install the whole set to get everything working together.
- MIT licensed. Third-party files keep their own licenses (see `NOTICE` files).

Made by [Mac](https://github.com/alichherawalla). Follow me on GitHub for new skills as they ship.
""" % dict(ge=where["graph-engineering"], gel=where["graph-engineering-loop"], tlu=where["test-like-a-user"], awm=where["argue-with-me"], rac=where["resume-any-chat"])
open(os.path.join(ROOT, "README.md"), "w").write(readme)
print("README +", len(sets), "set READMEs,", total, "skills")
