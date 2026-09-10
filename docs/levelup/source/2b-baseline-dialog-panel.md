Booking link: 

Step 2b. If the booking link above is empty, ask me for it before building anything that uses it. Never invent a URL or email.

1. **Header and dialog.** Keep `.experience-nav` hidden; `div.experience-hotspots` gets role=group. On open, store the opener, make `header.topbar`, `section.context-bar` and `div.builder-main` inert, and focus the lobby h1 (tabindex=-1), which labels `div.experience-shell` (aria-labelledby); the backdrop alt becomes "". Tab and Shift+Tab wrap at the shell's first and last controls. Escape (capture phase) closes only the innermost layer: panel, then lobby. Opening a door panel focuses its h2 (tabindex=-1); a tab switch keeps focus on the pressed tab. Closing refocuses its opener: Experience, the path chip, or the door last shown. Nothing starts selected; closing a panel clears selection. Selected: aria-current and the Explore chip filled #25b5d6 with navy text.

2. **Panel** (`aside.experience-detail-panel`). Above 900 px it starts at `--xp-header-h` (on `.experience-shell`: 66 px; 60 px at ≤700 px), fully opaque, pins under it inert; the ≤900 px sheet keeps top:39%. `.experience-detail-toolbar` and `.experience-detail-tabs` get flex-shrink:0 (tab row ≥51 px). "Back to doors" (`.experience-detail-close`) sits in the first row, named by its text. While any panel is open, hide the header's Talk and make the heading block visibility:hidden and inert. On open, keep s and set tx=R.cx−fx·s, clamped to [vw−W·s, 0] (R: viewport minus header and panel; fx: the doorway's or tower's x). Win Trust and Gain Control dock right, Stay Ready left; a tab switch re-docks without remounting.

3. **Panel type.** Keep order and copy, except: the kicker is the door's `icp` alone; h2 "{door}: {promise}", 30–32 px, weight 500; section labels become 18 px h3s; body 15 px; tabs and buttons 13 px; no lobby text under 12 px, `.experience-floor-footer` included. "Relevant service families" becomes "Services on this path", a `<ul>`, and "Browse service catalog" takes that name and moves focus to that h3, never opening `catalog-shell`. "Shared maturity route" becomes an `<ol>`, tagging emphasised stages "In this path" in text. `.experience-detail-next` ends with an outlined "Talk to our team" link.

4. **Talk.** Every "Talk to our team" (`.experience-outline-button`, the panels', later ones) opens the link above (`LOBBY_CONTENT.bookingUrl`) through one `resolveHref(key)` helper (web links: new tab, rel=noopener), replacing its toast. Each panel's first Talk is its only filled button (#25b5d6, navy text).

5. **Maturity path.** Replace `.experience-hotspot-route` with one "See the maturity path" chip in the stage, on the stair where the painted pill was (old pill 882–1071×480–516 ×W/1672; confirm in `?debug=1` that it sits on the stair treads, clear of both handrails), counter-scaled like the door chips, orange hairline, named by its text. It opens a left-docked path panel, never a door panel: h2 "The maturity path" (focused), "Back to doors", the door tabs, which become buttons with aria-pressed everywhere (none pressed here), an `<ol>` of the four stages, each `<li>` listing the doors that emphasise it (`maturityEmphasis`) as buttons, then Talk. No descriptions or durations.

**Done when**
- Keyboard only at 1280×720 and 1440×900: Enter on Experience focuses the h1; Tab and Shift+Tab never leave the lobby; Enter on a door opens its panel with focus on its h2; Escape returns focus to that door, a second Escape to Experience. WebKit matches.
- At 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080 and 390×844, elementFromPoint at "Back to doors" and each tab returns it, and a tab click switches the h2.
- With each door's panel open at 1280×720, 1440×900, 1512×982 and 1920×1080, its frame is wholly inside R and the heading hidden.
- At 1440×900 and 390×844 no lobby text is under 12 px and the outline is h2 > h3; Talk is each panel's only filled button, above the fold at 1280×720.
- Every Talk opens the booking link; no lobby control shows a toast or a price; the header shows the 3HUE logo.
- The chip, the only path control, opens the path panel, fresh and after each door; focus and selection look different; nothing stays selected after its panel closes.

Do not change anything not listed here. When done, list what you changed and anything you could not do. Report any check you could not actually run as "not run"; never infer a pass.
