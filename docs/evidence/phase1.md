# Phase 1 evidence (clean plate), measured 2026-09-10 on this repo's files

| Check | Measurement | Result |
|---|---|---|
| P1-D01 | `tesseract` on `media/plate/lobby-plate-2880.jpg` scaled 2× returns no text | Pass (O4: the upper navy band is accepted) |
| P1-D02 | Plate downscaled to 1672 wide and block-matched against `tools/reference/00-original-1672x941.png` at eight landmarks (three doorways, stair, tower base, table, bust, kiosk edge): best-alignment shift 0–1 px | Pass (max 1 px, limit 6) |
| P1-D03 | Sign panels, kiosk screen and ring bands lit but empty: visible in `art/lobby-rest-2560.png` and the live lobby (labels are DOM text over blank panels) | Pass |
| P1-D04 | `ffprobe`: 2880×1621; 2880×9/16 = 1620 (within 1 px) | Pass |
| P1-D05 | Live probe: every `media/plate/*` file 200 with the right content type; largest AVIF 125,418 B, largest WebP 258,180 B (limit 512,000 B) | Pass |

Commands: `tesseract`, `ffprobe`, and the block-matching script are in this session's log; re-run with `bash tools/bots.sh` for the live 200s and the Python snippet in `docs/evidence/phase1.md`'s history.
