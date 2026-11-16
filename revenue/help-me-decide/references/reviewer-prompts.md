# Reviewer prompts

Each reviewer runs in a fresh subagent (in Claude Code, the Agent tool with a general-purpose agent; elsewhere a new chat or a different model) so it is not anchored on the writer. Fill the {braces}. Never paste the writer's scores, preference or reasoning into the scorer.

## Scorer (step 4)

```
You are scoring options for a decision. You have not seen anyone else's scores.

Decision: {one-line question}. Decider: {name}. The decider says: {their priority, in their words}.

Must pass (an option that fails any is dropped; judge each option as it would stand when finished, with the same test for every option):
{list}

Points out of 100 (fixed before scoring; do not change them):
{criterion: points, ...}

Options:
{name: two-to-four-line description, with links to anything you should read}

Read what you need (code, sources, pages). Then:
1. Pass/fail each option on each must-pass, one-line reason.
2. Score each remaining option 1-10 on each criterion, one-line reason per score.
3. Make the strongest honest case for the option you rank second.
4. Suggest a mix of options if one clearly beats them all, and score it.
Return JSON first: {"options": {name: {criterion: score}}} for scored options, then your reasons. Do not write files. Under 700 words.
```

## Source post-check (step 6)

```
You check facts. You did not write this report.

Report: {path to HTML}. Claim packet: {path or pasted packet}.
Follow {skill dir}/vendor/tyroneross/references/strict-trace.md, "Trace draft" post-check:
split the report into factual and evaluative claims (including ones carried by adjectives and verbs), map each to the packet, and list every mismatch, missing scope term or unsupported claim with the exact line.
Also fetch at least 6 of the linked sources and say whether each supports what its row says.
Return: RESULT, then a table of problems (line, problem, fix), then the source fetch results. Do not edit files.
```

## Rules reviewer (step 6)

```
You are an independent reviewer. You did not write this report and owe it nothing. Be strict.

Report: {path to HTML}. Rules: {skill dir}/references/rules.md. Questions: {skill dir}/references/twelve-questions.md. Plain words: {skill dir}/references/plain-words.md.

1. Grade every one of the 22 rules PASS / PARTIAL / FAIL with the exact place and a one-line reason. Count the first screen's lines yourself (title + strip rows + reasons). List every jargon word. Count bold items.
2. Re-run the scores with: python3 {skill dir}/scripts/score.py {path to decision.json}. Say whether the page matches, and whether every sentence about what would change the answer is true.
3. Answer the twelve questions yourself; list where you disagree with the page.
4. Grade the whole report GREEN / YELLOW / RED in the format of {skill dir}/vendor/sruthir28/critic-SKILL.md: one-line verdict, top 3 fixes ranked by impact (each concrete enough to apply), one thing that works.
Do not edit files. Under 900 words.
```

## Case for the runner-up (step 6, when the lead is under 100 points or the decision is hard to undo)

```
You argue against a recommendation. Make the strongest honest case for {runner-up} over {leader}.
Decision and options: {same as scorer}. Read the sources yourself.
Then: what the leader's backers are overlooking; what evidence would make you switch; your own scores on the same points. Under 600 words. Do not write files.
```
