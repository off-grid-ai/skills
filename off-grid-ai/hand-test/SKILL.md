---
name: hand-test
description: Off Grid AI release verification on real devices. Use when Ali says "hand test", "verify the release", "manual verification", "write a test", "fix a test", or /hand-test.
---

# Hand test

Load `oga-devices`, `oga-tests`, `oga-release`, then, in this session (see `oga-cpto`):

1. **Plan.** Read the release diff in every repo. Write one checklist in `desktop/docs/`: do this → you should see this.
2. **Order.** Old install with real data, upgrade, checks, fresh install last. Mac last: phones pair with it.
3. **One device at a time** to a stable result, iPhone first. Shared code once, on the fastest device.
4. **Report each check:** pass, fail with what you saw, or not run and why. Read the code behind every claim.
5. **A failure is a bug.** Fix "now" items on the release branch with a test. Else log "after release".