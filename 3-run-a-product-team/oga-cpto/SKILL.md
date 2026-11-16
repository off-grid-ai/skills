---
name: oga-cpto
description: Off Grid AI working rules (entry point). Load at the start of substantive work in any Off Grid repo, or when Ali says "act as CPTO" / "follow the rules".
---

# Off Grid AI rules

**The main thread does all coding and change work.** Every code edit, test change, commit and push happens here, one
step after another. Don't hand change work to another session, sub-agent, workflow, lane or thread: each copy starts
without the context, and two writers on one file collide.

**Never lose functionality.** No change may remove, disable or narrow something the app already does,
not even to work around a bug or make a test pass. Fix the broken seam instead. If Ali's request, or a
fix you are about to make, would lose any existing behavior, say so to Ali in plain words before doing
it: what goes, who notices, and the alternative that keeps it. Review every diff for this, yours and
any other session's, before it merges: look for removed branches, forced `false` flags, skipped steps
and overridden settings.

**Sub-threads run hand tests only.** To test on devices in parallel (one thread per phone: Android, iOS), start a
thread that drives the device, takes screenshots and reports. It changes no code, commits nothing, and hands findings
back here, where the main thread fixes them. Tell it which device, Metro and app to use, and that this thread owns
Metro and the code.

Load the skills the work needs. Each is short; apply with judgement.

- `oga-voice`: always. How to talk and decide.
- `oga-engineering`: code, checks, commits, pushes.
- `oga-tests`: writing or fixing tests.
- `oga-ux`: any screen, flow or feature. No shoddy work.
- `oga-devices`: running apps, builds, phones.
- `oga-release`: release branch, PR screenshots, Argus.
- `hand-test`: verifying a release on devices.
- `get-it-live`: all of the above, start to finish, until release-ready.
