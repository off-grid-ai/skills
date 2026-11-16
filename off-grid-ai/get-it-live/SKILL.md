---
name: get-it-live
description: Take Off Grid AI work all the way to release-ready. Use when Ali says "get it live", "get-it-live", "ship it", or /get-it-live. Applies engineering, design, product, tests, devices and release together.
---

# Get it live

You do the work, in this session, start to finish. All code and change work stays here; sub-threads only run hand tests on devices (see `oga-cpto`). Load
`oga-voice`, `oga-engineering`, `oga-ux`, `oga-tests`, `oga-devices`, `oga-release`.

1. **State.** Read the release handoff (if any), `git log` and CI for every repo on the branch, and the open PRs. List what's left. No redoing done work.
2. **Order the work.** One list, worked top to bottom. A shared package or component library goes first and is pushed before the repos that use it. Keep Ali's exact words and the bar (`oga-ux` rule 1) in front of you; done = pushed, captioned in the PR, reported.
3. **Review as you go.** Look at every screen and flow against `oga-ux`, and read every new or changed test against `oga-tests`: what it fakes and how it seeds data. Fix a gap before moving on; never ship it.
4. **CI green** in every repo, with the no-mock guard on. A red test is fixed at its cause. A fix is accepted only after a live check on real data.
5. **While CI runs, one review loop.** Never sit idle waiting on CI. Run one turn of `review-loop` on the project's screen-review page: read open notes, judge every changed screen on iPhone and Android, fix what falls inside approved rules, pin the rest as notes for Ali. A fix restarts CI; that is fine.
6. **Review page in the PR.** Before the report: the screen-review page (`screen-review`) has fresh shots of every changed screen on both phones, published to the same URL; the shots and `docs/review/` are committed and pushed on the branch; the PR body has a **Screen review** line with the page link (`docs/review/ARTIFACT_URL`). Ali reviews from that page.
7. **Report.** When the list is done, the review page is in the PR and CI is green: one short summary to Ali with the PR links, and Argus updated. Tell him only what lands or needs his hands or a call.
8. **No merge, no nightly** until Ali says yes.
