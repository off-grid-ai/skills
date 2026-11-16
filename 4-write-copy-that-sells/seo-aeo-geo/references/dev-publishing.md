# DEV publishing

Use the API and existing scripts for publishing and cover generation. This workspace has working API paths for both. Do not switch to browser control without a concrete missing capability. Do not publish a new article when the user asked to update an existing one.

## Local workflow

Under `<off-grid-ai workspace>/desktop/marketing/devto`:

- `publish_devto.py` now supports `--file <article.md>` for one article, with duplicate checks and a publication record. Use that explicit option. Its no-argument path still publishes in bulk; do not run that path or import its top-level execution. Inspect before reuse. Never expose credentials or copy them into this skill.
- `2026-09-series/dev_cover_api.py` generates a cover through DEV's image API using the existing authorized session. Keep authentication material in memory and out of output. `prepare_cover.py` attaches the saved result to a draft.
- `2026-09-series/verify_publication.py` verifies one publication and records it in `queue-status.json`; the workbook builder's `--update` path updates the existing XLSX. Follow the user's reporting choice: this series records links in the XLSX, without posting each link in chat.
- `stats_devto.py` supports authenticated article statistics. Review its entrypoint before use.
- `2026-09-series/publish_one.py` is specific to article 001. It provides `credentials`, `request`, `article`, and `find_article`. Do not use its fixed article path or state file for a different post.
- Article 001: `2026-09-series/001-multilingual-transcription-android.md`, with its DEV ID from the publication record. Verify the live identity before any later mutation.

## Safe single-article update

1. Confirm the target from the current request and existing publication state. User authorization persists, but a later stop or review checkpoint limits the scope.
2. Read the live article through the authenticated author list or supported detail endpoint. Save its body and metadata locally.
3. Compare the local baseline with the live body. Reconcile concurrent changes before replacing content.
4. Send only intended fields in the update. Preserve the cover, title, tags, canonical URL, and publication state unless their change is part of the request.
5. Verify the returned body and relevant metadata. Re-read the saved article through the API when needed. Check the public page if accessible; a public-page fetch failure must not be described as successful public verification.
6. Record the live article URL in the user's requested place. If publication was limited to one post for review, stop there.

DEV can parse metadata from Markdown frontmatter. When changing a title, update the body frontmatter title as well as the API title field if frontmatter exists; otherwise the old title can win. Verify the saved title, body, cover, publication state, and tracker entry. Do not retry an uncertain write before inspecting its result.

For creation, check publication state and existing matching articles to prevent duplicates. Do not retry an ambiguous POST without checking whether it succeeded. Never run an unbounded bulk publisher for a one-at-a-time request.

An observed DEV behavior: the public `/api/articles/{id}` route returned a cached 404 for a new post while the authenticated `/articles/me/published` list contained it. The helper checks the author's lists. Treat this as a possible workaround, not a universal API rule.

## Off Grid community card

Place the community and feature-request card directly below the early Off Grid AI brand image, before the next heading. Keep one card per article; remove an older copy at the end when moving it. Use a visible mail link to the product support address plus verified Slack and Reddit community links. Preserve the article cover and download links. Check the saved body and rendered placement.
