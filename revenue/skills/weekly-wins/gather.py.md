# gather.py

This is the `gather.py` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `gather.py` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~python
#!/usr/bin/env python3
"""Collect what happened this week, and the week before, from agent chats and git.

Usage:
  python3 -I gather.py [--since YYYY-MM-DD] [--days 7] [--repo PATH ...] [--chats DIR ...]
                       [--topic REGEX] [--skip REGEX] [--out FILE]

  --since   start of this week's window (default: --days ago, 7 by default). The week before is the
            same length, just earlier, and is used only for comparison counts.
  --repo    a git repo to read (repeatable). Default: the git repo of the current folder, if any.
  --chats   a folder of agent chat transcripts, one JSONL file per chat (repeatable). Default: every
            folder that exists of ~/.claude/projects, ~/.claude-*/projects and ~/.codex/sessions.
  --topic   keep only chats whose title, folder or first asks match this regex (e.g. "market|sales").
  --skip    drop chats whose title or folder match this regex (e.g. "sweep|nightly|side-project").
  --out     write to this file instead of stdout.

For each chat in the window it prints the date, a title, the folder it ran in, the user's first asks
and the last two long answers. For each repo it prints commit counts for both weeks and this week's
log. Nothing is sent anywhere; it only reads local files and runs git.
"""
import argparse
import datetime
import glob
import json
import os
import re
import subprocess
import sys

p = argparse.ArgumentParser()
p.add_argument("--since")
p.add_argument("--days", type=int, default=7)
p.add_argument("--repo", action="append", default=[])
p.add_argument("--chats", action="append", default=[])
p.add_argument("--topic")
p.add_argument("--skip")
p.add_argument("--out")
a = p.parse_args()

now = datetime.datetime.now()
since = datetime.datetime.strptime(a.since, "%Y-%m-%d") if a.since else now - datetime.timedelta(days=a.days)
span = now - since
before = since - span
out = open(a.out, "w") if a.out else sys.stdout
topic = re.compile(a.topic, re.I) if a.topic else None
skip = re.compile(a.skip, re.I) if a.skip else None


def say(*parts):
    print(*parts, file=out)


def texts(content):
    """Plain text blocks from a message's content (string or list of blocks)."""
    if isinstance(content, str):
        return [content]
    found = []
    for b in content or []:
        if isinstance(b, dict) and isinstance(b.get("text"), str) and b.get("type") in (None, "text", "input_text", "output_text"):
            found.append(b["text"])
    return found


def read_chat(path):
    """Title, folder, user asks and long answers from one JSONL transcript (Claude Code or Codex style)."""
    title, cwd, users, answers = None, None, [], []
    try:
        lines = open(path, encoding="utf-8", errors="replace")
    except OSError:
        return title, cwd, users, answers
    for line in lines:
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if not isinstance(e, dict):
            continue
        if e.get("type") == "summary" and e.get("summary"):
            title = e["summary"]
        payload = e.get("payload") if isinstance(e.get("payload"), dict) else {}
        cwd = cwd or e.get("cwd") or payload.get("cwd")
        m = e.get("message") if isinstance(e.get("message"), dict) else payload
        role = m.get("role")
        for t in texts(m.get("content")):
            t = t.strip()
            # Skip injected context, tool output and skill bodies; keep what people typed and said.
            if not t or t.startswith("<") or t.startswith("Base directory for this skill") or t.startswith("[SCHEDULED"):
                continue
            if role == "user":
                users.append(t)
            elif role == "assistant" and len(t) > 300:
                answers.append(t)
    return title, cwd, users, answers


# 1. Chats
dirs = a.chats or [d for d in [os.path.expanduser("~/.claude/projects"), os.path.expanduser("~/.codex/sessions")]
                   + glob.glob(os.path.expanduser("~/.claude-*/projects")) if os.path.isdir(d)]
files = []
for d in dirs:
    files += glob.glob(os.path.join(os.path.expanduser(d), "**", "*.jsonl"), recursive=True)

this_week, last_week_count = [], 0
for f in files:
    if "/subagents/" in f:
        continue
    ts = datetime.datetime.fromtimestamp(os.path.getmtime(f))
    if ts < before:
        continue
    title, cwd, users, answers = read_chat(f)
    if not users:
        continue
    title = title or users[0].splitlines()[0][:80]
    where = f"{title} {cwd or ''}"
    if skip and skip.search(where):
        continue
    if topic and not (topic.search(where) or any(topic.search(u) for u in users[:5])):
        continue
    if ts < since:
        last_week_count += 1
    else:
        this_week.append((ts, title, cwd, users, answers, f))

this_week.sort(reverse=True)
say(f"===== CHATS: {len(this_week)} this week (since {since:%Y-%m-%d}), {last_week_count} the week before "
    f"({before:%Y-%m-%d} to {since:%Y-%m-%d}). Folders read: {', '.join(dirs) or 'none found'}")
for ts, title, cwd, users, answers, f in this_week:
    say(f"\n===== {ts:%Y-%m-%d} | {title} | cwd {cwd or '?'}")
    say(f"FILE: {f}")
    say("ASKS:", " || ".join(u[:300] for u in users[:3]))
    say("LAST:", " || ".join(x[:1500] for x in answers[-2:]))


# 2. Git: the record of what actually shipped.
def git(repo, *args):
    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else ""


repos = a.repo
if not repos:
    top = git(os.getcwd(), "rev-parse", "--show-toplevel").strip()
    repos = [top] if top else []
for r in repos:
    path = os.path.expanduser(r)
    if not git(path, "rev-parse", "--git-dir"):
        say(f"\n===== GIT {r}: not a git repo, skipped")
        continue
    git(path, "fetch", "-q", "origin")
    ref = "origin/HEAD" if git(path, "rev-parse", "-q", "--verify", "origin/HEAD") else "HEAD"
    log = git(path, "log", ref, f"--since={since:%Y-%m-%d %H:%M}", "--no-merges", "--format=%ad %an: %s", "--date=short")
    prev = git(path, "log", ref, f"--since={before:%Y-%m-%d %H:%M}", f"--until={since:%Y-%m-%d %H:%M}", "--no-merges", "--format=%h")
    merges = git(path, "log", ref, f"--since={since:%Y-%m-%d %H:%M}", "--merges", "--format=%s")
    added = set(git(path, "log", ref, f"--since={since:%Y-%m-%d %H:%M}", "--diff-filter=A", "--name-only", "--format=").split())
    say(f"\n===== GIT {r} ({ref}): {len(log.splitlines())} commits this week, {len(prev.splitlines())} the week before; "
        f"{len(merges.splitlines())} merges; {len(added)} files added")
    say(log)

print(f"{len(this_week)} chats and {len(repos)} repos since {since:%Y-%m-%d}", file=sys.stderr)
~~~~~
