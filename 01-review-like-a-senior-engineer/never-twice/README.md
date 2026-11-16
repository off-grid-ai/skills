# Make each code review raise your standard, so mistakes don't come back
![](overview.png)

Your agent reads a pull request's review comments, keeps only the lessons that would apply to any PR in any repo, and writes each one into your engineering standard with a concrete signal to catch it next time. One-offs are thrown away, and every kept lesson is logged with where it came from.

## Use it when
- A PR review just finished and you want the lessons kept.
- The same kind of review comment keeps coming back.
- A bug shipped even though the tests were green.

Try it: "Use never-twice on the comments from PR 42."

Feeds [code-check](../code-check). Runs as the last step of [safe-to-merge](../safe-to-merge).
