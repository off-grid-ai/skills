// dependency-cruiser ruleset - REACT NATIVE baseline.
//
// Generalized from a production app's gate-green config, adapted to a React
// Native layout (no Next.js routes). Two classes of defect neither typecheck nor
// tests catch:
//
//   1. Eager-VALUE circular imports - a TDZ crash that can pass in dev (Metro,
//      lazy) and break in a release bundle. `no-circular` catches it before ship.
//   2. Architecture boundary drift - presentation must not hold business logic;
//      services own state; pure logic stays IO-free.
//
// SEVERITY: baseline-then-ratchet. Clean rules are `error`; a rule with a backlog
// starts `warn` and ratchets up. EDIT: adapt every `# EDIT:` glob to your layout
// (common RN roots: `src/screens`, `src/components`, `src/services`, `src/store`).

module.exports = {
  forbidden: [
    // ── 1. THE LOAD-BEARING RULE ────────────────────────────────────────────
    {
      name: 'no-circular',
      comment:
        'Eager VALUE import cycle - the TDZ-crash class that can pass in a dev ' +
        'bundle and break in release. Dynamic import() and type-only edges are ' +
        'excluded (they cannot cause TDZ and are the correct ways to break a cycle). ERROR.',
      severity: 'error',
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['dynamic-import', 'type-only'] } },
    },
    {
      name: 'no-circular-type-only',
      comment: 'Broader net: cycles closing only through type-only edges (runtime-safe). WARN; ratchet to ERROR once clean.',
      severity: 'warn',
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['dynamic-import'] } },
    },

    // ── 2. ARCHITECTURE BOUNDARIES ──────────────────────────────────────────

    // EDIT: presentation (screens/components) must not import services/stores
    // directly if your architecture routes through hooks/selectors - tune to
    // your seam. Baseline here: a pure logic module must not do IO.
    {
      name: 'pure-logic-no-io',
      comment: 'Pure logic (src/**/*-policy.ts or src/logic/**) must not import services/native/IO. Keeps the coverage seam clean.',
      severity: 'error',
      from: { path: '^src/(logic|.*-policy\\.ts)' }, // EDIT: your pure-module glob
      to: { path: '^src/(services|native|store)/' }, // EDIT: your IO roots
    },
    {
      name: 'pure-logic-no-io-core',
      comment: 'Pure logic must not import IO-bearing node built-ins. (node:crypto is fine - deterministic computation.)',
      severity: 'error',
      from: { path: '^src/(logic|.*-policy\\.ts)' }, // EDIT
      to: {
        dependencyTypes: ['core'],
        path: '^(fs|net|http|https|child_process|dns|dgram|tls)$',
      },
    },
    {
      name: 'services-no-screens',
      comment: 'Services must not import screens/components. Dependencies point inward (UI -> service), never out.',
      severity: 'error',
      from: { path: '^src/services/' }, // EDIT
      to: { path: '^src/(screens|components)/' }, // EDIT
    },

    // ── 3. DEAD-CODE HYGIENE (prefer knip - this is the coarse net) ─────────
    {
      name: 'no-orphans',
      comment: 'Orphan modules (nothing imports them, not an entry point) are usually dead code. WARN - prefer knip for precision.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts)$',
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '(^|/)(babel|metro|react-native)\\.config\\.[cm]?[jt]s$',
          '^index\\.js$', // RN entry point
          '^App\\.tsx?$',
        ],
      },
      to: {},
    },

    // ── 4. STANDARD HYGIENE ─────────────────────────────────────────────────
    {
      name: 'not-to-dev-dep',
      comment: 'Production code must not depend on a devDependency. Tests exempt.',
      severity: 'error',
      from: { path: '^src', pathNot: '\\.(spec|test)\\.[jt]sx?$' },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'], pathNot: ['node_modules/@types/'] },
    },
    {
      name: 'no-non-package-json',
      comment: 'A dependency used but not declared in package.json will break a clean install. Declare it.',
      severity: 'error',
      from: {},
      to: { dependencyTypes: ['unknown', 'undetermined', 'npm-no-pkg', 'npm-unknown'] },
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
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'node_modules|coverage/|/dist/|/android/|/ios/' },
    enhancedResolveOptions: {
      // EDIT: RN resolves platform extensions (.native/.ios/.android). Include them
      // so the resolver follows the right file.
      extensions: [
        '.ts', '.tsx', '.js', '.jsx', '.native.ts', '.native.tsx',
        '.ios.ts', '.ios.tsx', '.android.ts', '.android.tsx', '.json',
      ],
      mainFields: ['react-native', 'module', 'main', 'types', 'typings'],
    },
  },
};
