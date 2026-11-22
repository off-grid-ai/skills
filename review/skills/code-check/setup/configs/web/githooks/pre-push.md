# pre-push

This is the `pre-push` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `pre-push` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~bash
#!/usr/bin/env bash
#
# Quality-as-code pre-push gate - WEB. Generalized from a production app.
#
# THE PRE-PUSH vs CI SPLIT (deliberate):
#   Pre-push runs the FAST subset so local pushes stay snappy - format check,
#   typecheck, coverage, dependency-cruiser, jscpd, and a build. It does NOT run
#   the heavy TYPED eslint (parserOptions.project is slow) or knip - those run in
#   CI on every push/PR (see .github/workflows/ci.yml), which is the backstop.
#   If you want the typed lint locally too, add `npm run lint` below (accept the
#   slower push) - but the contract is: CI ALWAYS runs the full set.
#
# INSTALL (one-time per clone - hooks are not copied by `git clone`):
#     git config core.hooksPath .githooks     # (bootstrap.sh does this for you)
# Undo with:  git config --unset core.hooksPath
#
# BYPASS (emergencies only - you own the consequences):  git push --no-verify

set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "pre-push: format check (prettier)..."
npm run --silent format:check

echo "pre-push: typecheck..."
npm run --silent typecheck

echo "pre-push: coverage:check (branches/statements/lines/functions >=85%)..."
npm run --silent coverage:check

echo "pre-push: depcruise (no eager-value circular imports / boundary breaks)..."
npm run --silent depcruise

echo "pre-push: jscpd (code duplication <= threshold - DRY)..."
npm run --silent jscpd

echo "pre-push: build (tsc + tests do NOT catch build/route errors)..."
npm run --silent build

echo "pre-push: OK - format, types, coverage, graph, duplication, build all green."
~~~~~
