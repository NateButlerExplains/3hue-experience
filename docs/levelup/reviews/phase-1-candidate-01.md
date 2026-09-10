# Phase 1 — candidate 01 — rejected

Source: [1-clean-plate.md](../source/1-clean-plate.md), **Size**, **Gate**, and Done-when item 4 ([P1-D04](../acceptance.md#p1-d04--fail)).

## Candidate and method

- Original: `assets/brand/solution-builder/2026-09-09/04-three-doors-concept.png` (1672×941).
- Original SHA-256: `19F3115282ED45AB168D08523ED836EA115F588E9F0454B8C490AB77E4779F96`.
- Built-in image editor was given that original reference, the complete removal list, exact composition/lighting/prop invariants, and a native output request of 2560×1440 or larger, at least 1920×1080.
- Local rejected output: `C:/Users/ai-gu/.codex/generated_images/01a087bf-50ba-72a1-8cd2-86c163d0a9f4/exec-2dcfcf0c-1d47-4ff5-b529-974ca5d1df27.png`.
- This is a rejected preview, not `/lobby-plate.png` or an approved application asset.

## Measurements

| Check | Expected | Implementer | Independent guardian | Result |
| --- | --- | --- | --- | --- |
| Native dimensions | At least 1920×1080 | 1672×941 via System.Drawing | 1672×941 via independent System.Drawing read | **Fail**: width short by 248px, height by 139px |
| Aspect tolerance | Height within 1px of width×9/16 | +0.5px | +0.5px | Pass for this subcondition only |
| File size | Recorded, not an acceptance threshold for this preview PNG | 2,154,762 bytes | 2,154,762 bytes | Recorded |
| Complete removal at 2× | No remaining letters/numbers/UI | Not run | Not run | **Not run** |
| Original 50% overlay | Every specified object aligned within 6px at 1672px reference width | Not run | Not run | **Not run** |
| Illumination preservation | Lit blank signs, kiosk and all ring bands | Not run | Not run | **Not run** |
| Side-by-side and five required close-ups | Acceptable candidate presented for user OK | Not run | Not run | **Not run**: size failure stops before approval presentation |
| Derivatives, size limits and live 200s | Only after explicit user OK | Not run | Not run | **Not run** |

The source bullet allows reporting a stop when size fails. The stop complies with that safety instruction, but the register still records **Fail** for the unfulfilled artwork size rather than implying that a compliant plate exists.

## Guardian verdict

`/root/experience_guardian` independently verified **1672×941**, **2,154,762 bytes**, aspect deviation **+0.5px**, and returned **REJECT**. It confirmed the source requires stopping and that the rejected image must not be adopted, upscaled, cropped, padded, or submitted as an approval-ready candidate. A native-size visual inspection did not substitute for the unrun exhaustive geometry/removal checks.

## Required correction and disposition

Obtain a compliant retouched plate meeting the size rule, from the original scene. Re-run exact-size, complete-removal, geometry and illumination checks; then present the required comparison and close-ups for explicit user OK. A different size rule needs an explicit user amendment.

Work stopped at the document's size gate. No repeated image calls, hidden resampling, color patches, master adoption, derivatives, app changes or deployment followed. The unchanged-source archive and review register are the only repository changes in this checkpoint. All later candidate and live checks remain **Not run**.
