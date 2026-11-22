#!/usr/bin/env bash
# Install every skill for every agent on this machine, with no Node needed.
#
#   curl -fsSL https://raw.githubusercontent.com/off-grid-ai/skills/main/install.sh | bash
#   bash install.sh             install or update
#   bash install.sh --uninstall remove the links this script made
#
# It keeps one copy in ~/.off-grid-skills (git pull to update) and links each skill into the skills folder of
# every agent it finds: Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, Windsurf, OpenCode, Kiro, and any
# agent that reads ~/.agents/skills.
set -euo pipefail

REPO="${OFF_GRID_SKILLS_REPO:-https://github.com/off-grid-ai/skills.git}"
HOME_DIR="${OFF_GRID_SKILLS_HOME:-$HOME/.off-grid-skills}"

# agent config folder (detect) -> its global skills folder
TARGETS=(
  "$HOME/.claude|$HOME/.claude/skills"
  "$HOME/.agents|$HOME/.agents/skills"
  "$HOME/.codex|$HOME/.agents/skills"
  "$HOME/.cursor|$HOME/.cursor/skills"
  "$HOME/.gemini|$HOME/.gemini/skills"
  "$HOME/.copilot|$HOME/.copilot/skills"
  "$HOME/.codeium/windsurf|$HOME/.codeium/windsurf/skills"
  "$HOME/.config/opencode|$HOME/.config/opencode/skills"
  "$HOME/.kiro|$HOME/.kiro/skills"
)

skills() { find "$HOME_DIR" -mindepth 4 -maxdepth 4 -path "*/skills/*" -name SKILL.md -not -path '*/.git/*' -exec dirname {} \; | sort; }

if [[ "${1:-}" == "--uninstall" ]]; then
  for t in "${TARGETS[@]}"; do
    dest="${t#*|}"; [[ -d "$dest" ]] || continue
    for link in "$dest"/*; do
      [[ -L "$link" && "$(readlink "$link")" == "$HOME_DIR"/* ]] && rm "$link" && echo "removed $link"
    done
  done
  exit 0
fi

command -v git >/dev/null || { echo "git is required"; exit 1; }
if [[ -d "$HOME_DIR/.git" ]]; then
  git -C "$HOME_DIR" pull --ff-only --quiet
else
  git clone --depth 1 --quiet "$REPO" "$HOME_DIR"
fi

linked=0; agents=()
for t in "${TARGETS[@]}"; do
  detect="${t%%|*}"; dest="${t#*|}"
  # always install for the shared ~/.agents/skills folder; others only if that agent is installed
  [[ -d "$detect" || "$dest" == "$HOME/.agents/skills" ]] || continue
  [[ " ${agents[*]-} " == *" $dest "* ]] && continue
  agents+=("$dest"); mkdir -p "$dest"
  while read -r s; do
    name="$(basename "$s")"; link="$dest/$name"
    if [[ -e "$link" && ! -L "$link" ]]; then echo "skipped $link (you already have a skill with this name)"; continue; fi
    ln -sfn "$s" "$link"; linked=$((linked + 1))
  done < <(skills)
done

echo "Installed $(skills | wc -l | tr -d ' ') skills into ${#agents[@]} agent folders:"
printf '  %s\n' "${agents[@]}"
echo "Update any time: bash $HOME_DIR/install.sh"
echo "Try it in your agent: \"Use graph-engineering to rename one thing across the app.\""
