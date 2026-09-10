# Phase 1 live asset review

Date: 2026-09-10  
Published Site: https://hue.executive-co-1918.chatgpt.site/  
Deployment: `appgdep_6aa3064d8d0c8191ad4a181f01c6b913`

## Published asset checks

Each saved Phase 1 asset returned HTTP 200 from the published Site:

| Asset | Status | Content type observed |
| --- | ---: | --- |
| `/lobby-plate.png` | 200 | `image/png` |
| `/lobby-plate-828.avif` | 200 | `image/avif` |
| `/lobby-plate-828.webp` | 200 | `application/octet-stream` |
| `/lobby-plate-828.jpg` | 200 | `image/jpeg` |
| `/lobby-plate-1280.avif` | 200 | `image/avif` |
| `/lobby-plate-1280.webp` | 200 | `application/octet-stream` |
| `/lobby-plate-1280.jpg` | 200 | `image/jpeg` |
| `/lobby-plate-1920.avif` | 200 | `image/avif` |
| `/lobby-plate-1920.webp` | 200 | `application/octet-stream` |
| `/lobby-plate-1920.jpg` | 200 | `image/jpeg` |
| `/lobby-plate-2880.avif` | 200 | `image/avif` |
| `/lobby-plate-2880.webp` | 200 | `application/octet-stream` |
| `/lobby-plate-2880.jpg` | 200 | `image/jpeg` |
| `/three-doors-concept.png` | 200 | `image/png` |

The locally measured AVIF and WebP variants remain below the 500 KB limit; dimensions and byte sizes are recorded in [phase-1-assets.md](phase-1-assets.md).

## Old-scene-live check

The published root returned HTTP 200. Its loaded page module (`/_next/static/chunks/page-DrOR_Mp7.js`) contains the `/three-doors-concept.png` reference, and that image also returned HTTP 200. The newly published `/lobby-plate-*` assets are therefore available for Step 2a while the old scene remains the active lobby artwork in Phase 1.

## Result

P1-D05: **Pass** for the published asset and rollback checks. The independent published guardian review is recorded in [phase-1-assets-live-guardian.md](phase-1-assets-live-guardian.md). No application code was changed or wired to the new plate during Phase 1.
