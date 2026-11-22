# Testing doctrine: prove what the user sees

This is written for apps with screens (mobile, desktop, web). The examples use Jest and React Native
Testing Library because they are common. The same rules hold for any test runner: swap in your
framework's way to render a screen, press a control and read what is on it.

There is ONE load-bearing test shape, and it is the default for every feature:

> **Mount the real screen. Arrive at the state the user would reach by tapping. Do the real
> gesture. Assert what the user SEES.** Everything in between is real. Fakes sit only at the device
> boundary. Checks happen only on the UI layer. The expected outcome comes from the product spec,
> not from the code.

There are two modes. **WRITE** writes a test to that shape, against working code, and it passes.
**FIX** repairs the seam when a test does fail. Default to WRITE.

**No red/green ritual.** Tests are not written to fail first. The implementation is NEVER broken,
reverted or switched off to show that a test can fail. Not for a moment, not "just to check."
A test earns its place by driving the real stack through a real gesture and asserting what the user
sees. That is what makes it a regression guard, and you confirm it by seeing it GREEN on working code.
Write the behaviour, watch it pass, move on.

---

## FAKES, NOT MOCKS: the rule that gets broken most (read this every time)

**NEVER mock the project's own code.** Not the services, not the stores, not the hooks, not the
business logic. If you are typing `jest.mock('<any path inside the project's source folders>')`, STOP.
You have left integration territory and are about to write a test that proves nothing. A test that
mocks the thing it asserts stays green even when the implementation is deleted. That is not a weak
test. It is a LIE, and worse than no test, because a lie reads as coverage.

**THE TRAP: drawing the boundary at your own service instead of at the native module.** This is how
the rule above gets broken by someone who has read it. The reasoning goes: "loading a model needs the
native engine, the engine can't run in tests, so I'll fake `modelService`." It is wrong at the second
step. The native module is the third-party package that talks to the device (an inference engine, a
camera, Bluetooth, the file system). The test setup file often ALREADY fakes it at that boundary.
Everything between the user's tap and that module (the screen, the navigation, the hook, your
services, the stores, any gate or budget check) is the project's own code and runs REAL. If you find
yourself faking one of your own services because "the native part can't run", you have drawn the line
one or more layers too high. Find the actual native import and fake THAT.

**Three ways to reach a precondition. Only the last is acceptable:**
1. `store.setState({ field: value })`: writing the field. Proves only that something can READ a field
   somebody set. Banned.
2. `store.getState().someAction(value)`: the store's own action. Better, and sometimes the honest
   ceiling for a hook whose contract IS the derivation. Still not the user's path.
3. **The real gesture:** render the real screen on the real navigation stack and PRESS the thing, so
   the state comes from the code that makes it in the app. This is the target. It is almost always
   possible. When you think it is not, re-read the trap above. The reason is usually a boundary drawn
   too high, not a real wall.

**The three test levels, one line each. This settles every "what do I mock" argument:**
- **unit:** mock everything you DON'T own.
- **integration** (the default): mock everything OUTSIDE the system: the native module, the memory
  sensor, the network transport, the file system, the clock. Everything the project OWNS runs REAL.
- **end-to-end:** mock only timers and triggers.

**Fake vs stub vs mock (Meszaros). Know the difference cold:**
- **FAKE = a behaviour-faithful in-memory version of a boundary.** An in-memory file system that
  really stores and reads files. A download layer that really steps through progress, complete and
  error, and drops its rows on a simulated relaunch. An engine fake that really streams device-shaped
  events. Your real code runs on top, and **the outcome EMERGES, it is not programmed.** That is what
  lets the test FAIL when the bug is live. Build these ONCE as a shared harness (for example
  `__tests__/harness/`) and reuse them. A per-test fake that drifts makes a green test lie.
- **STUB = the outermost leaf that cannot run, returning plain data** and recording what it received
  (a token, a transcript, a memory number). It never decides, never parses, never branches. The moment
  it makes a decision the code should make, it has become a mock and hidden the bug.
- **MOCK = canned return plus `toHaveBeenCalled`.** BANNED as the proof a feature works. It hides a
  common bug class: the code calls the gate, IGNORES its verdict and goes ahead anyway. The mock is
  green while the device crashes.

**Prefer the REAL implementation over a fake wherever it can run in-process.** SQLite `:memory:` is a
real database, not a fake. The same goes for real crypto or WASM, real stores and real domain objects.
Fake ONLY the leaf that is truly external, random or slow.

**WHY this keeps happening (the trap to catch yourself in):** the test environment can't boot the
native module, so the reflex is "I'll mock the service and assert it was called." That reflex is the
bug. The service is exactly what must run. The wiring, logic or parsing bug lives INSIDE it and in the
seams around it. You are not missing the real native layer. You **substitute the device's OUTPUT at its
boundary** (the fake emits what the device emits) and the whole real stack runs above it. A bug that
feels like a "backend" bug (memory budget, credit math, a download that never finishes) is usually
DECIDED in your own code before any native call. So fake the native leaf and the sensor, and STILL
mount the real screen, tap, and assert the rendered symptom. Faking one of your OWN services is faking
too HIGH. It removes the very logic the test exists to catch and leaves you asserting a mock. If a bug
can only be "proven" by mocking out the behaviour, test it at a higher layer or by hand on the device.
Never mock your own code.

Litmus, applied by READING the test, not by breaking anything: **if the implementation under test were
deleted, would this test still pass?** If a mock would carry it, it is asserting the mock. Rewrite it
to drive the real thing over a fake boundary and assert the rendered outcome. Answer this by looking at
what the assertion actually depends on, never by editing the source to find out.

---

## OBSERVE THE TRANSITION: the one way a green can still lie (read this every time)

A green test is the deliverable. There is one failure mode to guard against, and it needs no red:
**an assertion that is true for free because the thing was never there.**

"X is gone after the event" passes for free if X never rendered in the first place. Maybe the event
was too fast, or the precondition never took. That is a no-op dressed as a guard. Fix it by asserting
both halves of the transition:

- **Assert the BEFORE state.** The spinner IS on screen, the card IS absent, the list HAS one row.
  Assert it, then drive the gesture, then assert what changed. A test with only the after-assertion
  cannot tell "it cleared" from "it never appeared."
- **Hold the short-lived state open long enough to see it.** If the spinner clears before the first
  assertion can run, keep the work in flight (a fake that does not resolve until you tell it to) so the
  state really renders. Then release it, then assert it cleared.
- **Assert what must NOT appear as well as what must.** A render change has two sides. A test that
  only checks the new thing appeared will not notice the old thing stayed.

That is the whole quality bar for a green: it observed a real transition on the rendered surface. No
scenario flipping, no reverting a line, no `it.failing`.

---

## GROUND IN THE DEVICE EVIDENCE FIRST: logs, findings, notes (read this every time)

**Before you write or touch ANY test, read the device evidence and match the test to it EXACTLY.** The
device is ground truth. A test that passes while the device misbehaves is wrong by definition: it tests
a condition the bug does not live on. Find the project's sources and read them, don't skim. Typical
ones:
- a device findings doc (the WHY and the exact symptom of each bug found on a device)
- the user's own notes from testing by hand (the real sequence of taps)
- raw device logs and captured network or wire responses
- the manual test checklist

If the project has none of these, ask the user what they saw on the device before you write the test.

Then, before you write the assertion:
- **Match the EXACT conditions the bug happened on:** engine or backend, mode (for example text vs
  voice), data type, provider, platform. The costly lesson: a bug happens on engine A, a test is
  written on engine B, the test passes and engine A stays broken. Coverage on the wrong value of an
  axis is worse than none, because it reads as done. If a finding names an engine, provider, model or
  platform, PIN it in the test. If behaviour can differ per value (error handling, cleanup, settings
  plumbing, parsing), the test MUST run on the value the finding used, and ideally on both.
- **Replay captured wire shapes WORD FOR WORD as the boundary fake:** the real streamed chunks, the
  real JSON, the real memory numbers from the logs. Never a hand-written guess that could encode the
  same wrong assumption the code makes.
- **Cross-check against the log and the notes.** If the app misbehaved by hand and your test passes,
  the two disagree and one of them is wrong. Find out which before you claim coverage. Usually the test
  is pinned to the wrong value of an axis. The device wins.

---

## The five non-negotiables (every test obeys all five)

1. **Integration, real stack, no mocks of your own code.** Mock ONLY what is outside the system and
   cannot run in-process: native modules, sensors, the network transport, the clock. Everything the
   project owns (screens, navigation, hooks, stores, services, parsing, business rules) runs for real.
   Any mock of a path inside the project's source is a defect: that module must RUN.

2. **UI-driven, full navigation stack, real gestures.** The entry point is a MOUNTED screen inside the
   real navigation container or router. The user does something: press, type, drag, long-press,
   swipe, relaunch. Not a service call. If the symptom lives on a screen, the test lives on the screen.

3. **Reach the precondition through the UI too, not just the trigger.** This is the most-missed rule.
   Seeding the tested state with `store.setState(...)` or a direct `createThing(...)` call is the same
   shortcut as `toHaveBeenCalled`. It makes up a state the user reached by tapping, so the test never
   proves the tapping works. Get there the way the user does: send messages to make the conversation,
   tap through the form to make the project, drag the slider to change the setting, pick the item in
   the picker to load it. The ONLY things you may pre-place are leaves truly outside the system: a file
   on disk (in-memory file system), sensor numbers, native-module output, a row the server returned.
   Never the project's own state.

4. **Check ONLY on the UI layer, the final thing the user perceives.** Never assert an internal field,
   a prop, a yes/no verdict or `toHaveBeenCalled`. Assert rendered text, the card that does or does not
   appear, the item shown as loaded, the saved row that survives a relaunch and renders again, the file
   that the viewer then shows. The bug is never "`canFit` returned false". It is "I tapped it and it
   refused." Assert at the refusal, not the verdict. (Truly non-visual results, such as audio content
   or a real native crash, are the narrow exception. See **Device and native things**.)

5. **Derived from the spec, and it observes a transition.** Take the EXPECTED outcome from the product
   spec (the user's point of view), then confirm the code has surfaces to observe it. Do not read the
   implementation and write down what it emits today, or the test only restates the code and will bless
   a future bug. Assert the BEFORE state as well as the after, so "it was always on screen" cannot fake
   a pass. The test passes on working code. That is the deliverable.

---

## MODE: WRITE, one test

**Think in USER BEHAVIOUR, not code logic. This is the biggest lever for speed and correctness.** To
write a test, copy what the USER DOES (the taps, typing, swipes and screens), NOT what the code does
under the hood. Ask "how does a user get here and what do they do?" and drive those gestures. Do NOT
trace call graphs to understand the mechanism before writing. That is FIX-mode work, and doing it while
writing a behaviour test is the trap that burns hours. If you catch yourself grepping "who calls
setMode" to WRITE a test, stop. You only need "what control does the user tap to switch mode?" Find
that control's test id on the rendered screen and press it. The internals do not matter to a test that
drives the UI and asserts what the user sees, and the test must survive a refactor of exactly those
internals. Read code only when (a) you need the real test id or rendered string to assert on, or (b)
you are in FIX mode or debugging a test that won't behave (see Debugging).

Do these in order. One test at a time. Do not batch.

### 1. Ground the case (spec first, code second)
- Read the finding, notes or log behind it. State the **correct outcome in one sentence** from the
  user's view ("tapping a picture opens a viewer that closes"; "an item too large for the device shows
  a clear message, not a crash").
- Then read the code to find the REAL surfaces that show it (screen, test id, rendered string) and
  the REAL device boundary to fake. If you can only describe the happy path, you don't understand the
  feature yet. Map it before writing.

### 2. Pick the entry point and the gesture chain
- Mount the highest screen that runs faithfully. Walk the WHOLE journey as gestures: precondition
  through the UI, then the trigger gesture, then the assertion. Write the gesture chain out before
  coding.
- **Test EVERY way to do the action, not one.** If a menu opens by long-press AND by a `•••` button,
  or an item is picked from a sheet AND from a header control, each path is its own test.
  Parameterize the gesture helper and run all paths.

### 3. Put the fakes at the device boundary, emitting device-shaped output
- Fakes go at the native line where the device hands data to your code, and each emits exactly what
  the real device sends. Take it from GROUND TRUTH (a real wire capture, a real file listing, the log's
  numbers), never from a hand-written guess.
- Build the fake set ONCE as a shared harness and reuse it. The outcome emerges, it is not programmed.
  A stub is the outermost leaf that returns plain data and records what it got. A mock is banned as
  proof.
- Prefer the REAL in-process implementation over a fake wherever it can run.

### 4. Force it to a UI assertion, even for invariants
- Every case gets a UI-layer assertion. If the invariant has no rendered surface (which backend
  loaded, an internal setting value), add a **test-only label behind a flag that never renders in dev
  or production** (for example a `<Text testID="probe-…">` shown only when a test-only global is set).
  That is the approved way to make an invariant visible. Do not drop to a service-level assertion.
- Before adding a surface, check one doesn't already exist (a details row, a status label, a header
  indicator). Add a test id to an existing surface rather than a new label when the thing already
  renders.

### 5. Assert the final artifact, at the user's height
- The subject of the assertion is the rendered thing. Assert the BEFORE state too (the surface was NOT
  already there, the spinner WAS showing) so a no-op cannot pass as a transition.
- **Write it at the user's height, not the mechanism's.** Ask: *would this test still catch the problem
  if the feature broke in a DIFFERENT plausible way than the one I have in mind?* A test pinned to one
  internal path is too tight. It will pass through the next real bug. Assert the outcome the user
  perceives and it covers every path to that outcome.
- Prefer asserting the outcome over exact wording where the wording is not under test, so copy edits
  don't churn the suite.

### 6. Run, confirm, commit
- Run the single file and confirm it is GREEN. That is the bar. Nothing is broken or reverted to show
  anything.
- If it fails when you did not expect it to, that is a finding, not a step in a ritual. Go to
  Debugging, decide whether the fault is the harness or the product, and REPORT product faults rather
  than quietly reshaping the test until it passes.
- Run the related tests for the source files it touches (in Jest: `npx jest --findRelatedTests
  <files>`) to catch knock-on breakage now, not later.
- Run the type check. Commit. One test per commit with a real message. Next.

---

## MODE: FIX, a test is failing and the seam needs a proper repair

A failing behaviour test is the spec its fix must meet. Do NOT touch the test to make it pass (unless
the test itself is wrong; then fix the test with the same care and say so). Fix the CODE, at the seam.

1. **Find the real seam, not the symptom.** Trace the bug to the service or abstraction that owns it.
   The fix belongs where the responsibility lives (the service that owns the state machine and
   resources), not in the screen, the hook or a store snapshot.
2. **No hacks, no easy fixes, no patching around the abstraction.** Banned: a second type check or
   platform branch in a caller; a gate, guard or flag added to a view or store to make up for a missing
   owner; a copy of a rule in a second layer. If the owning abstraction doesn't exist, **creating it IS
   the work**. Build the seam and move every path onto it with no bypass. If a fix would add a second
   concrete branch in a caller, that is the signal to build the seam instead.
3. **SOLID, DRY, separation of concerns.** One job per module. Callers depend on an interface, so a new
   implementation drops in with no caller changes. A rule, map or constant is defined ONCE and imported
   everywhere. Pure logic (the decision, math or transition) is kept apart from I/O. Presentation holds
   no source-of-truth state or business logic.
4. **Migrations keep behaviour the same.** Routing existing code through a new service keeps its exact
   prior behaviour (additive; it may fix a missing case). It never changes what a caller relied on.
   Check each moved path behaves as before, then put the fix on top.
5. **Test the blast radius before "done".** When you edit a hub (a shared function, renderer or
   reducer), grep its callers and run ALL their tests in one go. The full regression run is part of
   the fix. A render change has two sides: assert what must now APPEAR and what must still NOT appear.
6. **Green means green, honestly.** The failing test now passes for the right reason, no other test
   broke, the type check is clean, and a production build passes if native code, dependencies, config
   or imports changed (types and tests don't catch build errors). A fake-based test proves your own
   code's integration. A NATIVE outcome (the OS killing the app, a background job pruned, behaviour on
   kill) still needs a device check. Say which is which. Never let the fake test claim the device
   outcome.

---

## The campaign: one at a time, blast radius checked (how to work a whole backlog)

When you turn a backlog of findings into a suite:

1. **One test at a time. Never batch.** Write ONE test, run it, see it green, commit it, then the next.
   A batch hides which test is lying and makes a failure impossible to pin on one test.
2. **After each test, run its blast radius:** the related tests for the source files it touches. A new
   test or a shared harness change that disturbs something else is caught NOW, not after twenty more.
   Make it a habit: write, run the file, run related tests, type check, commit, next.
3. **The suite is built on working code and is green when handed over.** Every case asserts something
   the user can see, so the guard is the assertion itself, not a colour change it once made.
   `it.failing` and mock-hidden passes are both banned. The first puts off the work, the second fakes
   it.
4. **NO source changes while writing tests, except test ids** (and the approved test-only probe behind
   a test-only flag). If writing a test turns up what looks like a product bug, STOP and report it with
   the evidence: the rendered symptom, the trace, the file and line. Do not fix it inside the testing
   pass and do not bend the test around it. Fixes are their own decision and their own commits, in FIX
   mode, after the bug is confirmed.
5. **What cannot be covered gets logged, not skipped in silence,** in the project's gaps or backlog
   file (create one, for example `docs/test-gaps.md`, if there is none). A case nobody wrote reads as a
   case that passed.

**Why this is safe: behaviour tests survive a refactor.** The entry point is a real gesture and the
assertion is what the user perceives, so the test is tied to BEHAVIOUR, not structure. Rename a
service, pull out an interface, merge a duplicated rule into one place, move logic out of a hook into
the service that owns it: the test does not change, because none of that changes what the user sees.
That is the point. The suite is the safety net that lets you refactor without fear, and a green suite
after the refactor proves it. The ONE caveat: a test can rightly break if the refactor changes the
surface it rides on, such as a rendered string it matches or a test id it presses. That is a coupling
point, not a behaviour change. Keep it small (assert outcomes over exact wording), and treat a test id
rename as an expected, allowed edit.

---

## Coverage doctrine (how to cover the case the author never ran)

- **Bugs live where things cross, not inside one function.** Almost every real defect is a crossing:
  engine x feature, platform x memory type, input type x saving, backend x file state, app lifecycle x
  resource limits. Each piece passes its unit tests. The feature breaks between them. Think in
  crossings.
- **Test key user JOURNEYS from end to end across parts of the system, and hit the failure EDGES
  hardest:** restart, retry, partial failure, network drop mid-download, cancel mid-task, relaunch
  mid-task, a resource taken away mid-answer, a provider failure that must clear the loading state.
  Make the boundary fail DIFFERENTLY across a retry so a static fake can't hide an ordering bug. Assert
  the final recovered state.
- **Name the axes, then cover JOURNEYS plus PAIRS, never every combination.** List what varies in
  production. Hit every PAIR of axis values at least once. An axis left at its default (one engine,
  one platform, typed not voice, fresh install not upgrade) means the other value has ZERO coverage
  while the suite looks full. Parameterize over the real values (in Jest: `describe.each`).
- **Scenario as DATA, one runner.** For a feature with many variants, make a scenario a plain object
  (platform, engine, capabilities, starting state, action steps, expected final artifacts) and write one
  runner that drives the real app and asserts outcomes. A new crossing is one ROW, not a new file, so
  the matrix actually grows.
- **Ask "which cell did we NOT run?" and log it** in the gaps file. Silent non-coverage reads as
  "covered", which is the most expensive lie a suite can tell.
- **Isolation and security features:** correct data is not the same as isolated. Cross the
  PRINCIPAL (tenant, role or session) with a DIFFERENT surface than it owns, and assert what the visitor
  PERCEIVES (its own sign-in, a 401, a redirect), not which rows a query returned.

---

## Debugging a test that won't behave: INSTRUMENT, don't guess

When a test fails and you cannot see why, or passes without ever reaching the code it should exercise,
do NOT theorize in a loop and do NOT paper over it. Debug it the way you'd debug the app, with
evidence:

0. **TRACE THE REAL FLOW WITH LOGS FIRST, before guessing where the code bails.** When a feature does
   not reach the code you expect (a handler never called, a branch not taken), add real log lines at
   every decision point along the live path (the send handler, the dispatch, each readiness check or
   early `return`, the service entry). Use a short tag per flow, such as `[SEND]`. Run the test and
   READ which branch it took and the last line it reached. Keep these logs if the project has a logger
   with levels: they help on devices too. Make sure the test runner shows them. Many setups silence
   `console.*` in tests, so add a switch (for example an env var like `DEBUG_LOGS=1`) that makes the
   project's logger also write to stderr under the test runner. Only once the trace shows the exact
   bail point do you fix the harness state or the seam.
1. **Log at every seam, to stderr if console is silenced.** In Jest, `process.stderr.write('[TAG] ' +
   JSON.stringify({...}) + '\n')` always shows. Print the actual props, state and return values at each
   boundary: what props a child got, what a store held, whether a function was reached at all. One
   real value beats ten guesses.
2. **Bisect by height.** Find where behaviour splits by mounting at a smaller or larger scope: the leaf
   component alone, then its PARENT (which supplies the real handler), then the full screen. "Works
   alone, fails wired" means the cause is in the wiring or props. Go UP one level at a time from the
   leaf until it breaks. That level owns the bug.
3. **Distrust your own stub.** If you stubbed a callback to "isolate" a component, you only proved the
   wiring to a FAKE handler. The real handler comes from the parent. Re-test at the parent with the
   REAL one before you conclude anything. A passing isolated stub test can hide a fully broken feature.
4. **Find the GUARD on the function that should run.** When the function you expect is never called,
   trace what gates it: an early `return`, a branch condition, a permission or capability check, an
   `await` that rejects. The guard almost always points at a boundary you forgot to fake (a permission,
   a memory number, a native `supports…()` returning the wrong default, a mode). Read the function from
   the top and find the first line that can bail.
5. **A failure that never reached the real path is usually a missing boundary fake.** "It didn't fire"
   is not "the product is broken." Fake the missing device boundary faithfully (grant the permission,
   seed the memory number, emit the device-shaped event) so the REAL code path runs. THEN read what it
   does.
6. **Tell a harness fault from a product fault, and say which it is.** This is the call the whole
   method exists for:
   - **Harness fault:** the seeded state, the fake, the gesture or the path to the state is wrong, and
     the product is fine. Fix the harness. Once it is right, the test passes.
   - **Product fault:** the harness is faithful, the real path ran, and the app did something the user
     would not accept. STOP. Report it with the evidence (the rendered symptom, the trace, the file and
     line) and let the user confirm before anything in the source moves. Do not reshape the test until
     it passes, which buries the finding, and do not fix it inside the testing pass.
   The deciding question is ground truth: does the behaviour match what the device and the user's own
   run showed? Cite it in the report so the finding travels with its evidence.
7. **Cross-check the device ground truth.** If the app misbehaved by hand and the test agrees, that is
   the product fault above. If they disagree, one is wrong. Find out which. Usually the test is pinned
   to an axis value the bug does not live on.

The loop: log, bisect, find the guard, fake the missing boundary, decide harness or product. If you
have been guessing why for more than a couple of rounds, you skipped step 0.

---

## The tells (reject on sight)

- A mock of a path inside the project's own source. FAIL.
- `expect(x).toHaveBeenCalled()`, `expect(obj.field).toBe(…)`, or a prop assertion used as the proof a
  feature works. That is a shape test. Move the assertion to the rendered final artifact.
- `store.setState(…)` or a direct create or update call to reach the tested state. That is a made-up
  precondition. Arrive by gesture.
- A "fixed a display bug" whose test never mounts the component, or asserts an object field instead of
  rendered text.
- A test that only ever runs one value of an axis the feature spans (the default-config trap).
- A fixture written by hand to match the implementation instead of taken from a real device listing or
  log.
- An assertion with no BEFORE state: "X is absent" over something that never rendered. A no-op.
- `it.failing`, a skipped case, or a test reshaped around a bug it found instead of reporting it.
- A green suite over a feature that is broken from end to end. Worse than no test, because it lies.

---

## Device and native things: write the BEST fake test anyway

Many projects have no automated device harness. Even so, you do NOT get to punt a hard case to "check
on device." **Write the best fake-boundary UI test you can for EVERY case, including device-flavoured
ones,** and a person tests the truly native remainder by hand. Never skip a case because "it's native."

For a device-flavoured bug, split the part your code decides (almost always the real bug) from the
truly native part, and TEST YOUR CODE'S PART at the UI:
- **The bug is almost always in your code, not native.** "Budget says it fits while the size is larger
  than memory", "spinner never clears on error", "resend skips the image path", "recording captures
  nothing": all DECIDED in your code before or around the native call. Fake the native leaf and the
  sensor, drive the real gesture, assert the rendered symptom (the card, a test-only probe, the cleared
  spinner, the right kind of bubble). This IS the test. It is not second best.
- **A truly native outcome** (the OS killing the app for memory, thermal throttling, real file system
  timing): test the app's AVOIDANCE or guard at the UI (drive the low-memory or runaway scenario,
  assert the clear message, the trimmed context or the refused load), and NAME the one native step a
  person checks by hand. You still ship the fake test for everything up to that step. Report it as
  **code / wired / verified**: a passing fake test is "wired", and only a person's device run makes it
  "verified". Never let the green claim the device outcome.
- **Audio content** (what text reached the speech engine, with markdown stripped): assert what reached
  the speak seam through a boundary stub that records it. Label it the audio exception. It is still a
  real test.
- **An invariant with no gesture** (raw randomness in a sampler): a pure-function unit test UNDERNEATH
  (never instead of) plus a `probe-*` label if an app surface can show it. Don't leave it untested.

Always NAME the split: what the fake test proves (your code's decision, the state, the rendered
symptom) and the one native step a person confirms by hand. The fake test is the deliverable, not a
consolation prize.

---

## The workflow, in one line

Ground in the spec, mount the real screen, arrive by gesture, fake only the device boundary (device
shaped, from ground truth), do the gesture, assert the BEFORE state and the rendered artifact, run the
file green, run related tests, type check, commit, next. Nothing in the source is touched to prove a
test. If a test finds a real product bug, report it with evidence and let the user decide. FIX mode
repairs the seam, properly, when something truly fails.
