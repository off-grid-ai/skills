---
name: finish-game-features
description: Take game work all the way to done in one session, from what is left to built, seen working, pushed and shown with screenshots. Use when the user says "finish the game work", "get it live", "ship it", "finish all the work" or "finish-game-features" on a game in any engine.
---

# Finish game features

You do the work, in this session, start to finish. Only slow side jobs (fetching or buying assets, long downloads) go to a separate session or person (see `act-like-a-game-director`).

Load these first: `talk-game-decisions`, `fix-the-real-problem`, `make-the-game-look-great`, `prove-game-changes`, `start-your-game`, `show-your-game-work`.

1. **State.** Read `git log`, the project's design doc and roadmap (look for DESIGN.md, GAME_DESIGN.md, a roadmap, a TODO or the issue tracker), any asset or status reports in the repo, and everything the user asked for this session. List what is left. Never redo done work.
2. **Order the work.** One list, top to bottom: what blocks other work first, then what the user can see. Keep the user's exact words and the look bar (`make-the-game-look-great` rule 1) in front of you.
3. **Build and prove each item.** A compile or script check, a call to the game's debug hooks or a render (`prove-game-changes`). Look at every render against `make-the-game-look-great`. Fix a gap before you move on.
4. **Commit and push** each item once it is proven (`show-your-game-work`).
5. **Review page.** Every finished item goes on the review page as a new version with a note from the agent. Anything still wrong gets a mark on the shot (`review-every-screen`). Before a release, run one `apply-feedback-everywhere` turn (`show-your-game-work` rule 3). No review page tool? Write a local HTML or markdown page with the shots and notes.
6. **Report.** A short status with screenshots: done, in progress, left (with rough times), and what needs the user's hands (a store or asset-site login, a licence to accept, a model or service to start, a permission to grant).
