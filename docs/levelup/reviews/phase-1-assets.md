# Phase 1 — responsive asset preparation

The user-approved and guardian-accepted plate was copied to the prescribed master name in the project asset tree and encoded into the prescribed responsive formats. The source scene remains unchanged and the new assets are not wired into the Experience until Step 2a.

## Local measurements

All measurements were made with `ffprobe` against the generated files. AVIF and WebP files are each below the required 500 KB limit.

| Asset | Dimensions | Bytes | AVIF/WebP limit |
| --- | ---: | ---: | --- |
| `lobby-plate.png` | 2880×1621 | 4,679,649 | Master PNG; limit does not apply |
| `lobby-plate-828.avif` | 828×466 | 21,679 | Pass |
| `lobby-plate-828.webp` | 828×466 | 39,974 | Pass |
| `lobby-plate-828.jpg` | 828×466 | 48,093 | q80 fallback |
| `lobby-plate-1280.avif` | 1280×720 | 42,655 | Pass |
| `lobby-plate-1280.webp` | 1280×720 | 81,610 | Pass |
| `lobby-plate-1280.jpg` | 1280×720 | 100,454 | q80 fallback |
| `lobby-plate-1920.avif` | 1920×1080 | 75,206 | Pass |
| `lobby-plate-1920.webp` | 1920×1080 | 151,762 | Pass |
| `lobby-plate-1920.jpg` | 1920×1080 | 195,006 | q80 fallback |
| `lobby-plate-2880.avif` | 2880×1621 | 125,418 | Pass |
| `lobby-plate-2880.webp` | 2880×1621 | 258,180 | Pass |
| `lobby-plate-2880.jpg` | 2880×1621 | 355,632 | q80 fallback |

No duplicate listed width at or above the native width was created; the largest copy uses its own width (`2880`). AVIF is available, so both AVIF and WebP are shipped with JPEG fallbacks.

## Remaining P1-D05 checks

The local files are prepared and pass their dimensions and size limits. HTTP 200 checks after Site publication and confirmation that the live lobby still serves the old `/three-doors-concept.png` remain **Not run**. Those checks must pass before Phase 1 is marked complete. The accepted plate is not yet wired into the lobby.
