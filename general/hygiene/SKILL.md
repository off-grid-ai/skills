---
name: hygiene
description: The Off Grid engineering standard. SETUP mode bootstraps a fresh repo's quality gates (setup/bootstrap.sh). PLAN mode designs a task against the bar (separation of concerns, SOLID, DRY, test strategy) before coding. AUDIT mode reviews a diff before a PR and gives a pass/fail verdict with evidence. Load only when designing a new subsystem or auditing a real PR — not for small fixes.
---

# Off Grid engineering standard

Three modes. **SETUP** once in a fresh repo. **PLAN** at the start of a task. **AUDIT** before a PR (default when a diff already exists). Detect the repo first — gates differ: `mobile`(+`pro`) · `desktop` · `shared` · `sync` · `console` · `gateway` · `website` · `provit`.

Don't load this for a small fix — apply the principles from the repo's CLAUDE.md directly. Load it to design a genuinely new subsystem or to audit a real PR.

---

## SETUP

`bash ~/.claude/skills/hygiene/setup/bootstrap.sh` from the repo root. Idempotent; backs up any edited config to `<file>.hygiene.bak`. Detects the stack and installs prettier + typed eslint + dependency-cruiser + jscpd + knip + c8, the tsconfig flags, and the pre-push hook. Pre-push runs the fast subset; CI runs the full set. A repo with a backlog starts noisy rules at a baseline and ratchets toward `error`/zero — never loosen a gate to excuse a new problem. Detail + the per-repo tuning you still do by hand: `setup/README.md`.

## PLAN — answer briefly, in the response

1. **Three questions.** Enough to abstract? (2+ concrete cases through one caller = a seam; one case = don't, YAGNI). SOLID applicable? (what owns the one responsibility; what interface callers depend on). Reused? (the single source of truth).
2. **Separation of concerns.** Name the owning **service** (state machine + resources + side-effects), the **pure logic** to isolate (zero-IO), the **thin handlers** (I/O only), the **presentation** (no logic/state). Where's the seam, what gets injected?
3. **DRY + which package owns it.** The rule/map/constant/type defined once, and every place that must consume it. If it is true on more than one platform, name the shared package that owns it and the ports each host injects — then state what the second host has to write: it must be wiring only, never logic.
4. **Tests.** The corner-case integration scenarios FIRST — the real user flow through the real seam in its hard states (empty, first, boundary, the false branch of each gate, concurrency/ordering, error path, the device/pressure combination). Name the terminal artifact each asserts (rendered text, persisted row, file on disk), and the BEFORE state it asserts so the after-assertion can't pass as a no-op. Green on working code is the bar — no red-first, and src is never broken to demonstrate a test.
5. **Design/brand** if UI (which tokens, which approved component lib; read `brand/DESIGN_PHILOSOPHY.md`).
6. **Reuse.** What already exists that this extends rather than rebuilds.

## AUDIT — for each dimension: PASS / FAIL / N/A + evidence (file:line, command output)

1. **Mechanical gates** — run them, paste results (format, lint, typecheck, scoped tests, coverage vs the repo bar, a production build if native/deps/config/new-import changed).
2. **Separation of concerns** — logic in the owning service, handlers thin, pure logic isolated, presentation free of state. Flag any View/hook doing retry/cancel/orchestration/"compute the real value". Any new `useState` that is derivable, mirrors the store, is synced by `useEffect`, or is read by siblings that shouldn't share it?
3. **SOLID** — any `kind===` / `instanceof` / `Platform.OS`-mechanism branch in a caller? A new implementation would need caller changes? A patch layered on shared state instead of the owning seam?
4. **SSOT / DRY** — any rule/constant defined twice (esp. main + renderer)? For each fact the diff touches: who owns it, and is anything else entitled to answer the same question?
5. **One seam across platforms** — does any cross-platform rule live in a host instead of the shared package? Could the next platform be brought up with wiring alone, or would it restate this logic? Is the injected surface small and total, or can a host half-wire it? Is a capability gap reported as data, or branched on with `Platform.OS`?
6. **Tests** — real integration through the real seams; assert the terminal artifact, never `toHaveBeenCalled`; no mocks of our own code; each assertion depends on the impl actually running (read it, don't break src to check).
7. **Design / copy** if touched — tokens not hardcoded, brand voice.
8. **Branch / PR / honesty** — off `main`, one concern, status reported as code/wired/verified, unverified named, gaps logged.

End with an overall verdict + a blocking-issues list.

---

# Standards (the why)

**Separation of concerns.** Isolate pure logic (zero-IO, unit-testable) from I/O (thin adapters behind an interface). One owning service per resource/subsystem owns the state machine + side-effects; everything else reads its projection and dispatches intents. Presentation holds nothing — no authoritative state, no business logic, no store-orchestration, no "compute the real value from several sources"; if a hook is doing the work, that IS the bug, move it to the service. Reactive stores are a read-only projection, not a coordination bus — never fire a side-effect off a store snapshot multiple writers mutate.

**Avoid local state.** Reach for `useState` last, not first. Default to deriving from the service's projection: anything computable from what you already render is not state. Local state is legitimate only for transient view state the user is mid-way through — which sheet is open, an uncommitted draft field, a focus ring — and even then it lives in the component that owns that interaction, not on the screen above it. Tells it is wrong: state duplicating something the store/service already knows; state that must be kept in sync with a prop via `useEffect`; one field on a screen that several rows read, so typing in it changes unrelated rows' behaviour; a boolean that could be `derived === value`. Two `useState`s that must move together are one piece of state in the wrong place.

**SOLID.** Depend on interfaces, not concretes (DIP). The tell it's wrong: `kind==='x'` / `instanceof` / `engineId===` / a `Platform.OS`-to-choose-mechanism branch in a caller, especially a renderer — push the decision behind the abstraction so adding an implementation needs zero caller changes (OCP). SRP: one responsibility. LSP: any implementation substitutable through the interface; normalize capability gaps inside the service as data, not in the UI. ISP: don't force an implementation to stub methods it can't support. **Fix the seam, never patch around it** — if a fix would add a second concrete branch in a caller, build/extend the owning service instead. Migrations are behavior-neutral (additive; verify each migrated path behaves as before, then layer the fix on top).

**SSOT / DRY.** Every fact has exactly ONE canonical owner, and a rule/map/capability-check/constant/type is defined ONCE and imported everywhere. DRY is about duplicated code; SSOT is about duplicated *authority* — two places entitled to answer the same question will drift, and the second one is the bug even when its code is different. Ask of any fact: who owns it? Identity, roster membership, capacity, entitlement each have one owner; a cache or a projection is never an owner. A second generator of an id, a store that mints what a provider already owns, a UI that recomputes what a service decided — all SSOT violations. Collapse to the owner and have everything else read its projection. Tests import that source, never re-hardcode the value.

**One seam, in the shared package, with hosts as ports.** Anything true on more than one platform — a lifecycle, an ordering rule, a gate, a policy, a taxonomy, a state machine — is defined ONCE in the shared package, and each host supplies only what genuinely differs: its transport, its storage, its clock, its way of drawing. The shared package is the executable specification; a host is adapters. **The test: adding the second platform must require writing NO logic — only wiring.** If bringing up macOS means restating what mobile already decided, the seam is in the wrong repo, and the two will drift the moment one of them fixes an edge case (the first platform gets the fix, the others silently keep the bug). Tells: a service in `app/` that owns rules rather than plumbing; the same lifecycle written twice with different variable names; a shared package that exports only primitives while each host wires them up its own way — primitives without an orchestrator push the real decisions back into the hosts, which is the duplication wearing a library costume. Also make the injected surface small and total: prefer ONE input a host feeds from a state subscription over a set of `begin`/`update`/`end` calls it has to remember at every call site — a seam that can be half-wired eventually will be. Where a host genuinely cannot do something, it reports that as **capability data** the shared logic reads, never as a `Platform.OS` branch.

**Testing.** One rendered integration test per fix: mount the real screen, arrive via real gestures, run the whole real stack over fakes ONLY at the device boundary, assert what the user SEES. Never mock our own code. Never assert `toHaveBeenCalled` — assert the terminal artifact. Delete-smell, answered by READING the test: if deleting the implementation would keep it green, it's asserting the mock. Tests are written green against working code; never break, revert or neutralise src to prove one can fail. If writing a test uncovers a real product bug, report it with the evidence and let the human decide — don't fix it in the testing pass and don't bend the test around it. One-liners: unit = mock what you don't own; integration = mock only what's outside our system; e2e = mock only timers. No unit-test or coverage mandate — follow the repo's CLAUDE.md. Run only the fix's own test file while iterating; the full suite runs at pre-push.

**Design (if UI).** Source of truth: `brand/DESIGN_PHILOSOPHY.md` (no other copy). Calm, luminous, alive; Geist for reading text, Geist Mono for labels and numbers (weights 300–500), emerald-only accent (`#34D399` dark / `#059669` light), all color/spacing/type from tokens (`@offgrid/design` + each platform's layer) — never hardcode. Icons: `react-native-vector-icons` (Feather) on mobile, `@phosphor-icons/react` on desktop; never lucide. Hierarchy from size/weight, not color. Reuse before building — two surfaces of the same thing use the same component.

**Copy (if strings).** Source: `brand/`. Outcomes not features, speak to "you", proof-first ("15-30 tok/s", not "fast"). No em dashes, no exclamation marks, no curly quotes; no banned words (revolutionary, seamless, empower, leverage, robust, comprehensive, crucial, delve, showcase, enhance…).

**Branch / PR / honesty.** Never commit to `main` — branch first. Merge commit, never squash. One concern per PR. Pro code lives only in `pro/`, gated by `isPro`, wired via registries. Platform parity: one typed contract per native capability, satisfied by both Swift and Kotlin; genuine gaps modelled as capability-as-data, not an `if (ios)` branch. **Pull the device log, don't guess** (mobile): the live-session tail of `offgrid-debug.log`, grep the `[*-SM]` traces. Report status as **code / wired / verified** — name what's unverified; log gaps to `docs/GAPS_BACKLOG.md`.

**Mechanical gates per repo.** mobile: `prettier --write` · `eslint` · `tsc --noEmit` · `jest <the fix's file>` (full suite at pre-push). desktop: both tsconfigs · vitest · coverage ratchet · playwright. console: typecheck · node --test · c8 · build · smoke. gateway/shared: `npm run build`. Build before deploy whenever native/deps/config/imports changed — tsc+tests don't catch build errors.

---

# Evolving this standard

`pr-review`'s closing phase (`hygiene-learn`) folds *generic* review lessons into the right standard above and logs each with provenance in `LEDGER.md`. Keep this file lean — tighten and collapse redundant rules, never bloat.
