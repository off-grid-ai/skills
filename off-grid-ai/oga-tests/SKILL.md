---
name: oga-tests
description: How Off Grid AI tests are written and fixed. Load before writing, changing or fixing any test.
---

# Tests

1. **Test behaviour, not layout.** Tests survive a UI redesign.
2. **Below the UI first:** engine and service contract tests for what the feature does.
3. **Rendered tests** find elements by role, label or testID. Never by copy or position.
4. **Fake only the device boundary:** native modules, network, disk, clock, RAM. No mocks of our code.
5. **Seed through the product's own write paths.** Data enters the way the app writes it (capture, ingest, analysis), never by `INSERT` into its tables. A hand-seeded row tests your guess of the schema, not the product.
6. **A failing test is a finding.** Fix the cause. Never loosen the test or raise a timeout.
7. Hard cases: `~/.claude/skills/hand-test/reference/test-doctrine.md`.
