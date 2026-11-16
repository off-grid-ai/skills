# Off Grid AI editorial guidance

Workspace: your Off Grid AI checkout (for example `~/code/off-grid-ai`).
Read the applicable repository instructions and current brand guide before customer copy. The desktop marketing workflow is under `desktop/marketing/devto`. Read only relevant repositories; exclude generated files and dependencies from discovery.

## User's accepted choices

- Use **OGAD (Off Grid AI Desktop)** and **OGAM (Off Grid AI Mobile)** on the first mention of each product in an article. Use **OGAD** and **OGAM** afterward. Define each separately when an article covers both products. Preserve URLs and distinguish product names from visible UI labels.
- Lead with practical tasks, device names, and offline benefits.
- For a topic specific to Off Grid AI's own features, saved data, or controls, include **in Off Grid AI** in the title. This gives the reader the missing product context: for example, “How to Delete Saved Screen Activity in Off Grid AI on Your Mac in 2026.” Apply this to existing titles as well as new ones. Keep broad acquisition titles such as generating images on Android focused on the reader's task; introduce the product in the opening. Use the full brand in these titles while preserving OGAD/OGAM naming in article bodies.
- For this article series, use “in 2026” by default in current how-to titles, following the user's observed top-performing title pattern. Keep the reader's task and device clear. Recheck date-sensitive claims; do not imply that the year alone caused higher traffic.
- Do not use competitor-named comparisons or “vs” titles. Do not use Ollama or LM Studio references in new articles. OGAD supplies the desktop workflow.
- Explain “without internet” accurately: model/app downloads may need internet initially. Local device sync needs a usable local network. Tailscale or remote access has separate connectivity requirements. Never generalize one offline claim to all features.
- Keep a topic-specific cover. Put the brand image within the article after the opening download links when appropriate: `![Off Grid AI Mobile](https://getoffgridai.co/assets/cover.png)`. Use accurate alt text for the product shown.
- Write approximate catalog download sizes of 1,000 MB or more in GB: 1,500 MB becomes 1.5 GB; 1,550 MB becomes 1.55 GB. Keep smaller values in MB. Do not confuse download size with working RAM.
- Never type an Off Grid AI Pro price into a website article. Write `{pro.lifetime}`, `{pro.regular}` (lifetime before any offer), `{pro.monthly}` or `{pro.saving}`, in the body and the front matter alike; the build fills them in from `website/_data/pricing.yml`. Put offer-only words inside `{pro.offer:...}`, for example `{pro.lifetime} once{pro.offer:, a limited-time price down from {pro.regular}}`, so they vanish when the offer ends. Competitor prices stay literal.
- Confirm free versus Pro, mobile versus desktop, Android versus iOS, and stable versus beta availability. Older marketing briefs can contain stale claims.
- When code, release notes, and the website disagree, inspect the shipped artifact where practical. A Git submodule pointer does not prove bundled provenance when the release workflow checks out a different branch. The verified Windows 0.0.51 installer includes Pro Vault, Clipboard, Replay, and LAN Devices sync; do not apply the website's older Mac-only statement to those features. Other Windows features need separate checks. See `desktop/marketing/devto/2026-09-series/windows-pro-release-evidence.md` for the artifact evidence and limits.
- Release `v0.0.54-beta.108` adds published Linux packages and Windows/Linux optional CUDA downloads with backend controls. State that this is a beta release. Its Linux core support does not establish Linux Pro support: the tagged app still marks Pro features as coming soon. Windows speech output in this package uses the English US/UK ONNX voices; do not claim the Mac multilingual voice set is available on Windows. Preserve historical version-scoped facts while adding current availability. Recheck later releases before treating these limits as permanent.

## Acquisition purpose

This series aims to acquire readers and users for Off Grid AI. Search intent brings the reader in; the article must show why OGAD or OGAM is useful and make trying it easy. Do not let the article become an exhaustive product manual.

Open with a recognizable reader problem, the useful result, and the product that delivers it. Explain the verified advantage that matters for that task, such as local processing, no internet after setup, automatic capture after opt-in, or local device sync. Put a relevant download link early. Use one focused route to a first useful result, then only the troubleshooting and limits that help the reader succeed. Close with a clear, linked invitation to try that task in OGAD or OGAM. A plain download/try action is appropriate; avoid hype, pressure, unsupported comparisons, invented benefits, and conversion guarantees.

For remote-model topics, lead with the reader using powerful home hardware from a laptop or phone away from home. Distinguish remote inference from device sync. Tailscale private addresses do not mean internet-free remote access: traffic can use an encrypted direct route or relay. Verify the released endpoint, model compatibility, host availability, authentication, and access boundary before making the claim.

Apply the supplied copywriting rulebook’s useful principles: write to one reader, translate each feature into a specific benefit, show a credible way to get that result, and ask for one clear next action. Find useful combinations of verified capabilities rather than describing menu items. Keep the professional-services examples, sample statistics, testimonials, urgency, and guarantees out of product claims unless independently established. Avoid rigid word-count formulas that weaken the article.

Maintain useful direct answers and enough exact steps to deliver the promised result. SEO/AEO/GEO structure supports discovery; product value and the next action support adoption. Neither justifies padding or hiding setup costs, Pro requirements, or network limits.

## Planning breadth

For ambient capture topics, show the later work result: recover the reason for a decision, resume an interrupted task, collect commitments automatically, or prepare for a meeting from retained context. Check coverage for conversational questions as well as Search, Replay, and task lists; these solve different reader problems. Describe capture as automatic after the reader enables it, with a visible state. Verify what is recorded: sampled screen activity does not mean continuous video or an always-recording microphone. A conversational answer needs retrieved evidence and source checks; it is not necessarily a complete task list.

Use the whole product navigation and released workflows as a coverage checklist when a broad audit is requested. Match workflows to reader problems; do not create one article per sidebar item, setting, or patch. Disabled integration previews are not available features. Distinguish Actions to-dos, Tasks agent runs, and Assistant presets.

For this series, the title pattern is **How to [reader task] on [device] in 2026 ([verified benefit])**. Device and benefit can be omitted when they do not help. “How to Generate AI Images on Your Android Phone in 2026 (No Internet Required)” introduces a task; OGAM is the solution explained inside. For an inaccurate-transcript guide, lead with fixing transcription errors rather than selecting a second model. Review previous titles too when the user gives new direction. Do not add the brand or obscure model name merely to fill the title.

Apply a standalone-context and automation check to every title. Background capture, inferred tasks, automatic summaries, and configured sync can be the main reader benefit; highlight that when verified. For example, “How to Automatically Build a Private To-Do List From Your Work Chats on Mac in 2026” names the source and result. Automatic extraction of delegated tasks does not mean the app monitors another person’s progress or sends follow-up messages. Checking the source behind a suggested to-do belongs inside the automatic to-do guide unless a separate reader problem justifies its own article. Explain opt-in capture and required local models in the article; never imply silent, unconfigured capture or perfect automatic extraction.

When asked to cover recent releases, read the requested number for both OGAD and OGAM. Do not treat user examples as the complete feature inventory. Extract distinct reader tasks from speech recognition, spoken output, device sync, local networking, image tools, computer use, projects, memory controls, and other actual release content. Check each proposed title against existing published articles.

Do not make a title for every patch or internal implementation change. Group changes when they solve the same reader problem. Split genuinely different workflows when each warrants a guide.

## Existing evidence and artifacts

- Successful-post analysis: `desktop/outputs/devto-01a0ebb8/evidence.json`.
- Existing 225-title plan: `desktop/outputs/devto-01a0ebb8/off-grid-ai-article-plan.xlsx` and `off-grid-ai-titles.csv`.
- Series copy rules: `desktop/marketing/devto/2026-09-series/EDITORIAL-STANDARD.md`.
- Copywriting reference supplied by user: the `copywriting-rulebook` skill.
- Example broader Android guide: https://dev.to/alichherawalla/how-to-run-local-ai-on-your-android-phone-in-2026-no-cloud-no-account-5cbp

The eight previously sampled high-view posts support a recurring editorial pattern. They do not prove that structure caused performance. Dedicated FAQ sections were absent in that sample. Use FAQs when useful, not as a supposed proven traffic cause.

## Fresh performance review (2026-09-29)

The authenticated 168-post snapshot and full-body review are in `desktop/marketing/devto/2026-09-series/performance-review/`. The top three had 16,977, 13,415 and 12,155 lifetime views. Their common shape is a benefit-led opening, early product/store links and brand image, useful capability examples and device/model details, then brief getting-started steps. Use this shape for this acquisition series; avoid letting long UI procedures dominate. FAQs are optional. Reverify old technical claims instead of copying them. Lifetime views do not establish causation or conversion.

## Article depth review

The user found several later articles too short. The three top-view examples contain about 959–1,231 visible words. Use their useful detail as a comparison, not as a mandatory word count. Read the whole article before deciding whether it needs revision. Tables, code, and narrow tasks can make length alone misleading.

For a broad reader task, a short list of settings is insufficient. Include a complete relevant example, the choices that affect the outcome, the first useful result, and how the reader can use that result. Keep this depth during large publication batches. Expand missing substance rather than adding repeated warnings or generic advice. Remove overlapping sections after adding an example. Introduce ordinary hypothetical examples naturally; do not add a benchmark disclaimer to a simple “Suppose” scenario.

Audit other published articles when the user identifies a weak example. Record which articles need revision and why adequate articles can stay as they are. Revise existing posts in place, preserve unrelated metadata, verify each saved body, and update the publication workbook after each successful change.

## Sector and use-case content tests

Use company sectors and niches to form content hypotheses when the user supplies visitor-company data. Do not infer individual intent from page visits or present a visitor as a customer. Keep company identities and private visitor activity out of public copy. Check enrichment quality and leave uncertain classifications explicit.

The target is small firms that can decide quickly. Team sizes below 10 or 50 and possible monthly prices from $49 to $999 are loose planning guides, not hard filters, verified willingness to pay, or a published service offer. Prefer a specific job and useful first result for a named reader type. Keep industry hypotheses distinct from demonstrated demand.

For this series, append accepted topics to the existing off-grid-ai-article-plan.xlsx. Preserve published URLs and statuses. Record overlaps and topics needing measurements instead of publishing near-duplicates or inventing test results.
