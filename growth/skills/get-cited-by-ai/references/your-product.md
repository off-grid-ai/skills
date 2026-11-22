# Your product's editorial guide

Product articles go wrong in the same few places every time: wrong product names, claims that were true two
releases ago, prices typed into prose, and titles that only make sense to people who already use the app. This
file is the checklist for writing about the user's own product, and the template for the guide you keep for it.

## Find or make the guide

1. Look in the project for an existing editorial standard, brand guide or article plan (search for
   `EDITORIAL`, `brand`, `style`, `voice`, an articles folder, a content tracker spreadsheet). Read the
   repository's agent instructions too. Read only relevant repos; skip generated files and dependencies.
2. If there is none, create one in the project (for example `marketing/EDITORIAL-STANDARD.md`) using the
   sections below, fill in what you can verify, and ask the user for the rest. Update it whenever the user
   gives a new rule, and apply new rules to the queue and to affected published articles, not only future drafts.

## Sections to fill in

### Names
- The exact brand wording, and any short names for each product (desktop, mobile, extension). When to use the
  full name, when the short one. Keep URLs as they are and keep product names separate from visible UI labels.
- Example: a "Notes App Desktop (NAD)" on first mention, "NAD" after.

### Titles
- The title pattern that works for this series, from the user's own data. A common one:
  **How to [reader task] on [device] in [year] ([verified benefit])**. Device and benefit can be dropped when
  they don't help.
- When to put the product name in the title: for topics about the product's own saved data, settings or
  controls, where the task would otherwise look like a general operating-system feature. Keep broad discovery
  topics on the reader's task and introduce the product in the opening.
- Whether to use a year, and why (only if it's truthful and the user's data supports it; never claim the year
  caused traffic).
- The user's stance on competitor names and "vs" titles. Follow it.

### Claims that need care
- **Offline, local and private claims.** Say exactly which part works without internet. Model or app downloads
  may need internet first. Local sync may need a local network. Remote access has its own requirements. Never
  stretch one feature's offline claim to the whole product.
- **Automatic claims.** Verify the trigger, the opt-in and what happens without further input before calling
  anything automatic. Never imply silent, unconfigured capture or perfect extraction.
- **Availability.** Free versus paid tier, desktop versus mobile, each operating system, stable versus beta.
  Older marketing briefs go stale; check the current release.
- **When code, release notes and the website disagree,** inspect the shipped build where practical. A submodule
  pointer or a branch name does not prove what shipped. Record the evidence and its limits in the guide.
- **Version-scoped facts.** Keep historical facts with their version; recheck later releases before treating a
  limit as permanent.

### Prices
- Never type the product's own price into an article if the site can fill it in. Use the site's price
  placeholders (for example `{price.lifetime}`) in body and front matter so prices update in one place. Put
  offer-only words inside the offer placeholder so they disappear when the offer ends. Competitor prices stay
  literal. If the site has no placeholders, ask the user before writing any price.

### Units and images
- How sizes are written (for example, 1,000 MB and up in GB with up to two decimals). Don't confuse download size
  with working memory.
- The brand image to place after the opening links, with accurate alt text. A topic-specific cover per article.

## Acquisition purpose

Articles exist to bring readers who then try the product. Search intent brings the reader in; the article shows
why the product helps with their task and makes trying it easy. Don't let it become a full product manual.

Open with a reader problem they'd recognise, the useful result, and the product that delivers it. Explain the
verified advantage that matters for that task. Put a download or sign-up link early. Give one focused route to a
first useful result, then only the troubleshooting and limits that help the reader succeed. Close with a clear,
linked invitation to try that task. Plain is fine; no hype, pressure, unsupported comparisons or conversion
promises. Don't hide setup costs, paid-tier requirements or network limits.

## Planning breadth

- Show the later work result, not the menu item. For a capture feature: recover why a decision was made, resume
  an interrupted task, collect commitments, prepare for a meeting.
- For a broad audit, use the whole product navigation and released workflows as a coverage checklist. Match
  workflows to reader problems; don't write one article per sidebar item, setting or patch. Disabled previews are
  not features.
- When asked to cover recent releases, read the number of releases the user asked for, for every product. Don't
  treat the user's examples as the full feature list. Group changes that solve the same reader problem; split
  truly different workflows. Check each proposed title against what's already published.

## Evidence on file

Record where these live in the project, and keep them current:

- Successful-post analysis (which articles performed, and their common shape).
- The article plan or title list, with status and live URLs.
- The editorial standard (this guide).
- A performance snapshot with its date. Lifetime views don't prove causation or conversion; compare article age.

## Article depth

When the user finds articles too short, compare against the top performers' useful detail, not their word
count. For a broad task, a short list of settings isn't enough: include a complete example, the choices that
change the outcome, the first useful result, and how to use it. Expand missing substance rather than adding
warnings. Audit other published articles when the user flags a weak one; record which need revision and why the
rest can stay. Revise in place, keep unrelated metadata, verify each saved body, update the tracker.

## Sector and use-case tests

If the user shares visitor-company data, use sectors and niches to form content ideas only. Don't infer one
person's intent from page visits or present a visitor as a customer. Keep company names and visitor activity out
of public copy. Keep industry guesses separate from shown demand, and record topics that need measurement
instead of inventing results.
