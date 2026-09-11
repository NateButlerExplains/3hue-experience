# 3HUE Experience

A buyer-facing lobby for 3HUE, published as a standalone static site. One painted lobby plate with three doors (Win Trust for SaaS & AI vendors, Gain Control for Portfolio owners, Stay Ready for Regulated operators) and one shared maturity path (Assess, Strengthen, Operate, Advance). Opening a door dollies the camera to the doorway, fades in that door's rendered room, and docks a panel whose sections (urgency, gap, services, proof, program, decision) double as station pins inside the room. The path chip climbs the tower ring by ring. A captioned walk steps through every stop at the visitor's pace. Every visible word comes from one JSON manifest; every position comes from one geometry file; the JavaScript only templates. No framework, no build step, no runtime dependency.

Live: https://natebutlerexplains.github.io/3hue-experience/
Repo: https://github.com/NateButlerExplains/3hue-experience (GitHub Pages, legacy build from `main:/`)

The fork `NateButlerExplains/3Hue-Market-Intel` stays the system of record for the plate master, the research corpus, the priced catalog and the original acceptance register. This repo carries only what the public site needs; `docs/PROVENANCE.md` lists every copied file with its SHA-256 and every file left behind with its fork path.

## Folder map

```
index.html                 shell: head metadata, boot-cover script, header, stage, panel, walk
404.html                   forwards pretty paths (/door/<id>, /path, /experience) into the hash router
robots.txt                 Allow: / (bots may fetch link previews; noindex is set per page)
.nojekyll                  Pages serves the tree as-is
package.json               npm scripts and devDependencies (Playwright, axe-core, Lighthouse)
css/experience.css         tokens, header, stage, pins, panel, walk, composed (phone) layout, @font-face
js/main.js                 boot: manifests -> plate -> stage -> doors/labels/hud -> panel/path/walk -> router
js/content.js              manifest and geometry loading, ?manifest= swap, string helpers
js/stage.js                plate transform (rest placement, place/dolly, resize), room fit and crossfade
js/hotspots.js             door pins, path chip, hover plates
js/labels.js               door signs, tower stage names, the heading block
js/hud.js                  header actions, composed rows and footer
js/focus.js                layer stack, focus return, Escape
js/router.js               hash routes and layered history
js/panel.js                door panel and path panel templates
js/path.js                 ring arcs and the climb
js/kiosk.js                perspective-mapped kiosk (counts derived from the manifest)
js/screens.js              homography -> matrix3d for the kiosk quad
js/walk.js                 captioned walk
js/rooms.js                room renders, format/size selection, station pins, ?rooms=0, ?room-preview=
js/debug.js                ?debug=1 overlay and window.__lobby
content/experience.json    every visitor-readable string, with source and status on research fields
content/geometry.json      every position, in 2880x1621 plate pixels (rooms in fractions of the room image)
media/plate/               lobby-plate-{828,1280,1920,2880}.{avif,webp,jpg}
media/rooms/               <door>-{2560,2048,1280}.{avif,webp,jpg}, one set per approved room
media/brand/               3hue-logo.png (509x200) + 240/480 derivatives, favicon-32.png, apple-touch-icon-180.png
media/fonts/               self-hosted Sora and IBM Plex Sans (variable, latin subset) + fonts.generated.css
media/share/               share cards (1200x630 JPEG) and cards.json (what each capture contained)
s/                         share stubs: lobby, win-trust, gain-control, stay-ready, path
tools/                     serve, lint, geometry tool, render pipeline, shares, icons, version stamp
tools/room-prompts/        one paste-ready render prompt per door (generated from the manifest)
tools/reference/           git-ignored: the 1672x941 original concept for the overlay check
art/                       git-ignored: render candidates, upscales, gate sheets, previews, ad-hoc scripts
tests/                     Playwright specs and fixtures
docs/                      DECISIONS, DEPLOY, RENDER-GATE, COPY-GATE, PROVENANCE, CONTENT-SOURCES, levelup/, evidence/
```

## Run locally

```bash
npm install                 # dev tooling only; the site itself has no dependencies
npm run serve               # node tools/serve.mjs -> http://127.0.0.1:8765/3hue-experience/
PORT=8770 npm run serve     # any other port
```

Open the base path, not the root: `tools/serve.mjs` serves the repo under `/3hue-experience/` so every relative URL is exercised exactly as Pages serves it (`/` redirects there; anything outside the base path is a 404). Responses are `Cache-Control: no-store`. Missing files return `404.html`.

Routes (hash-based, see `js/router.js`):

| Route | State |
|---|---|
| `#/experience` | lobby at rest |
| `#/door/<id>[/<station>]` | a door; `id` is `win-trust`, `gain-control` or `stay-ready`; `station` is `urgency`, `gap`, `services`, `proof`, `program` or `decision` |
| `#/path[/<stage>\|/where-to-start]` | the maturity path; `stage` is `assess`, `strengthen`, `operate` or `advance` |
| `#/walk/<n>` | the captioned walk at step n |

Opening a layer pushes one history entry; a change inside a layer replaces. A deep link in a fresh tab gets the lobby placed beneath it, so Back closes exactly one layer and never leaves for another site (O3).

## Content: manifest only, and the lint

Every string a visitor can read lives in `content/experience.json`. `js/` never carries copy; `js/content.js` exposes `str(key, vars)` over `strings`, and each module templates the manifest it is given. `docs/CONTENT-SOURCES.md` records where each manifest field came from. Research fields (`doors[].opening`, `stat`, `statSecondary`, `program`, `proof[]`, `path.whereToStart`) carry a `source` and a `status`; the panel prints the source inline. `docs/COPY-GATE.md` describes the copy gate those sections pass before going live.

`node tools/check-manifest.js [path]` (`npm run lint`) walks every visible string and exits 1 on any error. It checks:

- `vocabulary.forbidden` and `vocabulary.retired` words anywhere visible (error); `vocabulary.avoid` (warning)
- a `$` figure or a `%` figure outside `stat`, `statSecondary` or `opening` text
- brand spelling: `3HUE` and `AiVRIC` only (domains excepted)
- every `proof[].basis` names a customer in `vocabulary.allowedCustomers` or is boilerplate; every proof has `basis` and `status`
- `opening`, `stat`, `statSecondary`, `program` and `path.whereToStart` have `source` and `status`
- exactly three doors; each with exactly four `serviceFamilies`, a `dock` of `left` or `right`, known `maturityEmphasis` stages and a doorway in the geometry
- `headingAccent.text` is a substring of `heading[1]`; stages are Assess-first
- O1 buyer labels and O2 booking URL as recorded in `docs/DECISIONS.md`
- `geometry.kiosk.measurements.a` and `.b` agree within 2 px on every corner and a `quad` exists
- any door with `room.render` set has `geometry.rooms.<door>`

Top-level `vocabulary`, `sources` and `note`, provenance-style keys (`source`, `basis`, `provenance`, `ref`, `url`, `route`, `derive`, ...) and `plate.*` are excluded from the word checks. Run the lint before every commit that touches `content/`.

## Geometry and the geometry tool

`content/geometry.json` holds every position in pixels of the 2880x1621 plate (`plate.reference` 1672 is the width of the original concept the first numbers were converted from). Keys: `layout` (header heights, sheet top, dolly zoom/ms/ease, pin fade, pulse period, room fade timings, heading sizes), `doorways.<id>` (`center`, `frame` `[l,t,r,b]`, `sign`), `tower`, `rings[]` (`stage`, `label`, `arc` SVG path), `stairPill`, `phoneBand`, `kiosk` (`measurements.a`/`.b`, `quad`, `focus`), `logoMark` (written by the icon tool), `rooms.<door>` (`width`, `height`, `focus {x,y}` and `stations {id: [x,y]}` as fractions of the room image) and `measured` (per-item flag: seeded from the 1672 conversion until re-measured in the tool).

`tools/geometry-tool.html` must be opened through the local server (`/3hue-experience/tools/geometry-tool.html`) because it fetches `../content/geometry.json`. It shows the 2880 plate at native size with a zoom slider, draws the current geometry, and reads plate pixels from clicks. Modes: Point, Rect (2 clicks), Quad (TL TR BR BL, with a live `matrix3d` preview), Arc (left, apex, right). "Assign to" writes the measurement into the chosen key; "Copy JSON" copies the edited geometry for you to paste back into `content/geometry.json` (the tool never writes the file). The "50% overlay of the 1672 original" checkbox needs the git-ignored `tools/reference/00-original-1672x941.png` (fork path in `docs/PROVENANCE.md`). The tool works on the lobby plate only; room focus and station fractions in `geometry.rooms` are currently entered by hand.

`js/debug.js` exposes the same numbers on screen: `window.__lobby.rects` projects every doorway centre/frame/sign, ring label, stair pill, tower point and kiosk corner to screen pixels for the checks.

## Render workflow (rooms)

Rooms are an override of the level-up spec (O5 in `docs/DECISIONS.md`); `?rooms=0` keeps the spec-as-written behaviour and stays supported.

1. Prompts. `npm run prompts` (`node tools/write-room-prompts.js`) regenerates `tools/room-prompts/<door>.txt` from the manifest (door title, number, dock side, accent). Nate pastes a prompt into GPT with `media/plate/lobby-plate-1920.jpg` attached as the reference image and asks for the largest landscape output.
2. Candidates. Each GPT output goes to `art/rooms/<door>/candidate-NN.png` with the prompt beside it as `art/rooms/<door>/prompt.txt`. `art/` is git-ignored; nothing under it ships.
3. Upscale (O6). `/Users/nateb/.venv-esrgan/bin/python tools/upscale-room.py art/rooms/<door>/candidate-NN.png` runs Real-ESRGAN x4plus (spandrel + torch, MPS when available; weights at `~/.cache/esrgan/RealESRGAN_x4plus.pth`) and writes `candidate-NN.esrgan-4x.png` and `candidate-NN.master-2560.png` (2560x1440, centre-cropped or padded). The native file is never modified.
4. Gate sheet. `python3 tools/gate-sheet.py <door> NN` (needs Pillow; the esrgan venv has it) writes `art/rooms/<door>/gate-NN.jpg`: the candidate beside the lobby door crop from the plate, plus 2x crops of the four corners and the centre.
5. Preview in place. `?room-preview=art/rooms/<door>/candidate-NN.master-2560.png#/door/<door>` mounts the candidate in the real dolly and crossfade (relative path, no scheme, no `..`; the preview replaces the render for whichever door is opened). `node tools/shots.mjs "<url suffix>" <out.png> [w h] [waitMs]` captures it headlessly (base from `CHECK_BASE`, default `http://127.0.0.1:8770/3hue-experience/`), typically at 1440x900 and 390x844.
6. Gate. Pass criteria are in `docs/RENDER-GATE.md` (no legible glyph or UI at 2x, no people, flat straight-on blank displays, plate materials and colour temperature, only the door's accent saturated, five props for pins, quiet dock-side third, no seam at z 1.3). Nate's written OK on the sheet is the gate.
7. Derivatives. `bash tools/build-derivatives.sh <door> [NN]` reads the 2560 master and writes `media/rooms/<door>-{2560,2048,1280}.{avif,webp,jpg}` (ffmpeg with libsvtav1 for AVIF, cwebp for WebP); it prints `TOO BIG` for any file over 600 KB.
8. Wire. Set `doors[].room.render` to the base path `media/rooms/<door>` (no size or extension; `js/rooms.js` picks 1280/2048/2560 from viewport x device pixel ratio and AVIF/WebP/JPEG from a format probe) and add `geometry.rooms.<door>` with `width`, `height`, `focus` and `stations`. Run the lint. Recapture that door's share card.

The three rooms currently wired each came from `candidate-01`.

## Share cards and stubs

The lobby is hash-routed, so `#/door/win-trust` never reaches a crawler. `s/<id>.html` is one small real file per route that carries its own title, description, canonical, Open Graph and Twitter tags, then bounces into the hash route with `location.replace` (a plain link is the fallback). Cards are screenshots of the page itself at that route.

```bash
node tools/build-shares.js [siteUrl]                                          # siteUrl defaults to site.url
LOCAL=http://127.0.0.1:8770/3hue-experience/ npm run shares                   # capture locally, bake the live URLs
```

Needs Playwright Chromium and ffmpeg. For each of lobby, the three doors and path it loads the route at 1200x630 at 2x with reduced motion, waits for `fonts.ready` and `data-plate-ready`, screenshots, downsamples to 1200x630 JPEG under 300 KB, writes `media/share/<id>.jpg`, `s/<id>.html`, and `media/share/cards.json` (route, URL, capture time, bytes, the page's inner text at capture).

Rebuild the cards whenever what a card shows changes: the resting lobby, a door panel's copy or layout, a room render, a share title or description in the manifest (`share.lobby`, `doors[].share`, `path.share`), `site.url`, or the noindex state (the stubs carry their own meta). Commit the results.

## Icons

`/Users/nateb/.venv-esrgan/bin/python tools/build-icons.py` crops the "3" mark out of `media/brand/3hue-logo.png` (crop and scale only, never redrawn) onto navy `#071426` and writes `media/brand/favicon-32.png` and `media/brand/apple-touch-icon-180.png`. It also records the crop box as `geometry.logoMark`. Re-run only if the logo file changes.

## Deploy

Summary of `docs/DEPLOY.md`. Pages builds `main:/` directly (legacy build, no workflow).

```bash
npm run lint                                   # must pass
npm run stamp                                  # python3 tools/stamp-version.py: ?v= on the CSS link, the entry script and every relative import
git add -A && git commit -m "..." && git push
gh api repos/NateButlerExplains/3hue-experience/pages/builds/latest --jq .status   # poll until "built"
npm run check:live                             # CHECK_BASE=https://natebutlerexplains.github.io/3hue-experience/ npx playwright test
```

Pages sits behind a CDN that caches for hours: never publish without the stamp (it is idempotent and takes an optional version argument). Never name a served file `_*` or `.*`. Share cards bake absolute URLs from `site.url`; rebuild them if the origin changes.

## Switches

| Query | Effect |
|---|---|
| `?debug=1` | draws every geometry item over the plate; `window.__lobby` (`manifest`, `geometry`, `stage {s,tx,ty,z,sRest,composed,layerOpen,dock,inRoom}`, `project(x,y)`, `projectRect([l,t,r,b])`, `frame()`, `rects`) is the debug surface the checks read |
| `?rooms=0` | no room renders: doors dolly and open their panel only (spec-as-written) |
| `?room-preview=<relative image path>` | mounts that file as the room for any door opened; used with `#/door/<id>` for the render gate |
| `?manifest=<relative json path>` | swaps `content/experience.json` for a fixture (relative paths only) so the rename check can prove every label follows the file |

Reduced motion (`prefers-reduced-motion`) sets `transition: none; animation: none` everywhere.

## Acceptance register and test commands

`docs/levelup/acceptance.md` holds the 43 original Done-when bullets verbatim (phase counts 5/5/6/7/8/6/6), each with source line, measured result, evidence and a Pass / Fail / Not run state as carried over from the fork. `docs/DECISIONS.md` O7 re-scopes them for a standalone site: clauses naming dashboard chrome are replaced by the standalone equivalent or removed; viewports, tolerances, timings and counts stay verbatim. The re-scoped register with per-check dispositions is `docs/acceptance-standalone.md`; rooms add their own checks and are never counted against the 43. Measured values and screenshots go under `docs/evidence/`. At the time of writing neither the standalone register nor the evidence folder has content.

```bash
npm run lint             # manifest lint
npm run check            # npx playwright test --project=chromium
npm run check:webkit     # --project=webkit   (npx playwright install webkit first)
npm run check:reduced    # --project=chromium-reduced
npm run check:live       # same suite against the published site
```

Specs live in `tests/*.spec.mjs` and read `window.__lobby` under `?debug=1`; the rename fixture is `tests/fixtures/renamed.json`. At the time of writing `tests/` holds only the empty `fixtures/` directory and there is no `playwright.config` yet, so the `check*` scripts are wired but have nothing to run. Two git-ignored helpers show the pattern used for gate work: `art/walk-test.mjs` (drives the walk with the keyboard and dumps hash, focus, live region, zoom and lit arcs per step) and `art/kiosk-test.mjs` (kiosk corner projection and line heights at five viewports); both run with `node` against the 8770 server. The desktop-app browser pane stalls `requestAnimationFrame`; headless Playwright does not.

## Decisions

`docs/DECISIONS.md` is the ledger: why this is a separate repo, the four overrides carried from the level-up register (O1 buyer labels, O2 booking URL, O3 customer navigation stack, O4 plate band), the five new ones (O5 rendered rooms, O6 upscaled renders, O7 standalone re-scope, O8 header link, O9 kiosk counts) and the standing rules (manifest-only content, no invented customers or figures, no prices, `3HUE` never expanded, `noindex` until lifted). The original override ledger is `docs/levelup/overrides.md`; the file-level record is `docs/PROVENANCE.md`; field-level content sources are in `docs/CONTENT-SOURCES.md`.

## noindex

The site is published but not indexed. `<meta name="robots" content="noindex">` is hardcoded in `index.html`, `404.html` and the stub template inside `tools/build-shares.js` (so every `s/*.html` carries it). `site.robots` in the manifest records the intent; no script reads it. `robots.txt` allows every bot so link previews still resolve.

To lift it, on Nate's say-so only: set `site.robots` to `index`, remove the meta line from `index.html` and `404.html`, change the line in the stub template in `tools/build-shares.js`, rebuild the shares so the stubs are regenerated, stamp, and publish.

## Credits

- The level-up program: eight user-supplied Markdown documents preserved byte-for-byte in `docs/levelup/source/` with SHA-256 hashes in `docs/levelup/source-manifest.json`, the implementation/guardian loop in `docs/levelup/README.md`, and the phase reviews in `docs/levelup/reviews/`.
- The AiVRIC experience (`/Users/nateb/3Hue/aivric-experience`, commit in `docs/PROVENANCE.md`): the stage, camera, panel, HUD, router, walk and share-stub patterns, the homography in `js/screens.js`, and `tools/stamp-version.py`.
- `NateButlerExplains/3Hue-Market-Intel` (fork, commit in `docs/PROVENANCE.md`): the lobby plate and its derivatives, the logo, the lobby content and geometry, the research the door copy is drawn from.
- Sora and IBM Plex Sans, SIL Open Font License, self-hosted as latin variable subsets.
- Real-ESRGAN x4plus weights run through spandrel and PyTorch for the room upscales; ffmpeg, libsvtav1 and cwebp for derivatives; Playwright, axe-core and Lighthouse for verification.
