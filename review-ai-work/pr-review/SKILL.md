---
name: pr-review
description: The Off Grid PR review loop — drive a pull request from "diff exists" to "merge-ready" and keep it there. Runs a hygiene AUDIT on the diff, gathers every review signal (Gemini /gemini review, Codecov, SonarCloud, human comments), triages and replies to EACH comment, fixes on the branch behind the mechanical gates, pushes, and re-reviews until no blocking issue remains. Closes by distilling the review into the hygiene skill via /hygiene-learn so the standard compounds. Use whenever a PR needs reviewing, or after pushing to a PR that has open review comments.
---

# Off Grid PR review loop

A PR is not done when the code is written — it is done when it is **VERIFIED and clean under
review**. This skill is the loop that gets it there and keeps it there. It is deliberately
iterative: review → triage → fix behind the gates → push → re-review, until the exit criteria
hold. Then it feeds what it learned back into the standard.

The rubric for "good" is the **`hygiene`** skill (§A–§H). This loop does not re-derive quality;
it *applies* hygiene's AUDIT mode to a live PR and manages the round-trip with reviewers.

**First, detect the repo and PR.** `gh pr view --json number,headRefName,baseRefName,title,url`.
If several PRs are open, confirm which one. Note the repo (`mobile`/`desktop`/`shared`/`sync`/
`console`/`gateway`/`website`/`provit`) — gates and tokens differ (hygiene §E).

**Posting is outward-facing.** Replying to a reviewer, pushing commits, and merging are visible
actions. Draft first; post replies and push freely on the PR's own branch (that is the loop),
but never merge without an explicit go, and never touch `main` (hygiene §H).

---

## The loop

### Phase 1 — Self-audit (before you read anyone else's comments)

Run the **`hygiene` skill in AUDIT mode** against `git diff <base>...HEAD`. Produce the
per-dimension PASS/FAIL/N/A verdict with evidence (run the mechanical gates, paste output).
Fix your own blocking issues *before* inviting review — a reviewer's time is not your linter.
Record the AUDIT verdict; it is half of the exit criteria.

### Phase 2 — Gather every review signal

Collect ALL of them; do not cherry-pick:

- **Automated reviewers:** trigger/read Gemini (`/gemini review`), Codecov (coverage delta +
  patch coverage), SonarCloud (new issues, quality gate, security hotspots). CI status:
  `gh pr checks`.
- **Human comments:** `gh pr view <n> --comments` and review threads via
  `gh api repos/{owner}/{repo}/pulls/{n}/comments` (inline) + `.../reviews`.

Enumerate every open, unresolved comment into one list. That list is the work.

### Phase 3 — Triage each comment (one verdict per comment, no silent skips)

For EVERY comment assign exactly one disposition, with a one-line reason:

- **ACCEPT → fix** — valid; will fix in this PR (most CI findings).
- **REJECT → reply** — not valid or not applicable; reply with the specific reason (a false
  positive from a bot still gets a courteous, concrete rebuttal so the thread resolves).
- **DEFER → gap** — real but out of this PR's one concern; log to `docs/GAPS_BACKLOG.md` with
  a link, and reply saying so. (hygiene §H: one concern per PR; gaps surfaced, never hidden.)

**Reply to EACH comment individually** (hygiene §H) — reviewers and threads resolve one by one,
never one blanket comment. A bot comment you're fixing gets a short "fixed in <sha>".

Watch for the trap: a bot flags a symptom, the real defect is a hygiene violation underneath
(a caller branching on a concrete type, a duplicated constant, a mock asserting itself). Fix
the seam (hygiene §A/§B), not the symptom the bot happened to see.

### Phase 4 — Fix behind the mechanical gates

Make the ACCEPTED fixes on the PR branch. Every fix clears hygiene §E for the repo BEFORE it is
pushed: prettier (separate from eslint) · eslint · tsc · scoped jest/tests · coverage vs the bar
· a production build if native/deps/config/imports changed. New behaviour ships its
**fails-before/passes-after** test (hygiene §D). Do NOT `--no-verify`. Do NOT bundle a repo-wide
prettier reformat — format only the lines you touched; a whole-file reformat that trips a
max-lines/complexity rule or bloats the diff is its own defect (revert it, re-apply minimally).

Commit per concern with a real message; push. Reply "fixed in <sha>" on each thread you closed.

### Phase 5 — Re-review (the loop)

After the push, CI re-runs. Return to **Phase 2**: pull the new signal, triage the new/again
comments, fix, push. Repeat until the exit criteria hold. Each pass should shrink the open list;
if it grows, a fix introduced a regression — treat that as a Phase-1 miss.

**Exit criteria (all must hold):**
1. hygiene AUDIT: overall PASS, zero blocking issues.
2. Every review thread resolved (fixed / rebutted / deferred-with-link) — none left open.
3. All CI checks green: Gemini has no unaddressed blocker, Codecov patch coverage meets the
   repo bar, SonarCloud quality gate passes, build is clean.
4. Evidence attached (hygiene §H): mobile = Provit journey + fails-before/passes-after +
   self-audit comment; desktop = screenshots per surface (read them, confirm they match the
   claim) + video for interaction + pasted test output.
5. Honesty check: what is NOT verified is named explicitly (on-device, 2-device, native
   linking, can't-repro → "candidate, not confirmed"). No inflated "done".

State the exit verdict as a gate: **code / wired / verified**. Only "verified" is done. Merging
(`gh pr merge --merge`, never squash/rebase — hygiene §H) waits for an explicit go.

### Phase 6 — Distill (feed the standard)

The review just taught you something. Before closing out, run **`/hygiene-learn`** on this PR's
review comments so the *generic* lessons sharpen the `hygiene` skill and the *specific* ones are
discarded. A review whose lessons evaporate will be re-learned the hard way on the next PR.
This phase is not optional — it is how the loop compounds.

---

## Notes

- **Scope discipline.** If review surfaces a real but unrelated problem, it is a gap
  (`docs/GAPS_BACKLOG.md`), not scope creep. One concern per PR.
- **The author and the reviewer can be the same agent** — that does not lower the bar. Audit
  your own diff as a hostile stranger would; the whole point of §D/§H is to catch the thing you
  were sure was fine.
- **A green CI with a broken feature is a FAIL** (hygiene §D). Checks passing ≠ feature works;
  the integration test through the real seam is what proves it.
