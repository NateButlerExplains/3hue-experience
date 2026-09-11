# Render gate (per room candidate)

A candidate is a file under `art/rooms/<door>/candidate-NN.png` with the prompt that produced it beside it as `prompt.txt`. `art/` is git-ignored; only approved derivatives ship under `media/rooms/`.

Pipeline: `bash tools/upscale-room.sh art/rooms/<door>/candidate-NN.png` (Real-ESRGAN, then downsample to a 2560×1440 master) → `node tools/gate-sheet.js <door> NN` (contact sheet: candidate beside the lobby door crop, plus 2× crops of five anchor areas) → open `?room-preview=art/rooms/<door>/candidate-NN.png#/door/<door>` at 1440×900 and 390×844 to see it in the real dolly and crossfade → send the sheet and two screenshots to Nate.

Pass only if all of these hold:
1. Master is 2560×1440 or larger at 16:9 after the O6 upscale; the native file is kept beside it.
2. No legible letter, numeral, logo or UI element at 2× zoom (tesseract at 2× returns nothing).
3. No people.
4. Every display is flat, rectangular, seen straight on, dark and blank, with nothing standing in front of it. No curved, holographic or projected surfaces.
5. Materials and colour temperature match the plate: charcoal, walnut, warm-white coves, pale stone floor, night glass, cool ambient.
6. Only the door's accent colour is saturated (cyan / orange / steel-blue) and only as a thin line.
7. Five distinct props exist for station pins.
8. The dock-side third (right for Win Trust and Gain Control, left for Stay Ready) is quiet enough for a panel.
9. At z 1.3 in the crossfade no seam or edge of the room image shows inside the viewport at 1440×900 or 1920×1080.

Nate's written OK on the sheet is the gate. Then: `bash tools/build-derivatives.sh <door>` → `media/rooms/<door>-{2560,2048,1280}.{avif|webp,jpg}` (each ≤ 600 KB), measure the focus point and station pins on the 2560 master in `tools/geometry-tool.html` → `geometry.rooms.<door>`, set `doors[].room.render`, recapture the door's share card.

## Sign-off record

| Date | Rooms | Decision |
|---|---|---|
| 2026-09-10 | win-trust, gain-control, stay-ready (candidate-01 of each, as published at commit 7fa92e4) | Approved. Nate relayed that the 3HUE owner reviewed the live site and was very happy with the results. Recorded as the written OK this gate requires. |
