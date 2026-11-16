#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function flag(name) {
  return process.argv.includes(name);
}

function git(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function walk(root, predicate, files = []) {
  if (!existsSync(root)) return files;
  for (const entry of readdirSync(root)) {
    if (
      entry === "node_modules" ||
      entry === ".git" ||
      entry === "dist" ||
      entry === ".next"
    )
      continue;
    const path = join(root, entry);
    const metadata = statSync(path);
    if (metadata.isDirectory()) walk(path, predicate, files);
    else if (predicate(path)) files.push(path);
  }
  return files;
}

function firstExisting(candidates, marker) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const path = resolve(candidate);
    if (existsSync(join(path, marker))) return realpathSync(path);
  }
  return null;
}

function exportedSymbols(path) {
  const source = readFileSync(path, "utf8");
  const symbols = new Set();
  for (const match of source.matchAll(
    /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    symbols.add(match[1]);
  }
  if (/export\s+default\s+/.test(source) && symbols.size === 0)
    symbols.add("default");
  return [...symbols].sort();
}

function sourceFacts(path) {
  const source = readFileSync(path, "utf8");
  const dependencies = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );
  return {
    acceptsProps:
      /export\s+(?:default\s+)?function\s+[A-Za-z_$][\w$]*\s*\(\s*[^)]/.test(
        source,
      ) || /export\s+const\s+[A-Za-z_$][\w$]*\s*=\s*\(\s*[^)]/.test(source),
    clientDirective: /^['"]use client['"];?/m.test(source),
    dependencies: [...new Set(dependencies)].sort(),
    usesReactState:
      /\buse(?:State|Reducer|Context|Effect|LayoutEffect)\s*\(/.test(source),
    hasAriaOrRole: /\baria-[\w-]+\s*=|\brole\s*=/.test(source),
    honorsReducedMotion:
      /prefers-reduced-motion|useReducedMotion|motion-reduce/.test(source),
    hasInfiniteAnimation: /Infinity|infinite/.test(source),
    animatesLayout:
      /animate\s*=\s*\{[^}]*(?:width|height|top|left|right|bottom)/s.test(
        source,
      ),
    usesRandom: /Math\.random\s*\(/.test(source),
    usesGradient: /gradient/i.test(source),
    usesHeavyShadow: /shadow-(?:lg|xl|2xl)|drop-shadow/i.test(source),
    usesPillRadius: /rounded-(?:full|\[999)/.test(source),
  };
}

const requestedProduct = arg("--product") ?? process.cwd();
const product =
  git(requestedProduct, ["rev-parse", "--show-toplevel"]) ??
  resolve(requestedProduct);
const productParent = dirname(product);
const brand = firstExisting(
  [
    arg("--brand"),
    join(productParent, "brand"),
    join(homedir(), "code/off-grid-ai/brand"),
  ],
  "DESIGN_PHILOSOPHY.md",
);
const library = firstExisting(
  [
    arg("--library"),
    join(productParent, "component-library-animations"),
    join(dirname(productParent), "component-library-animations"),
    join(homedir(), "code/component-library-animations"),
  ],
  "src/components",
);

if (!brand || !library) {
  console.error(
    JSON.stringify(
      { error: "Required UI source missing", product, brand, library },
      null,
      2,
    ),
  );
  process.exit(2);
}

const requestedFamily = arg("--family");
const behavior = arg("--behavior")?.toLowerCase();
const components = walk(join(library, "src/components"), (path) =>
  path.endsWith(".tsx"),
)
  .sort()
  .map((path) => {
    const facts = sourceFacts(path);
    return {
      family: basename(dirname(path)),
      name: basename(path, ".tsx"),
      path,
      exports: exportedSymbols(path),
      ...facts,
      catalogueOnly: !facts.acceptsProps,
    };
  })
  .filter(
    (component) => !requestedFamily || component.family === requestedFamily,
  )
  .filter((component) => {
    if (!behavior) return true;
    return JSON.stringify(component).toLowerCase().includes(behavior);
  });

const localComponents = walk(join(product, "src/components"), (path) =>
  path.endsWith(".tsx"),
)
  .sort()
  .map((path) => path.slice(product.length + 1));

const brandDocs = walk(brand, (path) => path.endsWith(".md"))
  .sort()
  .map((path) => path.slice(brand.length + 1));

const byFamily = Object.fromEntries(
  [...new Set(components.map((component) => component.family))]
    .sort()
    .map((family) => [
      family,
      components.filter((component) => component.family === family),
    ]),
);

const familyCounts = Object.fromEntries(
  Object.entries(byFamily).map(([family, members]) => [family, members.length]),
);
const factCounts = Object.fromEntries(
  [
    "acceptsProps",
    "clientDirective",
    "usesReactState",
    "hasAriaOrRole",
    "honorsReducedMotion",
    "hasInfiniteAnimation",
    "animatesLayout",
    "usesRandom",
    "usesGradient",
    "usesHeavyShadow",
    "usesPillRadius",
    "catalogueOnly",
  ].map((fact) => [
    fact,
    components.filter((component) => component[fact]).length,
  ]),
);

const output = flag("--summary")
  ? {
      product: { path: product, commit: git(product, ["rev-parse", "HEAD"]) },
      brand: { path: brand, docs: brandDocs },
      library: {
        path: library,
        remote: git(library, ["remote", "get-url", "origin"]),
        commit: git(library, ["rev-parse", "HEAD"]),
        componentCount: components.length,
        familyCounts,
        factCounts,
      },
      productLocalComponentCount: localComponents.length,
    }
  : {
      product: { path: product, commit: git(product, ["rev-parse", "HEAD"]) },
      brand: { path: brand, docs: brandDocs },
      library: {
        path: library,
        remote: git(library, ["remote", "get-url", "origin"]),
        commit: git(library, ["rev-parse", "HEAD"]),
        componentCount: components.length,
        families: byFamily,
      },
      productLocalComponentCount: localComponents.length,
      productLocalComponents: localComponents,
    };

const serialized = `${JSON.stringify(output, null, 2)}\n`;
const outputPath = arg("--output");
if (outputPath) writeFileSync(resolve(outputPath), serialized, "utf8");
else process.stdout.write(serialized);
