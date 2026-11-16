---
name: tests
description: The Off Grid testing standard for product behavior across web, services, mobile, and fleet repositories. Use when writing, fixing, reviewing, or auditing tests. Prove the complete user journey and best intended end-state with real integration tests; forbid mocking Off Grid code, allow fakes only at uncontrollable boundaries, and add native tests when Swift or Kotlin owns behavior.
---

# Off Grid tests

## The contract

- Optimize for the strongest faithful product evidence, not the fastest green test or shortest path
  to an answer. Exercise the broadest material user journey needed to expose real failure modes;
  never trade coverage quality, maintainability, or UI/UX confidence for speed.
- Do not bless a partial migration, duplicated navigation, compatibility clutter, or a technically
  reachable but confusing journey. Test the intended end-state.
- Do not mock Off Grid code. Keep `src/`, `pro/`, services, stores, hooks, components, screens,
  navigators, parsers, and registries real.
- Prove product behavior with an integration test: use the real route/navigation stack, reach the
  state through real user actions, and run the real production path. On web, assert URL/history and
  deep links; on mobile, mount the real screen and navigation stack with real gestures.
- Assert what the user can observe. Internal calls, mock invocations, and implementation details are
  not product outcomes.
- For a replacement or IA migration, assert both sides: every required entity/action remains
  discoverable through the new hierarchy, and the superseded/duplicate surface is absent. Redirects
  and source-string assertions alone do not prove a coherent user experience.
- Visually verify changed UI at relevant wide and narrow breakpoints, including expanded/collapsed,
  loading/empty/error, keyboard/focus, and absence-of-duplicate-navigation states. Screenshot QA
  complements behavioral assertions; it does not replace them. Capture only after loading and every
  animation ancestor have settled, then inspect the actual pixels for blank or translucent content,
  clipping, overflow, truncation, illegible hierarchy, and confusing composition. A saved screenshot,
  DOM visibility assertion, or green test is not by itself a visual pass.
- Fake only a boundary the test environment cannot control or reproduce faithfully, such as a native
  device API, model runtime, remote server, filesystem exhaustion, or OOM. Put the fake at that
  boundary; keep all Off Grid logic above it real.
- Do not use direct store `setState` to create an integration-test precondition.
- Use unit tests for pure functions and narrow contracts. They do not replace the integration test
  for changed product behavior.
- When Swift or Kotlin owns behavior that can be tested natively, add XCTest or JUnit coverage. Use a
  shared contract test when both platforms implement the same capability.

## Workflow

1. State the user-visible behavior and the failure being guarded.
2. Define the intended end-state and identify old paths/surfaces that must disappear.
3. Find the real screen, navigation path, production stack, and external boundary.
4. Reuse an existing boundary fake or add the smallest faithful fake there.
5. Write the integration test through real actions, URLs/history where relevant, and visible assertions.
6. For a bug, run the test against the broken code and confirm it fails for the intended reason.
7. Fix the production seam and remove the superseded path. Do not patch the test around a poor abstraction.
8. Run visual QA, the focused test, related suites, ESLint, Prettier, and TypeScript. Run native tests when the
   changed behavior crosses a native boundary.
9. Remove leaked timers, subscriptions, processes, and pending promises. A suite that needs
   `--forceExit` to hide unfinished work is not clean.

## Review verdict

Fail the review when a test mocks Off Grid code, manufactures state instead of using the product,
asserts only calls or source text, skips a known bug, preserves a duplicate/replaced journey, omits
visual/navigation proof for changed UI, or passes while asynchronous work survives teardown. Name
the exact file and the real integration test that should replace it.
