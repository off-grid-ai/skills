// dependency-cruiser ruleset - WEB / Next.js baseline.
//
// Generalized from a production web app's gate-green config. Two classes
// of defect that neither typecheck nor tests catch:
//
//   1. Circular imports that break the PROD build only. An eager-VALUE import cycle
//      causes a TDZ crash that can pass locally (newer Node) and crash on the
//      server (older Node). `no-circular` is the load-bearing rule - it catches
//      that in CI / pre-push BEFORE a deploy.
//
//   2. Architecture boundary drift. The ports-and-adapters shape (pure policy/logic
//      in `src/lib`, thin route handlers in `src/app`, swappable backends behind
//      `src/lib/adapters`) is enforced mechanically here, not just by review.
//
// SEVERITY POLICY (baseline-then-ratchet): rules that are CLEAN today are `error`
// (block the push / fail CI). A rule with an existing backlog starts `warn`
// (visible, not blocking) and ratchets to `error` once the backlog is burned down.
//
// EDIT: the boundary globs below assume `src/lib` (pure logic + adapters) and
// `src/app` (Next.js routes/pages). If your repo uses different roots, change the
// `path:` regexes to match. Everything marked `# EDIT:` is a per-repo placeholder.

module.exports = {
  forbidden: [
    // ── 1. THE LOAD-BEARING RULE ────────────────────────────────────────────
    //
    // no-circular (ERROR) counts a cycle ONLY if it can form from eager VALUE
    // edges - it EXCLUDES dynamic-import and type-only edges, because neither can
    // cause the TDZ crash and both are the correct ways to break a cycle. This is
    // the exact TDZ-dangerous class. Keep it at `error`.
    {
      name: 'no-circular',
      comment:
        'Eager VALUE import cycle - the exact cause of the TDZ crash that surfaces ' +
        'only in the prod build (older-Node server) while passing locally. Dynamic ' +
        'import() and type-only edges are excluded (they cannot cause TDZ and are ' +
        'the correct ways to break a cycle). ERROR.',
      severity: 'error',
      from: {},
      to: {
        circular: true,
        viaOnly: { dependencyTypesNot: ['dynamic-import', 'type-only'] },
      },
    },
    {
      name: 'no-circular-type-only',
      comment:
        'Broader hygiene net: cycles that close only through type-only edges ' +
        '(erased at build, runtime-safe) or eager value edges. Dynamic import() ' +
        'still excluded. WARN - a known baseline of type-only cycles is advisory; ' +
        'ratchet to ERROR once burned down.',
      severity: 'warn',
      from: {},
      to: {
        circular: true,
        viaOnly: { dependencyTypesNot: ['dynamic-import'] },
      },
    },

    // ── 2. ARCHITECTURE BOUNDARIES (ports & adapters) ───────────────────────

    // EDIT: pure policy/logic must stay pure (zero IO). A `*-policy.ts` (adapt the
    // pattern to your pure-module naming) must NOT reach into adapters, the DB
    // layer, or routes/pages. Keeping these modules pure is what makes the
    // unit-coverage seam reachable.
    {
      name: 'pure-lib-no-io',
      comment:
        'Pure logic (src/lib/*-policy.ts) must not import adapters, db, or app. ' +
        'Keeps the unit-testable coverage seam clean.',
      severity: 'error',
      from: { path: '^src/lib/[^/]*-policy\\.ts$' }, // EDIT: your pure-module glob
      to: { path: '^src/lib/adapters/|^src/db/|^src/app/' }, // EDIT: your IO roots
    },
    {
      name: 'pure-lib-no-io-core',
      comment:
        'Same seam, node built-ins arm: pure policy modules must not import ' +
        'IO-bearing core modules. node:crypto is intentionally allowed (pure ' +
        'deterministic computation - HMAC/hashing is not IO).',
      severity: 'error',
      from: { path: '^src/lib/[^/]*-policy\\.ts$' }, // EDIT: your pure-module glob
      to: {
        dependencyTypes: ['core'],
        path: '^(fs|net|http|https|child_process|dns|dgram|tls|cluster|worker_threads)$',
      },
    },

    // Business logic must not depend on routes/pages. Dependencies point inward
    // (app -> lib), never out.
    {
      name: 'lib-no-app',
      comment: 'Business logic (src/lib) must not import from routes/pages (src/app). Dependencies point inward.',
      severity: 'error',
      from: { path: '^src/lib/' }, // EDIT
      to: { path: '^src/app/' }, // EDIT
    },

    // A route handler must not import another route's module - routes are leaves;
    // shared logic belongs in src/lib.
    {
      name: 'no-route-to-route',
      comment: 'One route handler must not import another route module. Shared logic goes in src/lib, not sideways.',
      severity: 'error',
      from: { path: '^src/app/api/.+/route\\.tsx?$' }, // EDIT: your route glob
      to: { path: '^src/app/api/.+/route\\.tsx?$' },
    },

    // ── 3. RETIRED / BANNED MODULES ─────────────────────────────────────────
    // EDIT: list any module that has been retired and must never be imported
    // again (comments referencing it are fine; import edges are not). Delete this
    // rule if you have no retired modules yet.
    // {
    //   name: 'no-retired-module',
    //   comment: 'This module is retired. Nothing may IMPORT it. Baseline: 0 edges -> ERROR.',
    //   severity: 'error',
    //   from: {},
    //   to: { path: 'scripts/(the-retired-file)\\.mjs$' },
    // },

    // ── 4. DEAD-CODE HYGIENE (aspirational -> WARN) ─────────────────────────
    // NOTE: module-level dead code (unused files/exports) is better handled by
    // knip (see knip.json). This orphan rule is a coarse net for files nothing
    // imports; knip is the precise tool. Kept as WARN.
    {
      name: 'no-orphans',
      comment: 'Orphan modules (nothing imports them, not an entry point) are usually dead code. WARN - prefer knip.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts)$', // dot files (config)
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '(^|/)(babel|webpack|next|postcss|tailwind|drizzle)\\.config\\.[cm]?[jt]s$',
          '^src/app/', // Next.js file-system routing entry points
          '^scripts/',
          '^src/middleware\\.ts$',
          '^src/instrumentation\\.ts$',
        ],
      },
      to: {},
    },

    // ── 5. STANDARD HYGIENE (from the dependency-cruiser init template) ─────
    {
      name: 'not-to-dev-dep',
      comment: 'Production code must not depend on a devDependency. Scripts + tests are exempt.',
      severity: 'error',
      from: { path: '^src', pathNot: '\\.(spec|test)\\.[jt]sx?$' },
      to: {
        dependencyTypes: ['npm-dev'],
        dependencyTypesNot: ['type-only'],
        pathNot: ['node_modules/@types/'],
      },
    },
    {
      name: 'no-non-package-json',
      comment: 'A dependency used but not declared in package.json will break a clean install. Declare it.',
      severity: 'error',
      from: {},
      to: {
        dependencyTypes: ['unknown', 'undetermined', 'npm-no-pkg', 'npm-unknown'],
        // EDIT: add virtual/compiler-aliased specifiers your bundler resolves but a
        // static resolver cannot (e.g. Next.js `server-only`).
        pathNot: ['^server-only$'],
      },
    },
    {
      name: 'not-to-deprecated',
      comment: 'Depends on an npm module flagged deprecated by npm.',
      severity: 'warn',
      from: {},
      to: { dependencyTypes: ['deprecated'] },
    },
  ],

  options: {
    // EDIT: resolve your path alias (e.g. `@/*` -> `./src/*`) via tsconfig so
    // aliased import edges are seen the same as relative ones.
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'node_modules|\\.next/|coverage/|/dist/' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs', '.json'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)' },
      archi: {
        collapsePattern: '^(?:src/lib/adapters|src/lib|src/app/api|src/app|src/components|src/modules|scripts)',
      },
    },
  },
};
