# Phase 2a candidate guardian review

Review type: independent candidate review by the experience guardian (Cicero).

Verdict: **Pass for candidate checks; publish gate required.**

## Measurements and evidence

| Requirement | Result | Guardian evidence |
| --- | --- | --- |
| P2a-D01 — native pins, hit testing, focus/hover, stage order | Pass | All 13 required viewport sizes passed. Maximum ring placement error was 0.050px. Each ring resolved to its transparent doorway button through `elementFromPoint`; Assess remained the lowest stage label. Hover and focus changed only the ring and chip. |
| P2a-D02 — heading visibility, typography, clearance | Pass | All required heading viewports produced a visible two-line heading. At 1440×900, h1 measured 53.56px with 22.08px clearance. At 1200×630, h1 measured 36.57px with 8.984px clearance. |
| P2a-D03 — shared labels and logo | Pass | Source and runtime review confirmed lobby labels and catalog Door options read from `LOBBY_CONTENT`; the 3HUE logo is visible. |
| P2a-D04 — reduced motion | Pass | Reduced-motion transition duration measured exactly 0s. |
| P2a-D05 — published performance and WebKit | Not run | WebKit, Fast 4G cold-cache timing, ≤350ms cold placeholder/plate timing, single-download and warm-open behavior, and CLS require the published candidate. |

## Corrections verified

- Desktop and mobile Experience controls prewarm the lobby on pointer enter, focus, and pointer down.
- Idle prewarming waits until the first idle second.
- Failed image loading or decoding resets prewarm state and never marks the image decoded.
- The cold state uses the required inline 337-byte blurred scene placeholder and polite loading status.
- The chip offset includes a safety buffer and measures at least 8px below each ring.
- The heading uses the dynamic sizing and clearance budget, an unbroken desktop two-line treatment, and cyan emphasis on “One path” only.

The candidate is ready for publication. Phase 2a is not fully accepted until the live review completes; unavailable checks remain explicitly **Not run**.
