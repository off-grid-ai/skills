# code-check SETUP: the quality-as-code spine

Run this in a JavaScript or TypeScript repo to install the whole quality spine in one shot: the
libraries, plugins, configs, gates, the pre-push hook, and the CI workflow. Every
repo that runs it inherits the same standard, so quality is code, not memory.

The script and the files that are code (`bootstrap.sh`, `.dependency-cruiser.js`, `.prettierrc`,
`githooks/pre-push`) are stored here as `<file>.md`, with the code in a `~~~~~` fence. Write them out first with
the "Bundled files" command in `../SKILL.md`, which copies the skill to `$OUT`, then:

```bash
bash "$OUT/setup/bootstrap.sh"          # from the target repo root
bash "$OUT/setup/bootstrap.sh" /path    # or pass the repo path
```

`<skill-folder>` is wherever your agent installed this skill, for example
`.claude/skills/code-check`. Set `HYGIENE_SKIP_INSTALL=1` to place the
configs without running `npm install`.

`bootstrap.sh` is idempotent and non-destructive. Re-run it any time; it skips what
is already in place and never silently clobbers an edited config (it backs the old
one up to `<file>.hygiene.bak` first).

## What gets installed

| Artifact | Gate it powers |
| --- | --- |
| `.prettierrc` | Formatting baseline (web: 120 cols, RN: 80 cols). |
| `.eslintrc.json` | Typed lint + the AI-dead-code rules, with a plugin set for the stack. |
| `.dependency-cruiser.js` | No eager-value circular imports (the load-bearing rule) + architecture boundaries. |
| `.jscpd.json` | DRY copy/paste detector, baseline-then-ratchet threshold. |
| `.c8rc.json` | `>=85%` coverage on the pure-logic layer; I/O glue excluded and documented. |
| `knip.json` | Module-level dead code (unused files/exports/deps). |
| `.githooks/pre-push` | Fast local gate. Wired via `git config core.hooksPath .githooks`. |
| `.github/workflows/ci.yml` | Full gate, including the heavy typed lint + knip. |
| `tsconfig.json` (merged) | `allowUnreachableCode:false`, `noUnusedLocals:true`, `noUnusedParameters:true`. |
| `package.json` scripts | `format`, `format:check`, `lint`, `typecheck`, `depcruise`, `jscpd`, `knip`, `coverage`, `coverage:check`, `hooks:install`, and `build` if absent. |

### The three layers of dead-code detection

They are complementary, not redundant:

1. `@typescript-eslint/no-unnecessary-condition` and friends find dead BRANCHES
   inside a file (the always-true guard, the `?.` on a non-nullable) - the classic
   AI-generated dead branch.
2. `dependency-cruiser` finds cycles and boundary breaks between files.
3. `knip` finds whole unused files, exports, and dependencies.

## How stack detection works

`bootstrap.sh` sniffs `package.json` deps plus marker config files, in priority
order:

1. **React Native** - `metro.config.js` present, or a `react-native` dependency.
   Uses the RN baseline (airbnb + fp + react-native plugins, 80-col prettier, Metro
   bundle as the build gate).
2. **Web (Next.js / React)** - `next.config.*` present, or a `next` or `react`
   dependency. Uses the web baseline (eslint:recommended + sonarjs + security +
   github plugins, 120-col prettier, `next build` as the build gate).
3. **Plain TS library** - none of the above, just `typescript`. Reuses the web
   templates (the Next.js-specific globs simply match nothing) with `tsc --noEmit`
   as the build gate.

## The pre-push vs CI split (deliberate)

Two gates run different subsets, on purpose:

- **Pre-push (fast, local):** format check, typecheck, coverage, dependency-cruiser,
  jscpd, build. Kept snappy so pushing is not painful.
- **CI (full, every push + PR):** everything pre-push runs PLUS the **heavy typed
  eslint** (`parserOptions.project` makes it slow) and **knip**. CI is the backstop
  that always runs the full set.

If you want the typed lint locally too, add `npm run lint` to `.githooks/pre-push`
and accept the slower push. The contract is: CI always runs everything.

## The ratchet philosophy (baseline-then-ratchet)

A repo with an existing backlog will not pass every gate on day one, and that is
expected. You baseline at the current reality, then ratchet the bar UP as you burn
the backlog down. Never loosen a gate to excuse a new problem.

- **`no-unnecessary-condition`:** if it floods a repo with a real backlog, set it to
  `"warn"` in `.eslintrc.json`, drive the count to zero, then flip it back to
  `"error"`. A clean repo starts at `"error"`.
- **`.jscpd.json` threshold:** run `npm run jscpd` once, read the reported
  duplication percentage, set `threshold` JUST ABOVE it (not zero - that fails
  immediately on any existing code), then ratchet it DOWN as you extract clones.
- **`.c8rc.json`:** the `>=85%` bar applies to the pure-logic layer. Exclude your
  genuine I/O glue so the bar is reachable (see the exclusion rule below), never
  exclude branching logic to game the number.

## Honest per-repo tuning you still have to do

The bootstrap gets you a working spine, but three things are genuinely repo-specific
and cannot be auto-detected:

1. **`.dependency-cruiser.js` boundary globs.** The `pure-lib-no-io`, `lib-no-app`,
   and `no-route-to-route` rules assume `src/lib` (pure logic + adapters) and
   `src/app` (routes). Every glob marked `# EDIT:` needs your real directory layout.
   The `no-circular` rule works with no edits - it is the one that matters most.
2. **`knip.json` ignore entries for dynamic entry points.** knip cannot see a module
   reached ONLY through a dynamic `import()`, a string-keyed registry, or a
   navigation route table - it will flag it as unused. The workflow is **annotate,
   do not delete:** when knip flags something that IS reached dynamically, add it to
   `ignore` (or tag the export with a `// knip-ignore` comment). Deleting a real
   dynamic entry point is how knip breaks a build. This is manual and ongoing.
3. **`.c8rc.json` I/O-glue exclusion list.** Replace the example files with your real
   thin adapters. The rule for excluding a file: it must be a thin I/O adapter whose
   pure decision half already lives in a tested sibling module (a `*-policy` /
   `*-shape` / `*-plan` / `*-rules` module). If a file has branching logic and no
   pure sibling, do not exclude it - extract the pure half and test it.

Also: the coverage scripts wrap `npm test`, so define your test runner (`node --test`,
`jest`, or `vitest run`) as the `test` script. The bootstrap warns if it is missing.

## Customizing

- **eslint 9 flat config:** the templates use the legacy `.eslintrc.json` so the full
  plugin set composes cleanly. If your repo is flat-config-only, port the same
  `extends` / `plugins` / `rules` into `eslint.config.js` - the RULES are the
  contract, not the file format.
- **Different Node version in CI:** edit `node-version` in `github-workflows-ci.yml`.
- **Sibling monorepo deps:** if your `@`-scoped deps are `file:` links to a sibling
  repo, add a checkout + build step in the CI workflow before `npm ci` (there is a
  commented placeholder for it).

## Provenance

Generalized from the gate-green configs of a production web app (`.dependency-cruiser.js`,
`.jscpd.json`, `.c8rc.json`, `.githooks/pre-push`, `.github/workflows/ci.yml`,
`package.json` scripts) and two public baselines: `wednesday-solutions/react-template`
(web) and `wednesday-solutions/react-native-template` (React Native).
