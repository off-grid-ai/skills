# For AI agents: how to install these skills

If a user says "install the skills from github.com/off-grid-ai/skills", pick the first method that fits your environment and install every set unless they name one.

1. **You are Claude Code.** Run `/plugin marketplace add off-grid-ai/skills`, then `/plugin install <set>@off-grid-ai`
   for each set the user wants (sets: off-grid-review, off-grid-testing, off-grid-codebase). From a shell:
   `claude plugin marketplace add off-grid-ai/skills` and `claude plugin install <set>@off-grid-ai`.
2. **You are Codex.** Run `codex plugin marketplace add off-grid-ai/skills`, then `codex plugin add <set>@off-grid-ai`.
3. **Node is available (any agent).** Run `npx skills add off-grid-ai/skills` and choose skills and agents, or
   `npx skills add off-grid-ai/skills --all -g` for every skill in every agent on the machine.
4. **Anything else.** Run `bash <(curl -fsSL https://raw.githubusercontent.com/off-grid-ai/skills/main/install.sh)`.
   It clones to `~/.off-grid-skills` and links each skill into every agent's global skills folder it finds.
5. **Manual.** Copy any folder that holds a `SKILL.md` into your skills folder (`~/.claude/skills`,
   `~/.agents/skills`, `~/.cursor/skills`, `~/.gemini/skills`, `~/.copilot/skills`, or the project's
   `.agents/skills`).

Each skill is a folder with a `SKILL.md` (instructions, with `name` and `description` frontmatter) and sometimes
`references/` or `scripts/`. Skills load on demand when the user's request matches the description, or when the
user names them (`/code-check` or `/blast-radius` in Claude Code, or "use the code-check skill" anywhere).

## Working on this repo
- One folder per set (`review/`, `testing/`, ...), and each skill at `<set>/skills/<name>/SKILL.md`. The skill
  folder name equals its `name:` frontmatter. Each set folder is published as the plugin `off-grid-<folder>` (set by
  `plugin` in `scripts/catalog.json`), so its name never clashes with another publisher's.
- Each set folder is submitted to the Claude plugin directory on its own, so a set folder may only hold Markdown,
  plain text, JSON, YAML and PNG/JPEG/GIF/WebP/ICO images, plus `.claude-plugin/icon.png`. No scripts, HTML or
  executables: a skill that needs one keeps it as `<file>.md` holding the code in a `~~~~~` fence, and its SKILL.md
  says how to write it out ("Bundled files"). Pictures for the README go in `assets/`.
- After adding, removing or moving a skill, run `node scripts/build-manifests.mjs` to rebuild the Claude Code and
  Codex manifests, then `claude plugin validate .`.
