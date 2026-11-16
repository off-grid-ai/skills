# Test cases

Run after changing anything in this skill. Each case is a prompt plus what must happen. Also run cases 1, 6, 7, 8, 9, 10 and 11 of `../vendor/tyroneross/evals/directness-regression.md` for source checking; where those cases say "Load pyramid-…", load this skill instead.

## Case 1: The writer tries to score its own options

**Prompt:** "Write a decision report on whether we should move our Android builds from GitHub Actions to a self-hosted build machine. Here are the costs: …"

**Must happen:**
- Before any scoring, the writer asks what rules an option out and what matters most, in plain words (no "weights", no "must-haves").
- The points are saved to `decision.json` before scores exist.
- A separate subagent scores the options; the writer does not.
- At least three options appear, including "do nothing".

## Case 2: First screen too long

**Input:** a draft with a title, five strip rows and four reasons (10 lines).

**Must happen:** the rules reviewer fails rule 4, counts the lines out loud (10), and the fix cuts to seven or fewer.

## Case 3: Unsourced number

**Input:** a reason that says "Self-hosting cuts build time by 40%" with no source link.

**Must happen:** the source post-check flags it. The page either gains a source row with a locator, relabels it estimate with its method, or drops it. It never ships as a fact.

## Case 4: Jargon

**Input:** a page using "MECE", "base rate", "pre-mortem", "stakeholders" and "deal-breakers" in the body.

**Must happen:** the rules reviewer lists all five under rule 8; each is replaced from `plain-words.md`; book names move to the sources table.

## Case 5: Bold spread around

**Input:** a page with the recommendation, the option names and the totals all in bold.

**Must happen:** rule 10 fails; only the recommendation stays bold.

## Case 6: Odds without a comparison

**Input:** "It is likely the migration finishes in two weeks."

**Must happen:** becomes a number range with how similar cases went ("55 to 80%; our last two infra moves took 3 and 5 weeks"), or says nothing similar exists and marks it low confidence. The source-check confidence stays in words (High/Medium/Low), never a number.

## Case 7: Points changed after scoring

**Input:** the writer changes the points after seeing that its favourite lost.

**Must happen:** question 9 is flagged; both sets of points appear on the page with the reason; the scorer re-scores on the final points.

## Case 8: No decider

**Prompt:** "Write up the pricing options for the team."

**Must happen:** the writer asks who decides and by when before drafting. If nobody owns it, it stops and says so.

## Case 9: The arithmetic

**Input:** `python3 scripts/score.py` on points 35/30/25/5/5 and these scores: Mix 8/9/8/7/6, Our own 8/7/8/8/5, Adapt 7/9/7/6/7.

**Must print:** Mix 815, Our own 755, Adapt 755. Our own wins only if "Easy to change" gets more than 25 points. Adapt wins only if "First report soon" gets more than 35 points.

## Case 10: One-option request

**Prompt:** "Write a report recommending we hire a growth lead."

**Must happen:** the report adds at least one real alternative (for example an agency or a contractor) and "do nothing", and scores them. It does not present a bare yes or no.

## Case 11: Bad news headline

**Input:** facts where the recommended option has a serious risk found late.

**Must happen:** the risk sits in the "Main risk" row on the first screen, not one level down (rule 5).
