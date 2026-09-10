# 3HUE Experience — document-led implementation

Current phase: **2a — candidate accepted; publish gate pending**. Phase 1 is complete under the user's O4 design override: the supplied plate passes native-size, removal, geometry and illumination checks, the user approved it, responsive derivatives are published, every saved asset returns HTTP 200, and the independent guardian confirmed the loaded page module still references the old scene. The Step 2a candidate now renders the approved plate with typed content, native geometry, live labels, pinned controls, and decode-aware loading; its published performance and WebKit checks remain explicitly Not run until deployment.

The eight user-supplied Markdown files are preserved byte-for-byte in [source](source/), with SHA-256 hashes in [source-manifest.json](source-manifest.json). Source audit findings remain claims until independently measured. The [override ledger](overrides.md) contains the four confirmed changes to the documents' defaults.

## Governing sequence

| Order | Original document | Required work and review |
| --- | --- | --- |
| Governing | [LEVELUP.md](source/LEVELUP.md) | Preserve architecture, consultative copy, color meaning, four stages and data boundaries; enforce phase order; defer P2/parallax/amber breathing. |
| 1 | [1-clean-plate.md](source/1-clean-plate.md) | Retouch original only; preserve geometry and illumination; remove all baked text/UI; exact-size check; guardian review; original/edit and close-ups; explicit user OK; only then responsive files and asset-only publish with old scene active. |
| 2a | [2a-baseline-stage-labels.md](source/2a-baseline-stage-labels.md) | Typed shared content, measured native-stage geometry, pins/chips, exact live labels, logo and decode-aware responsive image loading. |
| 2b | [2b-baseline-dialog-panel.md](source/2b-baseline-dialog-panel.md) | Modal/focus behavior, docked panels, typography, own service-family list, working Talk links and independent maturity panel. |
| 3 | [3-phones-tablets.md](source/3-phones-tablets.md) | Composed phones/portrait/short screens, correct scene framing/sheets, navigation rows, safe areas, touch targets and supplied logo. |
| 4 | [4-motion-routes.md](source/4-motion-routes.md) | Clamped camera, manual maturity climb, measured arc highlights, door plates, state/history routes and prepaint cover. Re-run every earlier acceptance check. |
| 5 | [5-kiosk-share.md](source/5-kiosk-share.md) | Independently measured perspective kiosk with shared aggregates only; published-page screenshots, metadata, icons, test-then-static share pages and preview-bot verification. |
| 6 | [6-walk-dashboard.md](source/6-walk-dashboard.md) | Manual caption walk, dashboard accessibility, carousel pause/focus and lobby links; preserve existing functions/countdown. Re-run every earlier check. Optional 40-second idle tour only after required checks pass and then guardian review again. |

This table is an index, not a substitute for the full instructions. [requirements.json](requirements.json) retains every nonblank source line in traceable blocks, including formulas, measurements, restrictions and viewports. [acceptance.md](acceptance.md) retains all **43 original Done-when bullets** verbatim. Every requirement has a source, target, expected result, measured-result field, evidence field and Pass / Fail / Not run state. Each complete bullet, including all clauses, must pass; a viewport list is not a shortened replacement.

Instruction blocks that reference acceptance bullets link to their canonical `acceptanceId`, mirror its observations and review states, and are explicitly excluded from separate acceptance counts.

## Implementation and guardian loop

1. Implement only the current document's work and run its checks.
2. Independent guardian inspects original requirements, candidate artwork/code/behavior and evidence.
3. Rejections record source requirement, observed result, expected result and correction. Correctable defects return for correction and another independent review without a fixed retry limit.
4. Mandatory unavailable checks stay **Not run**. External limitations are reported; ineffective retries do not substitute for verification.
5. Publish the accepted candidate; guardian independently verifies the live result. A live failure returns to correction and republish.
6. Advance only after that phase passes. Phase 1 additionally requires the user's explicit artwork OK; guardian acceptance cannot replace it.

The implementation agent is the primary agent. `/root/experience_guardian` independently reviews and does not change the implementation or publish it. Plan approval is not artwork, candidate or live acceptance.

## Current evidence and outstanding work

- [Phase 1 candidate 01 rejection](reviews/phase-1-candidate-01.md): built-in edit was undersized at 1672×941; artwork not accepted.
- [Phase 1 candidate 02 rejection](reviews/phase-1-candidate-02.md): supplied 2880×1621 plate passes size, but retains the prohibited header band; artwork not accepted.
- [Phase 1 candidate 02 acceptance under O4](reviews/phase-1-candidate-02-accepted.md): guardian re-review and explicit user approval pass all candidate checks; P1-D05 remains open.
- [Phase 1 responsive asset preparation](reviews/phase-1-assets.md): master and AVIF/WebP/JPEG variants are locally measured.
- [Phase 1 published asset review](reviews/phase-1-assets-live.md): all saved assets returned HTTP 200 and the published page module still references the old scene.
- [Phase 1 published guardian review](reviews/phase-1-assets-live-guardian.md): independent guardian Pass for P1-D05 with no required check left unrun.
- [Phase 2a candidate review](reviews/phase-2a-candidate.md): implementation checks and independent matrix results for the native stage candidate.
- [Phase 2a candidate guardian review](reviews/phase-2a-candidate-guardian.md): independent guardian Pass for candidate checks; live publish checks remain Not run.
- [Documentation guardian review and correction](reviews/documentation-checkpoint.md): archive/register accepted for GitHub; this is not artwork or live-site acceptance.
- **0 acceptance items Fail; 9 Pass; 34 Not run.** Phase 1 is complete under O4; Step 2a candidate checks are accepted and the publish gate is the next required step.
- Derivative size limits and HTTP 200 checks pass locally and on the published Site. The old scene remains active; the new assets are staged for Step 2a.
- Phase 2a's live review is **Not run** pending publication; phases 2b–6 remain **Not run** by the governing sequence.
- O4 is the explicit approved exception for the retained upper band; no other clean-plate requirement is waived. Step 2a now owns the next implementation and guardian gate.

The undersized built-in result stays outside application assets. The supplied candidate is approved as the Phase 1 master under O4 but is not yet wired into the Experience; the currently published Experience remains as before this execution phase until Step 2a.

## Register verification

`build-register.py` produced the initial archive/register from the user originals. It asserts all eight copies are byte-identical, retains every nonblank source line, and checks phase bullet counts 5/5/6/7/8/6/6 = 43. It is an initialization tool: preserve/migrate subsequent review observations before rerunning it.

The supplied originals contain trailing spaces on two empty Booking link lines and an ending blank line. The folder's Git attributes preserve those exact source bytes and exempt only the original files from blank-line/trailing-space checks; derived documents remain checked normally.

No application build is needed for this documentation-only checkpoint; application build and browser acceptance remain **Not run** for this implementation.
