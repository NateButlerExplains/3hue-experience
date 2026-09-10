# Original acceptance register

All 43 source bullets are retained verbatim below, including every clause and viewport. The full instruction register is in [requirements.json](requirements.json). Apply only the [three approved overrides](overrides.md); the original text stays unchanged.

A failed image requirement is recorded as Fail even though stopping complies with the document. Nothing about the candidate is accepted by inference. Unrun checks remain Not run.

## Phase 1 — 1-clean-plate.md

Target: Clean image, approval gate and responsive assets.

### P1-D01 — Fail

Source: [1-clean-plate.md, line 23](source/1-clean-plate.md#L23).

- At 2× zoom the plate shows no legible letter or number and no UI shape (pill, arrow circle, header band).

Measured result: Candidate 02 passes removal of painted words, but retains a broad blank navy header-shaped band with a sharp lower boundary around y=63–66 at the 1672px reference width (native y≈109–114). The ceiling/glazing does not continue through it. Guardian rejected this residual UI geometry.

Candidate guardian: Fail. Published guardian: Not run.

Evidence: [reviews/phase-1-candidate-02.md](reviews/phase-1-candidate-02.md)

### P1-D02 — Not run

Source: [1-clean-plate.md, line 24](source/1-clean-plate.md#L24).

- Laid over the original at 50% opacity, scaled to 1672 wide, the doorways, stair, tower rings, table, bust and kiosk line up within 6 px, including the doorway centres 333,537, 748,535 and 1357,540.

Measured result: Full acceptance is not run because complete clean-plate clearance is outstanding. Guardian sampled 35 landmarks: 33 matched at 0–1px; two were inconclusive around the repaired stair and dark foreground chair.

Candidate guardian: Not run — blocked by P1-D01. Published guardian: Not run.

### P1-D03 — Pass

Source: [1-clean-plate.md, line 25](source/1-clean-plate.md#L25).

- The sign panels, kiosk screen and ring bands are still lit, just empty.

Measured result: Guardian visual inspection confirms the three sign panels, kiosk screen and four tower ring bands/base line remain illuminated and empty.

Candidate guardian: Pass. Published guardian: Not run.

Evidence: [reviews/phase-1-candidate-02.md](reviews/phase-1-candidate-02.md)

### P1-D04 — Pass

Source: [1-clean-plate.md, line 26](source/1-clean-plate.md#L26).

- You reported the plate's exact size, and it is at least 1920×1080 at 16:9 (±1 px), or you stopped.

Measured result: Candidate 02 is 2880×1621, 4,679,649 bytes, with +1px height deviation from 16:9. It meets the at-least-1920×1080 native-size rule. Candidate 01 remains historically rejected at 1672×941; see its separate review.

Candidate guardian: Fail. Published guardian: Not run.

Evidence: [reviews/phase-1-candidate-02.md](reviews/phase-1-candidate-02.md), [reviews/phase-1-candidate-01.md](reviews/phase-1-candidate-01.md)

### P1-D05 — Pass

Source: [1-clean-plate.md, line 27](source/1-clean-plate.md#L27).

- After my OK: every saved file returns 200, each AVIF and WebP copy is 500 KB or less, and the live lobby still shows the old image.

Measured result: User artwork-OK gate is satisfied. The master and responsive variants are prepared, all AVIF/WebP files are below 500 KB, and local dimensions are verified. Every saved asset returns HTTP 200 from the published Site. The loaded page module still references `/three-doors-concept.png`, which also returns HTTP 200, so the old scene remains active until Step 2a.

Candidate guardian: Pass. Published guardian: Pass.

Evidence: [reviews/phase-1-assets.md](reviews/phase-1-assets.md), [reviews/phase-1-assets-live.md](reviews/phase-1-assets-live.md)

## Phase 2a — 2a-baseline-stage-labels.md

Target: LOBBY_CONTENT, LOBBY_GEOMETRY, stage, labels and image loading.

### P2a-D01 — Not run

Source: [2a-baseline-stage-labels.md, line 14](source/2a-baseline-stage-labels.md#L14).

- `?debug=1` at 1024×768, 1280×800, 1440×900, 1512×982, 1920×1080 and 2560×1440: each ring sits within 4 px of its point, on its doorway, where elementFromPoint returns its button; hover and focus change only ring and chip; Assess labels the lowest band.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P2a-D02 — Not run

Source: [2a-baseline-stage-labels.md, line 15](source/2a-baseline-stage-labels.md#L15).

- The heading block is fully visible, below the header and logo, and clear of every door frame at 1024×768, 1180×820, 1200×630, 1280×720, 1366×657, 1366×1024, 1440×900, 1536×730 and 1920×902; at 1440×900 the h1 is 48 px or more, on two lines.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P2a-D03 — Not run

Source: [2a-baseline-stage-labels.md, line 16](source/2a-baseline-stage-labels.md#L16).

- Renaming a door in `LOBBY_CONTENT` renames it everywhere; the lobby header shows the 3HUE logo.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P2a-D04 — Not run

Source: [2a-baseline-stage-labels.md, line 17](source/2a-baseline-stage-labels.md#L17).

- Reduced motion makes the fade instant.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P2a-D05 — Not run

Source: [2a-baseline-stage-labels.md, line 18](source/2a-baseline-stage-labels.md#L18).

- WebKit at 1440×900 passes the first two checks; on Fast 4G, cold cache, the placeholder or plate shows within 350 ms of pressing Experience, the plate downloads once (≤500 KB at 1440 wide), a warm reopen skips the placeholder, and CLS stays 0.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

## Phase 2b — 2b-baseline-dialog-panel.md

Target: Dialog, panels, focus, contact destinations and maturity path.

### P2b-D01 — Not run

Source: [2b-baseline-dialog-panel.md, line 16](source/2b-baseline-dialog-panel.md#L16).

- Keyboard only at 1280×720 and 1440×900: Enter on Experience focuses the h1; Tab and Shift+Tab never leave the lobby; Enter on a door opens its panel with focus on its h2; Escape returns focus to that door, a second Escape to Experience. WebKit matches.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P2b-D02 — Not run

Source: [2b-baseline-dialog-panel.md, line 17](source/2b-baseline-dialog-panel.md#L17).

- At 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080 and 390×844, elementFromPoint at "Back to doors" and each tab returns it, and a tab click switches the h2.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P2b-D03 — Not run

Source: [2b-baseline-dialog-panel.md, line 18](source/2b-baseline-dialog-panel.md#L18).

- With each door's panel open at 1280×720, 1440×900, 1512×982 and 1920×1080, its frame is wholly inside R and the heading hidden.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P2b-D04 — Not run

Source: [2b-baseline-dialog-panel.md, line 19](source/2b-baseline-dialog-panel.md#L19).

- At 1440×900 and 390×844 no lobby text is under 12 px and the outline is h2 > h3; Talk is each panel's only filled button, above the fold at 1280×720.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P2b-D05 — Not run

Source: [2b-baseline-dialog-panel.md, line 20](source/2b-baseline-dialog-panel.md#L20).

- Every Talk opens the booking link; no lobby control shows a toast or a price; the header shows the 3HUE logo.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

Applicable override references: O2. Full override ledger governs all phases.

### P2b-D06 — Not run

Source: [2b-baseline-dialog-panel.md, line 21](source/2b-baseline-dialog-panel.md#L21).

- The chip, the only path control, opens the path panel, fresh and after each door; focus and selection look different; nothing stays selected after its panel closes.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

## Phase 3 — 3-phones-tablets.md

Target: Composed phone/tablet layouts, touch, safe areas and logos.

### P3-D01 — Not run

Source: [3-phones-tablets.md, line 18](source/3-phones-tablets.md#L18).

- At 390×844, 768×1024, 844×390 and 1024×1366: every door is reachable and labelled without hover, each row opens its door, and nothing overflows horizontally from 320 px up, dashboard top bar included.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P3-D02 — Not run

Source: [3-phones-tablets.md, line 19](source/3-phones-tablets.md#L19).

- At 390×844, report the h1 size (≥28 px) and the smallest lobby tap target (≥44×44); the band shows no text but the door numbers.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P3-D03 — Not run

Source: [3-phones-tablets.md, line 20](source/3-phones-tablets.md#L20).

- With each door's sheet open at 390×844 and 768×1024, that door is fully visible above the sheet, no pin sits on another door, and elementFromPoint at "Back to doors" and each tab returns it; at 844×390 the sheet fills the screen below the header.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P3-D04 — Not run

Source: [3-phones-tablets.md, line 21](source/3-phones-tablets.md#L21).

- At 1024×768, 1180×820 and 1366×1024 the desktop scene shows, each ring within 4 px of its doorway.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P3-D05 — Not run

Source: [3-phones-tablets.md, line 22](source/3-phones-tablets.md#L22).

- "Experience" shows on the dashboard at 320×640, 390×844 and 768×1024 without opening a menu; no base64 logo remains, and the logo is crisp at 1440×900@2x.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P3-D06 — Not run

Source: [3-phones-tablets.md, line 23](source/3-phones-tablets.md#L23).

- Keyboard only at 390×844, and again under reduced motion: Tab reaches the four rows in order, Enter opens each, Escape closes the sheet with focus back on the row.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P3-D07 — Not run

Source: [3-phones-tablets.md, line 24](source/3-phones-tablets.md#L24).

- WebKit at 390×844 matches and fetches a plate 1920 px wide or less, and at 844×390 shows the dashboard and lobby without overflow, with safe-area side padding.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

## Phase 4 — 4-motion-routes.md

Target: Camera placement, guided climb, plates, routing and boot cover.

### P4-D01 — Not run

Source: [4-motion-routes.md, line 14](source/4-motion-routes.md#L14).

- At 1280×720, 1440×900, 1512×982 and 1920×1080, after each door's dolly its whole frame is inside R.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P4-D02 — Not run

Source: [4-motion-routes.md, line 15](source/4-motion-routes.md#L15).

- Only transform and opacity animate; `will-change` is absent at rest; labels are sharp after a move at 1440×900@2x.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P4-D03 — Not run

Source: [4-motion-routes.md, line 16](source/4-motion-routes.md#L16).

- From `#/path`, "Next stage" lights the rings bottom to top, each arc directly above its stage's name and fully visible beside the panel, then shows "Where to start".

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P4-D04 — Not run

Source: [4-motion-routes.md, line 17](source/4-motion-routes.md#L17).

- Each route pasted into a fresh tab opens its state; Back steps panel, lobby, dashboard, one per press; Forward and reload restore; dashboard navigation still works.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

Applicable override references: O3. Full override ledger governs all phases.

### P4-D05 — Not run

Source: [4-motion-routes.md, line 18](source/4-motion-routes.md#L18).

- At 1440×900 no plate leaves the viewport or covers another ring.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P4-D06 — Not run

Source: [4-motion-routes.md, line 19](source/4-motion-routes.md#L19).

- Under reduced motion every flow completes and `document.getAnimations()` is empty after each step.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P4-D07 — Not run

Source: [4-motion-routes.md, line 20](source/4-motion-routes.md#L20).

- WebKit passes the route check; p95 frame time during a dolly at 1440×900 is under 20 ms; on Fast 4G, cold cache, no filmstrip frame of any route shows dashboard content.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P4-D08 — Not run

Source: [4-motion-routes.md, line 21](source/4-motion-routes.md#L21).

- Every earlier Done-when item still passes.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

## Phase 5 — 5-kiosk-share.md

Target: Kiosk projection, shared aggregates, screenshots, metadata, share pages and icons.

### P5-D01 — Not run

Source: [5-kiosk-share.md, line 14](source/5-kiosk-share.md#L14).

- The kiosk and share pages contain 0 "Drata", "watched", "$", "pipeline" or "opportunit".

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P5-D02 — Not run

Source: [5-kiosk-share.md, line 15](source/5-kiosk-share.md#L15).

- At 1280×720, 1366×657, 1440×900, 1920×1080 and 2560×1440 the kiosk content is hidden or fully on its screen, every line 12 px or more at 4.5:1.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P5-D03 — Not run

Source: [5-kiosk-share.md, line 16](source/5-kiosk-share.md#L16).

- Every word on each card matches the live page character for character, and each card shows the heading, the three sign names and the door chips.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P5-D04 — Not run

Source: [5-kiosk-share.md, line 17](source/5-kiosk-share.md#L17).

- Zoomed 8× at 2560×1440, kiosk corners sit within 2 px of the screen's edges with no seam and stay there through the Stay Ready dolly; WebKit places it as Chromium does.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P5-D05 — Not run

Source: [5-kiosk-share.md, line 18](source/5-kiosk-share.md#L18).

- curl of the root as Slackbot-LinkExpanding, LinkedInBot, Twitterbot and facebookexternalhit shows the og and twitter tags; og:image returns 200, 1200×630, under 300 KB; each share page, if the host serves them, returns 200 to those bots with its own og:title, og:image and og:url, no refresh, and opens its state in a browser.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P5-D06 — Not run

Source: [5-kiosk-share.md, line 19](source/5-kiosk-share.md#L19).

- `/robots.txt` returns 200 and blocks none of those bots; both icons return 200 and show the 3HUE mark on navy.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

## Phase 6 — 6-walk-dashboard.md

Target: Walk, dashboard accessibility, carousel and conditional idle tour.

### P6-D01 — Not run

Source: [6-walk-dashboard.md, line 14](source/6-walk-dashboard.md#L14).

- Keyboard only at 1440×900 and 390×844: 30 Tab presses stay in the shell; Enter on "Take the walk" or Guide starts it; Right walks every step, each announced once, with the matching door tab pressed; Escape ends at rest with focus on "Take the walk", and one more Back returns to the dashboard.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

Applicable override references: O3. Full override ledger governs all phases.

### P6-D02 — Not run

Source: [6-walk-dashboard.md, line 15](source/6-walk-dashboard.md#L15).

- At 1440×900 and 390×844 the caption bar covers no panel or sheet text, door frame, lit ring or kiosk screen.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P6-D03 — Not run

Source: [6-walk-dashboard.md, line 16](source/6-walk-dashboard.md#L16).

- Fields show focus rings, the first Tab reveals "Skip to content", and the catalog, admin modal and drawer close on Escape, returning focus.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P6-D04 — Not run

Source: [6-walk-dashboard.md, line 17](source/6-walk-dashboard.md#L17).

- With reduced motion, or the lobby open, the carousel stays still for 20 s; "See this in the lobby" opens the paired door, and Back then steps door, lobby, dashboard.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P6-D05 — Not run

Source: [6-walk-dashboard.md, line 18](source/6-walk-dashboard.md#L18).

- axe at 1280×720 and 390×844: 0 violations in the resting lobby and every panel, 0 contrast violations on Analyst, Director and C-suite; WebKit passes the focus checks.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.

### P6-D06 — Not run

Source: [6-walk-dashboard.md, line 19](source/6-walk-dashboard.md#L19).

- CLS stays 0, and every earlier Done-when item still passes. If "Take the walk" now shows in prompt 5's lobby-at-rest cards, recapture them.

Measured result: Phase not yet accepted or implemented.

Candidate guardian: Not run. Published guardian: Not run.
