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
