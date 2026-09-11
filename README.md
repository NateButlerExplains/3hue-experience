# 3HUE Experience

A buyer-facing lobby for 3HUE, published as a standalone static site. One painted lobby plate with three doors (Win Trust for SaaS & AI vendors, Gain Control for Portfolio owners, Stay Ready for Regulated operators) and one shared maturity path (Assess, Strengthen, Operate, Advance). Opening a door dollies the camera to the doorway, fades in that door's rendered room, and docks a panel whose sections (urgency, gap, services, proof, program, decision) double as station pins inside the room. The path chip climbs the tower ring by ring. A captioned walk steps through every stop at the visitor's pace. Behind a copy gate sits a guided tour: AiVRIC, the 3HUE guide, walks the visitor through the lobby with branching choices, captions and (once rendered) a voice, plus a Tour map, Ask AiVRIC and an emailed-to-yourself summary (O10, O11; see [The guided tour](#the-guided-tour-o10o11)). Every visible word comes from one JSON manifest (and, for the tour, one script file that quotes it); every position comes from one geometry file; the JavaScript only templates. No framework, no build step, no runtime dependency.

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
css/tour.css               the guided tour's card, dialogs and phone layout; loaded by js/tour.js only when the tour starts
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
js/walk.js                 captioned walk (the silent fallback: ?tour=0, #/walk/<n>, or a script that fails to load)
js/tour.js                 the guided tour's state machine: script loading, nodes, choices, pacing, pauses, history, summary
js/tourtext.js             pure refs, template tokens, conditions, next targets and the line hash (shared with the tools)
js/dialogue.js             the tour card: head row, progress, caption with word spans, callouts, choices, title card, live region
js/guide.js                the guide's sphere (canvas; original code, see docs/PROVENANCE.md)
js/tourmap.js              the Tour map dialog, plus the shared modal-dialog and icon-button helpers
js/ask.js                  the Ask AiVRIC dialog (approved answers only; optional microphone behind a disclosure)
js/ask-match.js            the static question matcher (pure)
js/voice.js                the voice player: audio and simulated back ends, word highlighting, mute, preload
js/rooms.js                room renders, format/size selection, station pins, ?rooms=0, ?room-preview=
js/debug.js                ?debug=1 overlay, window.__lobby and window.__tour
content/experience.json    every visitor-readable string, with source and status on research fields
content/geometry.json      every position, in 2880x1621 plate pixels (rooms in fractions of the room image)
content/tour.json          the guided tour's script: chapters, routes, nodes, Ask AiVRIC questions, the summary (refs into the manifest)
media/plate/               lobby-plate-{828,1280,1920,2880}.{avif,webp,jpg}
media/rooms/               <door>-{2560,2048,1280}.{avif,webp,jpg}, one set per approved room
media/brand/               3hue-logo.png (509x200) + 240/480 derivatives, favicon-32.png, apple-touch-icon-180.png
media/fonts/               self-hosted Sora and IBM Plex Sans (variable, latin subset) + fonts.generated.css
media/share/               share cards (1200x630 JPEG) and cards.json (what each capture contained)
media/voice/               (after the voice render) <key>.mp3 + <key>.json word timings + manifest.json, see docs/VOICE.md
s/                         share stubs: lobby, win-trust, gain-control, stay-ready, path
tools/                     serve, lint, geometry tool, render pipeline, shares, icons, version stamp, tour-text.mjs (copy sheet)
tools/voice/               the voice build (Azure AI Speech, ffmpeg) and its lint; not loaded by the site
tools/room-prompts/        one paste-ready render prompt per door (generated from the manifest)
tools/reference/           git-ignored: the 1672x941 original concept for the overlay check
art/                       git-ignored: render candidates, upscales, gate sheets, previews, ad-hoc scripts
tests/                     Playwright specs and fixtures
docs/                      DECISIONS, DEPLOY, RENDER-GATE, COPY-GATE, VOICE, PROVENANCE, CONTENT-SOURCES, copy sheets, levelup/, evidence/
```

## Run locally

```bash
npm install                 # dev tooling only; the site itself has no dependencies
npm run serve               # node tools/serve.mjs -> http://127.0.0.1:8765/3hue-experience/
PORT=8770 npm run serve     # any other port
```

Open the base path, not the root: `tools/serve.mjs` serves the repo under `/3hue-experience/` so every relative URL is exercised exactly as Pages serves it (`/` redirects there; anything outside the base path is a 404). Responses are `Cache-Control: max-age=0, must-revalidate` with `Last-Modified` (a reload revalidates and gets 304 for unchanged files, as on Pages); `.mp3` is `audio/mpeg` and byte ranges get 206, which Safari needs to play the voice. Missing files return `404.html`. Restart a server started before the voice work, or WebKit will not play audio locally.

Routes (hash-based, see `js/router.js`):

| Route | State |
|---|---|
| `#/experience` | lobby at rest |
| `#/door/<id>[/<station>]` | a door; `id` is `win-trust`, `gain-control` or `stay-ready`; `station` is `urgency`, `gap`, `services`, `proof`, `program` or `decision` |
| `#/path[/<stage>\|/where-to-start]` | the maturity path; `stage` is `assess`, `strengthen`, `operate` or `advance` |
| `#/walk/<n>` | the captioned walk at step n (always the silent walk, whether the tour is on or off) |
| `#/tour[/<node>]` | the guided tour at a node of `content/tour.json` (tour on only; with the tour off it opens the lobby); `#/tour` alone or an unknown node opens the start |

Opening a layer pushes one history entry; a change inside a layer replaces (every tour step replaces the tour's one entry). A deep link in a fresh tab gets the lobby placed beneath it, so Back closes exactly one layer and never leaves for another site (O3).

## Content: manifest only, and the lint

Every string a visitor can read lives in `content/experience.json`, apart from the guided tour's script and Ask answers in `content/tour.json`, which quote the manifest through refs and tokens (see [The guided tour](#the-guided-tour-o10o11)). `js/` never carries copy; `js/content.js` exposes `str(key, vars)` over `strings`, and each module templates the manifest it is given. `docs/CONTENT-SOURCES.md` records where each manifest field came from. Research fields (`doors[].opening`, `stat`, `statSecondary`, `program`, `proof[]`, `path.whereToStart`) carry a `source` and a `status`; the panel prints the source inline. `docs/COPY-GATE.md` describes the copy gate those sections pass before going live.

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
- the quote builder (O15): every family, example, offer, package and program name is on `content/builder-names.json` (names only, made by `node tools/builder-names.mjs` from the Builder capture of 2026-09-09; `--check` re-derives it) and is not a draft; a held ([Confirm price]) name stands only as a program name; each door's `starts` cover its triggers plus `early`, sit in its own panel lists and obey the overlaps (never SOC 2 Readiness with ISO 27001 Certification Readiness, no standalone Initial Risk Assessment beside either, the VCP base before its 5-vendor block, Incident Response Fast Start is not live incident command); Learn more opens only the allowlisted https://3hue.net pages; nothing on an offer or program is price-, rate- or hour-shaped

Top-level `vocabulary`, `sources` and `note`, provenance-style keys (`source`, `basis`, `provenance`, `ref`, `url`, `route`, `derive`, ...), `plate.*`, `tour.*` and `guide.voice.*` are excluded from the word checks. Run the lint before every commit that touches `content/`.

`npm run lint` also lints the tour script (`tour.manifest`, or `node tools/check-manifest.js --tour <file>` for another): the graph (targets resolve, every node reachable, no loop without a choice, no dead end), refs and tokens that resolve, figures only through sourced manifest fields (spelled-out numbers count), no door title, buyer label, stage name or quote-builder name typed into the script (Builder names come through `{offer:<id>}` and `{program:<id>}`), at most 4 options per choice, label lengths, a source and status on every text line and Ask answer, and the same vocabulary and brand checks. Then `tools/voice/lint.mjs` checks `media/voice/` against the script: missing or stale audio is a warning while `guide.voice.required` is false and an error once it is true; a broken file is always an error.

## The guided tour (O10/O11)

AiVRIC, the 3HUE guide, leads a branching tour through the lobby. It is adopted from the owner's tour at 3hue.net/experience with our three doors, our content rules and our own code (`docs/DECISIONS.md` O10, O11).

- **The gate.** `content/experience.json` `tour.gate` is `"pending"` until the tour's copy is signed (`docs/COPY-GATE.md`, sheet `docs/copy-sheets-tour.md`). While it is pending the site behaves exactly as approved at 7fa92e4: the walk button walks, and nothing of the tour (script, stylesheet, voice) is fetched. `?tour=1` previews the tour; `?tour=0` always gives the silent walk. At go-live the gate becomes `"approved"` and `strings.walk` becomes the tour's label (`docs/DEPLOY.md`).
- **One layer.** Starting the tour pushes `#/tour/<node>`; every step replaces it, so Back always lands on the lobby. A tour link in a fresh tab gets the lobby beneath it (O3) and restores the session's answers. The tour moves the lobby through the scene API in `js/main.js` (rest, door, station, path, kiosk, keep) and never opens a panel: a statistic or proof line shows a callout tile with its printed source. "See the details" hands over to `#/door/<id>/<station>` or `#/path/<stage>` and ends the tour in the normal panel.
- **The script.** `content/tour.json`: chapters (named by lobby landmarks), named routes, nodes `{chapter, scene, lines[{id, text|ref, source, status, when, cue, callout}], choice{prompt, remember, options[{label, sub, next|action, suggest, hideWhen}]}, next}`, `ask.intro` and `ask.questions[]`, and the `summary`. Figures come only through `ref` to sourced manifest fields; names only through tokens such as `{door:win-trust.title}`. The tour's interface words (Next, Your call, Tour map, Ask, End tour, the disclosures) are `strings.tour*` and `guide.*` in the manifest. `node tools/tour-text.mjs` prints every spoken line with its hash (`--count` totals, `--json`, `--sheet` writes the copy sheet).
- **Pacing and access.** With the voice on it moves at the voice's pace; otherwise the visitor presses Next and nothing runs on a timer. Captions always show. The live region (`#tour-live`) reads a line only when the voice does not. Focus moves only when the visitor acts. Choices are buttons in a group labelled by the prompt, at least 44 px; → ← and digits work only while focus is in the card.
- **Close and Ask.** Talk opens https://3hue.net/contact.html in a new tab (O2). "Send me a summary" opens a `mailto:` with no recipient (at most 1800 characters) plus Copy. Ask AiVRIC answers only from the approved answers in the script, each with its source; the microphone, where the browser has speech recognition, shows a disclosure first. Nothing is sent anywhere and nothing is collected: every request is a same-origin static file, the tour keeps one sessionStorage key, and the only localStorage entry is the visitor's own mute choice.
- **The voice.** Azure AI Speech `en-US-AvaNeural`, rendered at build time into `media/voice/` by `tools/voice/` (`npm run voice:dry` prices it with no key; `npm run voice` renders). The runtime switch is `guide.voice.required`: while it is false (today, no render committed) the tour is captions-only and never requests `media/voice/`. Everything else, credentials included, is in `docs/VOICE.md`.

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
| `?debug=1` | draws every geometry item over the plate; `window.__lobby` (`manifest`, `geometry`, `stage {s,tx,ty,z,sRest,composed,layerOpen,dock,inRoom}`, `project(x,y)`, `projectRect([l,t,r,b])`, `frame()`, `rects`) and `window.__tour` (node, line, phase, mode, answers, visited, scene, pause reasons, voice state, open dialog, guide frames) are the debug surface the checks read |
| `?rooms=0` | no room renders: doors dolly and open their panel only (spec-as-written) |
| `?room-preview=<relative image path>` | mounts that file as the room for any door opened; used with `#/door/<id>` for the render gate |
| `?manifest=<relative json path>` | swaps `content/experience.json` for a fixture (relative paths only) so the rename check can prove every label follows the file |
| `?tour=1` | the walk button starts the guided tour (and `#/tour/<node>` links open it) before `tour.gate` is `approved`; the preview |
| `?tour=0` | always the silent walk: no tour, no script fetched, `#/tour` links open the lobby |
| `?tour-manifest=<relative json path>` | swaps `content/tour.json` for another script (same-origin relative paths only); the engine specs use `tests/fixtures/tour-min.json` |
| `?voice=1` | the audio back end before `guide.voice.required` is true, to hear a trial render |
| `?voice=sim&rate=<n>` | the simulated voice back end for the specs: real fetches and checks, a clock instead of sound, `rate` times faster |
| `?voice=0` | captions only: no Voice control, nothing requested under `media/voice/` |
| `?voice-base=<relative dir>` | another voice folder (the specs write theirs under `tests/results/voice/`) |

Reduced motion (`prefers-reduced-motion`) sets `transition: none; animation: none` everywhere.

## Acceptance register and test commands

`docs/levelup/acceptance.md` holds the 43 original Done-when bullets verbatim (phase counts 5/5/6/7/8/6/6), each with source line, measured result, evidence and a Pass / Fail / Not run state as carried over from the fork. `docs/DECISIONS.md` O7 re-scopes them for a standalone site: clauses naming dashboard chrome are replaced by the standalone equivalent or removed; viewports, tolerances, timings and counts stay verbatim. The re-scoped register with per-check dispositions is `docs/acceptance-standalone.md`; rooms (R-01 … R-06) and the guided tour (T-01 … T-24) add their own checks and are never counted against the 43. Measured values and screenshots go under `docs/evidence/`. `node tools/fill-register.mjs candidate tests/results/report.json` (with `MANUAL=docs/evidence/manual.json` for the manual rows) fills the Candidate column from a Playwright JSON report: every spec title, or the describe block around it, starts with the IDs it proves (`P3-D01/D06 …`, `R-05 …`, `T-14 …`).

```bash
npm run lint             # manifest + tour lint, then the voice lint
npm run check            # npx playwright test --project=chromium
npm run check:webkit     # --project=webkit   (npx playwright install webkit first)
npm run check:reduced    # --project=chromium-reduced
npm run check:live       # same suite against the published site
```

Specs live in `tests/*.spec.mjs` (`playwright.config.mjs`: projects `chromium`, `webkit`, `chromium-reduced`, base `http://127.0.0.1:8770/3hue-experience/` unless `CHECK_BASE` is set) and read `window.__lobby` and `window.__tour` under `?debug=1`. The rename fixture is `tests/fixtures/renamed.json` (rewritten by `rename.spec`; commit it when the manifest changes). The tour's engine specs (`tour*.spec.mjs`, helpers in `tests/tour-helpers.mjs`) run on `tests/fixtures/tour-min.json`, so they hold while the script changes; `tests/voice-fixture.mjs` writes voice folders at test time under `tests/results/voice/` so their hashes always match the copy under test. No-browser specs cover the manifest and tour lint (`tour-manifest`), the voice tooling (`voice-tool`), secrets (`secrets`), the local server (`serve`) and the Ask matcher (`ask-match`). Two git-ignored helpers show the pattern used for gate work: `art/walk-test.mjs` (drives the walk with the keyboard and dumps hash, focus, live region, zoom and lit arcs per step) and `art/kiosk-test.mjs` (kiosk corner projection and line heights at five viewports); both run with `node` against the 8770 server. The desktop-app browser pane stalls `requestAnimationFrame`; headless Playwright does not.

## Decisions

`docs/DECISIONS.md` is the ledger: why this is a separate repo, the four overrides carried from the level-up register (O1 buyer labels, O2 booking URL, O3 customer navigation stack, O4 plate band), the five new ones (O5 rendered rooms, O6 upscaled renders, O7 standalone re-scope, O8 header link, O9 kiosk counts), the two for the guided tour (O10 voiced tour, O11 the walk hands over behind a gate) and the standing rules (manifest-only content, no invented customers or figures, no prices, `3HUE` never expanded, `noindex` until lifted). The original override ledger is `docs/levelup/overrides.md`; the file-level record is `docs/PROVENANCE.md`; field-level content sources are in `docs/CONTENT-SOURCES.md`.

## noindex

The site is published but not indexed. `<meta name="robots" content="noindex">` is hardcoded in `index.html`, `404.html` and the stub template inside `tools/build-shares.js` (so every `s/*.html` carries it). `site.robots` in the manifest records the intent; no script reads it. `robots.txt` allows every bot so link previews still resolve.

To lift it, on Nate's say-so only: set `site.robots` to `index`, remove the meta line from `index.html` and `404.html`, change the line in the stub template in `tools/build-shares.js`, rebuild the shares so the stubs are regenerated, stamp, and publish.

## Credits

- The level-up program: eight user-supplied Markdown documents preserved byte-for-byte in `docs/levelup/source/` with SHA-256 hashes in `docs/levelup/source-manifest.json`, the implementation/guardian loop in `docs/levelup/README.md`, and the phase reviews in `docs/levelup/reviews/`.
- The AiVRIC experience (`/Users/nateb/3Hue/aivric-experience`, commit in `docs/PROVENANCE.md`): the stage, camera, panel, HUD, router, walk and share-stub patterns, the homography in `js/screens.js`, and `tools/stamp-version.py`.
- `NateButlerExplains/3Hue-Market-Intel` (fork, commit in `docs/PROVENANCE.md`): the lobby plate and its derivatives, the logo, the lobby content and geometry, the research the door copy is drawn from.
- Sora and IBM Plex Sans, SIL Open Font License, self-hosted as latin variable subsets.
- The guided tour's shape (the AiVRIC guide persona, voiced lines with word-synced captions, branching choices with Suggested and Visited, chapter cards, the map, Ask, the closing screen) is adopted from the owner's tour at https://3hue.net/experience/; the code and copy here are our own (`docs/PROVENANCE.md`). The voice is Azure AI Speech `en-US-AvaNeural`, rendered on 3HUE's own resource.
- Real-ESRGAN x4plus weights run through spandrel and PyTorch for the room upscales; ffmpeg, libsvtav1 and cwebp for derivatives; Playwright, axe-core and Lighthouse for verification.
