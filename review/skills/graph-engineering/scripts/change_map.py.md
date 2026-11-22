# change_map.py

This is the `change_map.py` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `change_map.py` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~python
#!/usr/bin/env python3
"""Change map: find every place one change touches, across every app in a repo.

It finds the apps (web, mobile, desktop, extension, server, shared packages, games)
from their marker files, searches them for the change's terms, groups the hits by
app, and prints suspects worth a look: the same thing defined in more than one app
(a copy of a shared rule), a shared package importing from an app (a backward
arrow), and open pull requests that touch the same files (collisions).

It only finds suspects. The agent reads the code behind each one and decides.

Usage:
  python3 change_map.py --list                         # apps and saved concepts
  python3 change_map.py --term "dark ?mode" --term theme
  python3 change_map.py --concept theme                # terms saved in concepts.json
  python3 change_map.py --concept theme --json out/change-map.json --prs

Options:
  --root DIR        repo root (default: git top level, else the current folder)
  --concepts FILE   saved concepts (default: <root>/docs/change-review/concepts.json)
                    {"theme": {"terms": ["dark ?mode", "colorScheme"], "paths": ["*/theme/*"]}}
  --learned FILE    what the loop learned (default: <root>/docs/change-review/learned.json);
                    its "cleared" entries hide suspects already judged fine
  --app DIR=KIND    add or correct an app by hand (repeatable), e.g. --app apps/site=web
  --prs             also check open GitHub pull requests for collisions (needs gh)
  --json FILE       write the full result as JSON
Environment: CHANGE_MAP_ROOT, CHANGE_MAP_CONCEPTS and CHANGE_MAP_LEARNED set the same values.
"""
import argparse
import fnmatch
import json
import os
import re
import shutil
import subprocess
import sys
from collections import defaultdict

SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", "out", ".next", ".nuxt", ".turbo", "coverage",
    "Pods", "DerivedData", ".gradle", "vendor", ".venv", "venv", "__pycache__", "target",
    ".expo", ".cache", ".idea", ".vscode", "docs",
}
MARKERS = (
    "package.json", "pubspec.yaml", "build.gradle", "build.gradle.kts", "Package.swift",
    "Cargo.toml", "go.mod", "pyproject.toml", "setup.py", "Gemfile", "composer.json",
    "project.godot", "manifest.json",
)
SHARED_HINTS = ("shared", "common", "core", "lib", "libs", "packages", "ui", "design", "sdk", "utils")
MAX_DEPTH = 4
DEF_RE = re.compile(
    r"\b(?:function|const|let|var|def|class|fun|func|interface|type|enum|struct|protocol|object)\s+([A-Za-z_][A-Za-z0-9_]*)"
)
IMPORT_RE = re.compile(r"""(?:import\s[^'"]*?from\s*|import\s*\(\s*|require\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]""")


def run(cmd, cwd):
    try:
        return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=False).stdout
    except OSError:
        return ""


def repo_root(arg):
    if arg:
        return os.path.abspath(arg)
    top = run(["git", "rev-parse", "--show-toplevel"], os.getcwd()).strip()
    return top or os.getcwd()


def read_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def guess_kind(d, files):
    """Guess what kind of app a folder holds from its marker files."""
    name = os.path.basename(d).lower()
    if "manifest.json" in files and "manifest_version" in open(os.path.join(d, "manifest.json"), encoding="utf-8", errors="ignore").read():
        return "extension"
    if "project.godot" in files:
        return "game"
    if "pubspec.yaml" in files:
        return "mobile"
    if any(f.endswith(".xcodeproj") for f in files) or "Package.swift" in files:
        return "apple"
    if "build.gradle" in files or "build.gradle.kts" in files:
        txt = " ".join(open(os.path.join(d, f), encoding="utf-8", errors="ignore").read()
                       for f in ("build.gradle", "build.gradle.kts") if f in files)
        return "mobile" if "com.android" in txt else "jvm"
    if "package.json" in files:
        pkg = read_json(os.path.join(d, "package.json"), {})
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        has = lambda *names: any(n in deps for n in names)  # noqa: E731
        if has("electron", "@tauri-apps/api", "@tauri-apps/cli", "@neutralinojs/lib"):
            return "desktop"
        if has("react-native", "expo"):
            return "mobile"
        if has("wxt", "plasmo", "webextension-polyfill") or "@types/chrome" in deps:
            return "extension"
        if has("next", "nuxt", "astro", "@sveltejs/kit", "vite", "react-scripts", "@angular/core", "gatsby", "remix", "@remix-run/react"):
            return "web"
        if has("express", "fastify", "@nestjs/core", "hono", "koa"):
            return "server"
        if any(h in name for h in SHARED_HINTS) or "/packages/" in d.replace(os.sep, "/"):
            return "shared"
        return "web" if has("react", "vue", "svelte") else "library"
    if "Cargo.toml" in files:
        return "desktop" if "tauri" in open(os.path.join(d, "Cargo.toml"), encoding="utf-8", errors="ignore").read() else "library"
    if any(f in files for f in ("go.mod", "pyproject.toml", "setup.py", "Gemfile", "composer.json")):
        return "shared" if any(h == name for h in SHARED_HINTS) else "server"
    return "library"


def find_apps(root, manual):
    apps = {}
    for d, dirs, files in os.walk(root):
        depth = os.path.relpath(d, root).count(os.sep) + (0 if d == root else 1)
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS and not x.startswith(".")]
        if depth >= MAX_DEPTH:
            dirs[:] = []
        entries = set(files) | {x for x in os.listdir(d) if x.endswith(".xcodeproj")}
        if any(m in entries for m in MARKERS) or any(x.endswith(".xcodeproj") for x in entries):
            rel = os.path.relpath(d, root)
            rel = "" if rel == "." else rel.replace(os.sep, "/")
            if "manifest.json" in entries and not (entries & (set(MARKERS) - {"manifest.json"})):
                try:
                    if "manifest_version" not in open(os.path.join(d, "manifest.json"), encoding="utf-8", errors="ignore").read():
                        continue
                except OSError:
                    continue
            pkg = read_json(os.path.join(d, "package.json"), {}) if "package.json" in entries else {}
            apps[rel] = {"id": rel or "root", "path": rel, "platform": guess_kind(d, entries), "package": pkg.get("name")}
    for spec in manual:
        path, _, kind = spec.partition("=")
        path = path.strip("/")
        apps[path] = {**apps.get(path, {}), "id": path or "root", "path": path, "platform": kind or "library",
                      "package": apps.get(path, {}).get("package")}
    if len(apps) > 1 and "" in apps and not any(s.startswith("root=") or s.startswith("=") for s in manual):
        apps[""]["platform"] = "root"  # the workspace root: config, not an app
    return apps


def app_of(path, apps):
    best = ""
    for p in apps:
        if p and (path == p or path.startswith(p + "/")) and len(p) > len(best):
            best = p
    return best if best in apps else ("" if "" in apps else None)


def grep(root, terms, path_globs):
    """Return {file: [(line_no, text)]} for lines matching any term (case-insensitive)."""
    pattern = "|".join(f"({t})" for t in terms)
    hits = defaultdict(list)
    if os.path.isdir(os.path.join(root, ".git")) or run(["git", "rev-parse", "--git-dir"], root).strip():
        out = run(["git", "grep", "-n", "-I", "-i", "-E", pattern, "--", "."], root)
        for line in out.splitlines():
            f, _, rest = line.partition(":")
            n, _, text = rest.partition(":")
            if n.isdigit():
                hits[f].append((int(n), text.strip()[:200]))
    else:
        rx = re.compile(pattern, re.I)
        for d, dirs, files in os.walk(root):
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS and not x.startswith(".")]
            for name in files:
                full = os.path.join(d, name)
                try:
                    with open(full, encoding="utf-8") as fh:
                        for i, text in enumerate(fh, 1):
                            if rx.search(text):
                                hits[os.path.relpath(full, root).replace(os.sep, "/")].append((i, text.strip()[:200]))
                except (OSError, UnicodeDecodeError):
                    continue
    # A path glob also counts a file as touched even when no term matches inside it.
    if path_globs:
        out = run(["git", "ls-files"], root).splitlines()
        for f in out:
            if any(fnmatch.fnmatch(f, g) for g in path_globs) and f not in hits:
                hits[f].append((0, "(matched by path)"))
    return hits


def suspects(hits, apps, terms, root):
    found = []
    rx = re.compile("|".join(f"({t})" for t in terms), re.I)
    # 1. The same name defined in more than one app: a possible copy of a shared rule.
    defs = defaultdict(set)
    for f, lines in hits.items():
        a = app_of(f, apps)
        for n, text in lines:
            for m in DEF_RE.finditer(text):
                if rx.search(m.group(1)):
                    defs[m.group(1)].add((a, f, n))
    for name, where in sorted(defs.items()):
        in_apps = {a for a, _, _ in where}
        if len(in_apps) > 1:
            found.append({"id": f"copy:{name}", "kind": "copy-of-shared-rule",
                          "title": f"{name} is defined in {len(in_apps)} places",
                          "files": sorted(f"{f}:{n}" for _, f, n in where)})
    # 2. A shared package importing from an app: a backward arrow.
    app_pkgs = {a["package"]: p for p, a in apps.items() if a.get("package") and a["platform"] not in ("shared", "library", "root")}
    for f in hits:
        a = app_of(f, apps)
        if a is None or apps[a]["platform"] not in ("shared", "library"):
            continue
        try:
            text = open(os.path.join(root, f), encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        for m in IMPORT_RE.finditer(text):
            target = m.group(1)
            into = None
            if target.startswith("."):
                resolved = os.path.normpath(os.path.join(os.path.dirname(f), target)).replace(os.sep, "/")
                t_app = app_of(resolved, apps)
                if t_app is not None and t_app != a and apps[t_app]["platform"] not in ("shared", "library", "root"):
                    into = t_app
            else:
                for pkg, p in app_pkgs.items():
                    if target == pkg or target.startswith(pkg + "/"):
                        into = p
            if into is not None:
                found.append({"id": f"arrow:{f}->{into}", "kind": "backward-arrow",
                              "title": f"Shared code in {a or 'root'} imports from the app {into}",
                              "files": [f]})
    # 3. One file touching the change from many angles: check it does one job.
    for f, lines in hits.items():
        if len(lines) >= 25:
            found.append({"id": f"big:{f}", "kind": "many-jobs-in-one-file",
                          "title": f"{f} mentions the change {len(lines)} times", "files": [f]})
    return found


def collisions(hit_files, root):
    if not shutil.which("gh"):
        return [{"what": "gh is not installed, so open pull requests were not checked", "files": []}]
    out = run(["gh", "pr", "list", "--state", "open", "--limit", "50", "--json", "number,title,files"], root)
    try:
        prs = json.loads(out or "[]")
    except ValueError:
        return [{"what": "Could not read open pull requests (is gh signed in?)", "files": []}]
    res = []
    for pr in prs:
        shared = sorted({x.get("path") for x in pr.get("files") or []} & set(hit_files))
        if shared:
            res.append({"what": f"PR #{pr['number']} ({pr['title']}) also edits these files", "files": shared})
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=os.environ.get("CHANGE_MAP_ROOT"))
    ap.add_argument("--term", action="append", default=[])
    ap.add_argument("--concept", action="append", default=[])
    ap.add_argument("--concepts", default=os.environ.get("CHANGE_MAP_CONCEPTS"))
    ap.add_argument("--learned", default=os.environ.get("CHANGE_MAP_LEARNED"))
    ap.add_argument("--app", action="append", default=[])
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--prs", action="store_true")
    ap.add_argument("--json")
    a = ap.parse_args()

    root = repo_root(a.root)
    concepts = read_json(a.concepts or os.path.join(root, "docs/change-review/concepts.json"), {})
    learned = read_json(a.learned or os.path.join(root, "docs/change-review/learned.json"), {})
    apps = find_apps(root, a.app)

    if a.list:
        print(f"Apps in {root}:")
        for p, info in sorted(apps.items()):
            print(f"  {info['platform']:<10} {p or '.'}" + (f"  ({info['package']})" if info.get("package") else ""))
        print("Saved concepts:", ", ".join(sorted(concepts)) or "none yet")
        return 0

    terms, globs = list(a.term), []
    for c in a.concept:
        if c not in concepts:
            print(f"No saved concept '{c}'. Saved: {', '.join(sorted(concepts)) or 'none'}. Use --term.", file=sys.stderr)
            return 2
        terms += concepts[c].get("terms", [])
        globs += concepts[c].get("paths", [])
    if not terms and not globs:
        print("Give at least one --term or --concept.", file=sys.stderr)
        return 2

    hits = grep(root, terms or ["(?!)"], globs)
    by_app = defaultdict(dict)
    for f, lines in hits.items():
        p = app_of(f, apps)
        by_app[p if p is not None else ""][f] = lines

    cleared = [c.get("match", "") for c in learned.get("cleared", []) if c.get("match")]
    sus = [s for s in suspects(hits, apps, terms or ["(?!)"], root) if not any(m in s["id"] for m in cleared)]
    hidden = len(suspects(hits, apps, terms or ["(?!)"], root)) - len(sus)
    col = collisions(list(hits), root) if a.prs else []

    print(f"Change map for: {', '.join(a.concept + a.term)}")
    print(f"{len(hits)} files in {len(by_app)} places\n")
    for p in sorted(by_app, key=lambda x: (apps.get(x, {}).get("platform") != "shared", x)):
        info = apps.get(p, {"platform": "?"})
        files = by_app[p]
        print(f"## {p or '.'}  [{info['platform']}]  {len(files)} files")
        for f in sorted(files, key=lambda x: -len(files[x]))[:12]:
            print(f"  {f}  ({len(files[f])} lines)")
        if len(files) > 12:
            print(f"  ... and {len(files) - 12} more")
    print("\nSuspects (read the code before you call any of them real):")
    for s in sus:
        print(f"  [{s['kind']}] {s['title']}\n      " + "\n      ".join(s["files"][:6]))
    if not sus:
        print("  none")
    if hidden:
        print(f"  ({hidden} hidden: already cleared in learned.json)")
    if a.prs:
        print("\nCollisions:")
        for c in col or [{"what": "none", "files": []}]:
            print(f"  {c['what']}" + (": " + ", ".join(c["files"]) if c["files"] else ""))

    if a.json:
        out = {
            "terms": terms, "concepts": a.concept,
            "apps": [{"id": p or "root", "path": p, "platform": apps.get(p, {}).get("platform", "?"),
                      "files": len(fs), "fileList": sorted(fs)} for p, fs in by_app.items()],
            "suspects": sus, "collisions": col,
        }
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"\nWrote {a.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
~~~~~
