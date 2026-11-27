#!/usr/bin/env node
// Rebuilds every install manifest from the skill folders, so adding a skill never needs hand edits.
//   node scripts/build-manifests.mjs
// Writes:
//   .claude-plugin/marketplace.json      Claude Code: /plugin marketplace add off-grid-ai/skills
//   .agents/plugins/marketplace.json     Codex:       codex plugin marketplace add off-grid-ai/skills
//   <set>/.claude-plugin/plugin.json      one plugin per set (skills live in <set>/skills/<name>/SKILL.md)
//   <set>/.codex-plugin/plugin.json
// `npx skills add off-grid-ai/skills` needs no manifest: it finds every SKILL.md itself.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const owner = { name: 'Off Grid AI', url: 'https://www.wednesday.is/mcp/' };

const catalog = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'catalog.json'), 'utf8'));
const sets = catalog.sets
  .map(({ dir, plugin }) => {
    // plugin name can differ from the folder (the Claude directory needs distinct names: off-grid-<folder>)
    const name = plugin || dir;
    const skills = fs.readdirSync(path.join(root, dir, 'skills'))
      .filter((s) => fs.existsSync(path.join(root, dir, 'skills', s, 'SKILL.md')))
      .sort();
    const readme = fs.existsSync(path.join(root, dir, 'README.md'))
      ? fs.readFileSync(path.join(root, dir, 'README.md'), 'utf8') : '';
    // first non-heading, non-empty, non-image line of the set README is its pitch
    const pitch = (readme.split('\n').find((l) => l.trim() && !/^(#|!\[|<)/.test(l.trim())) || name).trim();
    return { dir, name, skills, pitch };
  });

const write = (rel, obj) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
};

for (const s of sets) {
  const manifest = {
    name: s.name,
    version,
    description: s.pitch,
    author: owner,
    homepage: 'https://github.com/off-grid-ai/skills',
    repository: 'https://github.com/off-grid-ai/skills',
    license: 'MIT',
    keywords: ['agent-skills', ...s.skills],
    skills: './skills/',
  };
  write(`${s.dir}/.claude-plugin/plugin.json`, manifest);
  write(`${s.dir}/.codex-plugin/plugin.json`, manifest);
}

write('.claude-plugin/marketplace.json', {
  name: 'off-grid-ai',
  description: pkg.description,
  owner,
  plugins: sets.map((s) => ({
    name: s.name,
    source: `./${s.dir}`,
    description: s.pitch,
    category: 'productivity',
    tags: ['agent-skills', 'claude-code', 'codex'],
    homepage: 'https://github.com/off-grid-ai/skills',
  })),
});

write('.agents/plugins/marketplace.json', {
  name: 'off-grid-ai',
  interface: { displayName: 'Off Grid AI skills' },
  plugins: sets.map((s) => ({
    name: s.name,
    source: { source: 'local', path: `./${s.dir}` },
    policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
    category: 'Productivity',
    description: s.pitch,
  })),
});

const total = sets.reduce((n, s) => n + s.skills.length, 0);
console.log(`${sets.length} plugins, ${total} skills, version ${version}`);
for (const s of sets) console.log(`  ${s.name}: ${s.skills.length}`);
