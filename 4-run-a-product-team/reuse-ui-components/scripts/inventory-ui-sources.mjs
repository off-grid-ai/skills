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
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function walk(root, predicate, files = [], depth = Infinity) {
  if (!existsSync(root) || depth < 0) return files;
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
    if (metadata.isDirectory()) walk(path, predicate, files, depth - 1);
    else if (predicate(path)) files.push(path);
  }
  return files;
}

function firstExisting(candidates, markers) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const path = resolve(candidate);
    if (markers.some((marker) => existsSync(join(path, marker))))
      return realpathSync(path);
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
// Folder (inside the library and the product) that holds components.
const componentsDir = arg("--components-dir") ?? "src/components";
const extensions = (arg("--ext") ?? ".tsx,.jsx,.vue,.svelte").split(",");
const isComponent = (path) => extensions.some((ext) => path.endsWith(ext));
// The design source: a folder holding the design philosophy, design system or brand guide.
const designMarkers = [
  "DESIGN_PHILOSOPHY.md",
  "DESIGN.md",
  "DESIGN_SYSTEM.md",
  "BRAND.md",
  "STYLEGUIDE.md",
];
const brand = firstExisting(
  [
    arg("--brand") ?? process.env.UI_BRAND_DIR,
    product,
    join(product, "docs"),
    join(product, "design"),
    join(productParent, "brand"),
    join(productParent, "design-system"),
  ],
  designMarkers,
);
// The shared component library: a sibling checkout, an installed package, or the product itself.
const library = firstExisting(
  [
    arg("--library") ?? process.env.UI_LIBRARY_DIR,
    join(productParent, "component-library"),
    join(productParent, "ui"),
    join(productParent, "design-system"),
    product,
  ],
  [componentsDir],
);

if (!brand || !library) {
  console.error(
    JSON.stringify(
      {
        error: "Required UI source missing",
        hint: "Pass --brand <folder with the design doc> and --library <component library root>, or set UI_BRAND_DIR / UI_LIBRARY_DIR. Use --components-dir if components are not in src/components.",
        product,
        brand,
        library,
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

const requestedFamily = arg("--family");
const behavior = arg("--behavior")?.toLowerCase();
const components = walk(join(library, componentsDir), isComponent)
  .sort()
  .map((path) => {
    const facts = sourceFacts(path);
    return {
      family: basename(dirname(path)),
      name: basename(path).replace(/\.[^.]+$/, ""),
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

const localComponents = (library === product ? [] : walk(join(product, componentsDir), isComponent))
  .sort()
  .map((path) => path.slice(product.length + 1));

const brandDocs = walk(brand, (path) => path.endsWith(".md"), [], 2)
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
