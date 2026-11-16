#!/usr/bin/env python3
"""Upload reviewed PR screenshots to a PR's branch on GitHub (Contents API, [skip ci]) and list
them in the PR body, without pushing any local code.

Usage:
  pr_shots.py <repo-dir> <owner/repo> <pr-number> <file>... [--branch BRANCH] [--dir FOLDER]

Only the named files are uploaded, after you have looked at them.
--branch defaults to the PR's head branch. --dir defaults to docs/pr-screenshots/<branch>.
Needs the GitHub CLI (gh), signed in with write access to the repo.
"""
import argparse, base64, hashlib, json, os, re, subprocess

START, END = '<!-- release-testing-screenshots:start -->', '<!-- release-testing-screenshots:end -->'
IMG = ('.png', '.jpg', '.jpeg', '.gif', '.webp')


def gh(*args, stdin=None):
    out = subprocess.run(['gh', *args], input=stdin, capture_output=True, text=True)
    if out.returncode:
        raise SystemExit(f"gh {' '.join(args[:3])} failed: {out.stderr.strip()}")
    return out.stdout


def main(repo_dir, repo, pr, reviewed, branch, folder):
    pr_info = json.loads(gh('pr', 'view', pr, '-R', repo, '--json', 'body,headRefName'))
    body = pr_info['body'] or ''
    branch = branch or pr_info['headRefName']
    folder = (folder or f'docs/pr-screenshots/{branch}').strip('/')

    root = os.path.join(repo_dir, folder)
    local = sorted(
        os.path.relpath(os.path.join(d, f), repo_dir)
        for d, _, files in os.walk(root) for f in files if f.lower().endswith(IMG))
    tree = json.loads(gh('api', f'repos/{repo}/git/trees/{branch}?recursive=1'))
    remote = {t['path']: t['sha'] for t in tree['tree'] if t['type'] == 'blob'}

    uploaded = []
    for path in local:
        if os.path.basename(path) not in reviewed:
            continue
        with open(os.path.join(repo_dir, path), 'rb') as fh:
            data = fh.read()
        blob_sha = hashlib.sha1(b'blob %d\0' % len(data) + data).hexdigest()
        if remote.get(path) == blob_sha:
            continue
        # A retake under the same name replaces the file on the branch (the API needs its old sha).
        verb = 'retake' if path in remote else 'add'
        body_json = {'message': f'PR screenshot {verb}: {os.path.basename(path)} [skip ci]',
                     'content': base64.b64encode(data).decode(), 'branch': branch}
        if path in remote:
            body_json['sha'] = remote[path]
        gh('api', '-X', 'PUT', f'repos/{repo}/contents/{path}', '--input', '-', stdin=json.dumps(body_json))
        uploaded.append(path)

    # Every screenshot on the branch that the rest of the PR body does not show yet.
    shown = body.split(START)[0] + (body.split(END)[1] if END in body else '')
    on_branch = sorted({p for p in remote if p.startswith(folder + '/') and p.lower().endswith(IMG)} | set(uploaded))
    fresh = [p for p in on_branch if p not in shown]
    url = lambda p: f'https://github.com/{repo}/blob/{branch}/{p}?raw=true'
    title = lambda p: re.sub(r'[-_]+', ' ', os.path.splitext(p[len(folder) + 1:])[0]).strip()
    cells = [f'**{title(p)}**<br><img src="{url(p)}" width="360">' for p in fresh]
    rows = ['| | |', '|---|---|'] + [f"| {cells[i]} | {cells[i + 1] if i + 1 < len(cells) else ''} |"
                                      for i in range(0, len(cells), 2)]
    section = '\n'.join([START, '## Screenshots from release testing',
                         'Added as each check passes on a device (light mode, test data).', '',
                         *(rows if cells else ['None yet.']), END])
    new_body = (re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda _: section, body, flags=re.S)
                if START in body else body.rstrip() + '\n\n' + section + '\n')
    if new_body != body:
        gh('pr', 'edit', pr, '-R', repo, '--body-file', '-', stdin=new_body)
    print(json.dumps({'repo': repo, 'branch': branch, 'uploaded': uploaded, 'in_section': len(fresh)}))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Upload reviewed screenshots to a PR branch and list them in the PR body.')
    ap.add_argument('repo_dir', help='local checkout of the repo')
    ap.add_argument('repo', help='owner/repo on GitHub')
    ap.add_argument('pr', help='PR number')
    ap.add_argument('files', nargs='+', help='screenshot files you have looked at; nothing is uploaded unseen')
    ap.add_argument('--branch', help="branch to upload to (default: the PR's head branch)")
    ap.add_argument('--dir', dest='folder', help='screenshot folder in the repo (default: docs/pr-screenshots/<branch>)')
    a = ap.parse_args()
    main(a.repo_dir, a.repo, a.pr, {os.path.basename(f) for f in a.files}, a.branch, a.folder)
