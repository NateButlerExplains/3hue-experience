# Phase 2a candidate review

Candidate scope: typed lobby content, native-size stage placement, live labels, pinned doorway controls, responsive `<picture>` sources, idle/interaction prewarming, and the debug overlay.

## Implementation checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run build` | Pass | Direct `vinext build` completed in the dependency-backed Site source clone; all five environments built. |
| `git diff --check` | Pass | Workspace diff contains no whitespace errors. |
| Old image is not used by the candidate | Pass | Candidate DOM uses `/lobby-plate-1920.jpg` as JPEG fallback with AVIF and WebP sources; no `/three-doors-concept.png` in the Experience picture. |
| Shared content source | Pass | `LOBBY_CONTENT` supplies heading, sub-line, doors, buyer labels and stages; catalog door options map from it. |
| Native geometry at local viewport | Pass | At the local browser viewport 1294×912 with `?debug=1`, stage transform is measured from `LOBBY_GEOMETRY`; all three ring centers hit their doorway buttons through `elementFromPoint`. Assess is the lowest stage label. |
| Heading at local viewport | Pass | Guardian matrix confirms every required heading viewport is visible and two lines; h1 is 53.56px at 1440×900, with 22.08px clearance, and 36.57px at 1200×630 with 8.98px clearance. |
| Image sources | Pass | DOM has AVIF and WebP `<source>` elements and a JPEG fallback; PNG is absent from the picture. |
| Door selection | Pass | Each doorway has an accessible `Explore {door}: {promise}` button; selecting Win Trust opens the existing guided path surface. |

## Guardian candidate review

The independent guardian accepted the corrected candidate for all locally testable Step 2a requirements. Across the 13 required viewport sizes, ring placement and hit testing passed with a maximum 0.050px error; Assess remained the lowest stage label; hover/focus changed only the ring and chip; and chip clearance measured 8.995–9px after the safety buffer. Source review confirmed `LOBBY_CONTENT`, catalog mapping, live labels, logo, responsive sources, interaction/idle prewarming, failure reset, and the 337-byte inline blurred placeholder. Reduced-motion transition duration measured exactly 0s.

## Mandatory checks not run yet

Published WebKit, Fast 4G cold-cache timing, exact cold-load placeholder timing, one-download byte measurement at 1440 wide, warm reopen, and CLS remain **Not run**. They require the published candidate and the guardian's independent browser instrumentation.

The candidate is guardian-approved for the publish gate. Phase 2a remains incomplete until the published review runs; no live check is being inferred from the candidate review.
