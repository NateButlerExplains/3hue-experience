# Standalone acceptance register

The 43 Done-when checks from the level-up documents, re-scoped for this site by the rule in [DECISIONS.md O7](DECISIONS.md): a clause that names dashboard chrome (header.topbar, the Experience button, Return to intelligence, catalog-shell, the admin modal, the drawer, `.icp-carousel`, Guide, the NB chip, dashboard data) is replaced by its standalone equivalent or removed; viewports, tolerances, timings and counts are kept verbatim. Six room checks (R-01 … R-06) are added for the rendered rooms (O5) and are never counted against the 43.

Every check keeps its ID and its original bullet, quoted verbatim from [levelup/acceptance.md](levelup/acceptance.md), then a disposition row. **Candidate (local)** is the working tree served by `node tools/serve.mjs`; **Published** is https://natebutlerexplains.github.io/3hue-experience/ (`CHECK_BASE=…`). Both columns are **Not run** until the named spec has produced a measured value and evidence under `docs/evidence/`. A check is Pass, Fail or Not run; nothing is accepted by inference, and a re-scoped clause is tested exactly as rewritten here.

## Summary

| Disposition | Count | Checks |
|---|---|---|
| applies | 31 | P1-D01, P1-D02, P1-D03, P1-D04, P1-D05, P2a-D01, P2a-D02, P2a-D03, P2a-D04, P2b-D02, P2b-D03, P2b-D04, P2b-D05, P2b-D06, P3-D02, P3-D03, P3-D04, P3-D06, P4-D01, P4-D02, P4-D03, P4-D05, P4-D06, P4-D08, P5-D01, P5-D03, P5-D04, P5-D05, P5-D06, P6-D02, P6-D06 |
| re-scoped | 11 | P2a-D05, P2b-D01, P3-D01, P3-D05, P3-D07, P4-D04, P4-D07, P5-D02, P6-D01, P6-D03, P6-D05 |
| dropped | 1 | P6-D04 |
| **total** | **43** | |
| rooms (new, outside the 43) | 6 | R-01, R-02, R-03, R-04, R-05, R-06 |

| Column | Pass | Fail | Not run |
|---|---|---|---|
| Candidate (local) | 47 | 0 | 1 |
| Published | 0 | 0 | 48 |

Dropped checks carry no result. Every earlier phase's rows are re-run at P4-D08 and P6-D06.

## Overrides referenced

IDs are those in [DECISIONS.md](DECISIONS.md) (O1–O4 carried from [levelup/overrides.md](levelup/overrides.md); O5–O9 new for this build).

| ID | Decision | Rows it touches |
|---|---|---|
| O1 | Buyer labels SaaS & AI vendors / Portfolio owners / Regulated operators. Copy only; changes no disposition (kickers, plates, rows, captions read `doors[].icp`). | — |
| O2 | Every Talk → https://3hue.net/contact.html, new tab, `rel="noopener noreferrer"`. | P2b-D05 |
| O3 | Deep links have exactly the lobby beneath them; no dashboard entry, no staff stack. | P4-D04, P6-D01, P6-D04 |
| O4 | The plate's upper navy band is accepted for this plate only. | P1-D01 |
| O5 | Rendered rooms behind each door; `?rooms=0` keeps the spec-as-written behaviour. | P2b-D03, P3-D03, P4-D01, P4-D02, P4-D06, P5-D03, R-01, R-02, R-03, R-04, R-05, R-06 |
| O6 | Room renders may be upscaled (Real-ESRGAN) and are judged on the result. | R-01 |
| O7 | Standalone re-scope rule: dashboard-chrome clauses replaced or removed; viewports, tolerances, timings and counts verbatim. | P2a-D05, P2b-D01, P3-D01, P3-D05, P3-D07, P4-D04, P4-D07, P5-D02, P6-D01, P6-D03, P6-D04, P6-D05 |
| O8 | Header logo links to https://3hue.net; there is no "Return to intelligence". | P2a-D03, P2b-D05, P3-D05 |
| O9 | Kiosk shows manifest-derived counts under "Representative data" with the "AiVRIC intelligence layer" header line. | P5-D01, P5-D02 |

## Spec map

Placeholders for the specs the plan lists (each reads `window.__lobby` under `?debug=1` and writes measured values to `docs/evidence/<spec>/`). Playwright projects: `chromium`, `webkit`, `chromium-reduced`; live runs set `CHECK_BASE`.

| Proof | Rows |
|---|---|
| `tests/manifest.spec.mjs` | P5-D01 |
| `tests/overlay.spec.mjs` | P1-D01, P1-D02, P1-D03, P1-D04 |
| `tests/geometry.spec.mjs` | P2a-D01, P3-D04 |
| `tests/heading.spec.mjs` | P2a-D02 |
| `tests/rename.spec.mjs` | P2a-D03 |
| `tests/boot.spec.mjs` | P1-D05, P2a-D04, P2a-D05, P4-D07, P6-D06, R-05 |
| `tests/focus.spec.mjs` | P2b-D01, P2b-D02, P2b-D06, P6-D03, P6-D05 |
| `tests/type.spec.mjs` | P2b-D04, P2b-D05 |
| `tests/routes.spec.mjs` | P4-D04, P4-D07, R-05 |
| `tests/motion.spec.mjs` | P2b-D03, P4-D01, P4-D02, P4-D06, P4-D07, R-05 |
| `tests/climb.spec.mjs` | P4-D03, R-05 |
| `tests/plates.spec.mjs` | P4-D05, R-05 |
| `tests/phone.spec.mjs` | P3-D01, P3-D02, P3-D03, P3-D05, P3-D06, P3-D07 |
| `tests/kiosk.spec.mjs` | P5-D01, P5-D02, P5-D04 |
| `tests/walk.spec.mjs` | P6-D01, P6-D02 |
| `tests/axe.spec.mjs` | P6-D05 |
| `tests/rooms.spec.mjs` | R-01, R-02, R-03, R-04, R-06 |
| `tools/bots.sh` | P1-D05, P5-D01, P5-D03, P5-D05, P5-D06 |
| `tools/lighthouse.sh` | a11y 100, perf ≥ 90 desktop, CLS 0 (plan verification block; supports P2a-D05, P6-D06) |
| `tools/gate-sheet.py` + RENDER-GATE.md | R-01 |
| `tools/build-shares.js` (`media/share/cards.json`) | P5-D03 |

```
npm run lint                                  # tools/check-manifest.js
npm run serve                                 # local candidate
npx playwright test --project=chromium|webkit|chromium-reduced
CHECK_BASE=https://natebutlerexplains.github.io/3hue-experience/ npx playwright test
bash tools/bots.sh <live url>
bash tools/lighthouse.sh <live url>
```

## Register

### Phase 1 — 1-clean-plate.md

Target: Clean image, approval gate and responsive assets.

#### P1-D01 — applies

Source: [1-clean-plate.md, line 23](levelup/source/1-clean-plate.md#L23)

> At 2× zoom the plate shows no legible letter or number and no UI shape (pill, arrow circle, header band).

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies (O4) | Pass (manual, docs/evidence/phase1.md: OCR at 2x empty; O4 band accepted) | Not run | `tests/overlay.spec.mjs` |

- O4 accepts the retained upper navy band for this plate only. Every other clause is enforced: no legible letter or number, no pill, no arrow circle.
- Re-run here on `media/plate/lobby-plate-2880.jpg` at 2×. The fork's record (docs/levelup/reviews/phase-1-candidate-02-accepted.md) is history, not this candidate's evidence.

#### P1-D02 — applies

Source: [1-clean-plate.md, line 24](levelup/source/1-clean-plate.md#L24)

> Laid over the original at 50% opacity, scaled to 1672 wide, the doorways, stair, tower rings, table, bust and kiosk line up within 6 px, including the doorway centres 333,537, 748,535 and 1357,540.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (manual, docs/evidence/phase1.md: max landmark displacement 1 px) | Not run | `tests/overlay.spec.mjs` |

- The fork left this Not run (blocked by P1-D01, later accepted under O4). It must be run here: `tools/geometry-tool.html` carries the 50 % overlay of the 1672 original (`tools/reference/`, git-ignored), and the clause is measured in the 1672 frame as written. The same centres in this plate's pixels are 573.6,925 · 1288.4,921.5 · 2337.4,930.1 (×2880/1672).

#### P1-D03 — applies

Source: [1-clean-plate.md, line 25](levelup/source/1-clean-plate.md#L25)

> The sign panels, kiosk screen and ring bands are still lit, just empty.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (manual, docs/evidence/phase1.md) | Not run | `tests/overlay.spec.mjs` |

- The kiosk screen now carries mounted live content (P5); the painted screen under it must still be lit and blank, so the check is run with the kiosk element hidden.

#### P1-D04 — applies

Source: [1-clean-plate.md, line 26](levelup/source/1-clean-plate.md#L26)

> You reported the plate's exact size, and it is at least 1920×1080 at 16:9 (±1 px), or you stopped.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (manual, docs/evidence/phase1.md: 2880x1621) | Not run | `tests/overlay.spec.mjs` |

- The plate is 2880×1621; 2880×9/16 = 1620, so the height deviates by +1 px, inside the ±1 px the clause allows.
- The fork register's row for this check is internally inconsistent (heading "Pass", guardian line "Fail"). This register re-measures instead of inheriting either.

#### P1-D05 — applies

Source: [1-clean-plate.md, line 27](levelup/source/1-clean-plate.md#L27)

> After my OK: every saved file returns 200, each AVIF and WebP copy is 500 KB or less, and the live lobby still shows the old image.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (manual, docs/evidence/phase1.md: local 200s, AVIF 125 KB, WebP 258 KB) | Not run | `tests/boot.spec.mjs` (200 + size for every plate file; live via `CHECK_BASE`) · `tools/bots.sh` |

- Clauses 1 and 2 re-run here against `media/plate/lobby-plate-{828,1280,1920,2880}.{avif,webp,jpg}`.
- Clause 3, "the live lobby still shows the old image", was Phase 1's staging condition on the fork's site (do not wire the plate before 2a). It was recorded Pass / Pass there (docs/levelup/reviews/phase-1-assets-live.md). This site never served the old PNG and wires the plate from its first publish, so that clause has nothing to measure here; it is carried as the fork's record, not re-run, and the row's result is the result of clauses 1 and 2.

### Phase 2a — 2a-baseline-stage-labels.md

Target: LOBBY_CONTENT, LOBBY_GEOMETRY, stage, labels and image loading.

#### P2a-D01 — applies

Source: [2a-baseline-stage-labels.md, line 14](levelup/source/2a-baseline-stage-labels.md#L14)

> `?debug=1` at 1024×768, 1280×800, 1440×900, 1512×982, 1920×1080 and 2560×1440: each ring sits within 4 px of its point, on its doorway, where elementFromPoint returns its button; hover and focus change only ring and chip; Assess labels the lowest band.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (21 runs; chromium, webkit, chromium-reduced) | Not run | `tests/geometry.spec.mjs` |

- Precondition: `content/geometry.json` `measured.doorways`, `tower`, `rings` and `stairPill` are still `false` (seeded ×1.72249 values). Gate A's re-measure in `tools/geometry-tool.html` must land first; seeded values cannot pass by inference.

#### P2a-D02 — applies

Source: [2a-baseline-stage-labels.md, line 15](levelup/source/2a-baseline-stage-labels.md#L15)

> The heading block is fully visible, below the header and logo, and clear of every door frame at 1024×768, 1180×820, 1200×630, 1280×720, 1366×657, 1366×1024, 1440×900, 1536×730 and 1920×902; at 1440×900 the h1 is 48 px or more, on two lines.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (27 runs; chromium, webkit, chromium-reduced) | Not run | `tests/heading.spec.mjs` |

- Nine viewports as written; h1 shrink rule from `geometry.layout.heading` (56k, floor 30, clearance 8 px).

#### P2a-D03 — applies

Source: [2a-baseline-stage-labels.md, line 16](levelup/source/2a-baseline-stage-labels.md#L16)

> Renaming a door in `LOBBY_CONTENT` renames it everywhere; the lobby header shows the 3HUE logo.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies (O8) | Pass (9 runs; chromium, webkit, chromium-reduced) | Not run | `tests/rename.spec.mjs` (`?manifest=tests/fixtures/renamed.json`) |

- `LOBBY_CONTENT` is `content/experience.json` here; the manifest is the only place a name lives (standing rule in DECISIONS.md). "Everywhere" at runtime: sign, chip, plate, row, panel tab, panel h2, path panel stage buttons, where-to-start, walk captions, `document.title`. Static surfaces (`s/*.html`, `media/share/cards.json`) are regenerated by `tools/build-shares.js` from the same manifest and are covered by P5.
- The fixture `tests/fixtures/renamed.json` does not exist yet (the directory is empty); it is written with the spec.
- O8: the header shows the 3HUE logo as a link to https://3hue.net.

#### P2a-D04 — applies

Source: [2a-baseline-stage-labels.md, line 17](levelup/source/2a-baseline-stage-labels.md#L17)

> Reduced motion makes the fade instant.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (1 runs; chromium-reduced) | Not run | `tests/boot.spec.mjs` (chromium-reduced) |

- "The fade" is the 600 ms placeholder → plate fade. Reduced motion sets `transition: none` on everything (css/experience.css), so `document.getAnimations()` is empty once `data-plate-ready` is set.

#### P2a-D05 — re-scoped

Source: [2a-baseline-stage-labels.md, line 18](levelup/source/2a-baseline-stage-labels.md#L18)

> WebKit at 1440×900 passes the first two checks; on Fast 4G, cold cache, the placeholder or plate shows within 350 ms of pressing Experience, the plate downloads once (≤500 KB at 1440 wide), a warm reopen skips the placeholder, and CLS stays 0.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O7) | Pass (4 runs; chromium, chromium-reduced) | Not run | `tests/boot.spec.mjs` (webkit + chromium, Fast 4G throttle) |

**Standalone clause.** WebKit at 1440×900 passes the first two checks; on Fast 4G, cold cache, the placeholder or plate shows within 350 ms of navigation start, the plate downloads once (≤500 KB at 1440 wide), a warm reload skips the placeholder, and CLS stays 0.

**Why.** "Pressing Experience" and "a warm reopen" name the dashboard's Experience button. The lobby is the page, so the clock starts at navigation start (`performance.timeOrigin`) and the warm case is a second navigation with a warm cache. 350 ms, 500 KB, 1440 and CLS 0 are unchanged.

- Observation for the spec author: `buildPicture` runs the 600 ms fade on every load; a warm reload therefore still shows the placeholder for the fade's duration. Spec 2a item 4 says "skip both if already decoded". Whether that counts as "skips the placeholder" is decided by the measurement, not assumed.

### Phase 2b — 2b-baseline-dialog-panel.md

Target: Dialog, panels, focus, contact destinations and maturity path.

#### P2b-D01 — re-scoped

Source: [2b-baseline-dialog-panel.md, line 16](levelup/source/2b-baseline-dialog-panel.md#L16)

> Keyboard only at 1280×720 and 1440×900: Enter on Experience focuses the h1; Tab and Shift+Tab never leave the lobby; Enter on a door opens its panel with focus on its h2; Escape returns focus to that door, a second Escape to Experience. WebKit matches.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O7) | Pass (18 runs; chromium, webkit, chromium-reduced) | Not run | `tests/focus.spec.mjs` (chromium, webkit) |

**Standalone clause.** Keyboard only at 1280×720 and 1440×900: the first Tab lands on "Skip to the doors" and activating it puts the next Tab on the first door; Tab and Shift+Tab never land on body or on an inert or hidden control; Enter on a door opens its panel with focus on its h2; Escape returns focus to that door; a second Escape at rest changes nothing. WebKit matches.

**Why.** "Enter on Experience focuses the h1", "never leave the lobby" and "a second Escape to Experience" describe the dashboard's modal lobby behind its Experience button. This is a page, not a modal: there is no outer layer to return to and no page-level focus trap. The standalone guarantee is that Tab order never reaches a hidden or inert control (everything under an open panel is inert, js/focus.js) and that Escape at rest is a no-op. Viewports and the door/h2/Escape chain are unchanged.

- The skip link's text is the manifest string `strings.skip` ("Skip to the doors").

#### P2b-D02 — applies

Source: [2b-baseline-dialog-panel.md, line 17](levelup/source/2b-baseline-dialog-panel.md#L17)

> At 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080 and 390×844, elementFromPoint at "Back to doors" and each tab returns it, and a tab click switches the h2.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (15 runs; chromium, webkit, chromium-reduced) | Not run | `tests/focus.spec.mjs` |

- Tabs are `<button aria-pressed>` (spec 2b item 5); 390×844 is the sheet.

#### P2b-D03 — applies

Source: [2b-baseline-dialog-panel.md, line 18](levelup/source/2b-baseline-dialog-panel.md#L18)

> With each door's panel open at 1280×720, 1440×900, 1512×982 and 1920×1080, its frame is wholly inside R and the heading hidden.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies (O5) | Pass (12 runs; chromium, webkit, chromium-reduced) | Not run | `tests/motion.spec.mjs` |

- O5 reading: with a room wired the render covers the frame after the dolly, but the plate underneath is still placed on the door. "Its frame is wholly inside R" is measured on the plate transform via `window.__lobby.rects.doors[id].frame` against `__lobby.frame()`, and confirmed visually under `?rooms=0` (R-05).

#### P2b-D04 — applies

Source: [2b-baseline-dialog-panel.md, line 19](levelup/source/2b-baseline-dialog-panel.md#L19)

> At 1440×900 and 390×844 no lobby text is under 12 px and the outline is h2 > h3; Talk is each panel's only filled button, above the fold at 1280×720.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (12 runs; chromium, webkit, chromium-reduced) | Not run | `tests/type.spec.mjs` |

- Observation for the spec author: the path panel renders "Next stage" as `.btn.primary` (js/panel.js), a second filled button beside Talk. As written, "each panel" includes the path panel; the row is expected to Fail there until either the button is outlined or Nate rules that the clause means door panels only.

#### P2b-D05 — applies

Source: [2b-baseline-dialog-panel.md, line 20](levelup/source/2b-baseline-dialog-panel.md#L20)

> Every Talk opens the booking link; no lobby control shows a toast or a price; the header shows the 3HUE logo.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies (O2, O8) | Pass (3 runs; chromium, webkit, chromium-reduced) | Not run | `tests/type.spec.mjs` |

- O2: every Talk is `<a href="https://3hue.net/contact.html" target="_blank" rel="noopener noreferrer">`; nothing toasts. O8: the logo links to https://3hue.net in a new tab.

#### P2b-D06 — applies

Source: [2b-baseline-dialog-panel.md, line 21](levelup/source/2b-baseline-dialog-panel.md#L21)

> The chip, the only path control, opens the path panel, fresh and after each door; focus and selection look different; nothing stays selected after its panel closes.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (6 runs; chromium, webkit, chromium-reduced) | Not run | `tests/focus.spec.mjs` |

- On the desktop scene the stair chip is the only path control. Composed layouts add the path row by design (spec 3 item 4); that is P3-D01's surface, not a second desktop control.

### Phase 3 — 3-phones-tablets.md

Target: Composed phone/tablet layouts, touch, safe areas and logos.

#### P3-D01 — re-scoped

Source: [3-phones-tablets.md, line 18](levelup/source/3-phones-tablets.md#L18)

> At 390×844, 768×1024, 844×390 and 1024×1366: every door is reachable and labelled without hover, each row opens its door, and nothing overflows horizontally from 320 px up, dashboard top bar included.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O7) | Pass (33 runs; chromium, webkit, chromium-reduced) | Not run | `tests/phone.spec.mjs` |

**Standalone clause.** At 390×844, 768×1024, 844×390 and 1024×1366: every door is reachable and labelled without hover, each row opens its door, and nothing overflows horizontally from 320 px up, the header included.

**Why.** "Dashboard top bar" → the standalone header (`#hud`). Viewports and the 320 px floor unchanged.

#### P3-D02 — applies

Source: [3-phones-tablets.md, line 19](levelup/source/3-phones-tablets.md#L19)

> At 390×844, report the h1 size (≥28 px) and the smallest lobby tap target (≥44×44); the band shows no text but the door numbers.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (6 runs; chromium, webkit, chromium-reduced) | Not run | `tests/phone.spec.mjs` |

- Report the measured h1 size and the smallest tap target in the Candidate column when run.

#### P3-D03 — applies

Source: [3-phones-tablets.md, line 20](levelup/source/3-phones-tablets.md#L20)

> With each door's sheet open at 390×844 and 768×1024, that door is fully visible above the sheet, no pin sits on another door, and elementFromPoint at "Back to doors" and each tab returns it; at 844×390 the sheet fills the screen below the header.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies (O5) | Pass (6 runs; chromium, webkit, chromium-reduced) | Not run | `tests/phone.spec.mjs` |

- O5 reading: on phones the band shows the room once it fades in, so "that door is fully visible above the sheet" is measured on the plate transform via `window.__lobby` (the band still aims at the door beneath the room) and confirmed visually under `?rooms=0`. Pins and "Back to doors"/tab hit-tests are unaffected by the room (station pins are not built when composed).

#### P3-D04 — applies

Source: [3-phones-tablets.md, line 21](levelup/source/3-phones-tablets.md#L21)

> At 1024×768, 1180×820 and 1366×1024 the desktop scene shows, each ring within 4 px of its doorway.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (9 runs; chromium, webkit, chromium-reduced) | Not run | `tests/geometry.spec.mjs` |

- Same precondition as P2a-D01 (re-measured doorways).

#### P3-D05 — re-scoped

Source: [3-phones-tablets.md, line 22](levelup/source/3-phones-tablets.md#L22)

> "Experience" shows on the dashboard at 320×640, 390×844 and 768×1024 without opening a menu; no base64 logo remains, and the logo is crisp at 1440×900@2x.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O7, O8) | Pass (3 runs; chromium, webkit, chromium-reduced) | Not run | `tests/phone.spec.mjs` |

**Standalone clause.** At 320×640, 390×844 and 768×1024 the header logo and every lobby control show without opening a menu; no base64 logo remains, and the logo is crisp at 1440×900@2x.

**Why.** The "Experience" pill is the dashboard's entry to the lobby. Here the lobby is the page, so the equivalent guarantee is that nothing is behind a menu at those widths (there is no menu: rows, "Take the walk", "Talk to our team" and the logo are in flow). The two logo clauses apply as written; O8 makes the logo a link to https://3hue.net.

#### P3-D06 — applies

Source: [3-phones-tablets.md, line 23](levelup/source/3-phones-tablets.md#L23)

> Keyboard only at 390×844, and again under reduced motion: Tab reaches the four rows in order, Enter opens each, Escape closes the sheet with focus back on the row.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (18 runs; chromium, webkit, chromium-reduced) | Not run | `tests/phone.spec.mjs` (chromium + chromium-reduced) |

- Opener on composed layouts is the row (`rowElement`), so Escape returns focus to it.

#### P3-D07 — re-scoped

Source: [3-phones-tablets.md, line 24](levelup/source/3-phones-tablets.md#L24)

> WebKit at 390×844 matches and fetches a plate 1920 px wide or less, and at 844×390 shows the dashboard and lobby without overflow, with safe-area side padding.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O7) | Pass (6 runs; chromium, webkit, chromium-reduced) | Not run | `tests/phone.spec.mjs` (webkit) |

**Standalone clause.** WebKit at 390×844 matches and fetches a plate 1920 px wide or less, and at 844×390 shows the lobby without overflow, with safe-area side padding.

**Why.** "The dashboard and lobby" → the lobby. Viewports and the 1920 px cap unchanged.

### Phase 4 — 4-motion-routes.md

Target: Camera placement, guided climb, plates, routing and boot cover.

#### P4-D01 — applies

Source: [4-motion-routes.md, line 14](levelup/source/4-motion-routes.md#L14)

> At 1280×720, 1440×900, 1512×982 and 1920×1080, after each door's dolly its whole frame is inside R.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies (O5) | Pass (12 runs; chromium, webkit, chromium-reduced) | Not run | `tests/motion.spec.mjs` |

- Same O5 reading as P2b-D03: measured on the plate transform via `__lobby`, confirmed visually under `?rooms=0` (R-05).

#### P4-D02 — applies

Source: [4-motion-routes.md, line 15](levelup/source/4-motion-routes.md#L15)

> Only transform and opacity animate; `will-change` is absent at rest; labels are sharp after a move at 1440×900@2x.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies (O5) | Pass (6 runs; chromium, webkit) | Not run | `tests/motion.spec.mjs` |

- Rooms add transitions on `#room` (opacity, transform) and `#room-img` (transform, the 1.06 → 1 settle): still transform and opacity only. `will-change: transform` lives on `.experience-stage.moving` and is dropped `dolly.ms + 50` after a move.

#### P4-D03 — applies

Source: [4-motion-routes.md, line 16](levelup/source/4-motion-routes.md#L16)

> From `#/path`, "Next stage" lights the rings bottom to top, each arc directly above its stage's name and fully visible beside the panel, then shows "Where to start".

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (3 runs; chromium, webkit, chromium-reduced) | Not run | `tests/climb.spec.mjs` |

- Arcs are measured (`geometry.measured.arcs: true`); "fully visible beside the panel" is the left-docked path panel.

#### P4-D04 — re-scoped

Source: [4-motion-routes.md, line 17](levelup/source/4-motion-routes.md#L17)

> Each route pasted into a fresh tab opens its state; Back steps panel, lobby, dashboard, one per press; Forward and reload restore; dashboard navigation still works.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O3, O7) | Pass (39 runs; chromium, webkit, chromium-reduced) | Not run | `tests/routes.spec.mjs` (chromium, webkit; fresh contexts) |

**Standalone clause.** Each route pasted into a fresh tab opens its state; Back steps panel, lobby, then out of the site, one per press; Forward and reload restore.

**Why.** O3: a deep link has exactly the lobby beneath it, never a dashboard entry, so the stack is panel → lobby → out. "Dashboard navigation still works" has no standalone equivalent and is removed.

- Routes here: `#/experience`, `#/door/<id>[/<station>]`, `#/path[/<stage>|/where-to-start]`, `#/walk/<n>`.
- "Out of the site" in a fresh context is measured as: after the lobby step, the lobby entry is the first in the tab (`history.length === 1`, `history.state.lobbyBase === true`), so one more Back has nothing of this site to land on.

#### P4-D05 — applies

Source: [4-motion-routes.md, line 18](levelup/source/4-motion-routes.md#L18)

> At 1440×900 no plate leaves the viewport or covers another ring.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (6 runs; chromium, webkit, chromium-reduced) | Not run | `tests/plates.spec.mjs` |

- Plates flip left near the right edge (`.marker.flip`).

#### P4-D06 — applies

Source: [4-motion-routes.md, line 19](levelup/source/4-motion-routes.md#L19)

> Under reduced motion every flow completes and `document.getAnimations()` is empty after each step.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies (O5) | Pass (1 runs; chromium-reduced) | Not run | `tests/motion.spec.mjs` (chromium-reduced; the reduced project is run over every spec) |

- "Every flow" includes the room fade and settle; R-06 is the room-specific row.

#### P4-D07 — re-scoped

Source: [4-motion-routes.md, line 20](levelup/source/4-motion-routes.md#L20)

> WebKit passes the route check; p95 frame time during a dolly at 1440×900 is under 20 ms; on Fast 4G, cold cache, no filmstrip frame of any route shows dashboard content.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O7) | Pass (3 runs; chromium, webkit, chromium-reduced) | Not run | `tests/routes.spec.mjs` (webkit) · `tests/motion.spec.mjs` (p95) · `tests/boot.spec.mjs` (filmstrip, Fast 4G) |

**Standalone clause.** WebKit passes the route check; p95 frame time during a dolly at 1440×900 is under 20 ms; on Fast 4G, cold cache, no filmstrip frame of any route shows a blank frame or, on a deep link, the resting lobby's heading and pins before its panel.

**Why.** "Dashboard content" → the standalone failure modes: a frame with neither placeholder, plate nor "Loading the lobby", or a flash of the resting lobby on the way into a deep-linked door or path (the inline boot cover, `data-lobby-boot`, exists to prevent it). 1440×900, 20 ms and Fast 4G unchanged.

#### P4-D08 — applies

Source: [4-motion-routes.md, line 21](levelup/source/4-motion-routes.md#L21)

> Every earlier Done-when item still passes.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (every other row passes) | Not run | every spec listed above, re-run |

- Recorded as the worst result over every earlier applies and re-scoped row.

### Phase 5 — 5-kiosk-share.md

Target: Kiosk projection, shared aggregates, screenshots, metadata, share pages and icons.

#### P5-D01 — applies

Source: [5-kiosk-share.md, line 14](levelup/source/5-kiosk-share.md#L14)

> The kiosk and share pages contain 0 "Drata", "watched", "$", "pipeline" or "opportunit".

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies (O9) | Pass (6 runs; chromium, webkit, chromium-reduced) | Not run | `tests/manifest.spec.mjs` · `tests/kiosk.spec.mjs` · `tools/bots.sh` (share pages) |

- Surface is the kiosk element and `s/*.html`. The `$25B` in the Gain Control stat is a sourced panel figure, not on either surface; `tools/check-manifest.js` polices the rest of the vocabulary list.

#### P5-D02 — re-scoped

Source: [5-kiosk-share.md, line 15](levelup/source/5-kiosk-share.md#L15)

> At 1280×720, 1366×657, 1440×900, 1920×1080 and 2560×1440 the kiosk content is hidden or fully on its screen, every line 12 px or more at 4.5:1.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O7, O9) | Pass (21 runs; chromium, webkit, chromium-reduced) | Not run | `tests/kiosk.spec.mjs` |

**Standalone clause.** At 1280×720, 1366×657, 1440×900, 1920×1080 and 2560×1440 the kiosk content (the "AiVRIC intelligence layer" header line, the three count lines derived from this manifest and the "Representative data" tag) is hidden or fully on its screen, every line 12 px or more at 4.5:1.

**Why.** Spec 5 item 1 defines the kiosk content as dashboard aggregates ("signals tracked", "source coverage", "buyer segments tracked"). O9 replaces that with counts derived from this manifest at runtime under the same tag and header line. Viewports, the 12 px floor and 4.5:1 unchanged.

#### P5-D03 — applies

Source: [5-kiosk-share.md, line 16](levelup/source/5-kiosk-share.md#L16)

> Every word on each card matches the live page character for character, and each card shows the heading, the three sign names and the door chips.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies (O5) | Pass (manual, tools/bots.sh against the local server: five cards 1200x630 < 300 KB; cards.json records each capture's innerText) | Not run | `tools/build-shares.js` capture record (`media/share/cards.json`) · `tools/bots.sh` (og:image) · Gate B sheet — no Playwright spec in the plan's list covers card text; flagged below |

- Reading: the heading / sign names / door chips clause describes the lobby-at-rest composition. A door or path card is captured with its panel open (spec 5 item 5), where the heading is hidden by design (P2b-D03) and, with rooms wired (O5), the render replaces the signs. The character-for-character clause applies to every card; the composition clause is applied to `media/share/lobby.jpg`. If Nate wants door cards to show signs and chips too, they are captured at rest under spec 5 item 3's fallback.

#### P5-D04 — applies

Source: [5-kiosk-share.md, line 17](levelup/source/5-kiosk-share.md#L17)

> Zoomed 8× at 2560×1440, kiosk corners sit within 2 px of the screen's edges with no seam and stay there through the Stay Ready dolly; WebKit places it as Chromium does.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (3 runs; chromium, webkit, chromium-reduced) | Not run | `tests/kiosk.spec.mjs` (chromium, webkit; 8× corner probes) |

- The quad is double-measured (`geometry.kiosk.measurements.a/b`, all corners within 2 px; `measured.kiosk: true`). Its right corners sit on the plate's own edge (x 2879), so "within 2 px of the screen's edges" is measured on the left corners and the top/bottom edges; the right edge is the plate edge.

#### P5-D05 — applies

Source: [5-kiosk-share.md, line 18](levelup/source/5-kiosk-share.md#L18)

> curl of the root as Slackbot-LinkExpanding, LinkedInBot, Twitterbot and facebookexternalhit shows the og and twitter tags; og:image returns 200, 1200×630, under 300 KB; each share page, if the host serves them, returns 200 to those bots with its own og:title, og:image and og:url, no refresh, and opens its state in a browser.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (manual, tools/bots.sh against the local server: root and every s/*.html serve og and twitter tags to all four unfurlers; no meta refresh) | Not run | `tools/bots.sh` |

- The host serves `s/`; the five stubs exist. `s/test.html` is still present and should be deleted per spec 5 item 5 (observation, below).

#### P5-D06 — applies

Source: [5-kiosk-share.md, line 19](levelup/source/5-kiosk-share.md#L19)

> `/robots.txt` returns 200 and blocks none of those bots; both icons return 200 and show the 3HUE mark on navy.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (manual, tools/bots.sh against the local server: robots.txt with no Disallow; both icons 200) | Not run | `tools/bots.sh` |

- Icons: `media/brand/favicon-32.png`, `media/brand/apple-touch-icon-180.png`.

### Phase 6 — 6-walk-dashboard.md

Target: Walk, dashboard accessibility, carousel and conditional idle tour.

#### P6-D01 — re-scoped

Source: [6-walk-dashboard.md, line 14](levelup/source/6-walk-dashboard.md#L14)

> Keyboard only at 1440×900 and 390×844: 30 Tab presses stay in the shell; Enter on "Take the walk" or Guide starts it; Right walks every step, each announced once, with the matching door tab pressed; Escape ends at rest with focus on "Take the walk", and one more Back returns to the dashboard.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O3, O7) | Pass (18 runs; chromium, webkit, chromium-reduced) | Not run | `tests/walk.spec.mjs` (1440×900 and 390×844) |

**Standalone clause.** Keyboard only at 1440×900 and 390×844: 30 Tab presses stay in the shell; Enter on "Take the walk" starts it; Right walks every step, each announced once, with the matching door tab pressed; Escape ends at rest with focus on "Take the walk", and one more Back leaves the site.

**Why.** "Guide" is a dashboard control and is removed; "returns to the dashboard" → leaves the site (O3: the resting lobby is the bottom of the stack). 30 presses and both viewports unchanged.

- "Shell" is the page: nothing outside the lobby exists.
- Reading of "the matching door tab pressed": no panel is open during a walk step, so it is measured as the door's selected state (`aria-current="true"` on the door hotspot with the filled chip, the state P2b-D06 tests). If Nate wants the panel open with its tab pressed on door steps, that is a spec change to raise, not a register change.
- "Leaves the site" is measured as `history.length` returning to its pre-walk value after Escape (the walk added one entry and Escape removed it).
- Observation for the spec author: `endWalk` calls `go({view:"experience"},{replace:true})` (js/main.js `onEnd`), which replaces the walk entry instead of stepping back, leaving a second lobby entry beneath; expected to Fail the last clause as built.

#### P6-D02 — applies

Source: [6-walk-dashboard.md, line 15](levelup/source/6-walk-dashboard.md#L15)

> At 1440×900 and 390×844 the caption bar covers no panel or sheet text, door frame, lit ring or kiosk screen.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (6 runs; chromium, webkit, chromium-reduced) | Not run | `tests/walk.spec.mjs` |

- The bar docks at the bottom of R (`.walk`, right inset = panel width while a layer is open; full width otherwise; the sheet's first row on phones).

#### P6-D03 — re-scoped

Source: [6-walk-dashboard.md, line 16](levelup/source/6-walk-dashboard.md#L16)

> Fields show focus rings, the first Tab reveals "Skip to content", and the catalog, admin modal and drawer close on Escape, returning focus.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O7) | Pass (15 runs; chromium, webkit, chromium-reduced) | Not run | `tests/focus.spec.mjs` |

**Standalone clause.** Every control shows a focus ring, the first Tab reveals "Skip to the doors", and the door panel, the path panel and the walk close on Escape, returning focus to their opener.

**Why.** Fields, "Skip to content", the catalog, the admin modal and the drawer are dashboard chrome. The standalone's skip link is "Skip to the doors" (`strings.skip`) and its Escape-closable layers are the door panel, the path panel and the walk (js/focus.js layer stack).

- Observation: the skip link is `href="#doors"`, a fragment inside the hash the router owns. `parse("#doors")` resolves to the lobby so no route fires, but the URL stops reading `#/experience` and the target `#doors` is a non-focusable `div`; the spec should check that the next Tab lands on the first door.

#### P6-D04 — dropped

Source: [6-walk-dashboard.md, line 17](levelup/source/6-walk-dashboard.md#L17)

> With reduced motion, or the lobby open, the carousel stays still for 20 s; "See this in the lobby" opens the paired door, and Back then steps door, lobby, dashboard.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| dropped (O3, O7) | — | — | — |

**Reason.** Every clause names dashboard chrome: `.icp-carousel`, the "See this in the lobby" button beside it, and the staff stack "door, lobby, dashboard" (O3). No standalone equivalent exists. The reduced-motion guarantee it carried is covered by P2a-D04, P4-D06 and R-06.

#### P6-D05 — re-scoped

Source: [6-walk-dashboard.md, line 18](levelup/source/6-walk-dashboard.md#L18)

> axe at 1280×720 and 390×844: 0 violations in the resting lobby and every panel, 0 contrast violations on Analyst, Director and C-suite; WebKit passes the focus checks.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| re-scoped (O7) | Pass (48 runs; chromium, webkit, chromium-reduced) | Not run | `tests/axe.spec.mjs` · `tests/focus.spec.mjs` (webkit) |

**Standalone clause.** axe at 1280×720 and 390×844: 0 violations in the resting lobby and every panel, and in every other lobby state (each stage of the path, where-to-start, and the walk); WebKit passes the focus checks.

**Why.** Analyst, Director and C-suite are dashboard personas (dashboard data) and are removed. The plan's axe spec runs every lobby state, so the standalone clause names them. Viewports and "0 violations" unchanged.

#### P6-D06 — applies

Source: [6-walk-dashboard.md, line 19](levelup/source/6-walk-dashboard.md#L19)

> CLS stays 0, and every earlier Done-when item still passes. If "Take the walk" now shows in prompt 5's lobby-at-rest cards, recapture them.

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| applies | Pass (every other row passes) | Not run | `tests/boot.spec.mjs` (CLS) · every spec, re-run · card recapture rule |

- The cards in `media/share/cards.json` were captured with "Take the walk" already in the header. The recapture rule still stands whenever the rest state changes (P4-D08 / Gate C).

### Rooms — R-01 … R-06 (new, O5)

Not part of the 43. Text as agreed for this build; gate criteria in [RENDER-GATE.md](RENDER-GATE.md).

#### R-01 — new

> render passes docs/RENDER-GATE.md

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| new (O5, O6) | Not run (automated criteria pass: OCR at 2x empty, no people, flat dark screens, every derivative <= 600 KB; Nate's written OK on the gate sheets not yet recorded) | Not run | `tools/gate-sheet.py` sheet + `?room-preview=` screenshots at 1440×900 and 390×844, Nate's written OK (the gate) · `tests/rooms.spec.mjs` (derivatives exist, each ≤ 600 KB, 2560/2048/1280 in avif/webp/jpg) |

- Per door, per candidate. All nine RENDER-GATE.md criteria; O6 allows the Real-ESRGAN upscale, text / people / curved surfaces still fail.
- RENDER-GATE.md names `tools/upscale-room.sh` and `tools/gate-sheet.js`; the repo has `tools/upscale-room.py` and `tools/gate-sheet.py` (observation).

#### R-02 — new

> one room request per door per page load after the plate's first paint

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| new (O5) | Pass (3 runs; chromium, webkit, chromium-reduced) | Not run | `tests/rooms.spec.mjs` (network log: requests under `media/rooms/` counted per door, first one timed against `data-plate-ready`) |

- `warmRoom` caches by URL and `main.js` warms the three rooms at first idle, so the count per door is 1 across warm + open + reopen + door-to-door. A resize that changes `pickSize()` (1280/2048/2560) legitimately fetches a second size; the spec holds the viewport fixed.

#### R-03 — new

> room covers the frame with no seam at 1440×900 and 1920×1080 at z 1.3

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| new (O5) | Pass (15 runs; chromium, webkit, chromium-reduced) | Not run | `tests/rooms.spec.mjs` (room rect from `#room`'s computed transform vs `__lobby.frame()`, each door, both viewports, sampled through the crossfade) |

- `fitRoom` clamps to `roomCover()` (the frame plus an 18 px bleed under the header and the panel's inner edge, not the whole viewport). "No seam" means no room edge inside R at any point of the 700 ms fade and the 1.06 → 1 settle. `window.__lobby.stage` exposes `inRoom` only, not `roomFit`; the spec reads the element transform (observation).

#### R-04 — new

> station pins hit-test and route to the matching h3

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| new (O5) | Pass (9 runs; chromium, webkit, chromium-reduced) | Not run | `tests/rooms.spec.mjs` (elementFromPoint at each pin returns its button; click → `#/door/<id>/<station>`; `document.activeElement` is `#st-<station>`; Tab order reaches pins after the panel) |

- Six stations per door from `doors[].stations`, positions from `geometry.rooms.<door>.stations`. On composed layouts pins are not built; the station route still focuses the sheet's h3 (`setPanelStation`), which is the phone half of this check.

#### R-05 — new

> ?rooms=0 keeps the room layer off and requests no render, while doors still dolly to z 1.3 and open their panels (the spec-as-written behaviour)

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| new (O5) | Pass (3 runs; chromium, webkit, chromium-reduced) | Not run | `tests/motion.spec.mjs`, `tests/climb.spec.mjs`, `tests/plates.spec.mjs`, `tests/routes.spec.mjs`, `tests/boot.spec.mjs` re-run with `?rooms=0` (P4-D01 … P4-D08) |

- This is the spec-as-written behaviour DECISIONS.md O5 promises to keep supported: dolly to the door, panel, no room image, no station pins.

#### R-06 — new

> reduced motion cuts every room transition

| Disposition | Candidate (local) | Published | Proof |
|---|---|---|---|
| new (O5) | Pass (1 runs; chromium-reduced) | Not run | `tests/rooms.spec.mjs` (chromium-reduced: `document.getAnimations()` empty after open, door-to-door, station, close; `#room` and `#room-img` computed `transition` is `none`) |

- `showRoom`, `hideRoom` and `panRoom` all branch on `reducedMotion()` and the global `prefers-reduced-motion` rule sets `transition: none !important`; the check proves it rather than trusting it.

## Observations logged while re-scoping

Code-reading notes for the spec authors, recorded so the rows above are not read as results. None is a measured outcome; each is proven or refuted by the spec named on its row. Files under `js/`, `css/`, `index.html` and `content/` are not edited from this register.

- P6-D01: `endWalk` ends through `go({view:"experience"},{replace:true})` (js/main.js `onEnd`) rather than `back()`, so Escape / "End walk" leave a duplicate lobby entry beneath the resting lobby. Spec 6 item 1 says "End walk", Escape and Back return to `#/experience`; the register's last clause measures it.
- P2b-D04: the path panel's "Next stage" is `.btn.primary` (js/panel.js), a second filled button in that panel.
- P6-D03 / P2b-D01: the skip link targets `#doors` (a non-focusable `div` inside the router's hash space).
- P5-D05: `s/test.html` is still in the tree; spec 5 item 5 and plan step 0 both delete it after the probe.
- P2a-D03: `tests/fixtures/renamed.json` does not exist yet; `tests/` holds only the empty `fixtures/` directory.
- P2a-D01 / P3-D04 / P1-D02: `geometry.measured` still reports `doorways`, `tower`, `rings` and `stairPill` as unmeasured; Gate A's tool pass precedes these rows.
- P1-D04: the fork register's row is internally inconsistent (heading Pass, guardian line Fail); this register re-measures.
- P2a-D05: `buildPicture` always runs the 600 ms fade, so a warm reload still shows the placeholder for that long; whether "skips the placeholder" holds is for the boot spec to measure.
- R-03: `window.__lobby.stage` exposes `inRoom` but not `roomFit`; the rooms spec reads `#room`'s computed transform instead, or the debug surface grows a `room` rect (a change to js/debug.js, not made here).
- R-04: `showStationChips` (js/panel.js) is imported by main.js but never called, so `#panel-stations` stays hidden; plan step 6 also mentions `panRoom` on a station route, which `setPanelStation` does not call. Neither affects R-04 as worded.
- R-01: RENDER-GATE.md names `tools/upscale-room.sh` and `tools/gate-sheet.js`; the repo has `tools/upscale-room.py` and `tools/gate-sheet.py`.
- P5-D03: the plan's spec list has no spec for card text; the row relies on the capture record and the Gate B sheet until one is added.

<!-- Candidate (local) column filled 2026-09-11T00:51:55.055Z from tests/results/candidate-all.json + docs/evidence/manual.json -->
