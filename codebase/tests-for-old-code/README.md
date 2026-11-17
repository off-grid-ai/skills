# Tests for code that never had any

Point your agent at a flow in old code. It works out what the code does today, writes end-to-end tests in tiers from sure to likely, runs every one and fixes them until they pass. What it can't test becomes a checklist, and any bug it finds comes first.

Use it when:
- You need to refactor code with no tests.
- You've inherited a project and don't trust it yet.
- Someone asks "what's our coverage on checkout?" and the answer is none.

Try it: "/tests-for-old-code the signup and email verification flow"
