# Change old code without breaking it

You inherit a codebase nobody fully understands, and every change is a guess. Your AI maps it first, shows you what each change will break, and adds tests before it touches anything risky.

| Skill | What you get |
| --- | --- |
| [**learn-this-codebase**](skills/learn-this-codebase) | Ask anything about a codebase you've never seen, and get answers with the file and line. |
| [**blast-radius**](skills/blast-radius) | See everything a change will break before it's made. Risky edits wait for your yes. |
| [**tests-for-old-code**](skills/tests-for-old-code) | Tests for code that never had any, each one run and passing before you see it. |
| [**audit-a-module**](skills/audit-a-module) | Find out whether to refactor, rewrite or leave a module alone, on one screen. |
| [**stay-in-the-lines**](skills/stay-in-the-lines) | Your architecture stays the way you drew it, because every change gets checked against your rules. |
| [**plan-from-scratch**](skills/plan-from-scratch) | Starting fresh? An architect, a product lead and a security lead plan it, and show you where they disagree. |
| [**deploy-without-fear**](skills/deploy-without-fear) | Deploy on any day. It checks before and after, and tells you the moment to roll back. |

## Install just this set

```bash
npx skills add off-grid-ai/skills --skill learn-this-codebase blast-radius tests-for-old-code audit-a-module stay-in-the-lines plan-from-scratch deploy-without-fear
```

Claude Code: `/plugin marketplace add off-grid-ai/skills` then `/plugin install off-grid-codebase@off-grid-ai`.
Codex: `codex plugin marketplace add off-grid-ai/skills` then `codex plugin add off-grid-codebase@off-grid-ai`.

Some of these skills call skills in other sets. To get everything working together, install every set (see the main README).

[All skills](../README.md)
