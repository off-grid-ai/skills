---
name: model-picks
description: Ali's Model Picks board (a published page; keep its URL in `BOARD_URL` beside this file). Use when Ali says "model picks", "refresh the model board", "which models should ship", or "ship the catalog picks": refresh the pool (every modality: chat, image, video, voice, transcription, computer use; Argus + Hugging Face trending + both catalogs + in-code entries + research suggestions), or write what he dragged into each app's catalog/models.json.
---

# Model Picks

A board over the apps' EXISTING behaviour, for every kind of model. It adds no app feature and no
schema, and never edits an app repo by itself. Brand on the page is always "Off Grid AI" (never
offgrid-ai / OGAM / OGAD in visible labels; repo ids in links stay as they are).

- Board: the URL in `BOARD_URL` (source: `board.html` here; republish with
  the Artifact tool, `url` set to the board, omit `capabilities`).
- Tabs (`#chat #image #video #voice #transcription #computer`), each per RAM tier for phones (Android
  6/8/12/16, iPhone 6/8/12) and desktops (8–128 GB):
  - **Chat**: drag-and-drop into `catalog/mobile` / `catalog/desktop` (unchanged), Fast/Balanced/Best by
    `pickModelsForDevice` (mobile `devicePicks.ts`: no grounders; desktop: Bonsai/Decider from code,
    sourceModelId rule).
  - **Image**: phones = `ImagePicksRow.imagePicks` over the sd.cpp packs mobile lists per platform
    (sync computes `mobileSd` with the shared pack/platform rules); desktop = `desktopImagePicks`
    (run by the sync per tier, stored in `meta/sync.imagePicks`) + the `recommendedImageModelId` badge.
    Core ML / MNN / QNN are fetched live by the phone: noted, not shown.
  - **Video**: phones list catalog video per `VIDEO_PLATFORM_SUPPORT` (no picks, "may exceed memory"
    under `minRamGb`); desktop picks by size (full builds), Configure-for-me = smallest complete pack,
    plus `chooseStartPicture` (what a phone asks that computer to get).
  - **Voice**: phones = Kokoro (pro, in code, warns < 8 GB); desktop picks by size.
  - **Transcription**: phones = multilingual Whisper picks (`whisperModels.ts`); desktop picks by size;
    Configure-for-me by mode (tiny/base/small).
  - **Computer use**: desktop only, fit per tier (no picks).
  - Every name shows its release date and the tab's one benchmark score (linked, dated). A
    **Decisions** table on top of each tab lists research recommendations (Add / Replace / Keep /
    Later / Remove), gain vs what it replaces, cost (download, smallest phone/desktop that runs it
    well), effort (S/M/L + what), platforms today → after, licence, risks, sources; sortable.
- Database (ArtifactData on that url):
  - `pool/<id with / as ~>`: one model each, every kind. Fields: `{id, name, org, kind, params,
    activeParams, quant, quality, sizeGB (chat download), totalGB, totalBytes, minRamGb, tags, quantOf,
    availability, grounder, sourceModelId, ours, video{arch,startImage,packOk,support}, mobileSd,
    imageHosts, lang/mobileId (mobile whisper), order{source:index}, sources[], released{date,source},
    bench{score,benchmark,url,readAt,matched,estimated}, editBench, decision{…}, entry, syncedAt}`.
    Sources: `bundled`, `catalog-mobile`, `catalog-desktop`, `desktop-code`, `mobile-code`, `argus`,
    `hf-trending`, `suggested` (resolved from HF), `research` (no downloadable entry).
  - `meta/sync`: `{ref, commits, syncedAt, byKind, bySource, benchmarks{kind:{name,url}}, imagePicks}`.
    Docs whose `syncedAt` differs from it are stale: the board no longer counts them as listed.
  - `catalog/mobile` and `catalog/desktop`: Ali's chat choices `{ids, quality}`. NEVER modify them
    during a refresh.

## Refresh the pool

1. Fetch the repos (`git -C ~/code/off-grid-ai/{shared,mobile,desktop} fetch`) and make sure the
   shared package's `dist` is built for the ref you show (the bundled catalog and rules come from it).
2. `node ~/.claude/skills/model-picks/sync-pool.mjs <scratch dir> [--ref <ref> | --worktree] [--offline]`
   - `--ref` defaults to `origin/main`; **for now publish `--ref release/analytics-video`** (the page
     says which ref it shows). `--worktree` reads uncommitted files. pro/ is read at the submodule
     commit the ref pins.
   - Writes one JSON per model plus `_meta.json` (→ `meta/sync`). Uncensored/abliterated filtered.
3. Write with ArtifactData `batch` (≤50 per call), `op: "set"`, `collection: "pool"`, `doc_id` = file
   name without `.json`, `file_path` = the file; `if_version` for docs that already exist (list the
   collection first). Write `_meta.json` to `meta/sync` last. Do not delete pool docs.
4. Check: `node <scratch>/check/verify.cjs`-style comparison of the board's `<script id="rules">` with
   the real shared functions (see this session's history) before publishing a rules change.

## Benchmarks, dates, decisions (hand-kept files beside the script)

- `benchmarks.json`: `{ "<pool id or sourceModelId>": {score, benchmark, url, readAt, matched,
  estimated?}, "edit:<id>": …, "_benchmarks": {kind: {name, url}} }`. One benchmark per kind: chat/vision
  AA Intelligence Index; image AA text-to-image Elo; video AA text-to-video Elo; voice AA TTS Elo;
  transcription Open ASR avg WER; computer use OSWorld-Verified %. Facts read from the page only,
  never estimated; a model not on the board shows "—".
- Release date: catalog `releaseDate`, Argus `launched`, else Hugging Face `createdAt` of
  `sourceModelId` (else the repo); Light builds take their full build's date.
- `suggestions.json`: research decisions. An item with `repo` + `files` (regex per role) is resolved
  against Hugging Face into a real entry (source `suggested`, draggable later); one that cannot be
  resolved stays `research` with no entry. Existing ids only get `decision` attached.

## Ship Ali's picks

1. Read `catalog/mobile` and `catalog/desktop`, and the `pool` docs they name.
2. For each target, `sections.models` = each model's `entry`, with `quality` from the doc's
   `quality` map when set. Keep other sections (mobile `text`, `transcription`, …) as they are.
   Bump `updatedAt`; keep `schemaVersion` 1. Follow each repo's `catalog/README.md`.
3. Write `catalog/models.json` in the mobile repo and the desktop repo on the branch Ali names; commit
   named files only; push only when he says so.
4. Tell Ali in a few bullets what changed per device class (the board's tables show it).
