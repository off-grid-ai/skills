# Review like a senior engineer, without reading code

Your AI changes 50 files and you can't tell what broke. Now you get one page with every screen it touched, before and after, and only the calls that need you.

![How review like a senior engineer, without reading code works](how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**graph-engineering**](graph-engineering) | Ask for one change. See every place it touches, every screen before and after, on one page. |
| [**graph-engineering-loop**](graph-engineering-loop) | Answer a few calls once. It learns your rule, applies it everywhere, and asks you less next time. |
| [**show-me**](show-me) | Every screen of your app on one page. Pin a note on the exact spot, like Figma comments. |
| [**safe-to-merge**](safe-to-merge) | Your pull request gets every review comment answered and fixed until it's safe to merge. |
| [**code-check**](code-check) | A pass or fail on every change before it ships, against one clear bar. |
| [**never-twice**](never-twice) | Every review teaches your AI, so the same mistake never comes back. |

## Install just this set

```bash
npx skills add off-grid-ai/skills --skill graph-engineering graph-engineering-loop show-me safe-to-merge code-check never-twice
```

Claude Code: `/plugin marketplace add off-grid-ai/skills` then `/plugin install review@off-grid-ai`.
Codex: `codex plugin marketplace add off-grid-ai/skills` then `codex plugin add review@off-grid-ai`.

[All skills](../README.md)
