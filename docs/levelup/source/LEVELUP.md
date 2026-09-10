# 3HUE Experience lobby: level-up to the AiVRIC standard

Site reviewed: https://hue.executive-co-1918.chatgpt.site/ (the Market Intel dashboard and its "Experience" lobby).
Benchmark: https://natebutlerexplains.github.io/aivric-experience/experience/

Four auditors each examined one area: the scene, the interaction, accessibility, and the platform. A separate skeptic re-measured every finding in each area. 71 findings survived and none were refuted. Two independent guardians then reviewed the prompts below before release.

## Where it stands

The lobby is a clickable poster. It is one 1672×941 PNG with about 37 words painted into it, and two of the painted door signs contradict the live labels. The hotspots sit in viewport percentages over a cover-cropped image, so they miss their doors, by 16–87 px on desktop and up to 325 px on phones. The camera never moves. Nothing is in the URL. "Talk to our team" shows nothing, and keyboard focus stays behind the dialog.

The foundations are good: the art direction, the three-doors metaphor, the consultative copy in the door panels, the cyan and orange colour meaning, the honest "representative data" labelling, and a fast dashboard.

## What to improve, mapped to the AiVRIC layers

### P0: looks broken in front of executives today

| # | Improvement | Today on 3HUE | AiVRIC layer it borrows |
|---|---|---|---|
| 1 | Text-free scene, every label live | 37 strings are baked into the render. The signs say "Scale Oversight" and "Stand Ready" while the UI says "Gain Control" and "Stay Ready". Baked text is upscaled 1.9× and soft on retina. | Text-free master render with live labels |
| 2 | One name for each thing | Doors have two names each. The lobby and dashboard use separate vocabularies. There are four maturity stages, but the brief said three. | Single status vocabulary |
| 3 | Hotspots locked to the doors | Offsets are 16–87 px on desktop, 120 px on a landscape iPad and up to 325 px on phones, and the direction of drift flips. | Pins in image space, one stage transform |
| 4 | A real modal | Reaching the lobby takes 37 Tab presses. One Escape closes everything, and focus drops to the page body. | Keyboard and Escape chain |
| 5 | A usable panel | "Back to doors" sits under the header CTA, the door tabs collapse to 18 px, and the panel covers the third door. | Panel that keeps the chosen subject in view |
| 6 | CTAs that land | "Talk to our team" shows a toast underneath the overlay, so the visitor sees nothing. | Link resolution, every CTA verified |
| 7 | Visible brand | The live logo is display:none, and the baked logo is blurred under the header. | Live brand in the HUD |
| 8 | No blank boot | A 2.16 MB PNG loads only on click, leaving a navy void with floating rings for 3–11 s. | Reveal-on-decode with pre-warming |
| 9 | Maturity path that goes somewhere | "See the maturity path" reopens the last door's panel. The tower rings do nothing. | Approver board: a path the visitor steps through |
| 10 | Phones and tablets | Two of the three doors are off-screen. On touch the rings have no names. | Composed portrait layout with a room list |
| 11 | Clean catalog handoff | The chosen door is lost, and the catalog shows buyers internal prices and notes. | Curated per-station content |

### P1: makes it feel alive and premium

| # | Improvement | AiVRIC layer it borrows |
|---|---|---|
| 12 | The camera dollies into the chosen door (1.3×, 1.1 s) and re-aims when the panel docks | Stage camera, the pan that follows the work |
| 13 | Hash routes per door and stage, Back closes one layer, refresh restores | Hash routing |
| 14 | Door plates on hover and focus, nothing pre-selected, soft ring pulse at rest | Door plates |
| 15 | The kiosk screen becomes a live surface in perspective, showing aggregates only | Live screens mounted by homography |
| 16 | The maturity path as a guided climb up the stair, lighting Assess, Strengthen, Operate, then Advance | Approver board and camera move |
| 17 | Share cards with Open Graph and Twitter tags, plus a favicon and per-door share pages if the host serves them | Share stubs with per-station cards |
| 18 | A captioned walk with a polite live region, paced by the visitor | Narrated walk |
| 19 | Reduced motion respected everywhere; the carousel ignores it today | Reduced-motion paths |
| 20 | Dashboard accessibility: 60 contrast failures, focus rings, a skip link, names for icon-only buttons | Accessibility bar |
| 21 | An independent re-check of the live URL after every publish | Guardian review |

### P2: polish

Explain-this-screen notes on dashboard panels, an optional idle attract loop, cache headers, and trimming 557 KB of JS.

### Deliberately not ported

- Sound, which you removed from AiVRIC.
- An intro film.
- Occlusion mattes, because the lobby has no people.
- Raw Market Intel findings, competitor intel, account signals or prices on any buyer-facing surface.
- Invented customers, logos or metrics.

## Decisions the prompts make for you (edit before pasting to override)


- Door names are Win Trust, Gain Control and Stay Ready. The painted "Scale Oversight" and "Stand Ready" are retired everywhere.
- The maturity path has four stages, shown on the tower from Assess at the bottom up to Advance at the top: Assess, Strengthen, Operate, Advance.
- Lobby heading: eyebrow "Your maturity partner", headline "Three doors. One path to maturity." on two lines, and the line "Advisory. Oversight. Operational confidence. Built for what's next." It replaces the hidden "Select a path to explore…" line and sits where the painted headline sits today, at the same size (about 54 px on a 1440×900 laptop), with "One path" in the painting's light cyan (#52cce3).
- On screens wider than 16:9 (many Windows laptops and 1080p browser windows) the lobby image is cropped mostly from the floor, so the heading always sits below the header and logo. On small wide windows such as 1200×630, the share-card size, where the minimum text sizes would crowd the Win Trust door, the headline shrinks a little, never below 30 px (about 36 px there). The crop rule alone would still leave the sub-line touching that door there, because the heading and the doors move with the image together.
- The side-wall lists, the plinth lettering, "From uncertainty to operational confidence." and "Higher maturity, brighter possibilities" are not recreated as live text. Each door's hover plate shows its service families instead.
- The lobby header drops the logo's "MATURITY PARTNER" tag, because the heading's eyebrow says the same thing.
- Doors carry buyer labels made from the dashboard's ICP names: "Provable Vendors", "Portfolio Companies" and "Regulated Operators". Please confirm two of them before pasting 2a. "Provable Vendors" is an internal segment name; "AI-native vendors", from its own description, is an alternative. "Portfolio Companies" sits directly above Gain Control's audience line, which speaks to ownership and operating teams across several companies rather than to the companies themselves; "Portfolio owners" or "Investors and holding companies" may fit better.
- Door panels open with the buyer label alone as the kicker (for example "PORTFOLIO COMPANIES"), because each audience line already begins "For …", followed by the heading "{door}: {promise}", for example "Gain Control: See and govern what matters." The "recommended fit" wording is removed.
- Panel section headings become 18 px and body text 15 px, and no lobby text is smaller than 12 px. On phones the in-scene words that can't meet that (sign names, stage names) are hidden, because the door rows carry the names. "Talk to our team" is the one filled button in each panel, and the "Next decision" block now ends with an outlined "Talk to our team" link.
- Each door's accessible name is "Explore {door}: {promise}". Its always-visible chip reads "Explore {door}", and the promise no longer prints under the chip.
- Doors never draw a box: hover and keyboard focus show only on the door's ring and chip, and hovering lifts the chip 2 px, its only movement. Nothing is selected when the lobby opens, a door stays highlighted only while its panel is open, and closing a panel returns keyboard focus to the door last shown.
- Win Trust and Gain Control panels dock on the right. The Stay Ready panel docks on the left, because no camera position keeps that door clear of a right-hand panel. The maturity path panel also docks on the left.
- There is no separate "Services on this path" view. "Browse service catalog" is renamed "Services on this path" and jumps to the panel's own list of that door's four service families, since a second view would repeat the same names. No catalog records or prices reach the lobby, and the internal catalog stays on the dashboard only.
- If you later want service names listed under each family, decide first whether draft records may show. 7 of the 12 catalog services that match Gain Control's families are drafts, including every service behind "Digital maturity paradigm assessments" and "Managed enterprise architecture programs".
- The maturity path shows the stage names and which doors emphasise each stage, with no stage descriptions, durations or outcomes until you supply them. Its panel has its own "Talk to our team" button.
- The guided climb is one camera move up the stair to frame the tower; then each stage lights the glowing arc directly above its name, from Assess at the bottom to Advance at the top. The camera can't move from ring to ring, because once it frames the tower it already sits at the image's top edge; all four rings are in view at once, the stage names span roughly 144 to 415 px down a 1440×900 screen, with the lit arcs just above them.
- The kiosk shows three aggregates read from the dashboard, plus "Representative data": signals tracked (all findings in the unfiltered list, currently 4), source coverage (86%) and buyer segments tracked (3). It is display-only. Please confirm the dashboard holds no live HubSpot records or real prospect names.
- The "AiVRIC intelligence layer" co-brand stays on the kiosk as small live text. Delete that sentence in prompt 5 to remove it.
- The kiosk content hides whenever its screen is cropped by more than 2 px or its text would render under 12 px, the same floor as the rest of the lobby (a 10 px floor was the alternative). At rest that means it shows only on large 16:9 or wider screens, about 1920 px wide and up. It also shows when the camera frames it, in the Stay Ready dolly and on the walk's kiosk step; the walk skips that step wherever the kiosk stays hidden.
- The logo stays the existing 509×200 PNG, served as a 240×94 file; prompt 3 swaps it into every header along with the other header changes. The favicon is cropped from its "3" mark onto navy, and ChatGPT will ask you for a square mark if that crop isn't legible.
- The site gets a noindex tag so review-mode data stays out of search, and a permissive robots.txt so link previews still work.
- Share cards are screenshots of the live lobby, never pictures drawn by an image model or text laid onto the plate; if ChatGPT can't take the screenshots, Claude captures them from the live site, so every word on a card matches the site. A share page whose open panel can't be reproduced that way uses the resting-lobby card instead.
- Share pages (/s/lobby.html, one per door, and one for the path) ship only if the host can serve extra static files; if ChatGPT can't fetch its own test page, it will ask you to open it. Each names itself as the link's destination and forwards to the lobby by script rather than a meta refresh, so LinkedIn and Facebook open the lobby, not the dashboard. /s/lobby.html is the link to post there.
- Deep links are #/experience, #/door/<id>, #/path and #/path/<stage>. A pasted lobby link shows a "Loading the lobby" screen, never the dashboard, while the page starts, and adds the dashboard and lobby to history behind it, so Back steps out one layer at a time.
- The door dolly zooms 1.3x over 1.1 s on the existing image; no close-up renders are made. At rest the door rings pulse softly every 8 s, and all motion stops under reduced-motion settings.
- The phone layout applies at 900 px wide or less, in portrait, or when the screen is under 500 px tall. Landscape tablets keep the full scene. In the phone layout the panel is always a bottom sheet, and under 500 px tall it fills the screen below the header.
- On phones the lobby header keeps only the logo and "Return to intelligence". "Talk to our team" moves to a full-width outlined button under the door rows, with the colour legend after it, and the scene band shows door numbers only.
- "Take the walk" sits in the lobby header next to Talk (under the rows on phones) and, like Talk, hides while a panel is open, so it can never land on a door or start from inside one. Its caption bar sits at the bottom of the open area beside the panel, and on phones it becomes the top row of the sheet.
- The walk is on-screen captions plus a screen-reader announcement, with no audio or speech. Any caption that quotes a kiosk figure ends "Representative data." It adds one history entry; "End walk", Escape or Back return to the resting lobby, and using any other lobby control ends the walk wherever that control leads.
- The dashboard keeps its own ICP names, and a "See this in the lobby" button beside its ICP carousel opens the matching door (Provable Vendor to Win Trust, Portfolio to Gain Control, Regulated Operator to Stay Ready), adding the lobby and the door to history so Back steps out.
- Prompt 1 saves the new image without showing it. Prompt 2a switches the lobby over together with the live labels, so visitors never see blank signs. The image must be 16:9 and at least 1920 px wide, ideally 2560 or more, and that includes one you supply from another tool; ideally 2880 px or more; 2560 is slightly soft on 14-inch MacBook Pros.
- The lobby image is served as AVIF and WebP with a JPEG fallback, from files named /lobby-plate-828, -1280, -1920 and the largest named by its own width, e.g. -2560. The full-size PNG is kept as the master, and the old /three-doors-concept.png stays on the server, unused, so you can roll back.
- Checks ChatGPT probably can't run itself (WebKit, throttled loading, frame timing, axe, requests as each link-preview bot, 8× zoom and image overlays) are marked to be reported as not run rather than passed; Claude runs them against the live URL.
- No sound, no intro film, and no invented customers, logos or metrics anywhere.
- The idle attract loop is optional. It is built only after every other check passes, and it adds no history entries.
- The dashboard clean-up shares prompt 6 with the walk, so the sequence stays at seven prompts. If ChatGPT reports part of any prompt as not done, paste those items again on their own.
- Deferred on purpose: pointer parallax and a slow amber breathing on the door frames. Add them after the seven prompts pass if you still want more motion.

## How to use

1. Open the ChatGPT conversation that built the site. Paste one prompt at a time, in order: 1, 2a, 2b, 3, 4, 5, 6. Let each one publish before you paste the next.
2. Fill in before pasting: your booking link after "Booking link:" at the top of 2b (a meetings page, contact page or mailto: address). Before 2a, confirm or edit the three buyer labels in its item 1. Before 5, confirm the dashboard holds no live HubSpot records or real prospect names.
3. Prompt 1 is a gate. ChatGPT shows you the cleaned image and waits. Reply OK only if the doors, stair, tower and kiosk have not moved and no lettering is left. If ChatGPT cannot hold the composition, or cannot make a 16:9 image at least 1920 px wide, upscale the original to at least 1920 px wide (ideally 2560 or more) in another tool, retouch it with prompt 1's removal list, upload it, and write: "Use this file as the plate: check it as step 1 says, then do the After my OK step."
4. After each publish, reply: "Report every Done-when item as pass, fail or not run, with the value you measured." Have it fix every fail, and paste any item it left undone again on its own. After 4 and after 6, ask it to re-run every earlier Done-when item.
5. Have Claude re-check the live URL after each publish, especially items marked not run (Safari, frame timing, link-preview bots). If ChatGPT cannot capture the share cards in prompt 5, Claude can capture them from the live site; upload them and write: "Use these uploaded files as the share cards for /, /s/lobby.html, /s/win-trust.html, /s/gain-control.html, /s/stay-ready.html and /s/path.html; check each against prompt 5's card checks."
6. Do not share a lobby link until prompt 5 is live. Then post a /s/ page (for example /s/lobby.html) on LinkedIn and Facebook, and the #/experience link in Slack, email or chat. If ChatGPT reported that the host cannot serve /s/ pages, check a link in LinkedIn Post Inspector before posting there, because it will open the dashboard.
7. Anyone with the bare site address lands on the Market Intel dashboard, and "Return to intelligence" leads there from the lobby. It shows a competitor note and pipeline figures, labelled representative. If buyers should not see it, ask ChatGPT to hide "Return to intelligence" for visitors who arrive by a #/ or /s/ link.

## The prompts

### Prompt 1 · Clean plate (image only)

````text
Step 1 of seven for the 3HUE Experience lobby you built: create one retouched image and change nothing else. The lobby backdrop `/three-doors-concept.png` (1672×941, shown by `img.experience-backdrop` in `div.experience-shell`) was painted as a website mockup: about 37 baked strings, fake controls, and door signs that contradict the live page ("Scale Oversight", "Stand Ready"). Step 2a moves the door names, stage names and heading into live HTML and retires the rest, so the image must carry no text.

**Edit, don't regenerate.** Use your image tool's edit mode on the existing file. Keep the camera, perspective, composition, lighting, props and colours, so the doors, stair, tower, table, bust and kiosk stay exactly where they are. If a door moves or a prop changes shape, stop and tell me; never substitute a new scene.

**Remove every baked word and UI element:**
- The painted header band: the 3HUE wordmark, the nav (Approach, Customer Paths, Insights, About), the "Talk to our team" pill and the band's lower edge. Continue the ceiling and glazing behind it.
- The eyebrow, the two-line headline and the sub-line in the upper left.
- The three door signs. Leave each backlit sign panel lit but blank.
- The side-wall lists, every orange dash on the walls, "From uncertainty to operational confidence." and "HIGHER MATURITY BRIGHTER POSSIBILITIES". Leave plain wall.
- The three "Explore this path" captions and their cyan arrow circles.
- The painted "See the maturity path" pill on the stair.
- The four tower ring labels (Advance, Operate, Strengthen, Assess). Keep every glowing ring line (the four arcs and the base line).
- The plinth lettering "PEOPLE PERSPECTIVE PROGRESS". Leave plain stone.
- The kiosk's "AiVRIC intelligence layer" text and icon. Leave a dark, blank, faintly lit screen.

**Size.** Output the largest 16:9 size your tool supports, at least 1920×1080 and ideally 2560×1440 or more, and tell me the exact size. If it is under 1920 wide or not 16:9 (height within 1 px of width×9/16, so 2560×1441 passes), stop and tell me; never upscale, crop or pad to hide it.

**Gate.** Show me the original and the edit side by side, plus close-up crops of each door, the tower and the kiosk, then stop and wait for my OK. Redo any change from the original, not from a previous edit. If a word won't come out cleanly, tell me; never hide it under a colour-sampled patch, in the image or in code. If I upload a retouched plate instead, hold my file to the same size rule and checks; if it passes, go straight to the next paragraph.

**After my OK, and only then:** save the full-size PNG as `/lobby-plate.png` (the archive master), plus AVIF, WebP and q80 JPEG copies named `/lobby-plate-{828|1280|1920|full}.{avif,webp,jpg}`, where the largest copy carries the plate's own width in its name, e.g. `/lobby-plate-2560.webp` (skip listed widths at or above it). Keep each AVIF and WebP copy at 500 KB or less. If you can't encode AVIF, ship WebP and JPEG only and say so. Don't wire them in or delete the old PNG: the lobby keeps it until step 2a, so visitors never see blank signs.

**Done when**
- At 2× zoom the plate shows no legible letter or number and no UI shape (pill, arrow circle, header band).
- Laid over the original at 50% opacity, scaled to 1672 wide, the doorways, stair, tower rings, table, bust and kiosk line up within 6 px, including the doorway centres 333,537, 748,535 and 1357,540.
- The sign panels, kiosk screen and ring bands are still lit, just empty.
- You reported the plate's exact size, and it is at least 1920×1080 at 16:9 (±1 px), or you stopped.
- After my OK: every saved file returns 200, each AVIF and WebP copy is 500 KB or less, and the live lobby still shows the old image.

Do not change anything not listed here. When done, list what you changed and anything you could not do. Report any check you could not actually run as "not run"; never infer a pass.
````

### Prompt 2a · Professional baseline: content, stage and pins, live labels, boot

Before pasting: Optional: to change a buyer label before pasting, edit it in item 1, for example "Provable Vendors" to "AI-native vendors", or "Portfolio Companies" to "Portfolio owners" or "Investors and holding companies". The panel kickers and door plates read it from there.

````text
Step 2a: the clean plate, live labels and pinned controls.

1. **Content.** One `LOBBY_CONTENT` object absorbs the existing door records (Win Trust, Gain Control, Stay Ready) with every field (promise, audience, triggers, tension, gap, serviceFamilies, maturityEmphasis, decision), and adds each door's `icp` ("Provable Vendors", "Portfolio Companies", "Regulated Operators"), the stages (Assess, Strengthen, Operate, Advance) and the heading copy. Every lobby label, the catalog's Door filter too, reads from it. The dashboard's own ICP names (the catalog's door-to-ICP mapper, the persona filter options, the carousel) stay as they are.

2. **Stage and pins.** One `div.experience-stage` holds `img.experience-backdrop`, `div.experience-hotspots` and every in-scene label at native W×H, `transform-origin:0 0`, placed by `translate(tx,ty) scale(s)`: s=max(vw/W, vh/H), tx=(vw−W·s)/2 and, at rest on the desktop scene, ty=max(vh−H·s, min(0, 78−118k)) with k=s·W/1672, so wide screens crop from the floor and the heading clears the header. Delete `object-fit`, the door buttons' percentage positions and every `.experience-floor.with-panel` rule. `LOBBY_GEOMETRY` holds plate pixels, each re-measured in a `?debug=1` overlay that draws it, from these old-plate values ×W/1672: doorway centres 333,537; 748,535; 1357,540. Tower 969,225. Door frames 220–450×330–665; 665–840×355–650; 1260–1445×345–660. Sign lettering centres 338,390; 748,401; 1353,398 (cap height 17). Ring bands x 969, y 116/193/266/334.

Door buttons cover their frames, transparent, borderless and still (delete their background, border, `<small>`, `opacity:0` and `:is(.experience-hotspot:hover, …)` rules). State shows only on a 30 px ring at the doorway centre and, ≥8 px below, an always-visible 13 px navy chip "Explore {door}" (cyan hairline) that starts the accessible name "Explore {door}: {promise}". Hover brightens the ring and lifts the chip 2 px; `:focus-visible` gives both a 2 px #fff outline and 2 px #06121f halo. Both counter-scale (1/s). Hide `.experience-hotspot-route` until 2b. Show `.experience-brand` (the existing logo) minus its "MATURITY PARTNER" span and drop `.experience-header`'s backdrop-filter, so the clean plate never shows without the 3HUE logo.

3. **Live labels.** In the stage, `pointer-events:none` and `aria-hidden`, weight 500: each door name on its blank sign at the measured height and angle (warm white, soft glow), and each stage name on its ring band, Assess lowest (y 334) up to Advance (y 116), white, cap height 11 old-plate px ×W/1672, never under 12 px on screen. The heading block (`.experience-hotspot-intro`, minus display:none and max-widths) sits outside the stage: eyebrow "Your maturity partner" (uppercase, 0.18em tracking, rgb(92,199,223)), h1 "Three doors." / "One path to maturity." (two lines, weight 500, "One path" in #52cce3), then "Advisory. Oversight. Operational confidence. Built for what's next." (#c9d6df, breaking after "confidence."), over a navy gradient holding 4.5:1, max-width calc(100vw − 48px). Place it at left max(24px, 120k+tx), top 118k+ty; h1 56k px (≥30 px, line-height 1.0), sub-line 17k px (≥15 px, line-height 1.4), eyebrow 12 px, with 8 px gaps between eyebrow, h1 and sub-line. If the minimums bring it within 8 px of a door frame, shrink the h1 toward 30 px until it clears.

4. **Boot.** Serve step 1's `/lobby-plate-*` files as a `<picture>` (JPEG fallback, never the PNG) with width, height, `fetchpriority="high"` and sizes `max(100vw, {100·W/H}vh)`. Decode a detached `<picture>` with the same sources and sizes on Experience hover, focus or pointerdown and after the dashboard's first idle second (requestIdleCallback, else setTimeout). Until `decode()` resolves, show an inlined blurred placeholder (≤4 KB) and a polite "Loading the lobby" status, then fade in over 600 ms; skip both if already decoded.

**Done when**
- `?debug=1` at 1024×768, 1280×800, 1440×900, 1512×982, 1920×1080 and 2560×1440: each ring sits within 4 px of its point, on its doorway, where elementFromPoint returns its button; hover and focus change only ring and chip; Assess labels the lowest band.
- The heading block is fully visible, below the header and logo, and clear of every door frame at 1024×768, 1180×820, 1200×630, 1280×720, 1366×657, 1366×1024, 1440×900, 1536×730 and 1920×902; at 1440×900 the h1 is 48 px or more, on two lines.
- Renaming a door in `LOBBY_CONTENT` renames it everywhere; the lobby header shows the 3HUE logo.
- Reduced motion makes the fade instant.
- WebKit at 1440×900 passes the first two checks; on Fast 4G, cold cache, the placeholder or plate shows within 350 ms of pressing Experience, the plate downloads once (≤500 KB at 1440 wide), a warm reopen skips the placeholder, and CLS stays 0.

Do not change anything not listed here. When done, list what you changed and anything you could not do. Report any check you could not actually run as "not run"; never infer a pass.
````

### Prompt 2b · Professional baseline: header, dialog, panel, Talk, maturity path

Before pasting: On the first line, after "Booking link:", type the real destination for every "Talk to our team" button: a meetings or booking page URL, a contact page URL, or a mailto: address. If you leave it blank, ChatGPT will stop and ask you before building the Talk buttons.

````text
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
````

### Prompt 3 · Phones and tablets

````text
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
````

### Prompt 4 · Make it move: camera, guided climb, door plates, hash routes

````text
Step 4: motion and URLs.

1. **Camera.** One placement function for `div.experience-stage`: S=s·z, tx=R.cx−fx·S, ty=R.cy−fy·S, clamped so the plate covers its frame (viewport or phone band); s is the resting scale, R the frame minus header, panel and sheet, (fx, fy) the focus from `LOBBY_GEOMETRY`. At rest (z=1, no panel) keep 2a's placement. Opening a door dollies to z=1.3 on its doorway over 1100 ms, cubic-bezier(.2,.7,.2,1), animating only `transform`, with `will-change: transform` only during the move. Pins and chips fade (150 ms) during moves and return counter-scaled (1/S). A tab switch dollies door to door; closing reverses to rest; leaving mid-move resets the camera. The heading block stays hidden and inert whenever the camera is off rest. At rest, door rings pulse softly every 8 s, staggered (opacity only); under reduced motion, moves cut and nothing pulses.

2. **Guided climb.** The path chip dollies once up the stair to frame the tower (z=1.3), then holds still while the rings light. `#/path` is the overview: the full `<ol>`, no ring lit. "Next stage" lights Assess, then Strengthen, Operate, Advance; "Previous stage" steps back. All four `<li>` stay visible; the current one gets aria-current="step" and a visible "Current stage" tag. Each stage's ring is the arc directly above its name (measured into `LOBBY_GEOMETRY`); lighting adds a translucent `mix-blend-mode: screen` glow along it that never dims the render's. After Advance, "Where to start" shows each door with its emphasised stages (`maturityEmphasis`) as a button into that door, plus Talk. Existing copy only; nothing advances on a timer.

3. **Door plates.** On fine pointers and keyboard focus, a plate fades in (opacity only; its size never animates) just below the door's chip ("Explore {door}", "for {icp}" and its `serviceFamilies`, from `LOBBY_CONTENT`); the chip's 2 px hover lift stays the only movement. Plates are `pointer-events:none`, flip left near the right edge and stay on screen. On touch, the first tap opens the door.

4. **Hash routes.** Every lobby control calls one `go(state)`. Routes: `#/experience`, `#/door/<win-trust|gain-control|stay-ready>`, `#/path`, `#/path/<assess|strengthen|operate|advance|where-to-start>`. Opening the lobby or a panel pushes an entry that keeps the framework router's state (`history.pushState({...history.state, lobby: state}, '', hash)`); changes while a panel is open replace it. Back closes only the innermost layer; Escape, "Back to doors" and "Return to intelligence" call `history.go(-n)` for the n layers they close. A deep link in a fresh tab (no `lobby` key in history.state) first rebuilds the stack (replace with the dashboard URL, push `#/experience`, then push the state only if it differs), then opens without animation, focusing the panel heading. Ignore a re-fired, unchanged hash. Set `document.title` per state ("Gain Control · 3HUE").

5. **Boot cover.** An inline `<head>` script runs before first paint: if `location.hash` starts with `#/`, it sets `data-lobby-boot` on `<html>`, and inline CSS hides `header.topbar`, `section.context-bar` and `div.builder-main` and shows 2a's placeholder and "Loading the lobby" until the lobby mounts. An unknown route removes the attribute.

**Done when**
- At 1280×720, 1440×900, 1512×982 and 1920×1080, after each door's dolly its whole frame is inside R.
- Only transform and opacity animate; `will-change` is absent at rest; labels are sharp after a move at 1440×900@2x.
- From `#/path`, "Next stage" lights the rings bottom to top, each arc directly above its stage's name and fully visible beside the panel, then shows "Where to start".
- Each route pasted into a fresh tab opens its state; Back steps panel, lobby, dashboard, one per press; Forward and reload restore; dashboard navigation still works.
- At 1440×900 no plate leaves the viewport or covers another ring.
- Under reduced motion every flow completes and `document.getAnimations()` is empty after each step.
- WebKit passes the route check; p95 frame time during a dolly at 1440×900 is under 20 ms; on Fast 4G, cold cache, no filmstrip frame of any route shows dashboard content.
- Every earlier Done-when item still passes.

Do not change anything not listed here. When done, list what you changed and anything you could not do. Report any check you could not actually run as "not run"; never infer a pass.
````

### Prompt 5 · Living kiosk and share cards

Before pasting: Optional: to leave the "AiVRIC intelligence layer" co-brand off the kiosk, delete the sentence that begins "Its small secondary header". Nothing else needs editing.

````text
Step 5: a live kiosk screen and share links.

1. **Kiosk screen.** Measure the blank kiosk screen's four corners in plate pixels, twice, independently, into `LOBBY_GEOMETRY` (its right corners sit on the plate's right edge). Mount a live `div.experience-kiosk` in `div.experience-stage` with the solved `matrix3d(…)` transform (origin 0 0), so the camera carries it. It shows aggregates read from the dashboard's data, never retyped: "signals tracked" (the count of all findings in the unfiltered list, currently 4; never labelled "today"), source coverage (86%) and buyer segments tracked (3), plus a "Representative data" tag. Its small secondary header is the live text "AiVRIC intelligence layer". Nothing else: no finding titles, competitor names, account signals, HubSpot, funnel, pipeline, deal, targeting or price data, and nothing invented. Dim it to the night scene, keeping 4.5:1. It is a display: no pin, click handler, Tab stop or animation. Hide the content, never squash it, whenever a line would render under 12 px or a corner falls over 2 px outside the visible frame (viewport or phone band).

2. **Share tags.** Root `<head>`: og:title "3HUE · Three doors. One path to maturity.", og:description "Advisory. Oversight. Operational confidence. Built for what's next.", og:type website, og:url and canonical at the root URL, twitter:card summary_large_image, og:image and twitter:image (all URLs absolute https) (a 1200×630 JPEG under 300 KB of the lobby at rest), and `<meta name="robots" content="noindex">`. Add a `/robots.txt` that allows every bot (no `Disallow: /`).

3. **Cards.** After the plate has decoded and faded in, capture each card as a screenshot of the published page in a headless browser (1200×630, or 2400×1260 downscaled). Never lay text onto the plate yourself and never make a card with an image model. If a screenshot can't reproduce a page's open panel, that page gets the lobby-at-rest card, never an approximation; if you can't make even that, tell me.

4. **Icons.** Crop the existing logo PNG's "3" mark onto a navy #071426 square: a 32×32 favicon and a 180×180 apple-touch-icon, linked in `<head>` (nothing is linked today; leave `/favicon.svg` unused). Crop and scale only; if it's illegible at 32 px, ask me for a square mark.

5. **Share pages, only if the host allows.** First publish `/s/test.html` and fetch it; if you can't fetch it, ask me to open it before going on. If it serves your content, add `/s/lobby.html`, `/s/win-trust.html`, `/s/gain-control.html`, `/s/stay-ready.html` and `/s/path.html`, each with a title, description and noindex from `LOBBY_CONTENT`, its own card (the lobby at rest, or that door or the path with its panel open), and og:url and canonical at its own /s/ URL. Each redirects to its route (`#/experience`, `#/door/<id>` or `#/path`) with `location.replace()` only, never meta refresh, all og:image, twitter:image, og:url and canonical values written as absolute https URLs in static text, with a plain "Open the 3HUE lobby" fallback link. Delete the test file. If the host can't serve them, skip this and tell me LinkedIn and Facebook shares will open the dashboard.

**Done when**
- The kiosk and share pages contain 0 "Drata", "watched", "$", "pipeline" or "opportunit".
- At 1280×720, 1366×657, 1440×900, 1920×1080 and 2560×1440 the kiosk content is hidden or fully on its screen, every line 12 px or more at 4.5:1.
- Every word on each card matches the live page character for character, and each card shows the heading, the three sign names and the door chips.
- Zoomed 8× at 2560×1440, kiosk corners sit within 2 px of the screen's edges with no seam and stay there through the Stay Ready dolly; WebKit places it as Chromium does.
- curl of the root as Slackbot-LinkExpanding, LinkedInBot, Twitterbot and facebookexternalhit shows the og and twitter tags; og:image returns 200, 1200×630, under 300 KB; each share page, if the host serves them, returns 200 to those bots with its own og:title, og:image and og:url, no refresh, and opens its state in a browser.
- `/robots.txt` returns 200 and blocks none of those bots; both icons return 200 and show the 3HUE mark on navy.

Do not change anything not listed here. When done, list what you changed and anything you could not do. Report any check you could not actually run as "not run"; never infer a pass.
````

### Prompt 6 · Captioned walk and dashboard polish

Before pasting: Optional: if you don't want the idle attract loop, delete the paragraph beginning "Optional, only if every check below passes".

````text
Step 6 (last): a captioned walk (on-screen captions and a live region only; no audio or speech) and dashboard polish (`main.app-shell`).

1. **Take the walk.** Add "Take the walk" before Talk in `.experience-header-actions` (phones: under the rows), hidden like Talk while a panel is open. Steps: the lobby; each door; each stage (`#/path/<stage>`); the kiosk (`#/experience`, camera z=1.3 on its screen; skipped on phones or if its content stays hidden); Talk (at rest, pointing to the visible "Talk to our team", which never opens itself). Captions use only `LOBBY_CONTENT` and the kiosk's aggregates; any caption citing a kiosk figure ends "Representative data." The caption bar (Previous, Next, "End walk", caption) docks at the bottom of R; on phones it is the sheet's first row while a sheet is open, otherwise pinned to the bottom with the lobby padded to match. Walk steps keep focus in the caption bar and never move it to a panel heading. A polite, atomic live region announces each caption (cleared, refilled next frame). Focus starts on Next; in the bar, Right/Left step and Space/Enter press the focused button; no timers. Starting pushes one history entry; steps replace it. "End walk", Escape and Back return to `#/experience` at rest, focusing "Take the walk"; any other lobby control ends the walk where it leads. Guide, and a new Guide item in `.mobile-action-menu`, open the lobby and start the walk.

2. **Contrast.** Fix every text colour under 4.5:1 (about 60 axe nodes today) on light dashboard surfaces only (the dark top bar, the lobby and `catalog-shell` keep their colours): secondary text #5f6f80, cyan text #0e7490 (#25b5d6 only for fills), orange text #b45309, green text #047857, review badge #8a5230 on #fff1e9, labels ≥11 px, search placeholder 4.5:1. Keep provenance wording.

3. **Focus and semantics.** `:focus-within` rings (2 px #0e7490; #6bd2e4 on the dark top bar) on `.top-search`, `.search-box`, `.select-wrap`, `.catalog-search`, `.catalog-filter-panel select` and `.admin-select select`. A "Skip to content" link to `div.builder-main`, first in Tab order, visible on focus, inert while the lobby is open. `main.experience-floor` becomes a div, and `header.topbar` moves out of `main.app-shell` to become the banner landmark. Add role=dialog and aria-modal to `section.admin-modal` and `aside.detail-drawer`, and give them and `catalog-shell` focus on open, Escape and focus return. Name icon-only buttons by their action.

4. **Carousel** (`.icp-carousel`). Pause on hover or focus in the rail, while an overlay is open and on a hidden tab; under reduced motion start paused and never rotate. Give the pause control one fixed label, "Pause rotation", with aria-pressed; give `.icp-dot` 24×24 hit areas (44×44 on touch) and animate the active dot with transform: scaleX, not width. Beside the carousel, not inside a card, add a "See this in the lobby" button whose `go()` call pushes the lobby and the active card's door (`#/door/<id>`; door-to-ICP mapper), never a bare hash link.

**Optional, only if every check below passes:** after 40 s idle on the resting desktop lobby, tour the doors and path via `go()` in replace mode until any real input returns it to `#/experience`; never start with a panel open, mid-walk, on touch or under reduced motion.

**Done when**
- Keyboard only at 1440×900 and 390×844: 30 Tab presses stay in the shell; Enter on "Take the walk" or Guide starts it; Right walks every step, each announced once, with the matching door tab pressed; Escape ends at rest with focus on "Take the walk", and one more Back returns to the dashboard.
- At 1440×900 and 390×844 the caption bar covers no panel or sheet text, door frame, lit ring or kiosk screen.
- Fields show focus rings, the first Tab reveals "Skip to content", and the catalog, admin modal and drawer close on Escape, returning focus.
- With reduced motion, or the lobby open, the carousel stays still for 20 s; "See this in the lobby" opens the paired door, and Back then steps door, lobby, dashboard.
- axe at 1280×720 and 390×844: 0 violations in the resting lobby and every panel, 0 contrast violations on Analyst, Director and C-suite; WebKit passes the focus checks.
- CLS stays 0, and every earlier Done-when item still passes. If "Take the walk" now shows in prompt 5's lobby-at-rest cards, recapture them.

Do not change anything not listed here, except that you may fix any other axe violation in the lobby; list each one. When done, list what you changed and anything you could not do. Report any check you could not actually run as "not run"; never infer a pass.
````

