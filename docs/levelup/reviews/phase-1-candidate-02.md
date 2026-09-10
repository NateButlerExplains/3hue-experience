# Phase 1 — candidate 02 — rejected

Source: [1-clean-plate.md](../source/1-clean-plate.md), its removal list, Size, Gate and five Done-when bullets.

## Candidate and evidence

- Supplied plate: `C:/apps/lobby-plate.png`.
- SHA-256: `6F92730A718742285EBA1F592C35A9979101183BE06500F7906069692882B618`.
- Native dimensions independently measured with System.Drawing: **2880×1621**, 24-bit RGB, 4,679,649 bytes. Height deviation from 16:9 is **+1 px**, within tolerance.
- Read-only comparison evidence: `phase1-candidate-02/original-vs-candidate.png`, `top-middle-compare.png`, `left-door.png`, `center-door.png`, `right-door.png`, `tower.png`, and `kiosk.png` in the local generated review directory. These files are inspection artifacts, not application assets.

## Independent guardian review

`/root/experience_guardian` inspected the supplied image in nine 2× tiles and compared it with the original in normalized plate space. The guardian confirmed that the door signs, side lists, headline, stage names, plinth text, kiosk text/icon, pills, arrow circles and captions are removed. It also confirmed that the three illuminated sign panels, four tower arcs plus base line, and kiosk illumination remain visible.

The candidate retains a broad blank navy header-shaped band across the upper center. Its sharp lower boundary is around **y=63–66 at the 1672 px reference width** (approximately **native y=109–114**). The ceiling/glazing does not continue through this area. This is residual UI geometry under the source instruction and fails the clean-plate requirement.

The normalized 50% overlay found 33 of 35 sampled landmarks at 0–1 px offset. Two weak matches around the repaired stair and dark foreground chair were inconclusive; because complete clearance is outstanding, the full geometry acceptance is not granted.

## Acceptance state

| Check | Result | Evidence |
| --- | --- | --- |
| Native size and aspect | **Pass** | 2880×1621; +1 px aspect deviation |
| No lettering or UI shape at 2× | **Fail** | Remaining header band and lower boundary in upper-middle comparison |
| Original alignment within 6 px | **Not run** | Partial landmark sampling only; full acceptance waits for corrected plate |
| Lit blank signs, kiosk and ring bands | **Pass** | Independent visual inspection |
| Post-OK derivatives and live 200 responses | **Not run** | User approval gate has not been reached |

## Required correction

Remove the remaining header band and its sharp lower edge by continuing the original ceiling/glazing through that area. Preserve the exact composition, camera, doorways, staircase, tower rings, table, chairs, bust/plinth, kiosk, props and illumination. Supply the corrected plate at native 16:9 dimensions at least 1920×1080 for another independent review.

This candidate is not adopted, copied into application assets, upscaled, cropped or published. Phase 1 remains stopped before the explicit user artwork-OK gate; phases 2a–6 remain Not run.
