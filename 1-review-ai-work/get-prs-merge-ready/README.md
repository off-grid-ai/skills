# Get every pull request to ready-to-merge, with each comment answered
![](overview.png)

Your agent audits its own diff, collects every review signal (AI review bots, coverage, static analysis, CI, human comments), answers each comment on its own thread, fixes behind your checks, and loops until nothing blocks. You only say when to merge.

## Use it when
- A PR has open review comments.
- You pushed to a PR and want the new feedback handled.
- You want a clear verdict: code, wired or verified.

Try it: "Use get-prs-merge-ready on PR 42."

Uses [check-code-before-merge](../check-code-before-merge) as its bar and [learn-from-every-review](../learn-from-every-review) to keep the bar rising.
