#!/usr/bin/env python3
"""find.py "<chat name>" [tail_events] — find a Code-tab chat by title across every Claude account on this Mac, print its metadata and the tail of its transcript."""
import glob, json, os, sys, datetime

name = sys.argv[1].lower()
tail = int(sys.argv[2]) if len(sys.argv) > 2 else 60
AS = os.path.expanduser("~/Library/Application Support")
hits = []
for f in glob.glob(f"{AS}/Claude*/claude-code-sessions/*/*/local_*.json"):
    try: d = json.load(open(f))
    except Exception: continue
    if name in (d.get("title") or "").lower():
        hits.append((d.get("lastActivityAt") or 0, f.split("/")[-5], d))
hits.sort(reverse=True)
if not hits: sys.exit(f"No chat titled like '{sys.argv[1]}'.")

for i, (ts, acct, d) in enumerate(hits):
    when = datetime.datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M")
    print(f"[{i}] {d['title']} | account {acct} | {when} | cwd {d.get('cwd')} | archived {d.get('isArchived')}")

ts, acct, d = hits[0]
paths = glob.glob(os.path.expanduser(f"~/.claude*/projects/*/{d.get('cliSessionId')}.jsonl")) + \
        glob.glob(os.path.expanduser(f"~/.claude-accounts/*/projects/*/{d.get('cliSessionId')}.jsonl"))
print("\nUsing [0]. Transcript:", paths[0] if paths else "NOT FOUND")
print("Last wrap-up:", (d.get("turnWrapUp") or {}).get("description"))
print("Status:", (d.get("postTurnSummary") or {}).get("status_detail"))
if not paths: sys.exit()

out = []
for line in open(paths[0]):
    try: e = json.loads(line)
    except Exception: continue
    m = e.get("message") or {}
    role, c = m.get("role"), m.get("content")
    if role not in ("user", "assistant"): continue
    for b in ([{"type": "text", "text": c}] if isinstance(c, str) else c or []):
        t = b.get("type")
        if t == "text" and b["text"].strip() and not b["text"].startswith("<system-reminder"):
            out.append(f"{role.upper()}: {b['text'].strip()[:800]}")
        elif t == "tool_use":
            out.append(f"  tool {b['name']}: {json.dumps(b.get('input'))[:200]}")
print("\n--- transcript tail ---")
print("\n".join(out[-tail:]))
