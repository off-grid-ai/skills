#!/bin/zsh
# Makes a git worktree cost almost no disk: clones heavy folders from the main checkout with
# copy-on-write (`cp -c` on macOS APFS, `cp --reflink=auto` on Linux) instead of installing or
# copying them. A clone shares blocks with the source until either side changes a file. Example: a
# 2.3 GB node_modules cloned in 14 s for 41 MB of real space. On a file system without clones the
# copy is a normal full copy, so prefer a plain install there.
#
#   lean-worktree.sh [--replace] <worktree> [main-checkout]   (main defaults to the repo's first worktree)
#   --replace  also slims a worktree that already has its own node_modules: the old folder is moved
#              aside, replaced by a clone (+ npm install for lockfile differences), and deleted only
#              when that succeeded. On failure the old folder is put back.
#
# - node_modules (every one, nested workspaces too): cloned when missing or symlinked.
#   Never symlink node_modules: Node, Vite and Electron follow the link to the main checkout,
#   and an npm install in the worktree then writes into main.
# - Tracked heavy folders (bundled binaries, LFS files): list them in LEAN_HEAVY_DIRS, space
#   separated, relative to the repo root (e.g. LEAN_HEAVY_DIRS="resources/bin assets/models").
#   Each is re-cloned only when identical to main at both HEADs and unmodified in the worktree.
# - If package-lock.json differs from main, runs `npm install` after the clone. npm rewrites
#   only the packages that changed; the rest stay shared.
set -euo pipefail
if [[ "$(uname)" == "Darwin" ]]; then CLONE=(cp -c -R); else CLONE=(cp -R --reflink=auto); fi
HEAVY=(${=LEAN_HEAVY_DIRS:-})
REPLACE=0
[[ "${1:-}" == "--replace" ]] && { REPLACE=1; shift; }
WT=${1:?usage: lean-worktree.sh [--replace] <worktree> [main-checkout]}
WT=${WT:A}
MAIN=${2:-$(git -C "$WT" worktree list --porcelain | awk '/^worktree /{print $2; exit}')}
MAIN=${MAIN:A}
[[ "$WT" == "$MAIN" ]] && { echo "That is the main checkout; nothing to do."; exit 0; }
df -k "$WT" >/dev/null
before=$(df -k "$WT" | tail -1 | awk '{print $4}')
OLD=()
restore() { for d in "${OLD[@]}"; do [[ -d "$d.lean-old" ]] && { rm -rf "$d"; mv "$d.lean-old" "$d"; echo "restored $d"; }; done; }
trap 'restore' ERR

# 1. node_modules: clone each one main has (root and nested workspaces).
for src in ${(f)"$(cd "$MAIN" && find . -type d -name node_modules -prune -not -path './.git/*' 2>/dev/null)"}; do
  rel=${src#./}; dst="$WT/$rel"
  [[ -d "$(dirname "$dst")" ]] || continue
  if [[ -L "$dst" ]]; then rm "$dst"; fi
  if [[ -e "$dst" ]]; then
    (( REPLACE )) || { echo "keep    $rel (already a real folder; --replace slims it)"; continue; }
    mv "$dst" "$dst.lean-old"; OLD+=("$dst")
  fi
  "${CLONE[@]}" "$MAIN/$rel" "$dst" && echo "clone   $rel"
done

# 2. Tracked heavy folders: only when byte-identical to main and clean in the worktree.
for rel in "${HEAVY[@]}"; do
  [[ -d "$MAIN/$rel" && -d "$WT/$rel" ]] || continue
  if git -C "$WT" diff --quiet "$(git -C "$MAIN" rev-parse HEAD)" HEAD -- "$rel" 2>/dev/null \
     && [[ -z "$(git -C "$WT" status --porcelain -- "$rel")" ]]; then
    rm -rf "$WT/$rel" && "${CLONE[@]}" "$MAIN/$rel" "$WT/$rel" && echo "clone   $rel (same as main)"
  else
    echo "keep    $rel (differs from main)"
  fi
done

# 3. Dependencies changed on this branch: let npm update only what differs.
for lock in ${(f)"$(cd "$WT" && git ls-files '*package-lock.json' 2>/dev/null)"}; do
  if ! cmp -s "$MAIN/$lock" "$WT/$lock"; then
    echo "npm     ${lock:h} (lockfile differs from main)"
    (cd "$WT/${lock:h}" && npm install --no-audit --no-fund --loglevel=error)
  fi
done

trap - ERR
for d in "${OLD[@]}"; do rm -rf "$d.lean-old"; done
after=$(df -k "$WT" | tail -1 | awk '{print $4}')
echo "Done. Free space change: $(( (after - before) / 1024 )) MB"
