# Tour script v2 — the review record

How the script in `../PLAN-tour-v2.md` was arrived at, kept so a later reader can see what was
checked and what was rejected rather than taking the result on trust.

| File | What it is |
|---|---|
| `2026-09-12-defects.md` | 160 findings against the first draft, chapter by chapter, from a reviewer instructed to find faults. Checked against `content/builder-names.json`, `content/experience.json`, `content/surfaces.json` and `tools/check-manifest.js`. |
| `2026-09-12-whole-script-critic.md` | The eight chapters read together. This is the pass that found the coverage claim was false — 36 of 102 live services have no offer id, so the round table could name 2 of its 33 — and forced the shelf correction. |
| `2026-09-12-seams.md` | Cross-chapter check on the rewritten script: offer homes, node graph, routing contract, dead labels, price sentence, held facts, tokens, surfaces, ear test. Ended **not ready** with nine blockers. |
| `tour-script-viewer.html` | Every node and line, expandable, with ElevenLabs credits per node and a live budget meter. Open it in a browser; no server needed. |

The nine blockers from the seam check were resolved by the showrunner contract, which is in
`../PLAN-tour-v2.md`. **The script has still never been assembled into `content/tour.json` and run
through `node tools/check-manifest.js`.** That is the first engineering task, and the lint is the
oracle.
