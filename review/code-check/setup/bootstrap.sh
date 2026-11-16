#!/usr/bin/env bash
#
# code-check SETUP (bootstrap) - install the quality-as-code spine into a repo.
#
# Runs from the TARGET repo root (or pass it as $1). Idempotent and non-destructive:
#   - detects the stack (Next/React web vs React Native vs plain TS lib),
#   - installs the right devDeps,
#   - drops config templates ONLY if absent (an existing config is backed up to
#     <file>.hygiene.bak before being replaced, never silently clobbered),
#   - merges the hygiene tsconfig flags into the repo tsconfig,
#   - adds the package.json scripts (only ones that are missing),
#   - wires the pre-push hook via core.hooksPath,
#   - prints a "run these to verify" summary + the baseline-then-ratchet note.
#
# Safe to re-run: re-running skips anything already in place and reports it.

set -euo pipefail

# ── Locate self + the config templates ──────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIGS="$SCRIPT_DIR/configs"

REPO="${1:-$(pwd)}"
REPO="$(cd "$REPO" && pwd)"
cd "$REPO"

say()  { printf '\033[0;36m[hygiene]\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m[hygiene]\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m[hygiene]\033[0m %s\n' "$*"; }

[ -f "$REPO/package.json" ] || { warn "no package.json at $REPO - run this from a JS/TS repo root (or pass the path)."; exit 1; }

# ── 1. Detect the stack ──────────────────────────────────────────────────────
# Sniff package.json deps + marker config files. Priority: RN (metro/react-native)
# > web (next) > plain TS lib (typescript, no framework).
detect_stack() {
  local pj="$REPO/package.json"
  if [ -f "$REPO/metro.config.js" ] || grep -Eq '"react-native"[[:space:]]*:' "$pj"; then
    echo "react-native"
  elif [ -f "$REPO/next.config.js" ] || [ -f "$REPO/next.config.mjs" ] || [ -f "$REPO/next.config.ts" ] || grep -Eq '"next"[[:space:]]*:' "$pj"; then
    echo "web"
  elif grep -Eq '"react"[[:space:]]*:' "$pj"; then
    echo "web" # plain React (CRA/Vite) uses the web baseline
  else
    echo "lib" # plain TS library - web baseline minus the framework plugins
  fi
}

STACK="$(detect_stack)"
# The config template dir. `lib` reuses the web templates (they degrade gracefully:
# the Next.js-specific globs simply match nothing in a plain lib).
SRC_DIR="$CONFIGS/web"
[ "$STACK" = "react-native" ] && SRC_DIR="$CONFIGS/react-native"
say "detected stack: $STACK  (templates: $(basename "$SRC_DIR"))"

# ── 2. devDependencies per stack ─────────────────────────────────────────────
COMMON_DEV=(
  prettier eslint typescript
  "@typescript-eslint/parser" "@typescript-eslint/eslint-plugin"
  eslint-config-prettier
  eslint-plugin-sonarjs eslint-plugin-security eslint-plugin-import
  dependency-cruiser jscpd knip c8
)
WEB_DEV=(
  eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jest
  eslint-plugin-github eslint-plugin-immutable
)
RN_DEV=(
  eslint-config-airbnb eslint-config-airbnb-typescript
  eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-native
  eslint-plugin-jsx-a11y eslint-plugin-github eslint-plugin-immutable
  eslint-plugin-fp eslint-plugin-prettier
)

DEV_DEPS=("${COMMON_DEV[@]}")
case "$STACK" in
  web|lib)       DEV_DEPS+=("${WEB_DEV[@]}") ;;
  react-native)  DEV_DEPS+=("${RN_DEV[@]}") ;;
esac

say "installing devDependencies (idempotent - npm skips already-present):"
printf '        %s\n' "${DEV_DEPS[@]}"
if [ "${HYGIENE_SKIP_INSTALL:-0}" = "1" ]; then
  warn "HYGIENE_SKIP_INSTALL=1 - skipping npm install (dry mode)."
else
  npm install --save-dev --save-exact "${DEV_DEPS[@]}"
fi

# ── 3. Drop config templates (non-destructive) ───────────────────────────────
# Copies $SRC_DIR/<name> -> $REPO/<dest>. If dest exists AND differs, back it up
# to <dest>.hygiene.bak first (never silently clobber). If dest exists and is
# identical, skip. If absent, copy.
drop() {
  local src="$1" dest="$2"
  local abs_dest="$REPO/$dest"
  if [ ! -f "$src" ]; then warn "template missing: $src (skipping $dest)"; return; fi
  mkdir -p "$(dirname "$abs_dest")"
  if [ -f "$abs_dest" ]; then
    if cmp -s "$src" "$abs_dest"; then
      ok "unchanged: $dest (already the hygiene template)"
    else
      cp "$abs_dest" "$abs_dest.hygiene.bak"
      cp "$src" "$abs_dest"
      warn "replaced: $dest  (your previous version saved to $dest.hygiene.bak - reconcile any repo-specific edits)"
    fi
  else
    cp "$src" "$abs_dest"
    ok "created: $dest"
  fi
}

drop "$SRC_DIR/.prettierrc"            ".prettierrc"
drop "$SRC_DIR/.eslintrc.json"         ".eslintrc.json"
drop "$SRC_DIR/.dependency-cruiser.js" ".dependency-cruiser.js"
drop "$SRC_DIR/.jscpd.json"            ".jscpd.json"
drop "$SRC_DIR/.c8rc.json"             ".c8rc.json"
drop "$SRC_DIR/knip.json"              "knip.json"
drop "$SRC_DIR/githooks/pre-push"      ".githooks/pre-push"
drop "$SRC_DIR/github-workflows-ci.yml" ".github/workflows/ci.yml"
chmod +x "$REPO/.githooks/pre-push" 2>/dev/null || true

# ── 4. Merge tsconfig hygiene flags ──────────────────────────────────────────
# Merge allowUnreachableCode:false + noUnusedLocals/Parameters:true into the
# repo tsconfig.json compilerOptions, WITHOUT touching any other setting.
merge_tsconfig() {
  local tsc="$REPO/tsconfig.json"
  local frag="$SRC_DIR/tsconfig.hygiene.json"
  if [ ! -f "$tsc" ]; then
    warn "no tsconfig.json - copying the hygiene fragment as tsconfig.hygiene.json for you to extend."
    cp "$frag" "$REPO/tsconfig.hygiene.json"
    return
  fi
  node - "$tsc" <<'NODE'
const fs = require('fs');
const p = process.argv[2];
// Tolerant read (strip // line + /* */ block comments, trailing commas) so a
// commented tsconfig still parses. We only ADD three flags; we never rewrite
// the user's structure beyond compilerOptions.
let raw = fs.readFileSync(p, 'utf8');
const stripped = raw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/,(\s*[}\]])/g, '$1');
let cfg;
try { cfg = JSON.parse(stripped); }
catch (e) { console.error('[hygiene] tsconfig.json is not plain JSON - add these flags manually to compilerOptions: allowUnreachableCode:false, noUnusedLocals:true, noUnusedParameters:true'); process.exit(0); }
cfg.compilerOptions = cfg.compilerOptions || {};
const want = { allowUnreachableCode: false, noUnusedLocals: true, noUnusedParameters: true };
let changed = false;
for (const [k, v] of Object.entries(want)) {
  if (cfg.compilerOptions[k] !== v) { cfg.compilerOptions[k] = v; changed = true; }
}
if (changed) {
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + '\n');
  console.log('[hygiene] merged hygiene flags into tsconfig.json compilerOptions.');
} else {
  console.log('[hygiene] tsconfig.json already has the hygiene flags.');
}
NODE
}
merge_tsconfig

# ── 5. Add package.json scripts (only the missing ones) ──────────────────────
add_scripts() {
  local stack="$1"
  node - "$REPO/package.json" "$stack" <<'NODE'
const fs = require('fs');
const [p, stack] = process.argv.slice(2);
const pj = JSON.parse(fs.readFileSync(p, 'utf8'));
pj.scripts = pj.scripts || {};
const buildCmd = stack === 'react-native'
  ? 'react-native bundle --platform android --dev true --entry-file index.js --bundle-output /tmp/hygiene.bundle --reset-cache'
  : (stack === 'web' ? 'next build' : 'tsc -p tsconfig.json --noEmit');
// coverage runner: c8 wrapping the repo's test command. We DON'T know the test
// runner, so wire c8 around `npm test` and leave `test` for the repo to define.
const want = {
  'format': 'prettier --write .',
  'format:check': 'prettier --check .',
  'lint': 'eslint .',
  'typecheck': 'tsc --noEmit',
  'depcruise': 'depcruise src --config .dependency-cruiser.js',
  'jscpd': 'jscpd --config .jscpd.json',
  'knip': 'knip',
  'coverage': 'c8 --config .c8rc.json npm test',
  'coverage:check': 'c8 --config .c8rc.json --check-coverage npm test',
  'hooks:install': 'git config core.hooksPath .githooks'
};
if (!pj.scripts.build) want.build = buildCmd;
const added = [];
for (const [k, v] of Object.entries(want)) {
  if (!pj.scripts[k]) { pj.scripts[k] = v; added.push(k); }
}
fs.writeFileSync(p, JSON.stringify(pj, null, 2) + '\n');
console.log(added.length
  ? `[hygiene] added package.json scripts: ${added.join(', ')}`
  : '[hygiene] all hygiene scripts already present.');
if (!pj.scripts.test || /no test specified/.test(pj.scripts.test)) {
  console.log('[hygiene] NOTE: no real `test` script found - coverage:check wraps `npm test`, so define your test runner (e.g. `node --test`, `jest`, or `vitest run`).');
}
NODE
}
add_scripts "$STACK"

# ── 6. Wire the pre-push hook ─────────────────────────────────────────────────
if git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1; then
  git -C "$REPO" config core.hooksPath .githooks
  ok "wired pre-push hook (git config core.hooksPath .githooks)."
else
  warn "not a git repo - skipped hook wiring. Run 'git init' then 'npm run hooks:install'."
fi

# ── 7. Summary + verify instructions ─────────────────────────────────────────
cat <<EOF

$(ok "hygiene spine installed for a '$STACK' repo.")

WHAT LANDED
  .prettierrc              formatting baseline ($([ "$STACK" = react-native ] && echo '80 cols' || echo '120 cols'))
  .eslintrc.json           typed lint + AI-dead-code rules ($STACK plugin set)
  .dependency-cruiser.js   no eager-value circular imports + architecture boundaries
  .jscpd.json              DRY copy/paste detector (baseline-then-ratchet threshold)
  .c8rc.json               >=85% coverage on the pure-logic layer (I/O glue excluded, documented)
  knip.json                module-level dead-code detector
  .githooks/pre-push       fast local gate (format, types, coverage, graph, dup, build)
  .github/workflows/ci.yml full gate incl. typed lint + knip (CI-only, kept out of pre-push for speed)
  tsconfig.json            merged: allowUnreachableCode:false, noUnusedLocals/Parameters:true
  package.json             hygiene scripts added

RUN THESE TO VERIFY THE GATES GO GREEN
  npm run format:check
  npm run typecheck
  npm run lint
  npm run depcruise
  npm run jscpd
  npm run knip
  npm run coverage:check
  $([ "$STACK" = react-native ] && echo 'npm run build   # Metro bundle' || echo 'npm run build')

BASELINE-THEN-RATCHET (read before the first green run)
  A repo with an existing backlog will not pass every gate on day one, and that is
  expected. Baseline first, then ratchet UP:
    - eslint @typescript-eslint/no-unnecessary-condition: if it floods, switch it to
      "warn" in .eslintrc.json, burn the backlog down, then flip back to "error".
    - .jscpd.json threshold: run 'npm run jscpd' once, read the reported %, set the
      threshold JUST ABOVE it, then ratchet DOWN as you extract clones.
    - .c8rc.json: exclude your genuine I/O glue (see the //exclusion-rule note in the
      file) so 85% is reachable on the pure-logic layer; never exclude branching logic.
  PER-REPO TUNING you must still do by hand: the .dependency-cruiser.js boundary
  globs (marked # EDIT:), and knip.json ignore entries for dynamic-import / lazy /
  navigation-registry entry points (annotate, do not delete - see setup/README.md).
EOF
