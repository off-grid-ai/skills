# Hygiene lessons ledger

Provenance for every rule/tell folded into `hygiene/SKILL.md` from a PR review, via
`/hygiene-learn`. One line per accepted lesson. This is the audit trail — it lets anyone see
why a rule exists and revert a bad addition. Lesson *content* lives in SKILL.md, not here.

Format: `YYYY-MM-DD · <repo> PR #<n> · §<X> · <the one-line lesson>`

---

<!-- newest first -->

## §D — isolation features: data-correct ≠ secure; attack the cross-principal × other-surface cell
- **2026-07-10 · console (public read-only demo, adversarial /hygiene)** — I reported the two-tenant
  demo "verified live" off the same-principal-same-surface happy path (bank viewer on the bank host →
  sees bank data, write 403). The org-binding was data-correct (never returned another tenant's rows),
  but a shared session cookie (`AUTH_COOKIE_DOMAIN=.getoffgridai.co`) let the bank login silently work
  on the INSURER host showing its own data — which the founder immediately read as "insecure / same
  system." The defect lived at the cross-principal × other-surface intersection the happy path never
  touched. Fix was host-scoped cookies (each subdomain its own session island → foreign session → that
  tenant's own signin, indistinguishable from logged-out) + a host-pinned post-login redirect. Lesson
  folded into §D: for isolation/RBAC/privacy features the axis is the PRINCIPAL and every test must
  cross it with a surface the principal does NOT own; assert the PERCEIVED separation (own-signin/401/
  bounce), not "which rows returned"; "no data leak" is necessary but not sufficient. Tell: a "verified"
  claim on an isolation feature backed only by same-principal-same-surface, broken by carrying A's
  session to B. (Adversarial audit ledger + G-SEC-VIEWER-1 connector-cred-redaction gap logged in
  console `docs/GAPS_BACKLOG.md`.)

## §D — assert at the USER'S ALTITUDE (root-cause altitude ≠ assertion altitude)
- **2026-07-10 · mobile PR #510 · §D** — user pushed "test everything at the UI layer, in a certain
  sense." Correct qualified form folded into §D: enter from the highest faithfully-runnable point (UI
  symptom → MOUNT the screen in RNTL — the only thing that catches presentation-layer local-copy
  drift), and ALWAYS assert the user-observable outcome, NEVER an internal field (`fits`/`audioUris`).
  When the UI can't be the entry (jsdom/native, pure math) drop to the service THE UI CALLS
  (activeModelService.loadTextModel, not makeRoomFor) and still assert the user outcome (throws / model
  not resident); a test asserting the raw verdict is the UNIT layer underneath, NOT load-bearing. Named
  the trap: "recon traced root cause at the service seam, so I'll assert there" — root-cause altitude ≠
  assertion altitude. Also: don't call these "behavioral" (Fowler behavior-verification = mockist);
  "non-flaky" is a consequence of sociable+subcutaneous+state-verifying+fake-only-at-boundary, not a
  category; prefer the REAL in-process impl (SQLite :memory:) over a fake where it can run; stay NARROW
  (a broad integration test over a socket is where flake breeds). Testing-Trophy vocabulary adopted.

## §D — the REQUIRED test shape: user-flow integration over FAKES, not mocks
- **2026-07-10 · mobile PR #510 · §D (+ AUDIT #5)** — user asked whether the fakeFs/fakeUnzip/
  fakeDownloadNative harness is "real user-flow integration testing" and to codify it as the ONLY test
  shape. Yes — with the precise distinction that the boundary is replaced by a FAKE (behavior-faithful
  in-memory implementation whose outcome is EMERGENT), not a MOCK (canned return + toHaveBeenCalled,
  which hides the call-the-gate-ignore-the-verdict bug class). Added a "REQUIRED test shape" subsection
  to §D: default to the real flow through real stores/services over shared single fakes, asserting the
  terminal artifact; STUB only the outermost non-runnable leaf (data source that records inputs); MOCK
  banned as proof; `jest.mock` of a module we own = FAIL; pure-logic unit tests allowed only underneath;
  fakes prove JS/TS integration, DEVICE/Provit proves native (jetsam/WorkManager-prune/on-kill) — name
  which is which. Wired an AUDIT #5 test-shape gate. Worked harness plan: `mobile/docs/ADVERSARIAL_TEST_PLAN.md`.

## §D — adversarial KEY-USER-FLOW journey testing (the seams between subsystems)
- **2026-07-10 · mobile PR #510 · §D** — user directive: adversarial testing must include KEY USER
  FLOW / journey-level integration tests, not just variant-crossing within a domain. Added a §D
  bullet: the highest-value test is the real multi-step journey that crosses several subsystems
  (download→residency→engine→chat→render; voice→transcript→tool→thinking→TTS→resend; project pick→
  send→setting-change→value-actually-used→relaunch), driven whole through the real seams with the
  terminal artifact asserted at EACH step — the "each piece passed but the feature broke between
  them" layer domain/unit tests can't see. Method: (1) first ENUMERATE the flow map (can't list the
  flows → don't understand the app), grouped by cluster (lifecycle+memory / multimodal / projects+
  settings-in-flow / interrupt-recovery); (2) attack the FAILURE EDGES hardest (restart, retry,
  partial failure, network drop, cancel, relaunch, eviction mid-flow, offline/queued), driving the
  boundary to fail DYNAMICALLY and asserting the recovered terminal state. Executed as a dedicated
  journey-map agent + 4 per-cluster journey agents under `__tests__/integration/journeys/`.

## §D — QA-adversary bug-hunt mindset (prove the developer wrong)
- **2026-07-10 · mobile PR #510 · §D** — user directive: the tester's role is QA on a BUG HUNT whose
  goal is to PROVE THE DEVELOPER WRONG, not to write passing tests. Reframed the §D adversarial
  subsection heading + intro: go DEEP per feature first (enumerate EVERY real user flow, ask "what
  can happen / where can this break"), hunt-don't-confirm (feature guilty until proven correct;
  finding zero bugs means you didn't push hard enough), and the PRIMARY deliverable of a test pass is
  the list of ways the feature breaks — each then fixed or guarded — not a green count. Applies to
  delegated test/QA agents too: brief them to hunt, not to confirm.

## §D — adversarial matrix / intersection testing (break-the-feature mindset)
- **2026-07-10 · mobile PR #510 · §D (+ PLAN #4, AUDIT #5)** — every #510 bug lived at an
  INTERSECTION of variants (litert × enhancement, qnn × android × fresh-download, dirty-model ×
  android × fit-check, voice-note × persisted × resend), and the suite missed them because tests
  sat at a hidden axis's DEFAULT (only llama, only iOS, only typed input) so the other value had
  zero coverage while the suite looked full — and one fixture hand-encoded the bug (asserted a
  `clip_v2.mnn.weight` the qnn model never ships). Added the **adversarial mindset** subsection to
  §D: approach each feature as an attacker ("how do I break this?"), test at intersections not
  inside functions, name the axes and cover JOURNEYS + PAIRWISE (never the cartesian product),
  never leave a hidden axis at its default (`describe.each` the real values), derive fixtures from
  GROUND TRUTH not guesses, use scenario-as-data so a new intersection is one row, and log untested
  crossings to GAPS_BACKLOG. Wired matching gates into PLAN #4 (adversarial-first) and AUDIT #5
  (intersection-coverage gate). Worked example committed at `mobile/docs/TEST_MATRIX.md`.

## SETUP mode — quality-as-code bootstrap added
- **2026-07-10 · console (provenance) + Wednesday templates** — added a third mode to the
  hygiene skill: **SETUP**, which bootstraps the entire quality spine into a fresh repo so
  gates are code, not memory. New `setup/` subtree: `bootstrap.sh` (idempotent, non-destructive
  stack-detecting installer), `setup/configs/{web,react-native}/` (real, generalized templates:
  `.prettierrc`, `.eslintrc.json`, `.dependency-cruiser.js`, `.jscpd.json`, `.c8rc.json`,
  `knip.json`, `tsconfig.hygiene.json`, `githooks/pre-push`, `github-workflows-ci.yml`), and
  `setup/README.md`. Installs prettier + typed eslint (Wednesday plugin set + the AI-dead-code
  rules incl. `@typescript-eslint/no-unnecessary-condition`), dependency-cruiser (no-circular +
  boundaries), jscpd (DRY), knip (dead code), c8 (≥85%), merges the tsconfig flags, wires the
  pre-push hook, and splits fast pre-push vs full CI. **Provenance:** the console's proven
  gate-green artifacts (`.dependency-cruiser.js`, `.jscpd.json`, `.c8rc.json`,
  `.githooks/pre-push`, `.github/workflows/ci.yml`, `package.json` scripts) generalized behind
  `# EDIT:` placeholders; the two Wednesday house baselines `wednesday-solutions/react-template`
  (web: 120-col prettier + sonarjs/security/github) and `wednesday-solutions/react-native-template`
  (RN: 80-col prettier + airbnb/fp/react-native). SKILL.md gained a `## MODE: SETUP` header +
  a frontmatter description line; detail lives in `setup/`.

## §A — data layer powers presentation; no local copies of authoritative data
- **2026-07-09 · OGAD (off-grid-ai-desktop)** — image-gen composer kept local `useState` copies of
  authoritative state: `imgModel` (seeded once from `imageGenStatus().active`, diverged from the
  Active-models panel which writes `setActiveModalModel`), and `imgSteps` (a model-change effect
  reset it to `standardModelDefaults`, overriding the user's value — displayed 10, generated 28).
  Also reasoning/thinking held only in component state, never persisted → gone on conversation
  remap. Lesson: bind controls to the one owning source (read reactively, write through);
  per-render defaults are pure functions of that source, not stored duplicates; persist through
  the data layer. Folded as the "UI never keeps its own COPY of authoritative data" bullet + tell.

## §D — a UI/render bug needs a RENDER test (assert on-screen, not object shape)
- **2026-07-09 · mobile PR #506 (OD14, TestFlight)** — the OD14 "keep pre-tool-call thinking"
  fix set `message.reasoningContent`; the unit test asserted that OBJECT field was present and
  went green — but the tool-call renderer (`ToolCallWithThinking`) derived its thinking block from
  `parseThinkingContent(message.content)` and ignored `reasoningContent`, so the block stayed blank.
  A green object-shape test over a still-broken UI; the user found it on TestFlight. Also: the
  hand-enumerated test factory silently dropped `reasoningContent`, hiding it further. Folded as the
  "A UI/render bug needs a RENDER test" §D bullet + tell + factory-trap corollary.

## §H — gate an unverified fix, don't just label it
- **2026-07-09 · mobile PR #506 (OD14, TestFlight)** — OD14 was correctly marked "unverified
  on-device", then shipped in beta.2 anyway; the user became the first to exercise it and it was
  broken. iOS TestFlight is distribution-signed so its debug log couldn't be pulled, but the Android
  adb dev build could have reproduced it pre-ship. Folded into §H honesty bar: verify on the
  instrumentable path before a beta/release; never let the end user be the first tester.

## §D — red-first is necessary but NOT sufficient; assert the terminal artifact
- **2026-07-09 · mobile PR #506 (OD14, follow-up)** — the ORIGINAL OD14 shape-test WAS red-first
  (reverting the fix that set `message.reasoningContent` made the object-field assertion go red),
  yet it never exercised the render path the user sees → green red-first test, broken UI. Lesson:
  red-first proves coupling to the change, not that the feature works; the assertion subject must be
  the terminal user-perceivable artifact (rendered text / persisted row / file) driven from the real
  entry point. Litmus added: "would this fail if the feature broke by a DIFFERENT plausible mechanism
  than the line I changed?" Folded as a §D bullet.

## §D — editing a hub, test the blast radius before "done" (fix-one-break-another)
- **2026-07-09 · mobile PR #506 (OD14 → tool-call-markup leak → thinking-dup)** — a two-hop
  regression chain, both from changing shared render seams and validating only the forward path:
  (1) OD14 render fix routed ToolCallWithThinking through buildMessageData → surfaced
  parsedContent.response as visible pre-text → raw <function=…> tool-call markup leaked (no test
  asserted markup stays HIDDEN); (2) the leak-fix changed buildMessageData → duplicated thinking
  text because the full ChatMessage render suite wasn't run before committing. Lesson: editing a
  hub/shared-fn requires grepping callers + running ALL their tests in one invocation BEFORE done,
  and render/output tests must assert both what appears AND what must not. Folded into §D.

## §D — UI-driven testing means UI-driven SETUP + every affordance, not just the trigger
- **2026-07-11 · mobile (happy-path + adversarial suite, refactor/parse-once-boundary)** — building a
  large integration suite, ~85% of tests entered at the store/service layer: they mounted/rendered real
  components and asserted real pixels (not false-greens), but (a) SEEDED the precondition with
  `store.setState`/`createConversation`/`updateSettings`/`createProject` instead of tapping there, and
  (b) TRIGGERED via a direct service call instead of the user gesture. User caught `updateSettings(...)`
  standing in for dragging the temperature slider ("this beats the point / a mock approach of updating
  the store and bringing it into that state"). Two lessons folded into §D: (1) arrive at the tested state
  through real UI gestures too — pre-place ONLY genuinely-outside-the-system leaves (model file on disk,
  RAM numbers, native output); seeding our own state is the same shortcut as `toHaveBeenCalled`. (2) test
  EVERY entry affordance — the message action menu opens via BOTH long-press AND the 3-dots `•••` button;
  one-path coverage hides the other path's wiring. Applies to adversarial/red tests identically: reproduce
  the bug through the gesture chain, not the service. Sole exception: genuinely gesture-less invariants
  (budget math, residency accounting, DB atomicity), which must be LABELED as such.

## Derive expected outcome from the product spec (OGAM), not from the code — happy AND adversarial
Folded in after a user integrity-check: "are these proper tests, or written to match what's in the code?
Same mentality for happy as adversarial?" The failure mode a happy test slides into is tautology — read the
code, assert whatever it emits, go green even when the behavior is wrong (it only proves "the code does what
the code does"). GENERIC lesson: before asserting, read the code to FIND the surfaces, then step back and ask
"what SHOULD happen from the product/user perspective?" (OGAM = Off Grid AI Mobile). The assertion encodes
what the app OUGHT to do; the code is what it does. Falsify BOTH ways for happy tests too (remove the
gesture/precondition → it must fail; add a pre-condition guard against "was it always on screen"). Copy-string
coupling (asserting an exact UI label lifted from source) is a mild match-the-code smell — prefer
behavior/outcome over exact wording where the wording isn't under test, and flag it when unavoidable. When
unsure whether the code's current behavior IS the spec, say so honestly rather than blessing it green.
Evidence this pass: falsified imageLightbox (no tap → no viewer; no Save press → no gallery file) and
imageOomCard (no RAM drop → no card) live, on request, rather than asserting they were "proper."

## SSOT is its own dimension, and `useState` is a last resort
Folded in on user request during the Personal Mesh work: "keep SSOT, SOLID and DRY fundamentals" and
"as far as possible try to avoid setState". Both were only half-covered. DRY already said "define it
once", but that reads as being about duplicated CODE — it did not catch the bug that prompted this:
public core minted a random device id while the Keychain fingerprint was the canonical identity, so
two places were entitled to answer "who is this device?", and record provenance drifted away from the
licensed roster. Neither copy of that logic was duplicated code; the duplicated thing was AUTHORITY.
GENERIC lesson: audit ownership per fact, not just per constant — "who owns this, and is anything else
entitled to answer it?" A cache or projection is never an owner.

Separately, presentation-holds-nothing covered authoritative state but said nothing about ordinary
local state, so `useState` was still the reflex. GENERIC lesson: derive from the projection first;
local state only for transient in-progress view state, owned by the component running that
interaction. Concrete tell from this pass: one pairing-code field on the Sync screen governed every
device row's Pair button, so a row's button reported whether the user had typed in an unrelated box
rather than whether pairing was possible — fixed by moving the input into a per-attempt sheet. Related
tells now listed: state mirroring the store, state synced by `useEffect`, a boolean that could be
`derived === value`, and two `useState`s that must move together.

## 2026-07-30 — one seam across platforms, hosts as ports

SSOT/DRY already covered duplicated authority, and SOLID already flagged a `Platform.OS`-mechanism
branch in a caller. Neither said WHERE a cross-platform rule must live, so a shared package could
export only primitives while each host wired them up and owned the actual decisions - which passes a
DRY read of the diff (no copied code yet) and still guarantees drift the moment the second platform
arrives. GENERIC lesson: anything true on more than one platform is defined once in the shared
package, hosts supply transport/storage/clock/drawing only, and the test is that bringing up the next
platform requires wiring and NO logic. Corollaries now stated: primitives without an orchestrator are
duplication wearing a library costume; prefer ONE total input a host feeds from a state subscription
over `begin`/`update`/`end` calls it must remember at every call site, because a seam that can be
half-wired eventually will be; a capability gap is reported as data the shared logic reads.

Concrete tell from this pass: live chat streaming shipped `ChatStreamSender`/`ChatStreamCoordinator`
in `@offgrid/sync` while the mobile host owned sender-per-conversation, broadcast, the preference
gate, preview publishing and retirement - so desktop had zero streaming and could only be built by
restating all of it. The half-wired failure was real too: the streaming-state emit was attached to two
of the four paths that change it, so tool-using generations streamed and then stopped mid-reply.
