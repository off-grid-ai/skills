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
plug = lambda s: s["dir"].split("-", 1)[1]


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

readme = f"""# Review everything your AI agent changed, on one page

Your agent writes code faster than you can read it. These {total} free skills make it check its own work, show you every changed screen before and after, and ask you only the calls that need you. They work in Claude Code, Codex, Cursor, Gemini CLI, Copilot and 60+ other agents.

{hero}[![Built with these skills: 193B tokens, 22,809 GitHub contributions in 4 months](assets/built-with-these-skills.png)](https://github.com/alichherawalla)

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

Plugin names: {', '.join('`' + plug(s) + '`' for s in sets)}.

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

## All {total} skills

{sections}

## Good to know

- Each skill is a folder with a `SKILL.md`, plain Markdown your agent reads when your request matches it. Nothing runs until you ask.
- Review pages publish as Claude Artifacts when you have them, and as a local HTML page when you don't.
- Skills mention each other by name. Install the whole set to get everything working together.
- MIT licensed. Third-party files keep their own licenses (see `NOTICE` files).

Made by [Mac](https://github.com/alichherawalla). Follow me on GitHub for new skills as they ship.
"""
open(os.path.join(ROOT, "README.md"), "w").write(readme)
print("README +", len(sets), "set READMEs,", total, "skills")
