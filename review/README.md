# Review like a senior engineer, without reading code

Your AI changes 50 files and you can't tell what broke. You get one page with every screen it touched, before and after, and only the calls that need you.

![How review like a senior engineer, without reading code works](../assets/sets/review-how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**graph-engineering**](skills/graph-engineering) | Ask for one change. See every place it touches, every screen before and after, on one page. |
| [**graph-engineering-loop**](skills/graph-engineering-loop) | Answer a few calls once. It learns your rule, applies it everywhere, and asks you less next time. |
| [**show-me**](skills/show-me) | Every screen of your app on one page. Pin a note on the exact spot, like Figma comments. |
| [**safe-to-merge**](skills/safe-to-merge) | Your pull request gets every review comment answered and fixed until it's safe to merge. |
| [**code-check**](skills/code-check) | A pass or fail on every change before it ships, against one clear bar. |
| [**never-twice**](skills/never-twice) | Every review teaches your AI, so the same mistake never comes back. |

## Install just this set

```bash
npx skills add off-grid-ai/skills --skill graph-engineering graph-engineering-loop show-me safe-to-merge code-check never-twice
```

Claude Code: `/plugin marketplace add off-grid-ai/skills` then `/plugin install review@off-grid-ai`.
Codex: `codex plugin marketplace add off-grid-ai/skills` then `codex plugin add review@off-grid-ai`.

Some of these skills call skills in other sets. To get everything working together, install every set (see the main README).

[All skills](../README.md)
