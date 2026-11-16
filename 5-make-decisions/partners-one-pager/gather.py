#!/usr/bin/env python3
"""gather.py [YYYY-MM-DD] [out_file] - collect every marketing/sales chat across all Claude accounts on this Mac
since the date (default: 7 days ago). For each chat prints the date, title, wrap-up, Mac's first asks and the
last two long assistant answers. Recurring automated runs (sweeps, triage, digests) and engineering-only chats
are dropped by title; Argus Today keeps only its newest run."""
import glob, json, os, re, sys, datetime

since = datetime.datetime.strptime(sys.argv[1], "%Y-%m-%d") if len(sys.argv) > 1 else datetime.datetime.now() - datetime.timedelta(days=7)
out = open(sys.argv[2], "w") if len(sys.argv) > 2 else sys.stdout
cut = since.timestamp() * 1000
AS = os.path.expanduser("~/Library/Application Support")

KEEP = re.compile(r"market|sales|growth|newsletter|digest|post|tweet|launch|product hunt|article|seo|aeo|ai answer|ai mention|"
                  r"email|insight|stripe|pricing|price|discount|sale|black friday|diwali|offer|revenue|campaign|brand|content|"
                  r"engage|reddit|linkedin|outreach|customer|copy|landing|website|store listing|store asset|store image|"
                  r"appsumo|boost|investor|affiliate|business|pick|social|dev\.to|traffic|analytics|argus today|rating|buzz", re.I)
DROP = re.compile(r"sweep|backlog triage|argus digest|argus article \(one|lane|commit review|tests? for|ci |crash|build", re.I)

def transcript(sid):
    ps = glob.glob(os.path.expanduser(f"~/.claude*/projects/*/{sid}.jsonl")) + \
         glob.glob(os.path.expanduser(f"~/.claude-accounts/*/projects/*/{sid}.jsonl"))
    users, asst = [], []
    if not ps: return users, asst
    for line in open(ps[0]):
        try: e = json.loads(line)
        except Exception: continue
        m = e.get("message") or {}
        c = m.get("content")
        for b in ([{"type": "text", "text": c}] if isinstance(c, str) else c or []):
            if not isinstance(b, dict) or b.get("type") != "text": continue
            t = b["text"].strip()
            if not t or t.startswith("<") or t.startswith("Base directory for this skill") or t.startswith("[SCHEDULED"): continue
            if m.get("role") == "user": users.append(t)
            elif m.get("role") == "assistant" and len(t) > 300: asst.append(t)
    return users, asst

rows, seen_today = [], False
for f in glob.glob(f"{AS}/Claude*/claude-code-sessions/*/*/local_*.json"):
    try: d = json.load(open(f))
    except Exception: continue
    t, ts = d.get("title") or "", d.get("lastActivityAt") or 0
    if ts < cut or not KEEP.search(t) or DROP.search(t): continue
    rows.append((ts, t, d))
rows.sort(reverse=True)
for ts, t, d in rows:
    if t == "Argus Today":
        if seen_today: continue
        seen_today = True
    users, asst = transcript(d.get("cliSessionId"))
    when = datetime.datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d")
    print(f"===== {when} | {t} | cwd {d.get('cwd')}", file=out)
    print("WRAP:", (d.get("turnWrapUp") or {}).get("description"), file=out)
    print("ASKS:", " || ".join(u[:300] for u in users[:3]), file=out)
    print("LAST:", " || ".join(a[:1500] for a in asst[-2:]), "\n", file=out)
print(f"{len(rows)} chats since {since:%Y-%m-%d}", file=sys.stderr)

# Chats whose title hides the work: match Mac's own words inside every transcript.
TOPIC = re.compile(r"boost|medium\.com|on medium|private-ai-apps|github list|dev\.to|ai answers|ai mentions|ogai.insights|newsletter|"
                   r"pricing|discount|appsumo|store listing|quote tweet|x post|tweet|product hunt|llms\.txt|seo|checkout|stripe", re.I)
SIDE = re.compile(r"civilization|game", re.I)  # side projects stay out unless Mac asks
listed = {t for _, t, _ in rows}
print("\n===== OTHER CHATS WHERE MAC ASKED ABOUT MARKETING (read the ones that matter with get-context/find.py)", file=out)
for f in glob.glob(f"{AS}/Claude*/claude-code-sessions/*/*/local_*.json"):
    try: d = json.load(open(f))
    except Exception: continue
    t, ts = d.get("title") or "", d.get("lastActivityAt") or 0
    if ts < cut or t in listed or DROP.search(t) or SIDE.search(d.get("cwd") or ""): continue
    users, _ = transcript(d.get("cliSessionId"))
    hits = sorted({m.group(0).lower() for u in users for m in TOPIC.finditer(u)})
    if len(hits) >= 2:
        print(f"{datetime.datetime.fromtimestamp(ts/1000):%Y-%m-%d} | {t} | {', '.join(hits)}", file=out)

# Git is the truth for what shipped: marketing repos, every commit since the date.
import subprocess
REPOS = ["~/code/off-grid-ai/website", "~/code/off-grid-ai/license-worker", "~/olympus-repo"]
# The GitHub lists repo has no local clone: count its files through gh.
lists = subprocess.run(["gh", "api", "repos/off-grid-ai/private-ai-apps/git/trees/HEAD?recursive=1", "--jq",
                        '[.tree[] | select(.path|startswith("lists/"))] | length'], capture_output=True, text=True).stdout.strip()
print(f"\n===== GITHUB off-grid-ai/private-ai-apps: {lists or '?'} lists", file=out)
for r in REPOS:
    p = os.path.expanduser(r)
    if not os.path.isdir(p): continue
    subprocess.run(["git", "-C", p, "fetch", "-q", "origin"], capture_output=True)
    ref = "origin/main" if subprocess.run(["git", "-C", p, "rev-parse", "-q", "--verify", "origin/main"], capture_output=True).returncode == 0 else "HEAD"
    log = subprocess.run(["git", "-C", p, "log", ref, f"--since={since:%Y-%m-%d}", "--no-merges", "--format=%ad %s", "--date=short"],
                         capture_output=True, text=True).stdout
    added = subprocess.run(["git", "-C", p, "log", ref, f"--since={since:%Y-%m-%d}", "--diff-filter=A", "--name-only", "--format="],
                           capture_output=True, text=True).stdout.split()
    arts = [a for a in added if a.startswith("articles/")]
    print(f"\n===== GIT {r} ({ref}): {len(log.splitlines())} commits, {len(set(arts))} new articles", file=out)
    print(log, file=out)
# X: our own posts and followers from Argus (views per post live in X analytics, read in Brave).
try:
    x = json.load(open(os.path.expanduser("~/.olympus/argus/signals/x-mine.json")))
    mine = [i for i in x.get("items", []) if (i.get("at") or "") >= f"{since:%Y-%m-%d}"]
    boost = [i for i in mine if "boost" in json.dumps(i).lower()]
    newf = [f for f in x.get("newFollowers", []) if (f.get("at") or "") >= f"{since:%Y-%m-%d}"]
    print(f"\n===== X (Argus x-mine.json): {len(mine)} posts/replies/quotes since {since:%Y-%m-%d}, {len(boost)} about Boost, "
          f"{x.get('followers')} followers, {len(newf)} new followers logged", file=out)
except Exception as e:
    print(f"\n===== X: x-mine.json unreadable ({e})", file=out)
print("\nAlso check: X analytics 7D for @AliChherawalla in Brave; the company Gmail inbox for listings, feature requests and newsletter replies; gh repo list off-grid-ai (new repos such as list repos), ~/.olympus/argus/signals/posts.json (our X/LinkedIn posts),"
      " ~/.olympus/argus/cache/answers.json and Signals AI answers runs, the dev.to stats dashboard (website launch.json 'devto-stats').", file=out)
