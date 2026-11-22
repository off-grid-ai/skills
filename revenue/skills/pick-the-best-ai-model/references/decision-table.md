# Decision table template

One table per kind of model (chat, image, voice, ...). One row per model. Sort by call, then by gain.

| Call | Model | Replaces | Gain (benchmark, date read) | Cost | Effort | Platforms today → after | Licence (commercial use) | Risks | Sources |
|---|---|---|---|---|---|---|---|---|---|
| Replace | `maker/new-model` (4B, Q4 build, 2.6 GB) | `maker/old-model` | 41 vs 33 on <benchmark>, read YYYY-MM-DD | 2.6 GB download; runs well on 8 GB phones and 8 GB desktops | M: needs a companion text encoder | desktop → desktop, Android, iOS | Apache-2.0 (yes) | Runtime support not yet confirmed on iOS | [model card](...), [leaderboard](...) |
| Keep | `maker/current-best` | | 52, read YYYY-MM-DD | | | | | | |
| Later | ... | | | | | | | | |
| Remove | ... | | | | | | | | |

Rules for filling it in:

- **Call** is one of Add, Replace, Keep, Later, Remove.
- **Gain** compares the same benchmark for both models, with the date it was read. "Not listed" when a model is
  not on the board. Never estimate a score.
- **Cost** is the download size and the smallest device that runs it well for on-device models, or the cost per
  call and latency for hosted ones.
- **Effort** is S (list entry only), M (small runtime or config work) or L (new runtime, new feature), plus what.
- Every fact in the row has a linked source.

Above the tables, put one line per device class with the Fast, Balanced and Best pick for each kind.
