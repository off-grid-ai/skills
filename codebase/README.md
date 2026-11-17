# Take over any codebase, old or new

New to a codebase, or starting one from nothing? Your AI maps it, knows what each change will break, keeps the architecture clean and deploys without a 2am rollback.

| Skill | What you get |
| --- | --- |
| [**learn-this-codebase**](learn-this-codebase) | Know a new codebase in an hour. Every answer comes with the file path. |
| [**blast-radius**](blast-radius) | Before shared code changes, see everything it breaks. Risky edits wait for your yes. |
| [**tests-for-old-code**](tests-for-old-code) | Tests for code that never had any, each one run and passing before you see it. |
| [**audit-a-module**](audit-a-module) | Refactor, rewrite or leave it alone? One screen and a straight answer. |
| [**stay-in-the-lines**](stay-in-the-lines) | Write down which parts may talk to which. Every change gets checked against it. |
| [**plan-from-scratch**](plan-from-scratch) | An architect, a product lead and a security lead plan your new project, and show you where they disagree. |
| [**deploy-without-fear**](deploy-without-fear) | Checks before and after every production deploy, and a clear call on when to roll back. |

## Install just this set

```bash
npx skills add off-grid-ai/skills --skill learn-this-codebase blast-radius tests-for-old-code audit-a-module stay-in-the-lines plan-from-scratch deploy-without-fear
```

Claude Code: `/plugin marketplace add off-grid-ai/skills` then `/plugin install codebase@off-grid-ai`.
Codex: `codex plugin marketplace add off-grid-ai/skills` then `codex plugin add codebase@off-grid-ai`.

Some of these skills call skills in other sets. To get everything working together, install every set (see the main README).

[All skills](../README.md)
