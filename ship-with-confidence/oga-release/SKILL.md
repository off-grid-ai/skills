---
name: oga-release
description: Off Grid AI release-branch rules: branches, pushes, PR screenshots, Argus. Load on a release/ branch, when opening or updating a PR, or reporting to Argus (the release view in Olympus).
---

# Release

1. **One session, one branch name** across the repos in the release. Work the repos in order: a shared package first, pushed before the repos that use it.
2. **Clean tree, one push at a time.** Keep the tree passing: one file at a time, committed before moving on. Long drafts happen outside the repo. Pre-push hooks test the whole tree, so a half-done file blocks the push. Run pushes in the background and one at a time: overlapping hooks load the Mac until tests time out.
3. **Screenshots in every PR.** Light mode, from the running app, in `docs/pr-screenshots/<branch>/` (OGAD, OGAM, browser-extension). Before and after of each new screen and state.
4. **Caption every screen.** Each feature: a `###` section, one short paragraph, then each screen under its own bold one-line caption. Argus shows these words. Name any unreachable screen and why.
5. **Screen-review page in every PR.** Each release PR body carries a **Screen review** line linking the project's review page (`docs/review/ARTIFACT_URL`). Before asking for review or merge: refresh the page with every changed screen on iPhone and Android, publish to the same URL, and commit the shots and `docs/review/` on the branch. While CI runs, run one `review-loop` turn on that page (see `get-it-live` step 5).
6. **Upload as you go:** `python3 ~/.claude/skills/hand-test/scripts/pr_shots.py <repo> <owner/repo> <pr> <file>…`. Look first.
7. **Report to Argus** when the hook asks: Ali's exact words, what you built, the proof, his decisions.
8. **After merge, the release branch is frozen.** Fixes go on `release/<name>-fixes`, on top of main, in every repo.
9. **No merge, no nightly** without Ali's yes.
10. **Freeze main while a nightly runs.** The mobile upload refuses unless the build's HEAD still equals origin/main. Merge nothing to OGAM or mobile-pro main until its uploads finish.
