
# Off Grid mobile testing doctrine

There is ONE load-bearing test shape and it is the default for every feature:

> **Mount the real screen → arrive at the state the user would reach by tapping → do the real
> gesture → assert what the user SEES.** Real everything in between. Fakes only at the device
> boundary. Validation only on the UI layer. The expected outcome comes from the product spec —
> not from the code.

Two modes. **WRITE** authors a test to that shape, against working code, and it passes. **FIX**
repairs the seam when a test does fail. Default to WRITE.

**No red/green ritual.** Tests are not written to fail first, and the implementation is NEVER broken,
reverted, or neutralised to demonstrate that a test can fail — not temporarily, not "just to check."
A test earns its place by driving the real stack through a real gesture and asserting what the user
sees; that is what makes it a regression guard, and it is verified by being GREEN on working code.
The old red-first campaign is gone: write the behaviour, watch it pass, move on.

---

## FAKES, NOT MOCKS — the rule that gets broken most (read this every time)

**NEVER mock our own code.** Not the services, not the stores, not the residency manager, not the tool
loop, not a hook. If you are typing `jest.mock('<anything under src/ or pro/>')`, STOP — you have just
left integration territory and are about to write a test that proves nothing. A test that mocks the
thing it asserts stays green even when the implementation is deleted. That is not a weak test, it is a
LIE — worse than no test, because a lie reads as coverage.

**THE TRAP: drawing the boundary at OUR service instead of at the native module.** This is how the rule
above gets broken by someone who has read it. The reasoning goes: "loading a model needs the native
engine, so the engine can't run, so I'll fake `activeModelService`" — and it is wrong at the second
step. The native module is `llama.rn` / `react-native-executorch`, and `jest.setup.ts` ALREADY fakes
both at that boundary. Everything between the user's tap and those modules — the screen, the
navigation, the hook, `activeModelService`, `llmService`, the stores, the residency gate — is ours and
runs REAL. If you find yourself faking one of our services because "the native part can't run", you
have drawn the line one or more layers too high. Find the actual native import and fake THAT.

**Three levels of reaching a precondition, and only the last is acceptable:**
1. `store.setState({ field: value })` — writing the field. Proves only that something can READ a field
   somebody set. Banned.
2. `store.getState().someAction(value)` — the store's own action. Better, and sometimes the honest
   ceiling for a hook whose contract IS the derivation. Still not the user's path.
3. **The real gesture** — render the real screen on the real navigation stack and PRESS the thing, so
   the state is produced by the code that produces it in the app. This is the target. It is almost
   always possible; when you think it is not, re-read the trap above, because the reason is usually a
   boundary drawn too high rather than a genuine wall.

**The three levels, one line each — this settles every "what do I mock" argument:**
- **unit** → mock everything you DON'T own.
- **integration** (our default) → mock everything OUTSIDE our system — the native module, the RAM
  sensor, the network/MCP transport, the filesystem, the clock. Everything we OWN runs REAL.
- **e2e** → mock only timers/triggers.

**Fake vs Stub vs Mock (Meszaros — know the difference cold):**
- **FAKE = a behavior-faithful in-memory implementation of a boundary.** An in-memory FS that really
  stores and reads files; a download-native layer that really sequences progress→complete→error and
  drops its rows on a simulated relaunch; a model-engine fake that really streams the device-shaped
  tokens/tool-call events. Your real code runs on top and **the outcome is EMERGENT, not programmed** —
  that is what lets the test FAIL when the bug is live. Build these ONCE as a shared harness
  (`__tests__/harness/`) and reuse; a per-test fake that drifts makes a green test lie.
- **STUB = the outermost non-runnable leaf returning plain data** and recording what it received (a
  token, a transcript, a RAM number). It never decides, never parses, never branches. The moment it
  makes a decision the code should make, it has become a mock and hidden the bug.
- **MOCK = canned return + `toHaveBeenCalled`.** BANNED as the proof a feature works. It hides the
  exact bug class we keep shipping: the code calls the gate, IGNORES its verdict, loads anyway → the
  mock is green while the device OOMs.

**Prefer the REAL implementation over a fake wherever it can run in-process** — SQLite `:memory:` is a
real database, not a fake; real crypto/WASM, real stores, real domain objects. Fake ONLY the leaf that
is genuinely external / nondeterministic / slow.

**WHY this keeps happening (the trap to catch yourself in):** jsdom can't boot the native module, so the
reflex is "I'll just `jest.mock` the service and assert it was called." That reflex is the bug. The
service is exactly what must run — the wiring/logic/parsing bug lives INSIDE it and in the seams around
it. You are not missing real native; you **substitute the device's OUTPUT at its boundary** (the fake
emits what the device emits) and the whole real stack runs above it. A "backend"-feeling bug (memory
budget, residency, credit-math, download finalize) is DECIDED in JS before any native call — so fake the
native leaf + the RAM sensor and STILL mount the real screen, tap, and assert the rendered symptom.
Faking one of our OWN services is faking too HIGH: it removes the very logic the test exists to catch and
leaves you asserting a mock. If a bug can only be "proven" by mocking out the behavior, that is the
signal to test it at a higher layer (integration) or by hand on the device — never to mock our code.

Litmus, applied by READING the test, not by breaking anything: **if the implementation under test were
deleted, would this test still pass?** If a mock would carry it, it is asserting the mock. Rewrite it to
drive the real thing over a fake boundary and assert the rendered outcome. You answer this by looking at
what the assertion actually depends on — never by editing src to find out.

---

## OBSERVE THE TRANSITION — the one way a green can still lie (read this every time)

A green test is the deliverable. There is exactly one failure mode to guard against, and it needs no red:
**an assertion that is trivially true because the thing was never there.**

"X is absent after the event" passes for free if X never rendered in the first place — the event was too
fast, or the precondition never took. That is a no-op wearing the costume of a guard. The fix is to assert
the transition, both halves of it:

- **Assert the BEFORE state explicitly.** The spinner IS on screen, the card IS absent, the list HAS one
  row — assert it, then drive the gesture, then assert what changed. A test with only the after-assertion
  cannot tell "it cleared" from "it never appeared."
- **Hold the transient state open long enough to see it.** If the spinner clears before the first
  assertion can run, keep the generation in-flight (a fake that does not resolve until you tell it to) so
  the state genuinely renders. Then release, then assert it cleared.
- **Assert what must NOT appear alongside what must.** A render change has two sides; a test that only
  checks the new thing appeared will not notice the old thing stayed.

That is the whole quality bar for a green: it observed a real transition on the rendered surface. No
scenario-flipping, no reverting a line, no `it.failing`.

---

## GROUND IN THE DEVICE EVIDENCE FIRST — logs, findings, commentary (read this every time)

**Before writing or touching ANY test, read the device evidence and match the test to it EXACTLY.** The
device is ground truth; a test that passes while the device misbehaves is wrong by definition — it is
testing a condition the bug does not live on. Sources (read them, don't skim):
- `docs/DEVICE_TEST_FINDINGS.md` (the Bxx findings — the WHY and the exact symptom)
- `docs/DEVICE_SESSION_COMMENTARY.md` (the user's verbatim device narration — the real sequence of taps)
- `docs/DEVICE_TEST_LOG.md` and `docs/wire-captures/` (the raw device logs + captured wire shapes)
- `docs/MANUAL_TEST_CHECKLIST.md` (the exhaustive row list)

Then, before you write the assertion:
- **Match the EXACT conditions the bug occurred on** — engine (litert vs llama/gguf), mode (text vs voice),
  model type, provider (LM Studio vs Ollama vs local), platform. The lesson that cost the most: B13/B33
  happened on a `*.gguf` = **llama** model, and a test written on **litert** passed while the llama path
  stayed broken — coverage on the wrong axis value is worse than none, because it reads as done.
  If a device finding names an engine/provider/model, PIN it in the test. If the behavior can
  differ per engine (error handling, clears, teardown, sampler/settings plumbing, reasoning parse), the
  test MUST run on the engine the finding used — and ideally cross both.
- **Replay captured wire shapes VERBATIM as the boundary fake** — the real SSE deltas, the real token/param
  JSON, the real memory numbers from the logs — never a hand-authored guess that could encode the same
  wrong assumption the code makes. If the user captured an LM Studio/Ollama response, the fake replays THAT.
- **Cross-check against the log + commentary.** If the app misbehaved when tested manually and your test
  passes, the two disagree and one of them is wrong — find out which before claiming coverage. Usually the
  test is pinned to the wrong axis value (the engine, the platform, the mode the bug did not happen on).
  The device wins.

---

## The five non-negotiables (every test obeys all five)

1. **Integration, real stack, no mocks of our own code.** Mock ONLY what is outside our system and
   cannot run in-process: native modules, the RAM sensor, the network/MCP transport, the clock.
   Everything we own — screens, navigation, hooks, stores, services, residency, parsing, the tool
   loop — runs for real. Any `jest.mock('<a path under src/ or pro/>')` is a defect: that module
   must RUN. The moment you mock the thing you are asserting, the test proves nothing (it would pass
   with the implementation deleted).

2. **UI-driven, full navigation stack, real gestures.** The entry point is a MOUNTED screen inside
   the real `NavigationContainer`. A user does an action — `fireEvent.press`, type, drag, long-press,
   swipe, relaunch. Not a service call. If the symptom lives on a screen, the test lives on the screen.

3. **Arrive at the precondition through the UI too — not just the trigger.** This is the most-missed
   rule. Seeding the tested state with `store.setState(...)` / `createConversation(...)` /
   `updateSettings(...)` / `createProject(...)` is the same shortcut as `toHaveBeenCalled` — it
   fabricates a state the user reached by tapping, so the test never proves the tapping works. Get
   there the way the user does: **send messages to make the conversation, tap through the form to make
   the project, drag the slider to change the setting, tap the model in the picker to load it.** The
   ONLY things you may pre-place are genuinely-outside-the-system leaves: a model file on disk (memfs),
   RAM numbers, native-module output, a downloaded row. Never our own state.

4. **Validate ONLY on the UI layer — the terminal artifact the user perceives.** Never assert an
   internal field, a prop, a boolean verdict, or `toHaveBeenCalled`. Assert: rendered text
   (`getByText`), the card that appears/does-not-appear, the model that ends up loaded as shown in the
   panel, the persisted row that survives a relaunch and re-renders, the file on disk that the viewer
   then shows. The bug is never "`makeRoomFor` returned `fits=false`" — it is "I tapped the model and
   it refused." Assert at the refusal, not the verdict. (Genuinely non-visual residue — audio content,
   a literal native SIGKILL — is the narrow exception; see **Honest exceptions**.)

5. **Spec-derived, and it observes a transition.** Derive the EXPECTED outcome from the product spec
   (the OGAM user's point of view), then confirm the code's surfaces exist to observe it — do not read
   the implementation and write down what it currently emits, or the test just restates the code and
   will bless a future bug. Assert the BEFORE state as well as the after, so "it was always on screen"
   cannot fake a pass. The test passes on working code; that is the deliverable.

---

## MODE: WRITE — author one test

**Think in USER BEHAVIOR, not code logic. This is the #1 speed + correctness lever.** To write a test you
replicate what the USER DOES — the sequence of taps/types/swipes/screens — NOT what the code does under the
hood. Ask "how does a user get here and what do they do?" and drive those gestures. Do NOT trace call-graphs
to understand the mechanism before writing — that is FIX-mode work (root-causing a bug), and doing it while
authoring a behavioral test is the trap that burns hours. If you catch yourself grepping "who calls
setInterfaceMode" / "what guards this function" to WRITE a test, stop: you only need "what control does the
user tap to switch to voice mode?" — find that control's testID on the rendered screen and press it. The
code's internals are irrelevant to a test that drives the UI and asserts what the user sees; the test must
survive a refactor of exactly those internals. Reach for code-reading only when (a) you need the real
testID/rendered-string to assert on, or (b) you're in FIX mode or debugging a test that won't behave
(§Debugging).

Do these in order. One test at a time. Do not batch.

### 1. Ground the case (spec first, code second)
- Read the finding/commentary/log that motivates it (for us: `docs/DEVICE_TEST_FINDINGS.md`,
  `docs/MANUAL_TEST_CHECKLIST.md`, the `docs/wire-captures/`). State the **product-correct outcome in
  one sentence** — what SHOULD happen from the user's view ("tapping a generated image opens a viewer
  that closes"; "an unfittable model shows a graceful card, not a crash"; "the transcript reaches the
  model, never raw audio").
- Then read the code to find the REAL surfaces that observe it (screen, testID, rendered string) and
  the REAL device boundary to fake. If you can only describe the happy path, you don't understand the
  feature yet — map it before writing.

### 2. Pick the entry point and the gesture chain
- Mount the highest screen that runs faithfully. Walk the WHOLE journey as gestures:
  precondition-via-UI → the trigger gesture → the assertion. Write the gesture chain out before coding.
- **Test EVERY affordance for the action, not one.** If the action menu opens via long-press AND a
  `•••` button, if a project is picked from a sheet AND a header control, each path is its own test —
  parameterize the gesture helper and run all paths.

### 3. Place the fakes at the device boundary — emitting device-shaped output
- Fakes go at the native line where the device hands data to JS, and each emits exactly what the real
  device spits out — derived from GROUND TRUTH (the real wire capture / `unzip -l` / the log's memory
  numbers), never a hand-authored guess that would encode the same wrong assumption the code makes.
- Build the fake set ONCE as a shared harness (`__tests__/harness/`) and reuse it. A fake is a
  behavior-faithful implementation (an in-memory FS that really stores files; a download-native layer
  that really sequences progress→complete→error and drops its rows on a simulated relaunch); the
  outcome is EMERGENT, not programmed. A stub is the outermost leaf that returns plain data and records
  what it received. A mock (canned return + `toHaveBeenCalled`) is banned as proof.
- Prefer the REAL in-process implementation over a fake wherever it can run: SQLite `:memory:`, real
  crypto/WASM, real stores. Fake only the genuinely external/nondeterministic/slow leaf.

### 4. Force it to a UI assertion — even invariants
- Every row gets a UI-layer assertion. If the invariant has no rendered surface (the resident set,
  which compute backend loaded, a sampler value), add a **test-mode-only label behind a flag that never
  renders in dev/prod** (e.g. a `probe-residents` `<Text testID=…>` gated by a jest-only
  `__TEST_PROBE__`). That is the sanctioned way to make an invariant observable — not dropping to a
  service-level assertion.
- Before adding a surface, check one doesn't already exist (a details row, a status label, a header
  indicator). Add a `testID` to an existing surface rather than a new label when the thing already
  renders.

### 5. Assert the terminal artifact, at the user's altitude
- The assertion subject is the rendered thing. Assert the BEFORE state too (the surface was NOT already
  present, the spinner WAS showing) so a no-op cannot pass as a transition.
- **Write it at the user's altitude, not the mechanism's.** Ask: *would this test still catch the
  problem if the feature broke by a DIFFERENT plausible mechanism than the one I have in mind?* A test
  pinned to one internal path is too tight — it will pass through the next real bug. Assert the outcome
  the user perceives and it covers every path to that outcome.
- Prefer asserting the outcome over exact wording where the wording is not the thing under test, so copy
  edits don't churn the suite.

### 6. Run, confirm, commit
- Run the single file and confirm it is GREEN. That is the bar; nothing is broken or reverted to
  demonstrate anything.
- If it is unexpectedly failing, that is a finding, not a step in a ritual: go to §Debugging, establish
  whether the fault is the harness or the product, and REPORT the product ones rather than quietly
  reshaping the test until it passes.
- `npx jest --findRelatedTests <the src files it touches>` to catch blast-radius regressions now, not
  after.
- `npx tsc --noEmit` on the file. Commit (commits are ungated by design; the gate is pre-push). One
  test per commit, real per-concern message. Next.

---

## MODE: FIX — a test is failing; repair the seam properly

A failing behavioural test is the spec its fix must satisfy. Do NOT touch the test to make it pass
(unless the test itself is wrong — then fix the test with the same rigor and say so). Fix the CODE, at
the seam.

1. **Find the real seam, not the symptom.** Trace the bug to the owning service/abstraction. The fix
   belongs where the responsibility lives — the service that owns the state machine and resources — not
   in the screen, the hook, or a store snapshot.
2. **No hacks, no easy fixes, no patching around the abstraction.** Banned: a second `kind===` /
   `instanceof` / `Platform.OS`-mechanism branch in a caller; a gate/guard/flag added to a View or
   store to compensate for a missing owner; a copy of a rule in a second layer. If the owning
   abstraction doesn't exist, **creating it IS the work** — build the seam and migrate every path onto
   it with no bypass. If a fix would add a second concrete branch in a caller, that's the signal to
   build the seam instead.
3. **SOLID / DRY / separation of concerns.** One responsibility per module (SRP); callers depend on an
   interface, a new implementation drops in with zero caller changes (OCP/DIP); the rule/map/constant
   is defined ONCE and imported everywhere (DRY); pure logic (the decision/math/transition) is isolated
   zero-IO from the I/O adapter; presentation holds no authoritative state or business logic.
4. **Migrations are behavior-neutral.** Routing existing code through a new service preserves its exact
   prior behavior (additive; may fix a missing case), never changes what a caller relied on. Verify each
   migrated path behaves as before, then layer the fix on top.
5. **Test the blast radius before "done".** When you edit a hub (a shared function/renderer/reducer),
   `grep` its callers and run ALL their tests in one invocation — the full regression is part of the
   fix, not a victory lap. A render change has two sides: assert both what must now APPEAR and what must
   still NOT appear.
6. **Green means green, honestly.** The failing test now passes for the right reason; no other test
   regressed; typecheck clean; a production build if native/deps/config/imports changed (tsc+tests
   don't catch build errors). A fake-based test proves the JS/TS integration — a NATIVE outcome (jetsam,
   WorkManager prune, on-kill) still needs a device journey; name which is which, never let the fake
   test claim the device outcome.

---

## The campaign — one at a time, blast-radius-checked (how a whole backlog is worked)

When turning a backlog of findings into a suite:

1. **One test at a time. Never batch.** Write ONE test, run it, confirm it is green, commit it, then the
   next. A batch hides which test is lying and makes a failure impossible to attribute.

2. **After each test, run its blast radius — `jest --findRelatedTests <the src files it touches>`.**
   This runs every existing test impacted by the same source files, so a new test (or a shared-harness
   change) that disturbs something else is caught NOW, not after twenty more. Make it a reflex: write →
   run the file → `--findRelatedTests` → `tsc` → commit → next.

3. **The suite is built on working code and it is green when handed over.** Every row asserts a
   user-observable outcome, so the guard is the assertion itself, not a colour transition it once made.
   `it.failing` and mock-hidden passes are both banned — the first defers the work, the second fakes it.

4. **NO src changes while writing, except `testID`** (and the sanctioned test-mode probe behind a
   jest-only flag). If writing a test surfaces what looks like a product bug, STOP and report it with the
   evidence — the rendered symptom, the trace, the file and line. Do not fix it inside the testing pass
   and do not bend the test around it. Fixes are their own decision and their own commits, in FIX mode,
   after the bug has been confirmed.

5. **What cannot be covered gets logged, not silently skipped** — `docs/GAPS_BACKLOG.md`. A row nobody
   wrote reads as a row that passed.

**Why this is safe — behavioral tests survive a SOLID/DRY refactor.** Because the entry point is a real
gesture and the assertion is the terminal artifact the user perceives, the test is coupled to BEHAVIOR,
not to structure. Rename a service, extract an interface, collapse a duplicated rule to one source, move
logic out of a hook into its owning service — the test does not change, because none of that changes what
the user sees. That is the entire point: the suite is the safety net that lets you refactor fearlessly,
and a green suite after the refactor is what certifies it. The ONE caveat: a test can legitimately break if the
refactor changes the user-observable surface it rides — a rendered string it matches or a `testID` it
drives. That is a coupling point, not a behavioral change; minimize it (assert outcomes over exact wording
where the wording isn't the thing under test), and treat a `testID` rename as the expected, allowed edit.

---

## Coverage doctrine (how to cover the case the author never ran)

- **Bugs live at INTERSECTIONS, not inside one function.** Almost every real defect is a crossing —
  engine × feature, platform × memory-type, modality × persistence, backend × asset-state, lifecycle ×
  residency. Each piece unit-tests green; the feature breaks between them. The unit of thought is the
  intersection.
- **Test key user JOURNEYS end-to-end across subsystems, and attack the failure EDGES hardest** —
  restart, retry, partial failure, network drop mid-download, cancel mid-generation, relaunch mid-turn,
  model evicted mid-answer, provider failure clearing loading state. Drive the boundary to fail
  DYNAMICALLY (different values across a retry) so a static fake can't hide an ordering bug; assert the
  recovered terminal state.
- **Name the axes, then cover JOURNEYS + PAIRWISE — never the cartesian product.** List the dimensions
  that vary in production. Hit every PAIR of axis values at least once. A hidden axis left at its
  default (llama not litert; iOS not Android; typed not voice; fresh not reinstall) means the other
  value has ZERO coverage while the suite looks full — parameterize with `describe.each` over the real
  values.
- **Scenario-as-DATA, one runner.** For a many-variant feature, make a scenario a plain object
  (platform, engine, caps, resident-before, action steps, expected terminal artifacts) and one runner
  that seeds the real stores/services and asserts outcomes. A new intersection is one ROW, not a new
  file — so the matrix actually grows.
- **Ask "which cell did we NOT run?" and log it** to `docs/GAPS_BACKLOG.md`. Silent non-coverage reads
  as "covered", which is the most expensive lie a suite can tell.
- **Isolation/security features:** data-correct is not the same as isolated. Cross the PRINCIPAL
  (tenant/role/session) with a DIFFERENT surface than it owns, and assert what the visitor PERCEIVES
  (its own signin / a 401 / a bounce), not which rows a query returned.

---

## Debugging a test that won't behave — INSTRUMENT, don't guess (the method)

When a test fails and you cannot see why, or passes without ever reaching the code it is meant to exercise,
do NOT theorize in a loop and do NOT paper over it. Debug it the way you'd debug the app — with evidence:

0. **TRACE THE ACTUAL FLOW WITH LOGS FIRST — before theorizing about where the code bails.** When a
   feature doesn't reach the code you expect (a provider/handler never called, a branch not taken), add
   REAL `logger.log('[XXX-SM] …', {…})` traces at every decision point and fork along the live path (the
   send handler, the dispatch, each `if (isRemote)` / readiness gate / early `return`, the service entry),
   run the test, and READ which branch it actually took and the last line it reached. These traces are
   KEPT (they join the app's existing `[GEN-SM]`/`[ROUTE-SM]`/… state-machine logs — permanent, useful on
   device too), not throwaway. To SEE `logger.log` output in jest (it goes through `console.*`, which
   setup silences), just run with the env flag: **`DEBUG_LOGS=1 npx jest <file>`** — `src/utils/logger.ts`
   mirrors every `logger.*` to `process.stderr` (which jest does NOT mock) whenever `DEBUG_LOGS` is set under
   a jest worker. This surfaces ALL existing `[GEN-SM]`/`[ROUTE-SM]`/`[MODEL-SM]`/… source traces with zero
   per-test patching. (This is why source logging is the convention: `logger.log('[X-SM] …')` is permanent,
   on-device-visible via the debug sink, AND test-visible via `DEBUG_LOGS` — you do NOT sprinkle
   `process.stderr.write` through `src/`.) Do NOT guess which gate bails from reading the code — make the
   code tell you which line it stopped at. Only once the trace shows the exact bail point do you fix the
   harness state or the seam.
1. **Instrument at every seam — `process.stderr.write`, never `console.log`.** Jest silences `console.*`
   (setup mocks it), so your logs vanish and you conclude the wrong thing. `process.stderr.write('[TAG] ' +
   JSON.stringify({...}) + '\n')` always shows. Print the actual props/state/return at each boundary: what
   props a child received, what a store held, whether a function was even reached. One real value beats ten
   hypotheses.
2. **Bisect by altitude.** Localize where behavior diverges by mounting at shrinking/growing scope:
   the leaf component alone → its PARENT (which supplies the real handler) → the full screen. "Works in
   isolation, fails wired" tells you the cause is in the wiring/props, not the API. Go UP one level at a
   time from the leaf until it breaks; that level owns the bug.
3. **Distrust your own stub.** If you stubbed a callback (`onX={jest.fn()}`) to "isolate," you only proved
   the wiring to a FAKE handler. The real handler comes from the parent — re-test at the parent with the
   REAL one before concluding anything. A passing isolated stub-test can hide a fully broken feature.
4. **Find the GUARD on the function that should run.** When the function you expect (the one that would make
   the test pass/fail correctly) is never invoked, trace what gates it — an early `return`, a branch
   condition, a permission/capability check, an `await` that rejects. The guard almost always points at a
   boundary you forgot to fake (mic permission, RAM number, a native `supports*()` returning the wrong
   default, an interfaceMode). Read the function top-down and find the first line that can bail.
5. **A failure that never reached the real path is usually a missing boundary fake.** "It didn't fire" ≠
   "the product is broken." Fake the missing device boundary faithfully (grant the permission, seed the
   RAM, emit the device-shaped event) so the REAL code path runs — THEN read what it does.
6. **Separate a harness fault from a product fault, and say which it is.** This is the judgement call the
   whole method exists to serve:
   - **Harness fault** → the seeded state, the fake, the gesture or the arrival path is wrong, and the
     product is fine. Fix the harness. Once it is right, the test passes.
   - **Product fault** → the harness is faithful, the real path ran, and the app produced something the
     user would not accept. STOP. Report it with the evidence (the rendered symptom, the `[*-SM]` trace,
     the file and line) and let the human confirm it before anything in src moves. Do not reshape the test
     until it passes — that buries the finding — and do not fix it inside the testing pass.
   The discriminator is the ground truth: does the behaviour match what the device and the human's manual
   run actually showed? Cite it (`docs/DEVICE_TEST_FINDINGS.md`, the wire log, the manual result) in the
   report so the finding travels with its evidence.
7. **Cross-check the device ground truth.** If the app misbehaved when tested manually and the test agrees,
   that is the product fault above. If they disagree, one of them is wrong and you find out which — usually
   the test is pinned to an axis value the bug does not live on.

The loop: instrument → bisect → find the guard → fake the missing boundary → decide harness-or-product. If
you're theorizing about why for more than a couple of rounds, you skipped step 1.

---

## The tells (reject on sight)

- `jest.mock('src/…')` or `jest.mock('pro/…')` — mocking our own code. FAIL.
- `expect(x).toHaveBeenCalled()` / `expect(obj.field).toBe(…)` / asserting a prop as the proof a
  feature works — shape-test. Move the assertion to the rendered terminal artifact.
- `store.setState(…)` / `createConversation(…)` / `updateSettings(…)` to reach the tested state —
  fabricated precondition. Arrive via gesture.
- A "fixed a display bug" whose test never mounts the component / asserts an object field instead of
  `getByText`.
- A test that only ever exercises one value of an axis the feature spans (the default-config trap).
- A fixture hand-authored to match the implementation instead of derived from a real device listing/log.
- An assertion with no BEFORE state — "X is absent" over something that never rendered. A no-op.
- `it.failing`, a skipped row, or a test reshaped around a bug it uncovered instead of reporting it.
- A green suite over a feature that's broken end-to-end — worse than no test, because it lies.

---

## Device / native things — write the BEST fake test anyway

There is no automated device harness in this project. So you do NOT get to punt a hard row to "device
journey." **Write the best fake-boundary UI test you can for EVERY row, including device-flavored ones**,
and the human tests the genuinely-native residue MANUALLY. Never skip a row because "it's native."

The move for a device-flavored bug is to separate the JS-decided part (almost always the real bug) from
the literal-native part, and TEST THE JS PART at the UI:
- **The bug is almost always JS, not native.** "whisper auto-resident on download", "budget says fits
  while size > physical", "spinner never clears on error", "resend skips the image route", "STT captures
  nothing" — all DECIDED in JS before/around the native call. Fake the native leaf + sensor, drive the
  real gesture, assert the rendered symptom (the card, the resident set via `probe-residents`, the
  cleared spinner, the image vs text bubble). This IS the test; it is not second-best.
- **A truly-native outcome** (real jetsam SIGKILL, real thermal throttle, the actual OS FS timing) — test
  the app's AVOIDANCE/guard at the UI (drive the low-memory or runaway-context scenario, assert the
  graceful card / the context got trimmed / the load was refused), and NAME the one native step the human
  verifies manually. You still ship the fake test for everything up to that step — never nothing.
  Report it as **code / wired / verified**: a passing fake test is "wired", and only the human's device run
  makes it "verified". Never let the green claim the device outcome.
- **Audio content** (what text reached the TTS engine, markdown-stripped) — assert what reached the
  `speak` seam via a boundary stub-record; label it the audio exception. Still a real test.
- **A genuinely gesture-less invariant** (raw sampler randomness) — a pure-function unit test UNDERNEATH
  (never instead of) plus a `probe-*` label if an app-side surface can show it. Don't leave it untested.

Always NAME the split: what the fake test proves (the JS decision / the store state / the rendered
symptom) vs the one native step a human confirms manually. The fake test is the deliverable, not a
consolation prize.

---

## The workflow, in one line

Ground in spec → mount real screen → arrive via gesture → fake only the device boundary (device-shaped,
from ground truth) → do the gesture → assert the BEFORE and the rendered artifact → run the file, green →
`--findRelatedTests` → `tsc` → commit → next. Nothing in src is touched to prove a test; if a test surfaces
a real product bug, report it with evidence and let the human decide. FIX mode repairs the seam, properly,
when something is genuinely failing.
