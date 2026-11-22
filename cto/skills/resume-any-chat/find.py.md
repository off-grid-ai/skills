# find.py

This is the `find.py` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `find.py` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~python
#!/usr/bin/env python3
"""find.py "<chat name>" [tail] [options]

Find an agent chat on this computer by its title and print the tail of its transcript.

Looks in every place it can find, with no setup:
  - Claude Code: $CLAUDE_CONFIG_DIR, ~/.claude, any ~/.claude* folder, and any folder one level
    inside those that has its own projects/ (for people who run several accounts side by side).
  - Claude desktop app chat titles (macOS ~/Library/Application Support/Claude*, Linux ~/.config/Claude*,
    Windows %APPDATA%/Claude*), mapped to their Claude Code transcripts.
  - Codex: $CODEX_HOME or ~/.codex (sessions/, archived_sessions/, session_index.jsonl).
  - Any extra folder passed with --dir (a Claude config dir, a projects/ dir, or a Codex home).

Examples:
  python3 find.py "release notes"            best match, last 60 events
  python3 find.py "release notes" 150        longer tail
  python3 find.py "release notes" --list     only list the matches
  python3 find.py "release notes" --pick 2   use match [2] from the list
  python3 find.py "pricing" --content        also search inside transcripts, not only titles
"""
import argparse
import datetime
import glob
import json
import os
import re
import shutil
import subprocess
import sys

HOME = os.path.expanduser("~")
CHUNK = 256 * 1024  # bytes read from the head and the tail of each transcript when looking for titles

TITLE_RES = [  # newest wins, in this order of trust
    re.compile(rb'"customTitle"\s*:\s*"((?:[^"\\]|\\.)*)"'),
    re.compile(rb'"aiTitle"\s*:\s*"((?:[^"\\]|\\.)*)"'),
    re.compile(rb'"type"\s*:\s*"summary"\s*,\s*"summary"\s*:\s*"((?:[^"\\]|\\.)*)"'),
]


def unescape(raw):
    try:
        return json.loads(b'"' + raw + b'"')
    except Exception:
        return raw.decode("utf-8", "replace")


def open_lines(path):
    """Lines of a transcript as bytes. Newer Codex builds store sessions as .jsonl.zst."""
    if not path.endswith(".zst"):
        return open(path, "rb")
    data = None
    try:
        from compression import zstd  # Python 3.14+
        data = zstd.decompress(open(path, "rb").read())
    except Exception:
        try:
            import zstandard
            data = zstandard.ZstdDecompressor().stream_reader(open(path, "rb")).read()
        except Exception:
            if shutil.which("zstd"):
                data = subprocess.run(["zstd", "-dcq", path], capture_output=True).stdout
    if data is None:
        raise OSError("cannot read .zst (install zstd or the zstandard module)")
    return iter(data.splitlines(True))


def head_and_tail(path):
    size = os.path.getsize(path)
    with open(path, "rb") as fh:
        head = fh.read(CHUNK)
        if size <= 2 * CHUNK:
            return head + fh.read()
        fh.seek(size - CHUNK)
        return head + b"\n" + fh.read()


# ---------- where to look ----------

def claude_config_dirs(extra):
    cands = []
    env = os.environ.get("CLAUDE_CONFIG_DIR")
    if env:
        cands += [p for p in re.split(r"[:;,]", env) if p]
    cands += [os.path.join(HOME, ".claude")]
    cands += [p for p in glob.glob(os.path.join(HOME, ".claude*")) if os.path.isdir(p)]
    cands += [os.path.join(HOME, ".config", "claude")]
    cands += extra
    out, seen = [], set()
    for c in cands:
        c = os.path.expanduser(c)
        for d in [c] + [p for p in glob.glob(os.path.join(c, "*")) if os.path.isdir(p)]:
            proj = d if os.path.basename(d.rstrip("/")) == "projects" else os.path.join(d, "projects")
            if not os.path.isdir(proj):
                continue
            real = os.path.realpath(proj)
            if real in seen:
                continue
            seen.add(real)
            out.append((d, proj))
    return out


def codex_homes(extra):
    cands = [os.environ.get("CODEX_HOME") or "", os.path.join(HOME, ".codex")] + extra
    out, seen = [], set()
    for c in cands:
        if not c:
            continue
        c = os.path.expanduser(c)
        if not (os.path.isdir(os.path.join(c, "sessions")) or os.path.isdir(os.path.join(c, "archived_sessions"))):
            continue
        real = os.path.realpath(c)
        if real not in seen:
            seen.add(real)
            out.append(c)
    return out


def desktop_titles():
    """Claude desktop app keeps chat titles beside the Claude Code transcripts. Map session id -> (title, app)."""
    roots = [os.path.join(HOME, "Library", "Application Support"), os.path.join(HOME, ".config")]
    if os.environ.get("APPDATA"):
        roots.append(os.environ["APPDATA"])
    titles = {}
    for root in roots:
        for f in glob.glob(os.path.join(root, "Claude*", "claude-code-sessions", "*", "*", "local_*.json")):
            try:
                d = json.load(open(f))
            except Exception:
                continue
            sid, title = d.get("cliSessionId"), d.get("title")
            if sid and title:
                app = f[len(root):].strip(os.sep).split(os.sep)[0]
                titles[sid] = (title, app, d)
    return titles


# ---------- reading transcripts ----------

def claude_title(path):
    blob = head_and_tail(path)
    for rx in TITLE_RES:
        found = rx.findall(blob)
        if found:
            return unescape(found[-1])
    return first_prompt(path, "claude")


def first_prompt(path, kind):
    try:
        for i, line in enumerate(open_lines(path)):
            if i > 400:
                break
            for role, text in events(line, kind):
                if role == "user" and not text.startswith(("<", "# AGENTS.md", "Caveat:")):
                    return text.splitlines()[0][:120]
    except Exception:
        pass
    return ""


def events(line, kind):
    """Yield (role, text) pairs from one JSONL line. Tool calls come back as role 'tool'."""
    try:
        e = json.loads(line)
    except Exception:
        return
    if kind == "claude":
        m = e.get("message") or {}
        role, content = m.get("role"), m.get("content")
        if role not in ("user", "assistant"):
            return
        blocks = [{"type": "text", "text": content}] if isinstance(content, str) else (content or [])
        for b in blocks:
            if not isinstance(b, dict):
                continue
            if b.get("type") == "text" and (b.get("text") or "").strip():
                yield role, b["text"].strip()
            elif b.get("type") == "tool_use":
                yield "tool", f"{b.get('name')}: {json.dumps(b.get('input'))[:200]}"
    else:  # codex
        p = e.get("payload") or {}
        if e.get("type") != "response_item":
            return
        if p.get("type") == "message" and p.get("role") in ("user", "assistant"):
            for b in p.get("content") or []:
                t = (b.get("text") or "").strip() if isinstance(b, dict) else ""
                if t:
                    yield p["role"], t
        elif p.get("type") in ("function_call", "custom_tool_call", "local_shell_call"):
            args = p.get("arguments") or p.get("input") or p.get("action") or ""
            yield "tool", f"{p.get('name') or p.get('type')}: {str(args)[:200]}"


def codex_meta(path):
    cwd = None
    try:
        e = json.loads(next(iter(open_lines(path))))
        cwd = (e.get("payload") or {}).get("cwd")
    except Exception:
        pass
    return cwd


def claude_cwd(path):
    try:
        with open(path, "rb") as fh:
            for i, line in enumerate(fh):
                if i > 200:
                    break
                m = re.search(rb'"cwd"\s*:\s*"((?:[^"\\]|\\.)*)"', line)
                if m:
                    return unescape(m.group(1))
    except Exception:
        pass
    return None


# ---------- search ----------

def matches(query, text):
    text = (text or "").lower()
    q = query.lower()
    if q in text:
        return 2
    words = [w for w in re.split(r"\W+", q) if w]
    return 1 if words and all(w in text for w in words) else 0


def content_hit(path, query):
    q = query.lower().encode()
    try:
        for line in open_lines(path):
            if q in line.lower():
                return True
    except Exception:
        pass
    return False


def collect(args):
    hits = []
    desk = desktop_titles()
    for cfg, proj in claude_config_dirs(args.dir):
        for f in glob.glob(os.path.join(proj, "*", "*.jsonl")):
            sid = os.path.splitext(os.path.basename(f))[0]
            src = f"claude code ({cfg.replace(HOME, '~')})"
            title = None
            if sid in desk:
                title, app, _ = desk[sid]
                src = f"claude app ({app})"
            if not title:
                title = claude_title(f)
            score = matches(args.query, title)
            if not score and args.content and content_hit(f, args.query):
                score = 0.5
            if score:
                hits.append((score, os.path.getmtime(f), title, src, "claude", f))
    for home in codex_homes(args.dir):
        names = {}
        idx = os.path.join(home, "session_index.jsonl")
        if os.path.exists(idx):
            for line in open(idx, encoding="utf-8", errors="replace"):
                try:
                    d = json.loads(line)
                    names[d["id"]] = d.get("thread_name") or ""
                except Exception:
                    pass
        files = []
        for sub in ("sessions", "archived_sessions"):
            for ext in ("*.jsonl", "*.jsonl.zst"):
                files += glob.glob(os.path.join(home, sub, "**", ext), recursive=True)
        for f in files:
            m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl(\.zst)?$", f)
            title = names.get(m.group(1)) if m else None
            if not title:
                title = first_prompt(f, "codex")
            score = matches(args.query, title)
            if not score and args.content and content_hit(f, args.query):
                score = 0.5
            if score:
                hits.append((score, os.path.getmtime(f), title, f"codex ({home.replace(HOME, '~')})", "codex", f))
    hits.sort(key=lambda h: (h[0], h[1]), reverse=True)
    return hits


def main():
    ap = argparse.ArgumentParser(description="Find an agent chat by title and print its transcript tail.")
    ap.add_argument("query", help="words from the chat title")
    ap.add_argument("tail", nargs="?", type=int, default=60, help="how many events to print (default 60)")
    ap.add_argument("--pick", type=int, default=0, help="use match N from the list instead of the best one")
    ap.add_argument("--list", action="store_true", help="only list matches")
    ap.add_argument("--content", action="store_true", help="also match text inside transcripts (slower)")
    ap.add_argument("--dir", action="append", default=[], help="extra Claude config dir, projects dir or Codex home")
    ap.add_argument("--max", type=int, default=15, help="how many matches to list (default 15)")
    args = ap.parse_args()

    hits = collect(args)
    if not hits:
        sys.exit(f"No chat titled like '{args.query}'. Try fewer words, --content, or --dir <path>.")

    for i, (score, ts, title, src, _, f) in enumerate(hits[: args.max]):
        when = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M")
        tag = "  (matched inside the transcript)" if score < 1 else ""
        print(f"[{i}] {title} | {src} | {when}{tag}")
    if len(hits) > args.max:
        print(f"... {len(hits) - args.max} more")
    if args.list:
        return
    if args.pick >= len(hits):
        sys.exit(f"--pick {args.pick} is out of range.")

    _, _, title, src, kind, path = hits[args.pick]
    cwd = claude_cwd(path) if kind == "claude" else codex_meta(path)
    print(f"\nUsing [{args.pick}]: {title}")
    print("Transcript:", path)
    print("Working folder:", cwd or "unknown")

    out = []
    for line in open_lines(path):
        for role, text in events(line, kind):
            if role == "tool":
                out.append(f"  tool {text}")
            elif not text.startswith(("<system-reminder", "<environment_context", "# AGENTS.md")):
                out.append(f"{role.upper()}: {text[:800]}")
    print("\n--- transcript tail ---")
    print("\n".join(out[-args.tail:]))


if __name__ == "__main__":
    main()
~~~~~
