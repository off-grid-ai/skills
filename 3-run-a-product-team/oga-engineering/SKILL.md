---
name: oga-engineering
description: How code is changed, checked and committed in Off Grid AI repos. Load before editing code, running checks or committing.
---

# Engineering

1. **Contract:** `off-grid-ai/.codex/ENGINEERING_CONTRACT.md`. Additive. No unrelated refactors. Ask before a new abstraction, schema or migration.
2. **Code first, check once.** Review the diff, then typecheck + lint + touched tests once, in the background. Ignore SonarCloud.
3. **Small commits.** One change each. Stage named files only. One git-flow branch name in every repo.
4. **Push with hooks.** Never `--no-verify`. After a pro commit, bump the `pro` pointer and push both.
5. **No worktrees** unless asked. If asked: `~/.claude/skills/oga-cpto/lean-worktree.sh <dir>` before `npm install`.
6. **Never wait.** Long jobs run in the background. Resume from the notification.
