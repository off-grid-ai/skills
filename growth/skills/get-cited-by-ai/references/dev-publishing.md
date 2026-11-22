# Publishing on DEV (dev.to) and similar platforms

Use an API and the project's own scripts for publishing and covers. Don't switch to driving a browser unless a
specific capability is missing from the API. Don't publish a new article when the user asked to update an
existing one.

## Find the local workflow

Search the project for existing publishing code before writing any (for example `grep -ril "dev.to\|forem"`, or
a `marketing/` or `devto/` folder). Typical pieces:

- A single-article publisher with duplicate checks and a publication record. Use its one-article option
  explicitly. If it also has a bulk mode, never run that for a one-at-a-time request, and don't import a script
  whose top level publishes on import. Read before reuse.
- A cover generator, a verifier that records the live URL in a tracker, and a stats script.
- A publication record (JSON or spreadsheet) with each article's platform id and URL.

If none exist, use the platform API directly. For DEV that is the Forem API (`https://dev.to/api`), with the key
in an environment variable such as `DEV_API_KEY`. Ask the user to set it. Never print, log or copy credentials
into files or this skill.

## Safe single-article update

1. Confirm the target from the current request and the publication record. A later "stop" or review checkpoint
   narrows earlier permission.
2. Read the live article through the authenticated author list or detail endpoint. Save its body and metadata
   locally.
3. Compare the local baseline with the live body. Reconcile changes made elsewhere before replacing content.
4. Send only the fields you mean to change. Keep the cover, title, tags, canonical URL and published state unless
   changing them is part of the request.
5. Verify the returned body and metadata. Re-read through the API when needed. Check the public page if you can;
   a failed public-page fetch is not a successful public check.
6. Record the live URL where the user asked. If publishing was limited to one post for review, stop there.

DEV can read metadata from Markdown front matter. When changing a title, change the front matter title as well
as the API field, or the old title can win. Verify the saved title, body, cover, state and tracker entry. Don't
retry an uncertain write before checking what happened.

For new articles, check the publication record and existing articles to prevent duplicates. Don't retry an
ambiguous POST without checking whether it succeeded.

Observed DEV behaviour: the public `/api/articles/{id}` route has returned a cached 404 for a new post while the
authenticated `/articles/me/published` list showed it. Check the author's lists. Treat this as a possible
workaround, not a rule.

## Community card

If the project uses a standard community or feedback card in articles (support email, community links), keep one
per article, in the place the editorial guide says (often right under the brand image, before the next heading).
Remove an older copy when moving it. Use only verified links. Check the saved body and where it renders.
