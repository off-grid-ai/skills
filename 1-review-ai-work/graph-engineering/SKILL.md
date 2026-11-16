---
name: graph-engineering
description: Plan, make and review an Off Grid AI change across every place it lives, as one change review page (screen-review plus the change map plus Argus Next release). Use when Mac says "graph engineering", "/graph-engineering", "change X", "what does changing X touch", "ripple of X", "change review", or asks to change a feature across desktop, mobile, Pro, the extension or the website.
---

# Graph engineering

A superset of `/screen-review`. The change map is the graph: every feature links to every place that makes it real. One page shows every changed screen, and next to each screen only what needs Mac.

Follow `oga-cpto`, `oga-engineering`, `oga-tests`, `oga-ux`, `oga-devices` and `oga-voice` at each step. This skill adds the graph; it repeats none of their rules.

1. **Map first.** In `desktop/`: `python3 scripts/change-map/scan.py --plan <feature>` (`--list` names them). A change in one place is a normal fix: skip the rest. Otherwise show Mac the ripple in short bullets (places, order, collisions, what makes it harder) and wait for go.
2. **Principles on the graph.** A change adds no second writer (SSOT), no copy of a shared rule (DRY), no file serving many concepts (SRP), no backward arrow (shared → app → Pro). Flag a breach the change would add; existing ones are calls for Mac, never a refactor.
3. **Make it.** In the plan's order. Each step ends one of three ways: its check passes, 2 failed tries, or a round with no progress. The last two stop and ask Mac. "Done" without a passing check never counts.
4. **The change review page.** Reuse the screen-review shots the change already has (`<repo>/docs/review/**/screens.json`); shoot only screens that have none. Write a spec and build:
   `python3 desktop/scripts/change-map/review.py <spec.json> <out-dir>`
   Spec: `{"title", "features": [Argus feature keys], "concepts": [change-map keys], "reviews": [{"dir", "surface", "platform"}]}`. It joins the shots, Argus Next release (`~/.olympus/argus/sources/release.json`: verdict, five lenses, platforms, missing shots), the change map (places, file counts, CI, collisions) and the principle checks (calls on the screen they affect).
   The script only finds suspects (it prints them). Read the code behind each one. Drop the false ones into the spec's `cleared` list. Write each real one into the spec's `calls`: `{id, screen, kind, title, what, risk, rec, recommended, options, files}`, where `what` is what the code does, `risk` what goes wrong for a user, `rec` what you'd do, in plain words. A call is a decision for Mac, so it carries enough context to decide without opening the code.
5. **Publish.** Artifact `publish` with `file_path` `<out>/index.html`, `files` = `<out>/files.json` plus `screens.json` and `change.json`, `capabilities` `{"db": {}, "user": {"scopes": ["profile"]}, "comments": {}}`, `icon` `review` on the first publish. Publish from the session doing the work: the publish arms its watch, and that is what routes Ask (step 6) back to it. Save the URL to `<out>/ARTIFACT_URL`; later runs publish to it so notes and decisions stay. Put the link in each PR body.
6. **Read it back.** Notes are in collection `comments`; Mac's choices on calls in `calls` (`{screen, choice, by, at}`, doc id = call id). Run `/graph-engineering-loop`: it acts on them and learns from them (`learned.json`), so each round asks less.
   **Ask.** Each call has an Ask box, and the composer an Ask Claude button. They post a comment sent to Claude (`comments.sendToClaude`), which wakes the publishing session; the text names the call or screen, so no extra context is needed. Answer with `ArtifactComments` `reply` on that thread, in plain short lines; resolve it once answered or acted on. A question that turns into a decision becomes a call. Check `ArtifactComments` `watch` shows the page with auto-replies armed; if not, re-publish from this session.
7. **Keep the map true.** A file the plan missed: fix its pattern in `CONCEPTS` in `scan.py` in the same change. A mistake seen twice: propose a check to Mac.
