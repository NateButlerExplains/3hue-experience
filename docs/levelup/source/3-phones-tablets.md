Step 3: phones and portrait tablets crop two doors out, and short screens leave no room for the scene and the sheet. Give them a composed layout reusing `div.experience-stage` and the heading block.

**When:** width 900 px or less, portrait, or height under 500 px. Landscape tablets (1024×768, 1180×820, 1366×1024) keep the desktop scene. The composed layout always uses the bottom sheet, even at 1024×1366.

**Composed layout** (in `div.experience-shell`, top to bottom):
1. `header.experience-header`: logo and "Return to intelligence". Its Talk becomes a full-width outlined button under the rows, with `.experience-floor-footer` after it in normal flow.
2. The heading block in normal flow: h1 ≥28 px, sub-line ≥15 px.
3. A scene band, full width and width·941/1260 tall (≤60% of screen height), showing native x 200–1460 of the old plate (re-measure) so all three doors show. Fit the stage to it with 2a's cover fit, centred, and set the `<picture>` sizes, and the same sources and sizes on 2a's detached decode copy, to the plate's width there (about 133vw), so the plate downloads once. In the band, hide the chips, the sign names and the stage names (the rows carry the names); each ring shows its door number (1–3, 13 px) with a 44×44 hit area, tappable, tabindex=-1, aria-hidden.
4. Rows, the doors' keyboard controls: Win Trust, Gain Control, Stay Ready, then "See the maturity path", each a button ≥56 px tall. A door row shows its number badge (aria-hidden), "Explore {door}" and its promise, named by the door's accessible-name sentence. The path row has an orange ring badge, no number or promise, named by its text.

**Sheet:** keep top:39%. While it is open, hide the heading block, rows, Talk and footer; the band moves under the header, filling the space above the sheet, aimed at the chosen door: tx=R.cx−fx·s and ty=R.cy−fy·s, clamped so the plate still covers the band. Opening a door or the path from a row focuses the sheet's h2; closing any sheet returns focus to the row that opened it. Hide any pin whose door falls outside the band. Under 500 px tall, the sheet fills the screen below the header and the band hides.

**Sizing and safe areas:** every lobby control is ≥44×44 on touch. Use `100dvh` (fallback `100vh`) for `div.experience-shell` and the sheet. Add `viewport-fit=cover` to the viewport meta, then pad `main.app-shell`, `header.topbar`, the lobby header and the rows with the left and right `env(safe-area-inset-*)`, and the sheet and rows with the bottom one.

**Headers:** on the mobile dashboard, show "Experience" as a visible pill ≥44 px tall in the top bar beside `.mobile-overflow-button`, and keep it in `.mobile-action-menu`. If the 320 px top bar can't fit the logo, that pill, the overflow button and the NB chip, shrink the logo to 88 px wide first, then move the NB chip into the overflow menu. The lobby header follows the same 88 px logo rule, and "Return to intelligence" may wrap inside its 44 px target; nothing may overlap. Every logo (`header.topbar`, the lobby, `catalog-shell`) becomes the existing 509×200 PNG saved as a 240×94 file with width and height, not base64; never redraw or recolour it.

**Done when**
- At 390×844, 768×1024, 844×390 and 1024×1366: every door is reachable and labelled without hover, each row opens its door, and nothing overflows horizontally from 320 px up, dashboard top bar included.
- At 390×844, report the h1 size (≥28 px) and the smallest lobby tap target (≥44×44); the band shows no text but the door numbers.
- With each door's sheet open at 390×844 and 768×1024, that door is fully visible above the sheet, no pin sits on another door, and elementFromPoint at "Back to doors" and each tab returns it; at 844×390 the sheet fills the screen below the header.
- At 1024×768, 1180×820 and 1366×1024 the desktop scene shows, each ring within 4 px of its doorway.
- "Experience" shows on the dashboard at 320×640, 390×844 and 768×1024 without opening a menu; no base64 logo remains, and the logo is crisp at 1440×900@2x.
- Keyboard only at 390×844, and again under reduced motion: Tab reaches the four rows in order, Enter opens each, Escape closes the sheet with focus back on the row.
- WebKit at 390×844 matches and fetches a plate 1920 px wide or less, and at 844×390 shows the dashboard and lobby without overflow, with safe-area side padding.

Do not change anything not listed here. When done, list what you changed and anything you could not do. Report any check you could not actually run as "not run"; never infer a pass.
