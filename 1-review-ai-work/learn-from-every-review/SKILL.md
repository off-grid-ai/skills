---
name: learn-from-every-review
description: Distill PR review comments into the check-code-before-merge skill so the standard gets sharper every review. Takes the review signal from a PR (Gemini/Codecov/SonarCloud/human comments, or a pasted set) and, for each, decides whether the lesson is GENERIC (a recurring class of mistake worth codifying) or SPECIFIC (a one-off to discard). Generic lessons are folded into the right hygiene dimension (§A–§H) as a tightened rule/tell/anti-pattern — minimally, without bloat — and logged with provenance. Run it as the closing phase of /get-prs-merge-ready, or standalone against any set of review comments.
---

# Distill reviews into the standard

The `check-code-before-merge` skill is only as good as the mistakes it has learned to catch. Every review is a
free lesson. This skill decides which lessons are worth keeping — and folds those, and only
those, back into `check-code-before-merge` so the next PR starts from a higher bar. The discipline is as much
about what you REFUSE to add as what you add: a bloated standard is an ignored standard.

**Input.** The review comments for a PR (from `/get-prs-merge-ready` Phase 2, or `gh pr view <n>
--comments` + `gh api .../pulls/{n}/comments`, or a set the user pastes). Include your own
AUDIT findings and any bug that slipped past the suite — a shipped regression is the highest-
signal lesson there is (hygiene §D: "why did the suite stay green?").

---

## Step 1 — For each comment, classify: GENERIC or SPECIFIC

Promote a lesson into `check-code-before-merge` **only if ALL five hold**:

1. **Recurs.** It is a *class* of mistake, not this feature's domain bug. The test:
   *"Would this exact comment be valid on an unrelated PR, in another repo?"* If it only makes
   sense for this feature, it is SPECIFIC — discard.
2. **Maps to a dimension.** It sharpens an existing §A–§H rule/tell/anti-pattern, OR it reveals
   a genuinely missing dimension. Name the section it belongs to.
3. **Detectable.** You can state it as a rule with a **tell** — a concrete signal a reviewer or
   a grep can catch next time (`kind ===`, a hardcoded hex, `expect(x).toHaveBeenCalled()`,
   a duplicated constant). "Write better code" is not a tell; discard.
4. **Not already covered.** Grep the current skill. If the rule is already there, do NOT
   duplicate — at most tighten the existing wording. Most near-misses land here.
5. **Portable.** It belongs in the cross-repo standard. Repo-specific facts (a path, a command,
   a token name) go to that repo's `CLAUDE.md`, not here. Anything a formatter/linter already
   enforces mechanically is not a hygiene lesson — it is a gate config (§E).

**Discard (do NOT touch the skill) when:** it is a one-off domain-logic bug; a subjective style
preference prettier/eslint owns; project-specific (→ `CLAUDE.md`); already covered; or a nit
with no general signal. Discarding is the common, correct outcome — most comments are SPECIFIC.

Output a short table: each comment → GENERIC/SPECIFIC → (if generic) the target § + the tell.

## Step 2 — Fold the GENERIC lessons in, minimally

For each GENERIC lesson:

- **Prefer sharpening an existing bullet** over adding a new one. Add the missing *tell* or
  *anti-pattern* to the rule that already exists. Add a brand-new bullet only when no existing
  rule covers it; add a brand-new **section** only when a whole dimension is missing (rare —
  justify it).
- **Write in the skill's voice:** imperative rule + the tell (the signal) + optional
  anti-pattern, terse. Match the density of the surrounding text. No preamble, no hedging.
- **Keep it tight.** The user's standing bar for this skill is high signal, zero bloat. If your
  addition makes a section longer without making it sharper, cut it back. One vivid tell beats
  three paragraphs.
- **One dimension per lesson.** If a comment spans two §s, split it.

## Step 3 — Show the diff, apply, log

- Show the exact before/after edit to `hygiene/SKILL.md` for each accepted lesson. Keep edits
  surgical (a tightened sentence, an added tell) — never a section rewrite.
- Apply the edits.
- **Log provenance** in `hygiene/LEDGER.md` — one line per accepted lesson:
  `YYYY-MM-DD · <repo> PR #<n> · §<X> · <the one-line lesson>`. The ledger is the audit trail:
  it lets anyone see why a rule exists and revert a bad addition. Convert relative dates to
  absolute. Do not put lesson *content* in the ledger beyond the one-liner — the content lives
  in the skill.
- Report: N comments reviewed → M generic (folded into §…) → (N−M) specific (discarded, why in
  one phrase). If M is 0, say so plainly — a review with no generalizable lesson is normal and
  honest; do not invent one to justify a skill edit.

---

## Guardrails

- **The skill must not grow monotonically.** When you add, also look for a rule the new tell
  makes redundant, and collapse them. Net size should stay roughly flat; density should rise.
- **Never weaken a rule to match a shipped mistake.** Lessons tighten the bar, never lower it
  (mirrors hygiene §D on coverage: raise, never lower).
- **A shipped regression edits the test CLASS, not just the code** (hygiene §D). If the lesson
  is "the suite stayed green while the feature broke", the hygiene edit is a sharper §D
  tell about the missing corner/seam — plus grep the codebase for the same test shape.
- **Don't over-fit to one loud reviewer.** A single bot's stylistic preference is not a
  standard. Require the "would it recur elsewhere?" test to pass on its own merits.
