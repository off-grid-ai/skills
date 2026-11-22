# An AI that thinks like your CTO

No CTO? Your AI picks what's urgent, tells you when you're wrong, keeps building overnight and picks up any old chat where you left it.

![How an ai that thinks like your cto works](../assets/sets/cto-how-it-works.png)

| Skill | What you get |
| --- | --- |
| [**be-my-cto**](skills/be-my-cto) | Your AI decides what's urgent, does the clear work, and only asks you the real calls. |
| [**build-while-you-sleep**](skills/build-while-you-sleep) | Several AI builders work at once while one checks everything that lands. |
| [**argue-with-me**](skills/argue-with-me) | Your AI argues back with facts instead of agreeing with your worst ideas. |
| [**resume-any-chat**](skills/resume-any-chat) | Pick up any past chat by its name and carry on. Works across Claude Code accounts and Codex. |
| [**no-fluff**](skills/no-fluff) | Short answers, result first, no essays. |

## Install just this set

```bash
npx skills add off-grid-ai/skills --skill be-my-cto build-while-you-sleep argue-with-me resume-any-chat no-fluff
```

Claude Code: `/plugin marketplace add off-grid-ai/skills` then `/plugin install off-grid-cto@off-grid-ai`.
Codex: `codex plugin marketplace add off-grid-ai/skills` then `codex plugin add off-grid-cto@off-grid-ai`.

Some of these skills call skills in other sets. To get everything working together, install every set (see the main README).

[All skills](../README.md)
