# Tour v2: Avi and Huey, three doors, rooms matched to the Builder

## URGENT: get this Mac's work onto GitHub before Nate moves machines (2026-09-13)

Nate is continuing on a different computer under the 3HUE account. Right now that would lose most of the project.

**`tour-rooms` has never been pushed.** `git status -sb` shows `## tour-rooms` with no upstream, and `git ls-remote` shows origin holding only `main` (d8f9d00) and `tour-engine-wip` (3273272). **Ten commits exist on this Mac and nowhere else** — the two guides, the ported orb and Ask console, the ElevenLabs pipeline, the Builder alignment (O15), and the measured surfaces (O14).

### What must move

1. **Push `tour-rooms` to origin.** Rescues the ten commits. Highest priority, do it first and alone.
2. **Commit the dirty working tree** — `content/tour.json`, `css/tour.css`, `js/tourtext.js`, `docs/copy-sheets-tour.md` and five part-updated spec files, left by an abandoned run. Commit them honestly labelled as WIP with the suite red, rather than losing them; the next session can discard the commit if it prefers the reconciled script.
3. **Force-add three small irreplaceable things that `.gitignore` currently excludes** (`art/` is ignored wholesale):
   - `art/surfaces/*.json` — 49 KB holding the 172 two-pass corner reads behind the 22 measured surfaces. Cannot be re-derived without re-measuring by hand.
   - `art/rooms/*/prompt.txt` — 5 KB, the exact prompts the three room renders came from.
4. **Add the plan and the review record to `docs/`** so they live in the repo instead of a personal `~/.claude` profile: this plan (with the complete script), the showrunner contract, the eight chapter sheets, the defect and seam reports, and the interactive script viewer.
5. **Scan before pushing.** The repo is public. Nothing added may carry Builder prices, codes, keys, or held facts.

### What git cannot carry — one zip, built for Nate

`art/` is 222 MB and stays ignored. Inside it, **`art/rooms/` is 93 MB and holds the only copies of the GPT room candidates** — `candidate-01.png` per door plus the ESRGAN masters. The shipped derivatives in `media/rooms/` are committed and safe, but the candidates are not regenerable: the same prompt does not return the same image. Also unbacked: `art/mockup/` (36 MB lighting study), `art/step6-surfaces/`, `art/v2-stills/`, `art/voice-ab/`, `art/_lens`, `art/a11y`.

Rather than have Nate hunt for pieces, **build one archive** at `/Users/nateb/3Hue/3hue-handoff-2026-09-13.zip` — outside the repo so it is never committed — containing:
- the whole of `art/` (everything git ignores, including the irreplaceable candidates and the surface measurement sources),
- this plan file,
- the session's review record: the showrunner contract, the eight chapter sheets, the defect/seam/critic reports, and the interactive script viewer,
- a `READ-ME-FIRST.md` at the archive root saying what each folder is, where the repo lives, and what to do on the new machine.

Then print its path and size. Nate copies one file. Everything else arrives by `git clone`.

`art/voice-cache/` does not exist yet, so there is no rendered audio to lose.

## Voice budget decision (Nate, 2026-09-13) — SETTLED

**Ask answers are captions-only in this release. Everything else renders.** Nate reviewed the script node by node and chose this deliberately: it lands the first render inside the Starter plan, and the Ask block gets voiced next month when credits renew.

| | Lines | Files | Credits |
|---|---|---|---|
| Full script | 283 | 555 (Avi 279 / Huey 276) | 51,783 |
| **Ask — captions only, deferred** | 78 | 156 | **17,104** |
| **To render now** | **205** | **399** (Avi 201 / Huey 198) | **34,679** |

**Starter is 40,000/month → fits, 5,321 spare.** The spare is the margin for reworded lines coming out of Andrew's review; only changed wording re-bills.

What this means in build terms: the Ask console still answers every question and still shows every line — the answers are read, not spoken. `ask.intro` and all 35 answers are excluded from the render set; the Play control on an Ask answer is hidden while its audio is absent. Nothing else about Ask changes.

**Next month, phase two:** render the 156 Ask files (17,104 credits) and turn the Play control back on. No copy change, no re-render of anything already built — the cache is keyed on text + voice + model, so the first render stays valid.

**Standing hold still in force:** no voice renders at all until the copy sheet is signed by Nate and the 3HUE owner.

## Copy decisions log (opening, 2026-09-11)

Nothing is rendered as audio until the copy sheet is signed, so every line below is still free to change. Four buyer lenses reviewed our opening against the owner's; Nate then went line by line.

**Settled**
1. **`arrive-1`** → "Welcome to the 3HUE lobby. I'm {guide:avi}. You'll leave knowing which door is yours, and one clear next step." The first sentence promises the payoff instead of describing our staffing. (Huey is introduced two lines later anyway.)
2. **New line after `arrive-1`** → the approved boilerplate, word for word: "3HUE builds and operates security, compliance and AI governance programs for organizations that have to prove their controls work — and have no one inside to run them." Approved copy (The Message Stack §09), so it needs a placement, not a new claim. Ask's own "What is 3HUE?" answer then needs a different first line, or a visitor hears it twice.
3. **`arrive-5` and the lead choice** → "One of us leads and the other stays close. The tour is the same either way, so pick the voice you'd rather hear." Prompt becomes "Who leads?" with the two options as plain guide-name tokens, so neither guide is the consolation prize.
4. **Order of the arrival stays as it is** (guides before the doors); Opening A's move of the guides to the room threshold is not taken.

**Open, being worked line by line**
- `lobby-1`, and the three door lines `lobby-2/3/4`: one decision, since they share the work of sorting the visitor.
- `wt-1` (and its twins `gc-1`, `sr-1`): whether the room needs a "this room is for…" line at all once the visitor has chosen the door.
- `wt-3` (and twins): "we'll finish with where you'd start" collides start with finish; needs plainer phrasing.
- `arrive-4` (Huey's only line): "if a room turns out to be wrong for you" puts the visitor in a negative frame; the credibility beat has to land positively.

**Not taken from the owner's opening:** the intro film, the name request, the fear statistics, "everything you're about to see is real", a track record for a synthetic voice, "here's the whole building at once", two-stage sorting, the threat-briefing chapter.

**How we review copy from here (Nate's method, 2026-09-11).** For every line under review: Nate says what is wrong, I ask until I understand it, and only then do I propose. No fixes before the diagnosis is his.

## The audience labels: a layer, not a line (open)

Reviewing `lobby-2/3/4` turned up a bigger decision. The three buyer labels — **SaaS & AI vendors**, **Portfolio owners**, **Regulated operators** — are wrong as a layer, spoken and on screen.
- "SaaS & AI vendors" narrows the door: a healthcare software firm, a payments company or a manufacturer with an enterprise customer hears a door that is not theirs.
- "Portfolio owners" is not how anyone describes themselves; it reads as an invented category.
- The door names (Win Trust, Gain Control, Stay Ready) were chosen to be plain and to line up with the catalog. **Those are settled** — Nate and the marketing team agree they land. Only the audience layer under them is in play.

**Decided:** replace the labels everywhere, not just in the spoken lines, and re-anchor everything downstream to the replacement. **Not** by widening them into vaguer words — Nate wants better examples first, then a short label that matches.

**Also under test:** whether "Regulated operators" is the right *framing* at all, judged against builder.3hue.net's catalog and the rest of the material, not by opinion.

**Blast radius when the labels change — measured 2026-09-12, wider than first written.** The labels are not only copy; they are the accessible name of the doorway the guide points at.
- **On screen during the tour:** `js/hotspots.js:30` prints `for {icp}` on every door plate — and the tour calls `setCurrent()` on that same hotspot group to light a doorway, so the retired label is what a screen reader announces for the door being pointed at. `js/panel.js:75` prints it as the panel kicker; `js/walk.js:25` puts it in the walk caption.
- **Shipped:** `media/share/cards.json` and all five share cards have it baked in.
- **Manifest, lint, tests:** `content/experience.json` `doors[].icp` ×3; `tools/check-manifest.js:185` hard-requires the three strings in order and `:570` registers each for the paraphrase scan; `tests/manifest.spec.mjs:163`, `tests/tour-manifest.spec.mjs:21`, `tests/tour-dialogs.spec.mjs:424`, `tests/fixtures/renamed.json` ×3.
- **Docs, including a signed one:** `README.md:3`, `docs/DECISIONS.md` O1, `docs/acceptance-standalone.md` O1, `docs/levelup/overrides.md` O1, `docs/copy-sheets-tour.md` ×9, and `docs/copy-sheets.md` ×3 as "Buyer label:" rows — **that sheet was approved on 2026-09-10**, so retiring O1 reopens a signed decision, not a pending one.
- **Paraphrases that are really labels, and must go with them:** `wt-1`/`gc-1`/`sr-1`, `ask-frameworks-1` ("For a bank, a credit union or a lender"), `ask-frameworks-2` ("For a software company selling into enterprise"), the three lobby buttons, and the kiosk display's own `experience.json` `kiosk.lines[0]` label **"Buyer segments"**, which prints a count of doors as a count of segments.

**Exercise under way (read-only):** three buyers per door. Nate asked for **real, named companies**, not invented personas: it forces the targeting decision, tests whether we could actually get in front of each one, and proves each door is aligned with a buyer that exists rather than with something that sounded good. Two passes are running:
1. **What each door is for**, from the quote builder's buyer personas and trigger rules, the Forcing Function and Message Stack, the approved manifest, the published customer stories, and 3HUE's public pages and tour.
2. **Three real organizations per door**, each verified from a public source that I open (their own site, a regulator's page, a filing, a press release), with the live signal that the door's trigger is active for them, the role that would own it, the first quote-builder offer, and the public channel we would reach them through. Organizations and role titles only: no personal details on individuals. Anything unverified is marked as such.

Nate reviews the nine companies; the short labels come after, drawn from how those buyers describe themselves.

## Door structure: three doors hold; what a door opens onto is the open call (2026-09-11)

Nate asked whether three doors with the settled names is still the right plan or whether there is a cleaner approach. Three read-only investigations ran: the case for keeping them, seven scored alternatives, and a full inventory of what a re-cut would cost.

**Three doors survive the test.** 46 of 61 reachable offers sit behind exactly one door (75%); only the risk-management program is shared by all three; Win Trust and Stay Ready share no first offer. Every scored alternative that reduced or increased the count lost. The names are settled and stay.

**One real defect, and it is not the count.** A door is doing two jobs — routing the visitor *and* holding the shelf — and the two want opposite things. 14 of the 59 services the doors name sit behind two or three doors at once; 12 of 23 catalog categories and 62 of 115 services sit behind no door at all. Gain Control has 14–15 sellable items, no packages, and its original two families were ITG **draft** categories stripped by `11a3d38` with nothing put back. It is a positioning door with the product door missing behind it.

**The candidate (F, scored 26/30):** keep three doors, three names, three rooms, three renders. Change what a door is a door *to* — the doors carry the advisory business split by what you are buying (Win Trust = prove it · Gain Control = own it across the estate · Stay Ready = run it continuously, 14 categories / 80 services); the **round table** carries people (8 categories / 33 services, today homeless); the **kiosk** carries the platform (2 services). 115 of 115 covered, nothing double-homed. The buyer situation moves to arrival, where nothing is signed or rendered. The room prompts already render an assurance room, a boardroom and an operations room — prove, govern, run.

**What it does not touch** (from the cost inventory): the lobby plate and its 12 derivatives, all 3 room renders and 27 derivatives, the 22 surface measurements and their sha256 bindings, every plate-pixel number in `geometry.json`, the 24 JS modules, the voice pipeline (nothing rendered — no sunk audio), the Builder alignment, and the 151 literal door ids across 16 specs, because the ids do not change.

**What it costs:** re-select `doors[].serviceFamilies / packages / programs / starts` and re-source the cited fields; rewrite ~103 unsigned tour lines in the door chapters; measure one new quad for the round table (~2 h in `tools/geometry-tool.html`); amend the O1 rule at `tools/check-manifest.js:185` and 4 hard assertions; re-bake 5 share cards; reconcile Market-Intel (`app/catalog-data.ts` `classifyDoors()`, the `icpProfiles` carousel, `buyer-personas.md`). **6–9 engineering days, zero re-renders.**

**The real price, stated plainly:** the 2026-09-10 copy OK covers "Services on this path" in each door panel, and the gate says any later change to a sourced field needs a fresh sheet. Candidate F changes exactly that section in all three doors, so it **reopens a signed gate**, not only the two sheets already pending. And Gain Control's meaning shifts from "portfolio owners" to "govern it across the estate" — the name survives, the contents change. That is a positioning call, not an engineering one.

**Bugs found on the way, true regardless of the decision:**
- Live share cards and the Gain Control plate/panel still carry the two stripped draft ITG category names.
- `js/panel.js:17 programOf()` drops **held** programs, so Gain Control's vCISO never renders; `check-manifest.js ref()` catches held offers but not held programs, so lint is silent.
- `content/geometry.json` still has `measured.doorways: false` — the doorway numbers were never re-measured against this plate.

**Decision taken 2026-09-11:** Nate had no preference between F and the narrow fix, so **F is adopted** and can be reversed on his word. The narrow fix leaves 62 services and 12 categories behind no door and 14 double-homed — that is the thing that keeps coming back.

### F as scored was wrong twice. Corrected 2026-09-12 after drafting the full script against it.

Eight chapters of the complete script were drafted against F, each adversarially verified, then criticised as a whole. Two of F's claims did not survive contact with the manifest:

1. **"115 of 115 covered" is coverage on paper, not in the tour.** 36 of the 102 live services have no `offers`/`programs` id in `content/experience.json`, and the naming rule forbids typing a Builder name that has no token. The round table can name **2 of its 33 services**; the kiosk's 2 are named nowhere in `tour.json`. Promoting them to homes creates two rooms with no chapter, no landmark, no measured surface, no render and no route in — the expensive path the cost inventory warned about, arriving through the back door.
2. **The trigger axis and the category axis do not line up.** Stay Ready's exam start and Gain Control's acquisition start are both *Risk Assessment & Risk Management*, which F assigned to Win Trust. Nine offers ended up in two rooms at once and the three door chapters each invented a different rule for it. `tools/check-manifest.js:456` independently forces Stay Ready's flagship start to name `incident-command`, which F had moved to the round table.

**Both are fixed by one correction, and it is the one the data pointed at all along** (agent 1's finding that the only shared offers were the risk-management ones):

### The shelf as adopted, verified against `content/builder-names.json` (19 live categories, 102 services, 7 packages)

**Risk Assessment & Risk Management (10) is the shared front step, not a door shelf.** Any door's first step may come from it, and the lobby says so once, out loud. That single move dissolves the nine double-homings.

| Home | Distinctive categories | Live services |
|---|---|---|
| **Shared front step** — where every door can start | Risk Assessment & Risk Management | 10 |
| **Win Trust** — prove it to whoever is asking | Information Security Program & Governance (14) · ISMS, SSPP & Statement of Applicability (4) | 18 |
| **Gain Control** — own it across the estate | Privacy Management & Data Protection (12) · Vendor & Third-Party Risk Management (4) · Security Engineering & Architecture (6) | 22 |
| **Stay Ready** — run it continuously | Cyber Incident Response Program (7) · Business Continuity & Operational Resilience (3) · Managed GRC Programs (3) · Managed Detection & Response (MDR / MXDR) (4) | 17 |
| | **advisory total** | **67** |
| **Not on the tour this release** — people | Leadership & Architecture (3) · IT & Cloud Infrastructure (4) · AI Development & Operations (5) · Product & Delivery (5) · Information Security (5) · Fractional Executive & Retainer Services (5) · IT/IS Project Management (2) · Standard Rate Card Services (4) | 33 |
| **Not on the tour this release** — platform | Technology Platform Deployment & Integration | 2 |

**The 35 people and platform services get one honest sentence at the close** — some visitors need a person, not a program, and that is a conversation — naming no offers, because 31 of the 33 have no token to name them with. Giving them a real shelf is a later release that starts with putting ids in the manifest, not with a room.

**Two triggers move, so that no room names another room's offer:** Win Trust's **ai** trigger goes to Gain Control (`ai-governance-advisory` is Privacy Management & Data Protection), and Stay Ready's **crossing** trigger goes to Gain Control (`privacy-leadership-launch`). `incident-command` stays with Stay Ready, which keeps `check-manifest.js:456` untouched.

**Packages, all 7 placed** (Gain Control stops being the door with none): Win Trust — SOC 2 Readiness, ISO 27001 Certification Readiness, ISO 27701 Privacy Readiness, PCI-DSS Readiness. Gain Control — Privacy Leadership Launch. Stay Ready — Incident Response Fast Start, MXDR Complete Protection. The existing overlap rule (never SOC 2 *and* ISO 27001 together) is a recommendation rule and is unaffected by shelving them side by side.

**Blocking lint change:** `tools/check-manifest.js:175` requires **exactly four** service families per door. Under F, Win Trust and Gain Control have three. Relax it to three-or-four rather than padding a door with a family it does not own. `:183` (exactly three doors) stays as it is.

**When the 13 draft services go live** they land without a structural decision: the vCIO category and DMP assessments to Gain Control, Managed Business Continuity to Stay Ready, the rest of Technology Advisory to Gain Control or the round table by whether it is a program or a person. Confirm each against the catalog at build time — do not guess in the manifest.

### Build order for F (replaces step 2's family table; everything else in the plan stands)

1. **Fix the three bugs first**, on their own commit — they are wrong today and independent of F: `programOf()` held programs, the `ref()` hole for held programs, and the stale draft ITG names on the plate, panel and share cards.
2. **`content/experience.json`:** rewrite `doors[].serviceFamilies` to the table above; place all 7 `packages`; re-point `programs` and `starts`; re-source the cited fields that move. Add the round table's and kiosk's shelves as their own content, not as door fields.
3. **No new measurement.** The corrected shelf needs none — the round table is not a home this release, so `content/geometry.json` and all 22 surfaces are untouched. (This was F's only new measurement; the correction removes it.)
4. **`tools/check-manifest.js`:** relax the exactly-four-families rule at `:175` (Win Trust now has two distinctive families plus the shared step); retire the O1 labels at `:185` and the buyer-label paraphrase scan at `:570`; leave `:456` (incident-command beside ir-fast-start) and every Builder-name rule exactly as they are.
5. **`content/tour.json`:** rewrite the three door chapters' beat 3 against the new shelf (~103 lines, none signed, none rendered). The buyer-situation question moves to arrival.
6. **Specs:** the 151 literal door ids stay valid. Amend only the 4 assertions that hard-code the count or the O1 labels (`manifest.spec.mjs:50,163`, `tour-manifest.spec.mjs:21,313`), then regenerate the 3 fixtures.
7. **Re-bake** the 5 share cards and stubs; re-run all 81 acceptance checks.
8. **Sheets:** regenerate `copy-sheets.md`, `copy-sheets-tour.md` and `copy-sheet-builder.md` together and send **one** sheet to the owner covering all three — the signed 2026-09-10 OK on "Services on this path" is reopened by this and there is no way around it.
9. **Market-Intel** reconciliation last, once the manifest is settled: `app/catalog-data.ts` `classifyDoors()`, the `icpProfiles` carousel, `docs/discovery/.../buyer-personas.md`.

Voice stays held throughout — nothing renders until the sheet is signed.

## Context

**Where things stand**
- The live site (`main` at d8f9d00) is the three-door lobby the owner approved.
- The tour engine is parked on `tour-engine-wip` (3273272). It is gated off (`tour.gate = "pending"`) and previewable with `?tour=1`.

**Andrew's tour** (3hue.net/experience, repo `3HUE/3HUE-Website` at 797b153) walks through every program in detail. It works well for internal teaching.

**What Nate wants from it**
- His two guides: Ava renamed **Avi**, and **Huey**.
- The same orb visuals and the same Ask questions.
- "Ask Avi" in the top right, linking to 3hue.net pages.

**What Nate wants for the public tour**
- It stays ours: **three doors for where the visitor is** (Win Trust, Gain Control, Stay Ready).
- Inside each room, Andrew's program knowledge names the programs and offers that fit.
- Offer names match the quote Builder (builder.3hue.net) exactly, so what a visitor hears is what Client Success quotes.

**Outcome.** One gated branch, `tour-rooms`, holding:
- a voiced tour with two guides
- rooms that write on their own displays
- a docked Ask console
- offer names exactly as in the Builder, voiced on ElevenLabs

Then the copy gate and go-live.

## Locked decisions

- **Guides.**
  - Avi opens, meets Huey, and the visitor picks who leads. This is Andrew's hand-off.
  - Unpinned lines and Ask answers are spoken by the lead. Replay resets the lead to Avi.
  - AiVRIC is now the platform name only, pronounced "av-RICK" (Nate).
- **Voices.** ElevenLabs: Avi `PAdXflgOFROGTlJEdlSu`, Huey `d9DA0yC1x1RCfpwZPDMM`.
- **Code.** Port Andrew's orb and Ask console with credit (Andrew OK'd it), fixing his accessibility and layout bugs on the way.
- **Catalog of record.** The Builder capture of 2026-09-09 in `natebutler-sudo/3Hue-Market-Intel`, under `docs/discovery/solution-builder-catalog-2026-09-09/`.
  - The site shows names only: no codes, no prices, no quote building (saved for later).
- **Starts.** "Every path starts with a Snapshot" becomes door-specific Builder starts, and goes back through sign-off.
- **Privacy.** No visitor name. Nothing leaves the browser.
- **Strategy, kept from the 3hue-2e draft.**
  - The tour's one job: find your door and leave with one next step.
  - Spine: lobby → your room → tower ring → round table.
  - Five beats per room: the buyer's moment → before and after → what you'd receive → proof → next step.
  - Each room has three trigger versions plus "Nobody's asking yet".
  - Rooms talk back on their own displays, and the station pins go (behind the gate).
  - **Superseded:** "borrow nothing from the owner". We now adopt his guides, his Ask and his program facts (adapted to our rules).

## Already done (reuse, don't redo)

- **Surfaces:** `art/surfaces/<door>.json` holds 22 surfaces, each measured in two passes, with visible corners agreeing within 2 px.
  - `gc-model` and `gc-console` each have one hidden corner.
  - `sr-clock` is a circle.
- **Mockup:** `art/mockup/` (`mockup.js`: `quadToMatrix3d` quads, occluder redraw, `fitSigns`, phone framing) and its shots.
- **Voice tests:** `art/voice/` holds Avi's chosen voice, 5 test lines on `eleven_multilingual_v2` and `eleven_v3`, and `test/report.html`.
- **Script v1:** `art/script/tour-script-v1.md`, with AiVRIC as the guide and decisions D1–D9 open. It is the basis for v2.
- **API key:** the ElevenLabs key is in `~/.env` as `ELEVNLABS_API_KEY` (the name is misspelled). The loader accepts both spellings and never prints the value.
- **Engine** on `tour-engine-wip`:
  - `js/tour.js`, `tourtext.js`, `dialogue.js`, `guide.js`, `voice.js`, `tourmap.js`, `ask.js`, `ask-match.js`
  - `tools/voice/*`
  - 908 tests passing on three engines

## Build

Branch `tour-rooms`, cut from `tour-engine-wip`. Each step is one commit, leaves all three engines green, and keeps the gate pending. `main` is not touched.

### 1. Credit and decisions
- **`docs/PROVENANCE.md`** gets rows for:
  - `js/guide.js` (the orb)
  - `js/ask.js` and `css/tour.css` (the console)
  - the hand-off pattern
  - the rule "pinned lines in one voice, unpinned lines in both"
- Each row reads "from 3HUE/3HUE-Website `experience/…` @797b153, used with Andrew Ramirez's permission (date, medium)". Add README credits.
- **`docs/DECISIONS.md`:**
  - O12: two guides, and the hand-off.
  - O13: ElevenLabs, with Azure kept as an option.
  - O14: surfaces replace pins, behind the gate.
  - O15: the Builder is the source of offer names, and there is no quoting on the site.
  - Amend O10: AiVRIC is the platform, not the guide.

### 2. Match the manifest to the Builder
Files: `content/experience.json` and `tools/check-manifest.js`.

**Names file.** `tools/builder-names.mjs` generates `content/builder-names.json` from `catalog.json`.
- Names only: categories, non-draft services, and the 7 packages.
- The three "[Confirm price]" items are marked `held`.
- No codes and no prices. The file is pinned to the capture date.

**`serviceFamilies`.** Still four per door. Family names are exact Builder category names, and the examples are exact non-draft item names.
- **Win Trust:** Risk Assessment & Risk Management · Information Security Program & Governance · ISMS, SSPP & Statement of Applicability · Privacy Management & Data Protection.
- **Gain Control:** Risk Assessment & Risk Management · Managed GRC Programs · Vendor & Third-Party Risk Management · Information Security Program & Governance. This drops the draft ITG families.
- **Stay Ready:** Risk Assessment & Risk Management (which covers the exam trigger) · Cyber Incident Response Program · Business Continuity & Operational Resilience · Privacy Management & Data Protection. MDR moves to packages and programs.

**New fields on each door:**
- **`packages`**, with summaries that carry no prices or hours:
  - Win Trust: SOC 2 Readiness, ISO 27001 Certification Readiness, ISO 27701 Privacy Readiness.
  - Gain Control: none. The panel hides the list.
  - Stay Ready: Incident Response Fast Start, Privacy Leadership Launch, MXDR Complete Protection, PCI-DSS Readiness.
- **`starts`**, keyed by trigger (see the table below).
- **`programs`**, by id: isp, rmp, cirp, vcp, vciso, sea, soc and grc, each mapped to a Builder category with a `learnMore` page. scs is held because the Builder has no such item.

**Wording changes** (all go on the copy sheet):
- `path.whereToStart` becomes "Each door has its own first step, scoped to the obligation in front of you." The path panel lists each door's start, derived from the manifest.
- `arc[0]` changes from Snapshot to Scope.
- `doors.win-trust.program.snapshot` becomes `program.start`, with new text.

**Lint rules:**
- Every Builder name used must be on the names list and not a draft.
- `held` names may appear only as program names.
- In `tour.json`, Builder names appear only as tokens.
- Overlap rules:
  - Never recommend SOC 2 Readiness together with ISO 27001 Certification Readiness.
  - Never add a standalone Initial Risk Assessment beside either.
  - The VCP base comes before its 5-vendor block.
  - Incident Response Fast Start is not live incident command.
- Every start appears in its door's panel lists.
- `learnMore` links must be on an allowlist of `https://3hue.net/` pages. No `www`, no `/isg/pricing.html`, no landing pages.
- Positional refs (for example `serviceFamilies.2.examples.2`) become keyed refs.

| Door | Trigger | Start | With | Then runs as | Tower ring |
|---|---|---|---|---|---|
| Win Trust | deal | SOC 2 Readiness, or ISO 27001 Certification Readiness if the buyer named ISO (never both) | — | Managed Information Security & Privacy Management | Assess → Strengthen |
| | evidence | Initial Risk Assessment | RFP Response Services | same | Assess |
| | ai | AI Governance & Privacy Advisory | Initial Risk Assessment if there's no baseline | same | Strengthen |
| Gain Control | acquisition | Initial Risk Assessment, one per company | — | Managed Risk Management Program | Assess |
| | reporting | BOD / Investor Performance Reporting | Risk Committee Posture Update | Managed Risk Management Program | Advance |
| | control | Managed Risk Management Program | Managed Vendor Compliance Program (VCP); a virtual CISO, named only as a program | — | Operate |
| Stay Ready | exam | Periodic Controls Gap Assessment | Manage Risk Register & POA&M | Managed Risk Management Program | Operate |
| | incident | Incident Response Fast Start | Business Continuity Plan Development; for a live incident, Incident Command & Emergency Response Leadership | Managed Cyber-Incident Response Program; MXDR Complete Protection | Strengthen |
| | crossing | Privacy Leadership Launch | AI Governance & Privacy Advisory | — | Strengthen |
| All | early | Initial Risk Assessment (Win Trust, Gain Control) or Periodic Controls Gap Assessment (Stay Ready), "when someone asks" | | | — |

### 3. Two guides on our engine
- **Manifest.** `guide` becomes `guides {avi, huey}` plus `lead: "avi"`, and the disclosure becomes plural: "Avi's and Huey's voices are synthetic…". Colours stay in CSS.
- **Pinned lines.** A `tour.json` line takes `who: "avi" | "huey"` and is spoken in that voice only. An unpinned line is spoken by the lead.
- **The lead is a remembered answer**, not new state: `choice.remember: "lead"`, with option values equal to guide ids.
  - Save, restore, `forget()` and `matches()` work unchanged.
  - Replay resets the lead to Avi with no extra code.
- **`js/tourtext.js` `resolveToken`:** `{guide}` is the speaker; `{guide:huey}` names a specific guide. Add `usesGuide()`.
- **`js/tour.js`:**
  - Add `lead()` and `syncLead()`. `syncLead()` sets `body[data-lead]`, the Ask label and the card's `aria-label`.
  - `lineOf` resolves each line's speaker, and `emit` and `tourState` carry `speaker` and `lead`.
  - With the voice off, the live region puts the speaker's name before a line when the speaker changes.
- **`js/dialogue.js`:** add `setSpeaker()`. The card's Ask button goes; the header owns Ask now.
- **Lint:**
  - `who` must be a guide id.
  - `lead` is a reserved name.
  - Guide names appear only as tokens.

### 4. Andrew's orb in `js/guide.js`
- **Keep our scheduler:** `initGuide`, `tick`, `still`, the idle settle, pause, and stopping when the tab is hidden. T-16 and T-17 test these.
- **Port his renderer:**
  - 96 Fibonacci points, every 9th one gold
  - threads by distance, the glow, the gold and white core, the listening ring
  - drawn in his 220-unit space through `setTransform`
  - time independent of frame rate: about 14 s per turn, with a ±20° nod
- **Tints from CSS:**
  - Avi: #1FB6FF, pale (210,240,255).
  - Huey: #2EE59D, pale (215,255,240).
  - Both: gold #FFD63A.
  - The card's orb follows the speaker. The console and pill orbs follow the lead, through `attachOrb(canvas, {follow})` on one shared loop.
- **UI accent.** New `--guide*` tokens. Avi keeps our cyan; the accent turns teal while Huey leads. The swap is instant, with no transition.
- **Speaking level from word timings, not WebAudio.** Using WebAudio would complicate the iOS unlock and would read zero under `?voice=sim`.
- **Reduced motion:** one still frame per mode, tint and size.
- **Sizes:**
  - 150 px at 1200 px and wider
  - 112 px at 901–1199
  - 64 px on phones
  - 60 px in the console head, 30 px in the pill

### 5. "Ask Avi / Ask Huey" top right, and the docked console
Files: `js/ask.js`, `js/hud.js`, `index.html`, `css/tour.css`.

**The header button.**
- `#hud-ask` is the last element in `#hud`, outside `#hud-actions` (which goes inert when a layer opens). Its label follows the lead.
- It is visible whenever the tour is on, including at rest. At rest it lazy-loads `tour.json` and opens the console without starting the tour.
- Before the gate opens, the approved header is unchanged.

**The console.**
- A native `<dialog>`, opened through `modal()` from `tourmap.js`. This fixes his missing modal semantics, focus trap and focus return.
- Width:
  - `min(600px, 44vw)` at 1201 px and wider
  - `min(560px, 100vw − 32px)` at 901–1200, which fixes his clipping
  - full screen on phones
- **Head:** the lead's orb and name, the chapter, Minimise and Close.
- **Tabs:** Conversation and Explore, as proper ARIA tabs. Transcript is deferred: it duplicates the captions, and every figure in it would need its source.
- **Conversation** is a scrollback. Each answer shows:
  - the approved lines with their sources
  - Take me there
  - Send me this answer (a mailto with no recipient)
  - **Learn more on 3hue.net**
  - Play, voiced by the lead
  - related chips

  It reuses `answer`, `groups`, `mailFor` and the microphone code from `ask.js`, and `buildIndex`, `match` and `related` from `ask-match.js`.
- **Chips** come from `node.ask`, at most 4 per node. They answer by question id, which fixes his misfiring chips.
- **Explore** reuses the chapter rows from `tourmap.js`.
- **Minimise** turns the console into a pill at top right, under the header. The pill is 44 px, labelled "Ask Avi, conversation minimised". The tour pauses and the history is kept.
- **Learn more links.**
  - Listed in `site.learnMore.pages`.
  - Checked again at runtime: https, host 3hue.net, no query string.
  - They open in a new tab with `noopener`.

**Questions.** Andrew's 21 topics plus ours, de-duplicated: 35 live and 3 held (vCIO, Get-Well, AI Snapshot).
- Each question is marked reuse, rewrite or hold, following the content plan.
- New question: "Can I get a quote here?" Answer: "Not on this site. The team builds it with you; your summary names your first step."

**Chips by chapter:**

| Chapter | Chips |
|---|---|
| Lobby | guides, where-to-start, what-is-3hue, privacy |
| Win Trust | auditor, guarantee, platform, ai |
| Gain Control | private-equity, vciso, vendor, rmp |
| Stay Ready | exam-findings, incident, live-incident, remediation-owner |
| Tower | pricing, quote, prepare, after |
| Round table | quote, proof, different, privacy |

### 6. Rooms talk back: `js/surfaces.js`, built on `js/screens.js`
- **Import.** `tools/import-surfaces.mjs` writes `geometry.rooms.<door>.surfaces`: passes a and b, the mean quad, hidden corners, occluders, text insets and `measuredOn.sha256`.
- **Lint:**
  - visible corners agree within 2 px
  - each quad equals its mean
  - `quadToMatrix3d` returns a matrix
  - the sha256 matches the shipped render
- **Port from `mockup.js`:** `addQuad`, `fitSigns`, and the occluder redraw as one clipped room-image layer, scaled by `Wr/2560`.
- **Script.**
  - Lines carry `cue: {surface}` and `write: {surface: {kind, lines, at?}}`.
  - A surface's state is the fold of the node's writes up to the current line, filtered by `when`. So Previous, deep links, resizes and the three trigger versions work with no extra state.
- **Accessibility:**
  - Surfaces are `aria-hidden` and pointer-only, like the pins.
  - A screen-reader-only "The room shows …" list in the card mirrors the lit text.
  - Text below the size floor is hidden.
  - Hit areas are at least 44 px.
  - Reduced motion: no fade and no lift.
- **Framing.** `frameRoom(bbox)` in `stage.js` frames the cued surfaces; on phones it zooms past the `fitRoom` cap. This resolves D9.
- **Door view.** Surfaces replace pins only while the tour is on. Pins stay the default before the gate opens, so `rooms.spec` R-04 stays green. `?room-preview=` turns surfaces off.
- **`geometry-tool.html`:** a room picker, quad passes a and b, a polygon mode for occluders, and zoom.

### 7. Script v2
Written in `content/tour.json`; the copy sheet `docs/copy-sheets-tour.md` is generated by `tools/tour-text.mjs --sheet`. Start from script v1, change the guide to Avi and Huey, and add the Builder starts and programs to beat 3.

**Arrival** (at rest, pinned lines):
- Avi: "Welcome to the 3HUE lobby. I'm Avi, one of your two guides."
- Avi: "We won't tour our building. We'll tour your situation, and the door that fits it."
- Avi: "This is Huey."
- Huey: "Hi. Glad you're here."
- Avi: "Would you like Huey to lead?" Options: Yes, Huey leads / Stay with Avi.
- Then the hand-off pair of lines, then "Which door is yours?" with the three buyer labels plus "Show me everything".

**Rooms.** Every door runs three triggers plus early, each through the five beats.
- Beat 3 names the start, what it contains, and the program that keeps it running. All names are Builder tokens, and the surfaces show them.
- Beat 4 is proof, from approved refs: Transit, the bank, and the boilerplate.
- Beat 5 is one next step.

**Andrew's facts.**
- Reuse his program descriptions that appear on the public 3hue.net ISG, CIRP and OPS pages.
- Hold these: hours, the 15-minute figure, Whitedog, 60%, "under 6 months", 50%, the maturity scorecard, the threat statistics, and Client Vision.

**Tower.**
- It lights the start ring for the visitor's door and trigger.
- Then it asks "Is a program in place today?":
  - Nothing formal → the Initial Risk Assessment.
  - Due a fresh look → the Review & Update items.
  - Running → the start stands.
- Closing line: "No list price here; the team scopes it with you."

**Round table.**
- The other guide returns.
- The summary names the start, with no codes.
- Options: Talk (`contact.html`), the summary, another door, or Ask.

**Show me everything:** one beat per room, then the tower with all three rings, then the round table.

**Size:** about 210 files per voice and about 39k credits for a full two-voice render (Creator gives 100k a month). That is about 23 minutes of audio per voice, and 3.5–4 minutes for one visitor's path.

### 8. ElevenLabs voice, in `tools/voice/`
- **`elevenlabs.mjs`:**
  - Calls POST `/v1/text-to-speech/{voice_id}/with-timestamps?output_format=pcm_24000`.
  - Converts the character `alignment` into word events, then passes them through the existing `timingJson`, `placeWords` and `captionMapper` in `ssml.mjs`, unchanged.
  - Adds `pcmToWav` to `audio.mjs`.
  - Retries through `withRetries`. A quota error stops the run. `redact()` also covers `xi-api-key`.
- **`plain.mjs` `buildPlain`** substitutes aliases, with a span map back to the captions. Aliases: AiVRIC → av-RICK, 3HUE → three hue, SOC 2 → sock two, plus vCISO, POA&M, BOD, TTX, M365, Avi and Huey. Dictionary phoneme rules don't apply on v2 or v3.
- **Items per guide.**
  - A pinned line renders as `<who>/<id>`.
  - Unpinned lines, `ask.intro` and every FAQ answer render in both voices, under `avi/` and `huey/`.
  - The voice manifest moves to v2 with a `guides` map.
  - In `voice.js`, `locate()` tries `<who>/<id>--<door>` and then `<who>/<id>`, and Ask plays in the lead's voice.
- **Cache.** `speechHash` v2 covers provider, voice, model, settings, seed, format, lexicon and text. Takes are cached at `art/voice-cache/<hash>.wav`. ElevenLabs is not deterministic, so Nate should back this folder up.
- **Output.**
  - Loudness normalised to −18 LUFS, true peak −1.5.
  - MP3, 24 kHz mono, 48 kbps constant bitrate.
  - A budget per guide, about 6.6 MB each.
  - The lint warns if the two guides differ in loudness by more than 1 LU.
- **Commands.**
  - `--check` reports each voice's category and the subscription, and renders one line per guide.
  - `--ab eleven_v3,eleven_multilingual_v2` renders 5 lines on 2 models in 2 voices, and writes a report to `art/voice-ab/`.
  - The default model is v2 unless Nate prefers v3.

### 9. Tests
**Rewrite:**
- `tour-scenes` and `tour-routes`: pins become surfaces.
- `tour-dialogs`, `tour-voice`, `tour`, `tour-axe` and `tour-phone`: Ask moves to the header.
- `voice-tool` and the voice fixture: guide keys and manifest v2.
- `tour-manifest`: guides.
- `tour-motion`: the tint joins the still-frame key.
- `manifest`, `plates`, `kiosk` and `climb`: the families and the arc.
- `secrets`: the ElevenLabs key names and `xi-api-key`.

**New:**
- **`tour-guides`** (T-25).
- **`tour-console`** (T-26):
  - no clipping at 901, 1024, 1100 and 1200 px
  - full screen at 390×844, 320×640 and 844×390
  - the Learn more allowlist
  - no raw `{…}` rendered
  - same-origin requests only
- **`surfaces`** (S-01 to S-06):
  - projected corners within 2 px at 1280, 1440 and 2560, and through pans
  - a click reaches its station
  - hit areas at least 44 px
  - the occluder sits on top
- **`tour-surfaces`** (T-27): the folded state, the `at` word cue, and Previous, deep links and resize.
- **`surfaces-contrast`**.
- **`voice-eleven`:**
  - the alignment fixture
  - PCM to WAV
  - errors and redaction
  - pinned lines rendered once, unpinned lines twice
  - dry-run credits
- **`builder`:**
  - every name is on the list
  - the overlap rules
  - no drafts
  - no price-shaped strings

Also add rows to the register and `S` to the `fill-register` regex.

### 10. Gates and go-live (after sign-off)
1. Nate and the owner sign copy sheet v2, which covers the tour and the approved fields that changed.
2. Nate approves the voices from the listening report.
3. Render both guides. Set `required: true` in the same commit as `media/voice/`.
4. Open the gate and set the header label.
5. Re-bake the share cards and stamp versions.
6. Merge to `main` and run the live checks.

## Order and early deliverables
1. Steps 1 → 6 are engine work, and don't wait on copy.
2. Step 7's copy sheet goes out for sign-off as soon as it is drafted.
3. Step 8: the A/B test and Huey's test run now. The full render waits for sign-off.
4. Step 9 runs throughout.

**Sent to Nate early:**
- the A/B listening report for both voices
- updated mockups with Avi, Huey and the Builder names on the surfaces, at 1440 and 390
- copy sheet v2

## Verification
- `npm run lint`: the manifest, the Builder names, the tour graph and the voice lint.
- The full Playwright suite on chromium, webkit and chromium-reduced after every step.
- In the Browser pane with `?tour=1`:
  - both leads
  - all three doors across all triggers
  - Ask at 1024, 1440 and 390
  - reduced motion
  - screenshots to Nate
- Voice:
  - `--check`
  - the A/B report
  - the full-render lint: at least 90% word coverage, loudness, constant bitrate, hashes
- After go-live: the suite against `CHECK_BASE`, `bots.sh` and `lighthouse.sh`.

## Nate's actions
- **Key.** Optionally rename `ELEVNLABS_API_KEY` to `ELEVENLABS_API_KEY` in `~/.env`; the loader takes both. Set a credit cap on the key and turn off usage-based billing.
- **Pronunciation.** Confirm how Avi is said ("AH-vee" or "AY-vee") in the listening report. AiVRIC stays "av-RICK".
- **Permission.** Get Andrew's permission in writing, by email or a GitHub comment, with the credit wording.
- **Sign-off.** Sign copy sheet v2 with the owner, and forward the updated owner note.
- **Repo privacy.** `natebutler-sudo/3Hue-Market-Intel` is public and holds Builder prices and internal research; so does our fork, `NateButlerExplains/3Hue-Market-Intel`. Decide whether to make them private. The site itself carries names only.
- **One window at a time** edits the repo.

## Owner questions (these go into the updated owner note)
1. **Snapshot.** The 3hue.net header and `contact.html` lead with "Book the AI Snapshot", but the Builder has no Snapshot item. Add it, or keep it off the tour?
2. **Names.**
   - His site says "led by Ava" on 58 pages; ours says Avi.
   - AiVRIC is "av-RICK" to us and "Avaric" in his tour.
3. **vCISO.** Which item: Virtual CISO — Support, Virtual CISO — Fractional (both "[Confirm price]"), or CISO Support?
4. **Gaps.**
   - Security Compliance Services has no Builder item.
   - Gain Control has no package.
   - When do the ITG drafts come out of draft?
5. **Packages.** Confirm the contents of all 7 packages, and the overlaps between them.
6. **Claims.**
   - Is "around the clock" OK for MDR?
   - For each held fact, is there a source, or should it be dropped? The held facts are: hours, the 15-minute figure, Whitedog, 60%, "under 6 months", 50%.
7. **Stay Ready.**
   - Should its plate show Privacy (recommended) or MDR?
   - Its approved emphasis leaves out Assess. Add Assess, or keep it out?
8. **AiVRIC.** How should we describe its relationship to 3HUE, and is Client Vision available yet?
9. **Operations.**
   - May we name "Client Success"?
   - Who tells us when the Builder changes?
10. **Site findings.**
    - The `www` certificate has expired.
    - The homepage has a stale "Q2 2026" banner.
    - The transportation page serves energy content.
    - The pricing page contradicts "no list prices".
    - Chips misfire, and a raw `{name}` shows.
    - The Ask button is clipped at 1024 px.
    - The `/tts` endpoint carries risks.
    - The emails hard-code Ava.


---

# The complete tour script

Every node, every line, every choice, every surface write, the Ask block and the emailed summary. Drafted per chapter, adversarially verified against the catalog, criticised as a whole, then reconciled to one contract. **Not yet mechanically linted** — the assemble-and-run step is blocked while plan mode is active; the baseline it will be measured against is clean (`content/experience.json` 0 errors; `content/tour.json` 0 errors, 1 warning, 32 nodes, 239 lines).

Reading the tables: **who** = `avi` or `huey` when a line is pinned to one voice, `lead` when it is unpinned and spoken by whoever the visitor chose. **when** = the condition on the line. A line with no condition is always spoken.


## The contract

Eight chapters were written in parallel and disagreed with each other at nearly every seam. This settles each cross-chapter decision once; where a chapter disagrees, this wins.

# 3HUE TOUR SCRIPT — SHOWRUNNER'S CONTRACT
**Normative. Eight writers conform to this. Where a chapter sheet disagrees, this wins.**

Line numbers are `tools/check-manifest.js` unless marked otherwise.

---

## C1. The answer keys

**`segment` is retired. `situation` survives.** `arrive-question` routes `prove→wt`, `own→gc`, `run→sr`, `browse→lobby`, so `segment` is stored for roughly a quarter of visitors and can never carry a universal gate; `situation` is stored on the only path out of `arrive`. The lobby choice keeps its four options and its four `suggest` clauses but **remembers nothing** — it is a router, like `lobby-again`'s `another` (:795 permits the field to be absent; :796 only reserves `door`).

**`situation = early` is deleted, not rehomed.** `MAX_OPTIONS = 4` (:514) with the error at :804 forbids a fifth arrival button, and the lobby is reachable only by `browse`, so an `early` visitor would have to first claim they want the whole floor. "Nobody's asking yet" already has three real homes every visitor can reach: the fourth option of `wt-trigger`, `gc-trigger` and `sr-trigger`.

**Dead on deletion** (each is a hard :632–633 error today): `lobby-early`, `start-notyet`, `baseline-3`, `sum-early`'s `situation` gate, `sum-situation`'s `early` value, `review-any`'s `situation` clause, and every `segment` gate (`close-1-all`, `sum-all-start`, the old `baseline-3`).

**`sum-early` survives, re-gated.** `{answer:*}` prints `st.chosen[key]`, the option label (`js/tour.js:827`), so the gate becomes the OR-list `:626` allows:
`[{answers:{"trigger-win-trust":["early"]}},{answers:{"trigger-gain-control":["early"]}},{answers:{"trigger-stay-ready":["early"]}}]`.

**`sum-situation`'s stem changes** to `What you told us at the door: {answer:situation}` — the old stem broke on the fourth label ("What brought you in: I'd rather see all three").

### Final key list

| key | legal values | stored at | read by |
|---|---|---|---|
| `lead` | `avi`, `huey` | `arrive` · choice `lead` · option ids | `close-back-avi`, `close-back-huey` |
| `door` | `win-trust`, `gain-control`, `stay-ready` | reserved (:796); written by every door scene, `js/tour.js:449` | 12 tower `start-*` lines; `baseline-1`, `baseline-2`; `review-wt`, `review-gc`, `review-sr` |
| `situation` | `prove`, `own`, `run`, `browse` | `arrive-question` · choice `situation` · option ids | `wt-ack`, `gc-ack`, `sr-ack`; `lobby-yours-prove`, `lobby-yours-own`, `lobby-yours-run`, `lobby-browse`; the four `suggest` clauses on the lobby choice; `sum-situation` |
| `trigger-win-trust` | `deal`, `evidence`, `scope`, `early` | `wt` · choice `wt-trigger` | `wt-moment`/`-change`/`-receive`/`-next` branch lines; `start-wt-deal`, `start-wt-evidence`, `start-wt-scope`, `start-wt-early`; `baseline-1`, `baseline-2`, `review-wt`; `close-1`; `sum-wt-deal`, `sum-wt-evidence`, `sum-wt-scope`, `sum-early` |
| `trigger-gain-control` | `crossing`, `ai`, `vendors`, `early` | `gc` · choice `gc-trigger` | `gc-moment`/`-change`/`-receive`/`-next` branch lines; `start-gc-crossing`, `start-gc-ai`, `start-gc-vendors`, `start-gc-early`; `baseline-1`, `baseline-2`, `review-gc`; `close-1`; `sum-gc-crossing`, `sum-gc-ai`, `sum-gc-vendors`, `sum-early` |
| `trigger-stay-ready` | `exam`, `incident`, `detect`, `early` | `sr` · choice `sr-trigger` | `sr-moment`/`-change`/`-receive`/`-next` branch lines; `start-sr-exam`, `start-sr-incident`, `start-sr-detect`, `start-sr-early`; `baseline-2`, `review-sr`; `close-1`; `sum-sr-exam`, `sum-sr-incident`, `sum-sr-detect`, `sum-early` |
| `program` | `none`, `review`, `running` | `path` · choice `program` | `sum-program`; the `suggest` on close's `talk` option |
| `yours` | `win-trust`, `gain-control`, `stay-ready`, `none` | `all-sr` · choice `all-sr-start` · option ids (renamed from `start-all`) | `path-all-yours`, `path-all-none`; `close-1-all`, `close-1-none`; `sum-all-wt`, `sum-all-gc`, `sum-all-sr`, `sum-all-none` |

Every value above is an option id on a live choice, so `remember` (:557–564) carries it and no `when` trips :632–633.

**RULE:** The only answer keys are `lead`, `door`, `situation`, `trigger-win-trust`, `trigger-gain-control`, `trigger-stay-ready`, `program`, `yours`. Write `segment` nowhere. Write `situation = early` nowhere. Before you gate a line, find its key in the table above and use only the values listed there.

---

## C2. The trigger set per door — final

`serviceFamilies` and `packages` must move in the same commit, because `:441` tests every start's `lead`/`alt`/`with` against the door's own family examples, packages and program build/run lists, and `:442` tests `then` against packages ∪ program `run`.

**Two lint lines must be amended in that same commit or nothing here ships:** `:175` (`if ((d.serviceFamilies || []).length !== 4)`) becomes *at least three* — Win Trust and Gain Control each hold three families under this contract; and `:185–186` (the `O1` icp assertion) is deleted with `doors[].icp`.

### Win Trust — `deal`, `evidence`, `scope`, `early`

| trigger | starts key | tower line (on `path`) | summary line |
|---|---|---|---|
| `deal` | `deal` (unchanged) | `start-wt-deal` | `sum-wt-deal` |
| `evidence` | `evidence` (unchanged) | `start-wt-evidence` | `sum-wt-evidence` |
| `scope` | **rename `ai` → `scope`** | **`start-wt-scope`** (new; `start-wt-ai` retired) | **`sum-wt-scope`** (new; `sum-wt-ai` retired) |
| `early` | `early` (unchanged) | `start-wt-early` | `sum-early` (shared) |

`triggers[2]` becomes "A certification audit is booked with no written scope."
`starts.scope` = `{trigger:2, lead:"isms-scope-soa-development", alt:"iso-27001-readiness", with:["system-security-privacy-plan-sspp-development"], then:["managed-isp"], ring:["strengthen"]}`.
Checked: all three of lead/alt/with are in Win Trust's LISTED set (:441 ✓); `managed-isp` is in Win Trust's `runs` via `programs.isp.run` (:442 ✓); neither overlap set pairs SOC 2 with ISO (:447 ✓); neither set carries `initial-risk-assessment` as a member beside SOC 2 or ISO (the rule the comment at **:443** announces and **:448** enforces ✓); flattening `contains` yields no repeat (:451 ✓); `strengthen` is in `maturityEmphasis` (:460 ✓).
`serviceFamilies` = Risk Assessment & Risk Management · Information Security Program & Governance · ISMS, SSPP & Statement of Applicability. `packages` gains `pci-dss-readiness`. `programs` stays `["isp","rmp"]`.

### Gain Control — `crossing`, `ai`, `vendors`, `early`

| trigger | starts key | tower line | summary line |
|---|---|---|---|
| `crossing` | **`starts` replaced wholesale**; key `crossing` | **`start-gc-crossing`** | **`sum-gc-crossing`** |
| `ai` | key `ai` | **`start-gc-ai`** | **`sum-gc-ai`** |
| `vendors` | key `vendors` | **`start-gc-vendors`** (new) | **`sum-gc-vendors`** (new) |
| `early` | key `early`, lead changes to `data-mapping-data-inventory` | `start-gc-early` | `sum-early` (shared) |

Retired: `starts.acquisition`, `starts.reporting`, `starts.control`; lines `start-gc-acquisition`, `start-gc-reporting`, `start-gc-control`, `sum-gc-acquisition`, `sum-gc-reporting`, `sum-gc-control`, `sum-gc-privacy`.
`crossing` = `{trigger:0, lead:"privacy-leadership-launch", with:["data-mapping-data-inventory","regulator-liaison-dsar-escalation-support"], ring:["assess","operate"]}`
`ai` = `{trigger:1, lead:"ai-governance-advisory", with:["security-architecture-reviews","secure-sdlc-program-development","vulnerability-management-program-development"], then:["security-engineering"], ring:["strengthen"]}`
`vendors` = `{trigger:2, lead:"managed-vcp", with:["asset-governance-program-development","audit-support"], then:["vcp-additional-vendor-monitoring-5-vendor-block"], ring:["operate"]}`
`early` = `{trigger:null, lead:"data-mapping-data-inventory", ring:[]}` (:426, :461, :467 ✓).
Checked: `privacy-leadership-launch` reaches LISTED only once `doors.gain-control.packages = ["privacy-leadership-launch"]` and it leaves `doors.stay-ready.packages` (:441); `security-engineering` reaches `runs` only once `programs` = `["vcp","sea"]` (:442); `privacy-leadership-launch.contains` is `[privacy-maturity, cpo-service, managed-privacy]`, which does not intersect its own `with` (:451 ✓); `managed-vcp` precedes the 5-Vendor Block in the vendors set (`vcpOrder`, :322 ✓); no set touches SOC 2, ISO or the standalone Initial Risk Assessment (:448 ✓). `maturityEmphasis` becomes `["assess","strengthen","operate"]` so no ring warns at :460.
`serviceFamilies` = Privacy Management & Data Protection (Data Mapping & Data Inventory · Data Protection Impact Assessment (DPIA) · AI Governance & Privacy Advisory · Regulator Liaison & DSAR Escalation Support) · Vendor & Third-Party Risk Management (Managed Vendor Compliance Program (VCP) · Asset Governance Program Development · Audit Support & Liaison Services) · Security Engineering & Architecture (Security Architecture Reviews · Secure SDLC Program Development · Vulnerability Management Program Development).

### Stay Ready — `exam`, `incident`, `detect`, `early`

| trigger | starts key | tower line | summary line |
|---|---|---|---|
| `exam` | `exam` (unchanged) | `start-sr-exam` | `sum-sr-exam` |
| `incident` | `incident` (unchanged) | `start-sr-incident` | `sum-sr-incident` |
| `detect` | **rename `crossing` → `detect`** | **`start-sr-detect`** (new; `start-sr-crossing` retired) | **`sum-sr-detect`** (new; `sum-sr-crossing` retired) |
| `early` | `early` (unchanged) | `start-sr-early` | `sum-early` (shared) |

`triggers[2]` becomes "Security tooling is generating alerts that nobody is reading."
`starts.detect` = `{trigger:2, lead:"mxdr-complete", alt:"mxdr-starter", ring:["operate"]}`.
Checked: both are in Stay Ready's LISTED (:441 ✓); no `then` so :442 is vacuous; `mxdr-complete.contains` is `[mxdr-starter, mxdr-siem-add-on, managed-security-controls-validation-for-endpoints]` and the alt forms its own set, so nothing is bought twice (:451 ✓); the lead is not Incident Response Fast Start, so no `live` is required (:456 ✓); `operate` is in `maturityEmphasis` (:460 ✓). `serviceFamilies` drops Privacy Management & Data Protection for Managed Detection & Response (MDR / MXDR). `packages` loses `pci-dss-readiness` and `privacy-leadership-launch`.

**RULE:** The twelve triggers are wt/`deal`·`evidence`·`scope`·`early`, gc/`crossing`·`ai`·`vendors`·`early`, sr/`exam`·`incident`·`detect`·`early`. Every one has exactly one `starts` key, one `start-<door>-<trigger>` line on `path`, and one `sum-<door>-<trigger>` line — except the three `early` values, which share `sum-early`. Name no other trigger id anywhere.

---

## C3. Scene kinds — all 33 nodes

`:714` rejects a write on anything but `door` or `station`; `:715` rejects `@`; `:723` rejects a surface id that is not that door's. Gain Control's five interiors flip.

| node | scene | node | scene |
|---|---|---|---|
| `arrive` | `rest` | `gc` | `{kind:"door",door:"gain-control"}` |
| `handoff-avi` | `keep` | `gc-moment` | **`{kind:"door",door:"gain-control"}`** ← was `keep` |
| `handoff-huey` | `keep` | `gc-change` | **`{kind:"door",door:"gain-control"}`** ← was `keep` |
| `arrive-question` | `rest` | `gc-receive` | **`{kind:"door",door:"gain-control"}`** ← was `keep` |
| `lobby` | `rest` | `gc-proof` | **`{kind:"door",door:"gain-control"}`** ← was `keep` |
| `lobby-again` | `rest` | `gc-next` | **`{kind:"door",door:"gain-control"}`** ← was `keep` |
| `wt` | `{kind:"door",door:"win-trust"}` | `all-gc` | `{kind:"door",door:"gain-control"}` |
| `wt-moment` | `{kind:"door",door:"win-trust"}` | `sr` | `{kind:"door",door:"stay-ready"}` |
| `wt-change` | `{kind:"door",door:"win-trust"}` | `sr-moment` | `{kind:"door",door:"stay-ready"}` |
| `wt-receive` | `{kind:"door",door:"win-trust"}` | `sr-change` | `{kind:"door",door:"stay-ready"}` |
| `wt-proof` | `{kind:"door",door:"win-trust"}` | `sr-receive` | `{kind:"door",door:"stay-ready"}` |
| `wt-next` | `{kind:"door",door:"win-trust"}` | `sr-proof` | `{kind:"door",door:"stay-ready"}` |
| `all-wt` | `{kind:"door",door:"win-trust"}` | `sr-next` | `{kind:"door",door:"stay-ready"}` |
| `path` | `{kind:"path"}` (no stage) | `all-sr` | `{kind:"door",door:"stay-ready"}` |
| `start-baseline` | `{kind:"path",stage:"assess"}` | `start-review` | `{kind:"path",stage:"strengthen"}` |
| `start-running` | **`{kind:"path",stage:"operate"}`** ← was `keep` | `path-all` | `{kind:"path"}` (no stage) |
| `close` | `rest` | | |

`handoff-avi` and `handoff-huey` stay `keep` and carry no write, no cue and no callout — that is what makes `keep` legal there. `gc-model` and `gc-console` are `text: null`, so they take `glow` entries only (:731); `gc-console` is additionally `target: false` and is never the object of a `cue`.

**RULE:** Every node whose sheet contains a "Room shows" block is a `door` scene with a named door. Only `handoff-avi` and `handoff-huey` are `keep`, and they write nothing.

---

## C4. The everything route

**`all-sr-start` is kept and given a job.** It is the only marker that fires on the everything route and nowhere else: `situation = browse` survives a lobby door-pick, and `answers.door` is set to `stay-ready` by accident (`js/tour.js:449`). Cutting it would leave `close-1-all` and `sum-all-start` with no legal key once `segment` retires.

Choice on `all-sr`: id `all-sr-start`, `remember: "yours"`, four options (:804 cap respected), option ids `win-trust` · `gain-control` · `stay-ready` · `none`, labels `{door:<id>.title}` and "Not sure yet", all four `next: path-all`.

### Resulting line set, in order

**`all-sr`** — `all-sr-1` (always) · `all-sr-3` (always) · `all-sr-4` (always) · `all-sr-5` (always) → choice.

**`path-all`** — `path-all-1` · `path-all-2` · `path-all-arc` (all always) · `path-all-wt` · `path-all-gc` · `path-all-sr` (all always, each naming that door's own `early` lead: `soc-2-readiness`-or-`initial-risk-assessment`, `data-mapping-data-inventory`, `controls-gap-assessment`) · then exactly one of:
- `path-all-yours` — `when: {answers:{yours:["win-trust","gain-control","stay-ready"]}}` — "You named {answer:yours}. That door's first step is the one to take with you."
- `path-all-none` — `when: {answers:{yours:["none"]}}` — "You didn't name one, and you don't have to. Without a door, the first step is usually the {offer:initial-risk-assessment}."
· then `path-all-price` (see C7). `path-all-start` is retired.

**`close`** — `close-back-*` · then exactly one of `close-1-all` (`yours` = the three doors; "You've seen all three, and you named the one that's yours.") or `close-1-none` (`yours` = `none`; "You've seen all three. All three begin in the same place.") · `close-2` · `close-person` · `close-3-all`.

**`summary`** — `sum-intro` · `sum-what` · `sum-situation` · `sum-front` · `sum-wt` · `sum-gc` · `sum-sr` · then exactly one of `sum-all-wt` / `sum-all-gc` / `sum-all-sr` / `sum-all-none`, each gated on the matching `yours` value and each naming that door's own `early` lead · `sum-price` · `sum-talk`. `sum-all-start` is retired.

**Secondary, and binding:** on this route `all-wt-4` must clear `wt-panel-4` in the same write that lights `wt-panel-3` with `{offer:initial-risk-assessment}`. Leaving the four readiness packages lit beside a standalone Initial Risk Assessment puts on the glass the exact pairing the manifest forbids in a start (**:443** comment, **:448** error). The lint cannot see a write; the visitor can.

**RULE:** `all-sr` asks one question and stores `yours`. Every line downstream that speaks about "the door you picked" or "no door picked" is gated on `yours`, never on `segment`, `situation` or `door`.

---

## C5. Offer homes, final

### The two double-homes

**"Managed Information Security & Privacy Management" → Win Trust, as a program.** `programs.isp.category` is Information Security Program & Governance, a Win Trust family, and all three non-early Win Trust starts carry `then: ["managed-isp"]`, which `:442` satisfies through `programs.isp.run`. `managed-isp` is not in Stay Ready's LISTED set at all — the same panel-list logic at `:441` that governs starts is the homing test. **`sr-exam-managed` loses its second sentence** and names `{offer:managed-rmp}` only.

**"Audit Support & Liaison Services" → Gain Control, as `{offer:audit-support}`.** Category is Vendor & Third-Party Risk Management; `audit-support` is in Gain Control's LISTED set and in no other door's (:441). **Win Trust stops naming it in voice and on the glass**: `wt-deal-r2` and the `wt-panel-1` list drop "audit support". SOC 2 Readiness still carries it inside `contains`; a package may carry what the room may not name.

### The token-kind collisions

Seven Builder names exist as both a program name and an offer name. The prompt names four; the rule covers all seven, because `rmp` is one chip away from reintroducing the bug.

| Builder name | program | offer | room | kind that room uses |
|---|---|---|---|---|
| Managed Information Security & Privacy Management | `isp` | `managed-isp` | Win Trust | **`{program:isp}`** |
| Managed Cyber-Incident Response Program | `cirp` | `managed-cirp` | Stay Ready | **`{program:cirp}`** |
| Managed Vendor Compliance Program (VCP) | `vcp` | `managed-vcp` | Gain Control | **`{program:vcp}`** |
| Security Engineering Services | `sea` | `security-engineering` | Gain Control | **`{program:sea}`** |
| Managed Risk Management Program | `rmp` | `managed-rmp` | Stay Ready | **`{program:rmp}`** |
| Managed Detection & Response — Complete | `soc` | `managed-detection-response-complete` | Stay Ready | **`{program:soc}`** if ever named (today neither is; `{offer:mxdr-complete}` is "MXDR Complete Protection", a different name, and stays) |
| AiVRIC CloudSignals GRCOps & CSPM Onboarding | `grc` | `aivric-cloudsignals-grcops-cspm-onboarding` | none | **`{program:grc}`** if ever named |

Consequences that follow mechanically: `sr-inc-r4`'s spoken `{program:cirp}` and its `sr-rack` write must both read `{program:cirp}` — today the line speaks the program and prints the offer in the same beat. `sr-exam-managed` becomes `{offer:managed-rmp}` → **`{program:rmp}`**. `sum-managed` is cut: with `isp` on Win Trust it can no longer claim managed programs live behind one door. Ids inside `doors[].starts` (`lead`, `with`, `then`, `alt`) are exempt — `:30` puts them in `O15_IDS`, so they are never read by a visitor.

**RULE:** One Builder name, one room, one token kind. If a name exists as both a program and an offer, every mention of it — spoken line, surface `sign`, `list`, `card` — uses the `{program:<id>}` form, in the one room the table assigns it.

---

## C6. Where the arrival answer is heard

Each of `wt`, `gc` and `sr` gains one new **acknowledgement line at position 1**, gated on the matching `situation` value, above the room's existing unconditional opener. `checkCond` has no negation, so the room's default is not gated — the matched visitor simply hears one extra line, and no two lines contradict.

| node | new line id | `when` | text | who | source · status |
|---|---|---|---|---|---|
| `wt` | `wt-ack` | `{answers:{situation:["prove"]}}` | They want a report or a certificate. That's this room. | — | Tour script, routing line · proposed |
| `gc` | `gc-ack` | `{answers:{situation:["own"]}}` | They're asking about your data and your vendors. That's this room. | — | Tour script, routing line · proposed |
| `sr` | `sr-ack` | `{answers:{situation:["run"]}}` | They want to see it running, not just written down. That's this room. | — | Tour script, routing line · proposed |

`sr-ack` sits above `sr-2`, which is the ref to `doors.stay-ready.opening`. None of the three carries a `cue` or a `write`; the room's own opener owns the first frame.

**The line that licenses the shared front step moves out of the lobby.** `lobby-5` is retired. Its sentence — *"One step is shared. Any of the three can begin in the same place: the {offer:initial-risk-assessment}."* — becomes **`arrive-shared`** on `arrive-question`, unconditional, placed between `arrive-q2` and `arrive-q3`, source `3HUE service catalog, September 2026` · `proposed`. `arrive-question` is on the only path out of `arrive`, so every visitor hears it before the sort, which is what makes it honest for `ai` to sit in Gain Control and `crossing` to have left Stay Ready. `lobby-yours-prove` / `-own` / `-run` and `lobby-browse` stay, with their door cues, as the map-jump visitor's only acknowledgement.

**RULE:** `wt`, `gc` and `sr` each open with one `situation`-gated acknowledgement line before their unconditional opener. The shared-first-step sentence is spoken once, at `arrive-question`, by `arrive-shared`, and nowhere else in the lobby.

---

## C7. The price sentence

The wording, unchanged and unsplit:

> There's no list price here. Pricing follows scope and commitment, and the team scopes it with you.

**Spoken home: the tower, once per visitor.** `path` is reached twice by a two-door walker (`close` → `lobby-again` → door → `-next` → `path`), so a bare `always` says it twice. Both tower price lines take the gate `notVisited: ["close"]`, which `:636` accepts because `close` is a chapter id:

| line | node | `when` |
|---|---|---|
| `path-price` | `path` | `{notVisited:["close"]}` |
| `path-all-price` | `path-all` | `{notVisited:["close"]}` |

First tower visit fires; every later tower visit is silent, on either route. `sum-price` keeps the sentence verbatim in the email — it is read, not spoken, and a forwarded reader never heard the tower. No door node speaks it.

**The `pricing` chip stops echoing it.** `ask-price-1` is retired and replaced by **`ask-price-3`**, so a visitor standing at `path` who taps `pricing` gets new information:

> `ask-price-3` — Scope and commitment set it: what has to be proved, by when, and whether 3HUE runs it afterwards.
> source: The Message Stack §06, objection handling; 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted

`ask-price-2` is unchanged and stays as the answer's second line.

**RULE:** The R5 sentence appears three times in the whole script and nowhere else: `path-price`, `path-all-price` (both gated `notVisited: ["close"]`) and `sum-price`. No Ask answer, no door line and no summary line may repeat those words.

---

## C8. The chip table

`:889` caps a node at four (`MAX_SUGGEST`, :512); `:890` rejects a repeat; `:891` rejects an id that is not an approved question. Nothing in the lint stops a `goto` from teleporting — `:925` only requires it be a node id — so the two routing rules below are contract, not lint, and writers must hold them by hand.

Routing rules: **`where-to-start` (`goto: path`) appears only on `wt-next`, `gc-next`, `sr-next` and `path-all`** — never on `arrive`, `handoff-*`, `arrive-question`, `lobby` or `lobby-again`. **A chip whose `goto` is a door (`vendor`, `ai` → `gc`; `rmp`, `incident`, `mdr`, `exam-findings` → `sr`) appears only inside that door's own room.** **`private-equity` is a chip on no node** — it is the retired "Portfolio owners" label reconstituted, and Gain Control's shelf is privacy, vendor risk and engineering; the question stays typeable.

| node | chips |
|---|---|
| `arrive` | different · proof · privacy · early |
| `handoff-avi` | guides · different · proof · privacy |
| `handoff-huey` | guides · different · proof · privacy |
| `arrive-question` | what-is-3hue · early · timeline · privacy |
| `lobby` | frameworks · packages · different · early |
| `lobby-again` | packages · after · different · proof |
| `wt` | frameworks · packages · auditor · guarantee |
| `wt-moment` | frameworks · auditor · guarantee · timeline |
| `wt-change` | frameworks · hire · platform · different |
| `wt-receive` | packages · auditor · timeline · pricing |
| `wt-proof` | proof · theater · guarantee · big-firm |
| `wt-next` | quote · where-to-start · pricing · after |
| `all-wt` | frameworks · packages · auditor · guarantee |
| `gc` | vendor · ai · msp · packages |
| `gc-moment` | vendor · ai · early · msp |
| `gc-change` | vendor · ai · different · timeline |
| `gc-receive` | packages · vendor · ai · pricing |
| `gc-proof` | proof · different · big-firm · theater |
| `gc-next` | quote · where-to-start · pricing · vendor |
| `all-gc` | vendor · ai · packages · msp |
| `sr` | exam-findings · incident · mdr · live-incident |
| `sr-moment` | incident · live-incident · mdr · exam-findings |
| `sr-change` | remediation-owner · mdr · incident · early |
| `sr-receive` | packages · mdr · live-incident · pricing |
| `sr-proof` | proof · exam-findings · remediation-owner · different |
| `sr-next` | quote · where-to-start · live-incident · pricing |
| `all-sr` | incident · mdr · exam-findings · packages |
| `path` | pricing · quote · prepare · after |
| `start-baseline` | prepare · after · timeline · pricing |
| `start-review` | after · prepare · remediation-owner · pricing |
| `start-running` | after · msp · platform · aivric |
| `path-all` | where-to-start · prepare · after · pricing |
| `close` | quote · hire · proof · privacy |

Six of the 35 questions carry no chip and are reachable by typing or microphone only: `risk-priority`, `rmp`, `vciso`, `have-ciso`, `grc-system`, `private-equity`. That is deliberate and is not a defect to be "fixed" by a writer adding a fifth chip.

**RULE:** This table is the whole of `nodes.<id>.ask`. Do not add, drop or reorder a chip in a chapter sheet; if a node needs a different chip, it needs a change to this table first.

---

## C9. Housekeeping

### Chapter titles

| # | id | title | eyebrow / landmark |
|---|---|---|---|
| 0 | `arrival` | **Your guides, and one question** | landmark `lobby`, entry `arrive` |
| 1 | `lobby` | `{str:legend}` | landmark `lobby`, entry `lobby` |
| 2 | `door-win-trust` | `{door:win-trust.title}` | landmark `door:win-trust`, entry `wt` |
| 3 | `door-gain-control` | `{door:gain-control.title}` | landmark `door:gain-control`, entry `gc` |
| 4 | `door-stay-ready` | `{door:stay-ready.title}` | landmark `door:stay-ready`, entry `sr` |
| 5 | `path` | `{ref:path.title}` | landmark `tower`, entry `path` |
| 6 | `close` | **What you'd do next** | landmark `lobby`, entry `close` |

"The round table" leaves the file with R1. `:841` accepts all five landmarks as written; `:839` runs `checkText` over both new titles and neither carries a figure, a brand slip or a typed Builder name.

### The `who` column

`:762` accepts `avi` or `huey` and nothing else. **`lead` is not a value; it is a hard error, ~150 times over if the sheets are read literally.** The column prints `avi`, `huey`, or `—`. `—` means the `who` field is **absent from the JSON**, and the line is spoken by whoever the visitor put in the lead (`withGuides`, :552, then resolves `{guide}` in that line for the actual lead).

Exactly ten lines carry a real `who`. Every other line in the script is `—`:

| `avi` | `huey` |
|---|---|
| `arrive-1`, `arrive-2`, `arrive-3`, `arrive-5`, `handoff-avi-2`, `handoff-huey-1`, `close-back-avi` | `arrive-4`, `handoff-avi-1`, `handoff-huey-2`, `close-back-huey` |

### The Message Stack §09 boilerplate

One wording. One status: **`approved-copy`**. Verbatim, never split, never paraphrased:

> 3HUE builds and operates security, compliance and AI governance programs for organizations that have to prove their controls work — and have no one inside to run them.

Three homes, all carrying that exact string at that exact status: **`arrive-2`** (spoken, whole), **`sum-what`** (email), **`ask-what-1`** (Ask). `arrive-2b` is cut and `ask-what-2` is cut. `ask-what-3` survives unchanged as the second line of the `what-is-3hue` answer. At 27 filled words `arrive-2` is under `MAX_WORDS = 35` (:514), so :775 does not even warn — the split was style, not lint, and it cost the script its only `approved-copy` text line.

**RULE:** Print `avi`, `huey` or `—` in the `who` column, never `lead`. `chapters[6].title` is "What you'd do next". The §09 boilerplate is one string at `approved-copy`, whole, at `arrive-2`, `sum-what` and `ask-what-1`; write no fourth version of it anywhere.


---

## Arrival

### `arrive` — Hello, and who leads
*scene:* rest

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `arrive-1` | avi | always | Welcome to the 3HUE lobby. I'm {guide:avi}. You'll leave with one clear first step, whichever door you take. |
| 2 | `arrive-2` | avi | always | 3HUE builds and operates security, compliance and AI governance programs for organizations that have to prove their controls work — and have no one inside to run them. |
| 3 | `arrive-3` | avi | always | This is {guide:huey}. |
| 4 | `arrive-4` | huey | always | Hi. We only say what 3HUE can back up, and you can ask either of us where it came from. |
| 5 | `arrive-5` | avi | always | One of us leads and the other stays close. Pick whichever voice you'd rather hear. |

**Room shows** — nothing. `surfaces.json` holds rooms for the three doors only, so the lobby has no measured surface: no `write` on this node, no `write` on any line, and no `cue` on any line. The rest camera holds all three doors in frame.
**Choice** — "Who leads?" (id `lead`, remembers `lead`): "{guide:avi} leads" → `handoff-avi` · "{guide:huey} leads" → `handoff-huey`
Option ids, which are the stored values: `avi`, `huey`.
**Ask chips** — different · proof · privacy · early
**Sources** — `arrive-1`: Tour script, arrival (after 3HUE's own tour at 3hue.net/experience) · proposed · `arrive-2`: The Message Stack §09, boilerplate · approved-copy · `arrive-3`: Tour script, linking line · proposed · `arrive-4`: Tour script, linking line · proposed · `arrive-5`: Tour script, linking line · proposed

### `handoff-avi` — Avi takes over
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `handoff-avi-1` | huey | always | {guide:avi} has you from here. I'll be back when you reach the end. |
| 2 | `handoff-avi-2` | avi | always | Thanks, {guide:huey}. One question, and I'll know where to take you. |

**Room shows** — nothing. A `keep` scene holds the lobby as `arrive` left it; this node carries no `write`, no `cue` and no `callout` on the node or on either line, which is what makes `keep` legal here.
**Choice** — none. `next: arrive-question`
**Ask chips** — guides · different · proof · privacy
**Sources** — `handoff-avi-1`: Tour script, linking line · proposed · `handoff-avi-2`: Tour script, linking line · proposed

### `handoff-huey` — Huey takes over
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `handoff-huey-1` | avi | always | {guide:huey} has you from here. I'll be back when you reach the end. |
| 2 | `handoff-huey-2` | huey | always | Thanks, {guide:avi}. One question, and I'll know where to take you. |

**Room shows** — nothing, and for the same reason: `keep`, with no `write`, no `cue` and no `callout` anywhere on the node.
**Choice** — none. `next: arrive-question`
**Ask chips** — guides · different · proof · privacy
**Sources** — `handoff-huey-1`: Tour script, linking line · proposed · `handoff-huey-2`: Tour script, linking line · proposed

### `arrive-question` — The one question
*scene:* rest

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `arrive-q1` | — | always | Almost everyone here has the same thing happening. Someone with leverage has asked them to prove something, with a date on it. |
| 2 | `arrive-q2` | — | always | What changes is what that person wants to see. That's the difference between {door:win-trust.title}, {door:gain-control.title} and {door:stay-ready.title}. |
| 3 | `arrive-shared` | — | always | One step is shared. Any of the three can begin in the same place: the {offer:initial-risk-assessment}. |
| 4 | `arrive-q3` | — | always | Answer for the week you're actually having. Nothing locks, and you can walk another door later. |

**Room shows** — nothing, and no `cue` on any line. A `{door:…}` cue points at exactly one door while `arrive-q2` names three and `arrive-shared` speaks for all three; the rest camera already holds them. No `write`: the lobby has no measured surface.
**Choice** — "What are they asking you for?" (id `situation`, remembers `situation`): "They want a report or a certificate" *(sub: {door:win-trust.title} · {door:win-trust.promise})* → `wt` · "They're asking about our data and our vendors" *(sub: {door:gain-control.title} · {door:gain-control.promise})* → `gc` · "They want to see it running, not just written down" *(sub: {door:stay-ready.title} · {door:stay-ready.promise})* → `sr` · "I'd rather see all three" *(sub: All three rooms, then where to start)* → `lobby`
Option ids, which are the stored values: `prove`, `own`, `run`, `browse`.
**Ask chips** — what-is-3hue · early · timeline · privacy
**Sources** — `arrive-q1`: The Forcing Function, cover · adapted · `arrive-q2`: Lobby manifest: door titles · derived · `arrive-shared`: 3HUE service catalog, September 2026 · proposed · `arrive-q3`: Tour script, linking line · proposed

**Manifest changes this chapter requires**

- `content/tour.json` → `chapters[0].title`: `"Your guides"` → `"Your guides, and one question"`. `chapters[0].entry` stays `arrive`, `chapters[0].landmark` stays `lobby`, and no `eyebrow` is added.
- `content/tour.json` → `nodes.handoff-avi.next` and `nodes.handoff-huey.next`: `"lobby"` → `"arrive-question"`. `arrive-question` is a new node in chapter `arrival`, scene `rest`, and its fourth option is the only remaining edge into `lobby`.
- `content/tour.json` → `nodes.arrive.choice`: prompt `"Who leads?"`, options reordered and relabelled so option `avi` (label `"{guide:avi} leads"`) comes first and option `huey` (label `"{guide:huey} leads"`) second. Both option ids remain guide ids, which is what `tools/check-manifest.js:799–801` requires of a `remember: "lead"` choice.
- `content/tour.json` → `nodes.arrive.lines`: `arrive-2` becomes the whole Message Stack §09 sentence at `status: "approved-copy"`; the draft's `arrive-2b` is not created. At 27 filled words `arrive-2` is under `MAX_WORDS = 35` (`tools/check-manifest.js:514`), so `:775` does not warn and no lint amendment is needed for it.
- `content/tour.json` → `nodes.arrive.ask`, `nodes.handoff-avi.ask`, `nodes.handoff-huey.ask`, `nodes.arrive-question.ask` are set to the four ids listed above. All eight distinct ids (`different`, `proof`, `privacy`, `early`, `guides`, `what-is-3hue`, `timeline`) already exist in `tour.json.ask.questions`, so `:891` passes with no new question.
- `content/experience.json` → **no change is required by this chapter.** `guide.guides.avi.name` and `guide.guides.huey.name` resolve `{guide:…}`; `doors.<id>.title` and `doors.<id>.promise` resolve the option subs (longest filled sub is 43 characters, under `MAX_SUB = 60`); `offers.initial-risk-assessment.name` resolves `arrive-shared`; and `sources[id=catalog]` already covers the source string on `arrive-shared`.
- `tools/check-manifest.js` → **no rule change is required by this chapter.** One dependency runs the other way: C2 deletes `doors[].icp` and the `O1` icp assertion at `:185–186`, and the only sort that used those labels was the old lobby choice. `arrive-question` is its replacement, so the icp deletion is safe only if this chapter ships in the same commit.
- Voice: eight ids in this chapter carry new or changed text — `arrive-1`, `arrive-2`, `arrive-4`, `arrive-5`, `handoff-avi-1`, `handoff-avi-2`, `handoff-huey-1`, `handoff-huey-2` — plus four new ids on `arrive-question` (`arrive-q1`, `arrive-q2`, `arrive-shared`, `arrive-q3`). Only `arrive-3` is untouched. Each needs a fresh hash; nothing is orphaned today because `media/voice/` does not exist.

**Still open for the owner**

- Whether the camera should sweep all three doors on `arrive-q2`. That needs a new cue kind in the geometry layer, not a copy change; today the line names three doors and the camera stays at rest.
- Whether `arrive-2` should be rendered as two breaths at the em dash. The copy is one unsplit `approved-copy` string and stays that way; the pause is a delivery note for the voice render, not a second line id.
- Whether "The Forcing Function, cover" alone substantiates `arrive-q1`. The old citation named §02 by its segment framing, which a visitor can read; the cover claim is the part the line actually uses, and the owner should confirm the cover carries it.


---

## Lobby

### `lobby` — Three doors named, and the visitor's own door lit

*scene:* rest

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `lobby-1` | — | always | Three doors from here. Each one is a kind of work, not a kind of company. |
| 2 | `lobby-2` | — | always | {door:win-trust.title} is the proving work: the evidence exists in pieces, and a buyer wants it assembled. |
| 3 | `lobby-3` | — | always | {door:gain-control.title} is the owning work: one operating picture, instead of decisions made company by company. |
| 4 | `lobby-4` | — | always | {door:stay-ready.title} is the running work: ownership and evidence that hold on an ordinary day, not just at the audit. |
| 5 | `lobby-yours-prove` | — | `{answers:{situation:["prove"]}}` | From what you told me, I'd open {door:win-trust.title} first. |
| 6 | `lobby-yours-own` | — | `{answers:{situation:["own"]}}` | From what you told me, I'd open {door:gain-control.title} first. |
| 7 | `lobby-yours-run` | — | `{answers:{situation:["run"]}}` | From what you told me, I'd open {door:stay-ready.title} first. |
| 8 | `lobby-browse` | — | `{answers:{situation:["browse"]}}` | You asked for the whole floor. One stop in each room, then where you'd start. |
| 9 | `lobby-6` | — | always | Take them in any order. You can come back for the ones you skip. |

Lines 5–8 are mutually exclusive and exhaust the four legal `situation` values. `arrive-question` routes `prove→wt`, `own→gc`, `run→sr`, `browse→lobby`, so on the walked route only `lobby-browse` ever fires here; lines 5–7 are the Tour-map jumper's acknowledgement, exactly as C6 assigns them. A visitor who jumps to chapter `lobby` before answering `arrive-question` has no `situation` at all and hears lines 1–4 and 9, every one of which is true with no pointer.

`lobby-5` is gone. Its sentence is now `arrive-shared` on `arrive-question`, where every visitor hears it before the sort (C6). Nothing in this node names an offer or a program, so the token-kind table (C5) has no claim here, and the R5 price sentence appears nowhere in this chapter (C7).

**Room shows** — nothing is written. `content/surfaces.json` measures `win-trust`, `gain-control` and `stay-ready` only, and `checkWrite` (`tools/check-manifest.js:714`) rejects a write on any scene but `door` or `station`, so a rest node in the lobby has no writable surface. The only visual is the door cue: `cue {door: win-trust}` on `lobby-yours-prove` · `cue {door: gain-control}` on `lobby-yours-own` · `cue {door: stay-ready}` on `lobby-yours-run`. `:723` permits a door cue only from a `rest` or `keep` scene, which this is. No cue on `lobby-1`–`lobby-4`, on `lobby-browse` or on `lobby-6`: `st.view.cueDoor` is set and never cleared (`js/tour.js:470`, and `checkCue` has no clearing kind), so a sweep across the three naming lines would leave {door:stay-ready.title} marked `aria-current` under `lobby-browse` and under the unset visitor's silence, contradicting the words on screen. Three doors named in voice, exactly one lit, and only when there is a real answer to light it with. No `callout` tiles: no line here carries a figure.

**Choice** — "Which one do we open first?" (id `door-first`, remembers nothing): "{door:win-trust.title}" / sub "Prove it to whoever is asking" → `wt`, suggest `{answers:{situation:["prove"]}}` · "{door:gain-control.title}" / sub "Own it across everything you carry" → `gc`, suggest `{answers:{situation:["own"]}}` · "{door:stay-ready.title}" / sub "Run it, and keep it running" → `sr`, suggest `{answers:{situation:["run"]}}` · "Show me everything" / sub "One stop in each room, then where to start" → `all-wt`, suggest `{answers:{situation:["browse"]}}`

The `remember` field is absent from the JSON. `:795` makes it optional and `:796` reserves only `door`, so this is a router with no stored answer, exactly like `lobby-again`'s `another`. Four options (cap 4, `:804`); longest filled label 18 characters (cap 90); longest filled sub 42 (cap 60). Only the first matching `suggest` is tagged (`js/tour.js:425`), and the four clauses are mutually exclusive, so at most one Suggested tag ever appears. `wt`, `gc`, `sr` and `all-wt` are all outside chapter `lobby`, so none is dropped by `js/tour.js:419-420`.

**Ask chips** — frameworks · packages · different · early

`where-to-start` is off this node: it carries `goto: "path"` and would teleport a visitor to the tower before any room (C8 routing rule). `early` is here because "nobody's asking yet" is a live question for a browsing visitor even though it is no longer a stored answer; its three real homes are the fourth option of `wt-trigger`, `gc-trigger` and `sr-trigger`.

**Sources** — `lobby-1`: Tour script, linking line · proposed
`lobby-2`: Lobby manifest: doors[].tension and doors[].gap · adapted
`lobby-3`: Lobby manifest: doors[].tension and doors[].gap · adapted
`lobby-4`: Lobby manifest: doors[].tension and doors[].gap · adapted
`lobby-yours-prove`: Tour script, routing line · proposed
`lobby-yours-own`: Tour script, routing line · proposed
`lobby-yours-run`: Tour script, routing line · proposed
`lobby-browse`: Tour script, routing line · proposed
`lobby-6`: Tour script, linking line · proposed

---

### `lobby-again` — The return: what is still closed, and the tower

*scene:* rest — `quiet: true`, so the return does not replay the chapter title card

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `again-1` | — | always | Back in the lobby. The tour keeps what you've seen, so nothing needs repeating. |
| 2 | `again-none` | — | `{notVisited:["door-win-trust","door-gain-control","door-stay-ready"]}` | You haven't opened a door yet. Any of the three can be first. |
| 3 | `again-some` | — | three OR clauses, below | Opening another door isn't a correction. It's another kind of work. |
| 4 | `again-all-tower` | — | `{visited:["door-win-trust","door-gain-control","door-stay-ready"], notVisited:["path"]}` | All three walked. What's left is the tower: your first step, and what follows. |
| 5 | `again-all-seen` | — | `{visited:["door-win-trust","door-gain-control","door-stay-ready","path"]}` | All three walked, and you've seen where you'd start. The tower's still there if you want another look. |

Exact `when` for `again-some`, the whole "at least one door open, at least one still closed" set and nothing else: `[{visited:["door-win-trust"], notVisited:["door-gain-control"]}, {visited:["door-gain-control"], notVisited:["door-stay-ready"]}, {visited:["door-stay-ready"], notVisited:["door-win-trust"]}]`. Against all eight combinations: `{}` matches no clause (covered by `again-none`); `{wt,gc,sr}` matches no clause (covered by lines 4–5); each of the other six matches exactly one. Every visitor hears exactly two lines. `visited` is an AND across the list and an array of conditions is an OR (`js/tourtext.js:154-163`), and all five ids named are chapter ids, which is what `:636` requires.

**Room shows** — nothing is written, for the same reason as `lobby`: a rest scene has no writable surface and the lobby has none measured. No door cue fires on this node. On the return the plate sits with no doorway current — marking one would re-open a recommendation the visitor has already acted on, and `cueDoor` would then stick for the rest of the walk. No `callout` tiles.

**Choice** — "Where to now?" (id `another`, remembers nothing): "{door:win-trust.title}" / sub "The proving work" → `wt`, hideWhen `{visited:["door-win-trust"]}` · "{door:gain-control.title}" / sub "The owning work" → `gc`, hideWhen `{visited:["door-gain-control"]}` · "{door:stay-ready.title}" / sub "The running work" → `sr`, hideWhen `{visited:["door-stay-ready"]}` · "Show me where I'd start" / sub "The tower: your first step, and what follows" → `path`, hideWhen `{notVisited:["door-win-trust","door-gain-control","door-stay-ready"]}`, suggest `{visited:["door-win-trust","door-gain-control","door-stay-ready"], notVisited:["path"]}`

The fourth option's `hideWhen` is a single AND clause, so it hides only when all three doors are still closed. That holds C8's routing rule by hand — the tower is never one tap away for a visitor who has walked no room, including the one who reached `close` by a Tour-map jump — and it still stops the choice emptying out, because the option appears exactly when at least one door button has been hidden. Zero doors walked: three door buttons. One or two walked: the remainder plus the tower. All three walked: the tower alone. `path` is the entry of chapter `path`, not of chapter `lobby`, so `js/tour.js:419-420` does not drop it; a visitor who has already walked the tower still sees it, tagged Visited, which is what `again-all-seen` describes. Longest filled label 23 characters; longest filled sub 44.

**Ask chips** — packages · after · different · proof

**Sources** — `again-1`: Tour script, linking line · proposed
`again-none`: Tour script, linking line · proposed
`again-some`: Tour script, linking line · proposed
`again-all-tower`: Tour script, linking line · proposed
`again-all-seen`: Tour script, linking line · proposed

---

**Manifest changes this chapter requires**

- `content/tour.json` → `nodes.lobby.choice`: delete `remember: "segment"`; rename `id` from `segment` to `door-first`; add `suggest` to all four options as listed. This removes the last `remember: "segment"` in the file, so `answers.segment` becomes a hard `tools/check-manifest.js:632` error anywhere it survives (`close-1-all`, `sum-all-start`, the old `baseline-3` — all retired under C1/C4).
- `content/tour.json` → `nodes.lobby.lines`: delete `lobby-5` (its sentence moves to `arrive-shared` on `arrive-question`) and delete `lobby-early` outright; add `lobby-yours-prove`, `lobby-yours-own`, `lobby-yours-run`, `lobby-browse`, `lobby-6`; move the three `cue.door` entries off `lobby-2`/`-3`/`-4` onto the three `lobby-yours-*` lines.
- `content/tour.json` → `nodes.lobby.ask` becomes `["frameworks","packages","different","early"]`; `nodes.lobby-again.ask` becomes `["packages","after","different","proof"]`. `where-to-start` leaves both.
- `content/tour.json` → `nodes.lobby-again.choice.options`: add `hideWhen` to the three door options and add the fourth option `{id:"path", next:"path", hideWhen:…, suggest:…}`; `nodes.lobby-again.lines` gains `again-none`, `again-some`, `again-all-tower`, `again-all-seen`.
- `content/experience.json` → `doors[].icp` can now retire: this chapter and `lobby-again` were the last places the buyer labels were printed, and nine `{door:*.icp}` tokens leave with them. It must retire in the same commit as three lint sites, or the tool crashes or fails: `tools/check-manifest.js:185-186` (the `O1` buyer-label assertion, deleted per C2); the `names` table at `:601`, whose `...doors.map((d) => [d.icp, 'buyer label', 'i'])` entry must be dropped — `escRe(undefined)` throws, so leaving it is a crash, not a warning; and `content/experience.json` → `strings.for` (`"for {icp}"`), whose only substitution disappears.
- `tests/tour-manifest.spec.mjs:316` and `:338` locate the sort by `n.choice?.remember === 'segment'`. Both must re-anchor on `remember === 'situation'` (now `arrive-question`), and T-03's three `d.icp` assertions at `:319-321` go with the field. `:341` must expect each hand-over's `next` to be `arrive-question`, not the lobby.
- No change to `content/surfaces.json`, to `chapters[1]` (`{str:legend}`, entry `lobby`, landmark `lobby` all stand), or to `js/tour.js` for this chapter.
- Voice: `lobby-1`, `lobby-2`, `lobby-3`, `lobby-4` and `again-1` keep their ids with new text and need fresh hashes; `lobby-5` and `lobby-early` are orphaned ids. `media/voice/manifest.json` does not exist, so nothing is rendered and there is no re-render cost yet.

**Still open for the owner**

- Whether `doors[].tension` and `doors[].gap` get a `source` and `status` of their own. `lobby-2/3/4` paraphrase them and are therefore `adapted`; with those two fields sourced, the three lines could be `derived` and the citation would point at something a visitor can check. This is also what clears the last of the visible "the three segments" citations the seam report flagged — the source string is already off these three lines, but the underlying fields are still unsourced.
- Whether the Tour map should keep offering chapter `lobby` as a jump target now that `arrive-question` routes three of four visitors straight past it. `lobby-yours-prove`, `-own` and `-run` exist only for that jump; if the map gated chapter entries on the arrival answer, all three would be dead copy and could be cut.
- Whether the return visitor who has walked all three doors and the tower should be offered anything beyond another look at the tower. `again-all-seen` and the single surviving option are honest about the state, but four options is the hard cap and the three door buttons are hidden by then.


---

## Win Trust

### `wt` — the shelf, and the question the room asks
*scene:* door:win-trust

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `wt-ack` | — | `situation = prove` | They want a report or a certificate. That's this room. |
| 2 | `wt-1` | — | always | This room holds three things: where you stand, how you run security, and what your scope covers. |
| 3 | `wt-2` | — | always | *(ref `doors.win-trust.opening`)* Your buyer isn't asking whether you're secure. They're asking whether you can prove it by Friday. |
| 4 | `wt-standards` | — | always | If your buyer named a standard, the readiness package for it is on the shelf. |
| 5 | `wt-3` | — | always | Tell me what's on your desk, and the room will show you the first step. |

**Node base state** — the room enters dark: `wt-panel-1` through `wt-panel-6`, `wt-monitor`, `wt-binders` and `wt-niche` all clear. `wt-ack` carries no cue and no write; the room's own opener owns the first frame.
**Room shows** — `wt-panel-1` sign: Where you stand *(at "stand", `wt-1`, cue)* · `wt-panel-2` sign: How you run *(at "run", `wt-1`)* · `wt-panel-3` sign: What your scope covers *(at "scope", `wt-1`)* · `wt-binders` glow *(`wt-1`)* · `wt-niche` sign: {ref:doors.win-trust.promise} *(`wt-2`, cue)* · `wt-panel-4` list: {offer:soc-2-readiness} / {offer:iso-27001-readiness} / {offer:iso-27701-readiness} / {offer:pci-dss-readiness} *(`wt-standards`, cue)*. `wt-panel-5`, `wt-panel-6` and `wt-monitor` stay dark.
**Choice** — "What's on your desk right now?" (id `wt-trigger`, remembers `trigger-win-trust`): "{door:win-trust.triggers.0}" → `wt-moment` *(option id `deal`)* · "{door:win-trust.triggers.1}" → `wt-moment` *(option id `evidence`)* · "{door:win-trust.triggers.2}" → `wt-moment` *(option id `scope`)* · "Nobody's asking yet" / sub "No deal, renewal or insurer on the clock" → `wt-moment` *(option id `early`)*
**Ask chips** — frameworks · packages · auditor · guarantee
**Sources** — `wt-ack`: Tour script, routing line · proposed · `wt-1`: 3HUE service catalog, September 2026 · derived · `wt-2`: ref, prints The Forcing Function §06, approved opening line · approved-copy · `wt-standards`: 3HUE service catalog, September 2026 · proposed · `wt-3`: Tour script, linking line · proposed

---

### `wt-moment` — what the ask actually looks like
*scene:* door:win-trust

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `wt-deal-m1` | — | `trigger-win-trust = deal` | Then a deal is waiting on a report you don't have, and procurement has put a date on it. |
| 2 | `wt-ev-m1` | — | `trigger-win-trust = evidence` | Then someone with leverage wants evidence, in their format, on their timetable. |
| 3 | `wt-scope-m1` | — | `trigger-win-trust = scope` | Then the audit has a date, and nobody has written down what it covers. |
| 4 | `wt-scope-m2` | — | `trigger-win-trust = scope` | Scope decides how much you have to prove, and how long the audit takes. |
| 5 | `wt-m-stat` | — | `trigger-win-trust = deal · evidence · scope` | *(ref `doors.win-trust.stat`)* 61% were required to hold a certification to win or renew a contract. |
| 6 | `wt-early-m1` | — | `trigger-win-trust = early` | Then you may be early, and 3HUE would rather tell you that than sell you something. |

**Node base state** — the room arrives carrying `wt`'s three shelf signs, the binders glow, the promise in the niche and the four-package list on `wt-panel-4`. Every branch's first line rewrites or clears all six panels, so no shelf sign survives into a beat about the visitor's desk. `wt-niche` keeps the promise throughout; `wt-binders` stays lit throughout.
**Room shows** —
*deal* (`wt-deal-m1`, cue `wt-panel-3`): `wt-panel-1` sign: SOC 2 Type II report? · `wt-panel-2` sign: ISO 27001 certificate? · `wt-panel-3` sign: Security questionnaire · `wt-panel-4` sign: PCI attestation? · `wt-panel-5` sign: Renewal on hold · `wt-panel-6` sign: Due Friday
*evidence* (`wt-ev-m1`, cue `wt-panel-3`): `wt-panel-1` sign: Customer questionnaire · `wt-panel-2` sign: Insurer's control form · `wt-panel-3` sign: Investor diligence · `wt-panel-4` sign: Policies? · `wt-panel-5` sign: Risk register? · `wt-panel-6` sign: Who owns this?
*scope* (`wt-scope-m1`, cue `wt-panel-3`): `wt-panel-1` sign: Audit booked · `wt-panel-2` sign: What's in scope? · `wt-panel-3` sign: What's out? · `wt-panel-4` cleared · `wt-panel-5` sign: Owner? · `wt-panel-6` sign: Evidence? — then (`wt-scope-m2`, cue `wt-panel-4`) `wt-panel-4` sign: Statement of Applicability? *(at "prove")*
*deal, evidence or scope* (`wt-m-stat`, cue `wt-monitor`): `wt-monitor` glow, callout `doors.win-trust.stat`
*early* (`wt-early-m1`, cue `wt-panel-2`): `wt-panel-1` sign: No date yet · `wt-panel-2` sign: Nobody asking · `wt-panel-3` cleared · `wt-panel-4` cleared · `wt-panel-5` cleared · `wt-panel-6` cleared · `wt-monitor` stays dark
**Choice** — none; continues to `wt-change`.
**Ask chips** — frameworks · auditor · guarantee · timeline
**Sources** — `wt-deal-m1`: The Forcing Function §03 · adapted · `wt-ev-m1`: The Message Stack §01, core narrative · adapted · `wt-scope-m1`: Tour script, linking line · proposed · `wt-scope-m2`: Tour script, linking line · proposed · `wt-m-stat`: ref, prints Secureframe, 2026 Cybersecurity & Compliance Benchmark · verified · `wt-early-m1`: The Ship List §06, discovery script; The Forcing Function §05, who to decline · adapted

---

### `wt-change` — before, after, and who is missing
*scene:* door:win-trust

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `wt-ch-1` | — | `trigger-win-trust = deal · evidence · scope` | Today the answers live in a spreadsheet, and in someone's head. |
| 2 | `wt-ch-2` | — | `trigger-win-trust = deal · evidence · scope` | Afterwards, every answer has an owner, and the evidence sits with it. |
| 3 | `wt-ch-3` | — | `trigger-win-trust = deal · evidence · scope` | The frameworks are public. What's missing is someone to run them. |
| 4 | `wt-ch-4` | — | `trigger-win-trust = deal · evidence · scope` | Almost every company calls security a top priority. Most have one security person, or none. |
| 5 | `wt-early-c1` | — | `trigger-win-trust = early` | The ask usually arrives as a deal, a renewal, or an insurer with a date. |

**Node base state** — the room arrives carrying whichever moment signs the branch wrote, plus the binders glow and the promise. `wt-ch-1` and `wt-early-c1` each clear every panel they do not use, so nothing from `wt-moment` survives into the before-and-after pair.
**Room shows** —
*deal, evidence or scope* — `wt-panel-1` cleared · `wt-panel-4` cleared · `wt-panel-5` cleared · `wt-panel-6` cleared · `wt-monitor` cleared · `wt-panel-2` status: In a spreadsheet *(`wt-ch-1`, cue `wt-panel-2`)* · `wt-panel-3` status: In someone's head *(`wt-ch-1`)* · `wt-panel-2` status: Owned ✓ *(at "owner", `wt-ch-2`)* · `wt-panel-3` status: Evidence attached ✓ *(at "evidence", `wt-ch-2`)* · `wt-binders` glow *(`wt-ch-3`, cue `wt-binders`)* · `wt-monitor` card: {ref:doors.win-trust.statSecondary}, callout `doors.win-trust.statSecondary` *(`wt-ch-4`, cue `wt-monitor`)*
*early* — `wt-panel-1` sign: A deal *(at "deal", `wt-early-c1`, cue `wt-panel-1`)* · `wt-panel-2` sign: A renewal *(at "renewal", `wt-early-c1`)* · `wt-panel-3` sign: An insurer, with a date *(at "insurer", `wt-early-c1`)*. Nothing else lights; `wt-monitor` stays dark.
**Choice** — none; continues to `wt-receive`.
**Ask chips** — frameworks · hire · platform · different
**Sources** — `wt-ch-1`: Tour script, linking line · proposed · `wt-ch-2`: The Message Stack §08, words we use · adapted · `wt-ch-3`: The Message Stack §01, core narrative · adapted · `wt-ch-4`: Secureframe, 2026 Cybersecurity & Compliance Benchmark · derived · `wt-early-c1`: The Forcing Function §05, who to decline · adapted

---

### `wt-receive` — the first step, named
*scene:* door:win-trust

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `wt-deal-r1` | — | `trigger-win-trust = deal` | For a blocked deal the start is one package, chosen by the standard your buyer named. |
| 2 | `wt-deal-r2` | — | `trigger-win-trust = deal` | Most often that's {offer:soc-2-readiness}. One package, and the evidence your buyer asks for comes with it. |
| 3 | `wt-deal-r3` | — | `trigger-win-trust = deal` | Named ISO instead? {offer:iso-27001-readiness}. Privacy? {offer:iso-27701-readiness}. Card data? {offer:pci-dss-readiness}. |
| 4 | `wt-deal-r4` | — | `trigger-win-trust = deal` | Take one, not two. Two of them overlap, and you would pay for the overlap twice. |
| 5 | `wt-ev-r1` | — | `trigger-win-trust = evidence` | Here the start is the {offer:initial-risk-assessment}: where you stand, what to fix, and in what order. |
| 6 | `wt-ev-r2` | — | `trigger-win-trust = evidence` | And for the questionnaire already in your inbox, there's {offer:rfp-response}: someone who owns the answers. |
| 7 | `wt-scope-r1` | — | `trigger-win-trust = scope` | Here the start is {offer:isms-scope-soa-development}: the boundary written down, with a reason for every control. |
| 8 | `wt-scope-r2` | — | `trigger-win-trust = scope` | If the auditor wants the system described, there's a document for that: {offer:system-security-privacy-plan-sspp-development}. |
| 9 | `wt-scope-r3` | — | `trigger-win-trust = scope` | If the audit is certification itself, take {offer:iso-27001-readiness} instead — it carries the scope work. |
| 10 | `wt-r-run` | — | `trigger-win-trust = deal · evidence · scope` | Then it has to stay true. That's what {program:isp} is for. |
| 11 | `wt-r-op` | — | `trigger-win-trust = deal · evidence · scope` | *(ref `doors.win-trust.program.operate`)* A managed program with questionnaire ownership and auditor management, so the engineering team goes back to shipping. |
| 12 | `wt-early-r1` | — | `trigger-win-trust = early` | When the ask comes, the usual first step is the {offer:initial-risk-assessment}, so you know where you stand. |

**Node base state** — the room arrives carrying the before-and-after statuses on `wt-panel-2` and `wt-panel-3` (or, on early, three signs on `wt-panel-1` to `wt-panel-3`), the binders glow, the statSecondary card, and the promise in the niche. Each branch's first line clears all six panels and the monitor card before it recommends anything, so no status from `wt-change` is still on the glass when a package is named.
**Room shows** —
*deal* — `wt-panel-1` through `wt-panel-6` cleared · `wt-monitor` glow *(`wt-deal-r1`, cue `wt-monitor`)* · `wt-binders` glow · `wt-panel-3` sign: {offer:soc-2-readiness} · `wt-panel-1` list: Where you stand / What's written down / What you'd do in an incident *(`wt-deal-r2`, cue `wt-binders`)* · `wt-panel-5` list: Instead, if they named: / {offer:iso-27001-readiness} / {offer:iso-27701-readiness} / {offer:pci-dss-readiness} *(`wt-deal-r3`, cue `wt-panel-5`)* · `wt-panel-2` sign: One, not two *(`wt-deal-r4`, cue `wt-panel-2`)*
*evidence* — `wt-panel-1` through `wt-panel-6` cleared · `wt-monitor` glow · `wt-binders` glow · `wt-panel-3` sign: {offer:initial-risk-assessment} · `wt-panel-4` list: Where you stand / What to fix / In what order *(`wt-ev-r1`, cue `wt-panel-3`)* · `wt-panel-5` sign: {offer:rfp-response} *(`wt-ev-r2`, cue `wt-panel-5`)*
*scope* — `wt-panel-1` through `wt-panel-6` cleared · `wt-monitor` glow · `wt-panel-3` sign: {offer:isms-scope-soa-development} · `wt-panel-4` list: What's in scope / What's out, and why / Which controls apply *(`wt-scope-r1`, cue `wt-panel-3`)* · `wt-binders` glow · `wt-panel-5` sign: {offer:system-security-privacy-plan-sspp-development} *(`wt-scope-r2`, cue `wt-binders`)* · `wt-panel-6` sign: Instead: / {offer:iso-27001-readiness} *(`wt-scope-r3`, cue `wt-panel-6`)*
*deal, evidence or scope* — `wt-niche` sign: Then: / {program:isp} *(`wt-r-run`, cue `wt-niche`)*. `wt-r-op` writes nothing; the niche sign already stands.
*early* — `wt-panel-1` cleared · `wt-panel-2` cleared · `wt-monitor` glow · `wt-panel-3` sign: {offer:initial-risk-assessment} *(`wt-early-r1`, cue `wt-panel-3`)*. `wt-niche` keeps the promise; no "Then:" sign is written on the early lane.
**Choice** — none; continues to `wt-proof`.
**Ask chips** — packages · auditor · timeline · pricing
**Sources** — `wt-deal-r1`: 3HUE service catalog, September 2026 · proposed · `wt-deal-r2`: 3HUE service catalog, September 2026 · adapted · `wt-deal-r3`: 3HUE service catalog, September 2026 · proposed · `wt-deal-r4`: 3HUE service catalog, September 2026 · derived · `wt-ev-r1`: 3HUE service catalog, September 2026 · adapted · `wt-ev-r2`: 3HUE service catalog, September 2026 · proposed · `wt-scope-r1`: 3HUE service catalog, September 2026 · proposed · `wt-scope-r2`: 3HUE service catalog, September 2026 · proposed · `wt-scope-r3`: 3HUE service catalog, September 2026 · derived · `wt-r-run`: 3hue.net, ISG managed programs; 3HUE service catalog, September 2026 · adapted · `wt-r-op`: ref, prints The Forcing Function §02, What 3HUE sells them · adapted · `wt-early-r1`: 3HUE service catalog, September 2026 · proposed

---

### `wt-proof` — someone who has already done it
*scene:* door:win-trust

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `wt-p1` | — | always | *(ref `doors.win-trust.proof.0`)* No formal security program, then SOC 2 Type I with zero findings and multi-entity SOC 2 Type II across a software portfolio. |
| 2 | `wt-p2` | — | always | It started where many teams start: an assessment of where they stood, then {offer:soc-2-readiness}. |
| 3 | `wt-p3` | — | always | You get the report because your buyer needs it, and a program because you need it. |

**Node base state** — the room arrives carrying a package recommendation on the panels and, on three of four branches, a "Then:" sign in the niche. `wt-p1` clears every one of them before the story starts: a recommendation must not stand over somebody else's engagement.
**Room shows** — `wt-panel-4`, `wt-panel-5`, `wt-panel-6` cleared · `wt-niche` cleared · `wt-panel-1` sign: No formal program · `wt-panel-2` sign: SOC 2 Type I · `wt-panel-3` sign: Multi-entity Type II · `wt-monitor` glow, callout `doors.win-trust.proof.0` *(`wt-p1`, cue `wt-monitor`)* · `wt-binders` glow · `wt-panel-4` list: Where they stood / Then {offer:soc-2-readiness} *(`wt-p2`, cue `wt-binders`)*. `wt-p3` writes nothing.
**Choice** — none; continues to `wt-next`.
**Ask chips** — proof · theater · guarantee · big-firm
**Sources** — `wt-p1`: ref, prints Transit Technologies engagement, published customer story · substantiated · `wt-p2`: Transit Technologies, published customer story · adapted · `wt-p3`: The Message Stack §06, objection handling · adapted

---

### `wt-next` — what you'd actually do on Monday
*scene:* door:win-trust

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `wt-deal-n` | — | `trigger-win-trust = deal` | Your next step is a conversation about that deal: the date, the scope, and what you don't have to do. |
| 2 | `wt-ev-n` | — | `trigger-win-trust = evidence` | Your next step: bring the questionnaire. The team scopes what it actually needs. |
| 3 | `wt-scope-n` | — | `trigger-win-trust = scope` | Your next step: bring the audit date, and the scope you think you have. |
| 4 | `wt-early-n` | — | `trigger-win-trust = early` | Take a summary with you, and come back when someone asks. |
| 5 | `wt-decision` | — | always | *(ref `doors.win-trust.decision`)* Choose the evidence and operating work that turns readiness into buyer confidence. |

**Node base state** — the room arrives carrying the Transit Technologies signs on `wt-panel-1` to `wt-panel-4`, the monitor glow and the binders glow. `wt-decision` clears all of it. The four `-n` lines write nothing; the room ends on exactly one lit statement, with every glow out.
**Room shows** — `wt-panel-1`, `wt-panel-2`, `wt-panel-3`, `wt-panel-4`, `wt-panel-5`, `wt-panel-6` cleared · `wt-monitor` cleared · `wt-binders` cleared · `wt-niche` sign: {ref:doors.win-trust.decision} *(`wt-decision`, cue `wt-niche`)*
**Choice** — "Where next?" (id `wt-next`, remembers nothing): "Show me where I'd start" / sub "The tower: your first step, and what follows" → `path` *(option id `start`)* · "Walk another door" / sub "{str:legend}" → `lobby-again` *(option id `another`)* · "Ask {guide} a question" / sub "Answers from 3HUE's approved material" → action `ask` *(option id `ask`)* · "{str:talk}" → action `talk` *(option id `talk`)*
**Ask chips** — quote · where-to-start · pricing · after
**Sources** — `wt-deal-n`: The Forcing Function §01, the fit model · adapted · `wt-ev-n`: Tour script, linking line · proposed · `wt-scope-n`: Tour script, linking line · proposed · `wt-early-n`: The Message Stack §07, battlecards · adapted · `wt-decision`: ref to a plain manifest string; no status printed

---

### `all-wt` — the one stop, for the visitor walking everything
*scene:* door:win-trust

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `all-1` | — | always | One stop in each room, then where to start. |
| 2 | `all-wt-2` | — | always | *(ref `doors.win-trust.opening`)* Your buyer isn't asking whether you're secure. They're asking whether you can prove it by Friday. |
| 3 | `all-wt-3` | — | always | So this room holds the proof: readiness for whichever standard your buyer names. |
| 4 | `all-wt-4` | — | always | You've asked to see everything, so start with the one that finds out where you stand: the {offer:initial-risk-assessment}. |

**Node base state** — the room enters dark: all six panels, the monitor, the binders and the niche clear.
**Room shows** — `wt-panel-1` sign: Where you stand · `wt-panel-2` sign: How you run · `wt-panel-3` sign: What your scope covers · `wt-binders` glow · `wt-niche` sign: {ref:doors.win-trust.promise} *(`all-wt-2`, cue `wt-panel-1`)* · `wt-monitor` glow · `wt-panel-4` list: {offer:soc-2-readiness} / {offer:iso-27001-readiness} / {offer:iso-27701-readiness} / {offer:pci-dss-readiness} *(`all-wt-3`, cue `wt-panel-4`)* · `wt-panel-4` **cleared** and `wt-panel-3` sign: {offer:initial-risk-assessment} *(`all-wt-4`, cue `wt-panel-3`, both in the one write)*. The four readiness packages leave the glass in the same frame the standalone assessment arrives, so the pairing `check-manifest.js:443` forbids in a start is never on the glass either.
**Choice** — none; continues to `all-gc`.
**Ask chips** — frameworks · packages · auditor · guarantee
**Sources** — `all-1`: Tour script, linking line · proposed · `all-wt-2`: ref, prints The Forcing Function §06, approved opening line · approved-copy · `all-wt-3`: 3HUE service catalog, September 2026 · proposed · `all-wt-4`: 3HUE service catalog, September 2026 · derived

---

**Manifest changes this chapter requires**

- `content/experience.json` → `doors[win-trust].triggers[2]` becomes `"A certification audit is booked with no written scope."`
- `content/experience.json` → `doors[win-trust].starts.ai` is renamed `doors[win-trust].starts.scope` and becomes `{trigger: 2, lead: "isms-scope-soa-development", alt: "iso-27001-readiness", with: ["system-security-privacy-plan-sspp-development"], then: ["managed-isp"], ring: ["strengthen"], source: "3HUE service catalog, September 2026; The Forcing Function §04, trigger events", status: "proposed"}`.
- `content/experience.json` → `doors[win-trust].serviceFamilies` drops **Privacy Management & Data Protection** and keeps three: Risk Assessment & Risk Management · Information Security Program & Governance · ISMS, SSPP & Statement of Applicability.
- `content/experience.json` → `doors[win-trust].packages` gains `"pci-dss-readiness"` (it leaves `doors[stay-ready].packages` in the same commit). `doors[win-trust].programs` stays `["isp","rmp"]`.
- `content/experience.json` → `doors[win-trust].icp` is deleted, with the `{icp}` uses in `strings.for`, `walk.captions.door` and `doors[win-trust].share.description`.
- `tools/check-manifest.js:175` → `if ((d.serviceFamilies || []).length !== 4)` becomes an at-least-three test; Win Trust now lists three.
- `tools/check-manifest.js:185–186` → the `O1` icp assertion and the `const O1 = [...]` line above it are deleted.
- `content/tour.json` → `nodes.wt.choice.options[2].id` becomes `scope`; `nodes.wt.choice.prompt` becomes `"What's on your desk right now?"`.
- `content/tour.json` → `nodes.wt.lines` gains `wt-ack` at index 0 and `wt-standards`; `wt-1` and `wt-3` are retexted.
- `content/tour.json` → the six `wt-ai-*` lines (`wt-ai-m1`, `wt-ai-m2`, `wt-ai-r1`, `wt-ai-r2`, `wt-ai-r3`, `wt-ai-n`) are replaced by the six `wt-scope-*` lines above; every `answers["trigger-win-trust"]` list in this chapter that read `"ai"` now reads `"scope"`.
- `content/tour.json` → `nodes.wt-change.lines[wt-ch-4]` loses its `ref` and takes `text` + `source` + `status: "derived"`; the precise figures survive only on its `wt-monitor` card and its `callout`, which still name `doors.win-trust.statSecondary`.
- `content/tour.json` → `nodes.wt-receive.lines[wt-deal-r2]` and its `wt-panel-1` list drop "audit support" and the other three plain-text Builder names; `doors[win-trust].starts.deal` is unchanged and `offers["soc-2-readiness"].contains` still carries `audit-support`.
- `content/tour.json` → the `wt-niche` write on `wt-r-run` reads `["Then:", "{program:isp}"]`, never `{offer:managed-isp}`.
- `content/tour.json` → `wt-p1` gains `"wt-niche": null`; `wt-decision` gains `"wt-monitor": null`, `"wt-binders": null` and `"wt-panel-5": null`, `"wt-panel-6": null` alongside the four clears it already carries.
- `content/tour.json` → `all-wt-4` is new; its write both clears `wt-panel-4` and signs `wt-panel-3`.
- `content/tour.json` → the `ask` array on all seven nodes is replaced with the C8 table's rows; `ai` leaves this chapter entirely.
- `content/tour.json` → `nodes.wt-moment.lines[wt-deal-m1].source` becomes `"The Forcing Function §03"`; `nodes.wt-next.lines[wt-deal-n].source` becomes `"The Forcing Function §01, the fit model"`. Neither prints "the three segments" to a visitor any more.

**Still open for the owner**

- `doors.win-trust.statSecondary` stays in the manifest at status `verified` but is no longer spoken; `wt-ch-4` speaks a derived paraphrase and the exact figures are read, not heard. The paraphrase — "Almost every company calls security a top priority. Most have one security person, or none." — is a claim in the owner's voice and needs the owner's signature.
- `doors.win-trust.program.operate` says "auditor management" and is spoken verbatim at `wt-r-op`. The contract removes Audit Support & Liaison Services from this room's vocabulary; "auditor management" is not that Builder name, but it is the same activity. Keep the ref, or reword the manifest field.
- `wt-panel-1`'s three-item list at `wt-deal-r2` describes what SOC 2 Readiness carries and deliberately omits the fourth item, because that item is Gain Control's to name. A visitor who later opens the Builder sees four. Acceptable, or should the glass carry a count instead of a list?
- `doors.win-trust.audience` ("For teams that need customer assurance…") survives the deletion of `icp` and is rendered outside the tour. It is the last field on this door that describes an audience rather than work.


---

## Gain Control

### `gc` — walking into Gain Control

*scene:* door:gain-control

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `gc-ack` | — | situation = own | They're asking about your data and your vendors. That's this room. |
| 2 | `gc-1` | — | always | {door:gain-control.title} is about the things you already own: your data, your vendors, and how your systems get built. |
| 3 | `gc-2` | — | always | For a while one person holds all of it in their head. Then there is more of it than one person can hold. |
| 4 | `gc-3` | — | always | Tell me which part is loudest, and we'll finish on the one step you would take first. |

**Room shows** — *base (node write):* `gc-wall`, `gc-amber-left`, `gc-amber-right`, `gc-model`, `gc-console` all cleared to null. `gc-ack` writes nothing and cues nothing; the room's own opener owns the first frame. `gc-1` cues `gc-wall` and writes `gc-wall` list: Your data / Your vendors / How it gets built. `gc-2` cues `gc-amber-left` and writes `gc-amber-left` status: One person holds it. `gc-3` writes nothing. `gc-amber-right`, `gc-model` and `gc-console` stay dark through this node.
**Choice** — "Which part is loudest right now?" (id `gc-trigger`, remembers `trigger-gain-control`): "{door:gain-control.triggers.0}" (sub: "Privacy rules, across the whole business") → `gc-moment` · "{door:gain-control.triggers.1}" (sub: "Who approves what AI touches") → `gc-moment` · "{door:gain-control.triggers.2}" (sub: "Other people's systems hold your data") → `gc-moment` · "Nobody's asking yet" (sub: "No rule, customer or vendor question on the table") → `gc-moment`
Option ids, in order: `crossing` · `ai` · `vendors` · `early`.
**Ask chips** — vendor · ai · msp · packages
**Sources** — `gc-ack`: Tour script, routing line · proposed · `gc-1`: 3HUE service catalog, September 2026 · derived · `gc-2`: The Forcing Function §03 · adapted · `gc-3`: Tour script, linking line · proposed

---

### `gc-moment` — the day it stops being one person's job

*scene:* door:gain-control

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `gc-cross-m1` | — | trigger-gain-control = crossing | Then a rule that used to belong to one team is suddenly everybody's problem. |
| 2 | `gc-cross-m2` | — | trigger-gain-control = crossing | And the first honest question is where that data lives. Nobody has one answer. |
| 3 | `gc-ai-m1` | — | trigger-gain-control = ai | Then a tool nobody approved is reading things nobody listed. |
| 4 | `gc-ai-m2` | — | trigger-gain-control = ai | Your customer's next question will not be whether you use AI. It will be who checks it. |
| 5 | `gc-ven-m1` | — | trigger-gain-control = vendors | Then a good part of your risk sits in other people's systems, and you take their word for it. |
| 6 | `gc-ven-m2` | — | trigger-gain-control = vendors | And when your own customer asks who you rely on, that list has to be real and current. |
| 7 | `gc-early-m1` | — | trigger-gain-control = early | Then this room can wait. The ask here usually comes from a rule, a customer, or your own auditor. |

**Room shows** — *base (node write):* `gc-wall`, `gc-amber-left`, `gc-amber-right` cleared to null; `gc-model` and `gc-console` stay dark. *crossing:* `gc-cross-m1` cues `gc-amber-left`, writes `gc-amber-left` status: Whose rule is it? · `gc-cross-m2` writes `gc-wall` list: Where does it live? / Who answers for it? / Since when? — *ai:* `gc-ai-m1` cues `gc-amber-left`, writes `gc-amber-left` status: Who approved it? · `gc-ai-m2` writes `gc-wall` list: Which tools? / What can they touch? / Who checks them? — *vendors:* `gc-ven-m1` cues `gc-amber-left`, writes `gc-amber-left` status: Their systems, your name · `gc-ven-m2` writes `gc-wall` list: Who do you rely on? / What do they hold? / Who checked? — *early:* `gc-early-m1` cues `gc-wall`, writes `gc-wall` list: A rule / A customer / Your own auditor; `gc-amber-left` stays cleared.
**Choice** — none; next `gc-change`
**Ask chips** — vendor · ai · early · msp
**Sources** — `gc-cross-m1`: Tour script, linking line · proposed · `gc-cross-m2`: Tour script, linking line · proposed · `gc-ai-m1`: 3hue.net, AI governance · adapted · `gc-ai-m2`: 3hue.net, AI governance · adapted · `gc-ven-m1`: 3hue.net, ISG managed programs · adapted · `gc-ven-m2`: Tour script, linking line · proposed · `gc-early-m1`: The Forcing Function §05, who to decline · adapted

---

### `gc-change` — what it looks like when someone is holding it

*scene:* door:gain-control

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `gc-ch-1` | — | trigger-gain-control = crossing, ai or vendors | Today the picture is a diagram someone drew once, plus whatever the longest-serving person remembers. |
| 2 | `gc-ch-2` | — | trigger-gain-control = crossing, ai or vendors | *(ref `doors.gain-control.program.build`)* One control set, applied the same way wherever it lands. |
| 3 | `gc-ch-3` | — | trigger-gain-control = crossing, ai or vendors | And where two things have to be kept apart, they stay apart. |
| 4 | `gc-ch-4` | — | trigger-gain-control = crossing, ai or vendors | After: everything you own has a name against it, and a date when someone last looked. |
| 5 | `gc-ch-5` | — | trigger-gain-control = crossing, ai or vendors | The hard part was never the standard. It was that nobody was given it to hold. |
| 6 | `gc-early-c1` | — | trigger-gain-control = early | When it does come, the first move is small: {offer:data-mapping-data-inventory}, so you know what you hold. |

**Room shows** — *base (node write):* `gc-wall` and `gc-amber-right` cleared to null; `gc-amber-left` carries the branch statement in from `gc-moment`. `gc-ch-1` cues `gc-amber-left`, writes `gc-amber-left` status: Drawn once, remembered since. `gc-ch-2` cues `gc-model`, writes `gc-model` glow and `gc-amber-right` status: One control set, wherever it lands. `gc-ch-3` writes `gc-amber-right` list: One control set, wherever it lands / Kept apart where it must be — the sameness statement stays lit beside the separateness statement instead of being overwritten by it. `gc-ch-4` cues `gc-wall`, writes `gc-wall` list: Named owner ✓ / Last looked at ✓, and clears `gc-amber-left` to null, because "drawn once, remembered since" stops being true at that line. `gc-ch-5` writes nothing. *early:* `gc-early-c1` cues `gc-wall`, writes `gc-wall` sign: {offer:data-mapping-data-inventory}; `gc-amber-left`, `gc-amber-right` and `gc-model` stay dark.
**Choice** — none; next `gc-receive`
**Ask chips** — vendor · ai · different · timeline
**Sources** — `gc-ch-1`: Tour script, linking line · proposed · `gc-ch-2`: ref → The Forcing Function §02, What 3HUE sells them · proposed (the block drops from approved-copy the moment its wording changes; see below) · `gc-ch-3`: The Forcing Function §02, What 3HUE sells them · adapted · `gc-ch-4`: The Message Stack §08, words we use · adapted · `gc-ch-5`: The Forcing Function §06, approved opening lines · adapted · `gc-early-c1`: 3HUE service catalog, September 2026 · proposed

---

### `gc-receive` — what you actually get, and in what order

*scene:* door:gain-control

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `gc-cross-r1` | — | trigger-gain-control = crossing | For privacy, the start is one package: {offer:privacy-leadership-launch}. |
| 2 | `gc-cross-r2` | — | trigger-gain-control = crossing | It sets the baseline, puts a named privacy lead in the chair, and keeps the program running. |
| 3 | `gc-cross-r3` | — | trigger-gain-control = crossing | If a customer or an auditor has named a privacy certificate, that track runs through {door:win-trust.title}. |
| 4 | `gc-cross-r4` | — | trigger-gain-control = crossing | Either way, someone has to draw the map: {offer:data-mapping-data-inventory}. |
| 5 | `gc-cross-r5` | — | trigger-gain-control = crossing | And when a regulator writes, there's {offer:regulator-liaison-dsar-escalation-support}. |
| 6 | `gc-ai-r1` | — | trigger-gain-control = ai | For AI, the start is {offer:ai-governance-advisory}: who approves it, what it may touch, who reviews it. |
| 7 | `gc-ai-r2` | — | trigger-gain-control = ai | {offer:security-architecture-reviews} put eyes on the design before it ships. |
| 8 | `gc-ai-r3` | — | trigger-gain-control = ai | {offer:secure-sdlc-program-development} makes that the normal way to build, not a favour. |
| 9 | `gc-ai-r4` | — | trigger-gain-control = ai | And {offer:vulnerability-management-program-development} settles what gets fixed, who fixes it, and what waits. |
| 10 | `gc-ai-r5` | — | trigger-gain-control = ai | Then it runs as {program:sea}, so the work carries on after the reviews stop. |
| 11 | `gc-ven-r1` | — | trigger-gain-control = vendors | For vendors, the start is the {program:vcp}. |
| 12 | `gc-ven-r2` | — | trigger-gain-control = vendors | It keeps one list: who you rely on, what they hold, when each was last checked. |
| 13 | `gc-ven-r3` | — | trigger-gain-control = vendors | It widens a block of vendors at a time, as your list grows. |
| 14 | `gc-ven-r4` | — | trigger-gain-control = vendors | Before any of that, you need the list of what you own: {offer:asset-governance-program-development}. |
| 15 | `gc-ven-r5` | — | trigger-gain-control = vendors | And when their auditor turns up, or yours, you have {offer:audit-support}. |
| 16 | `gc-r-op` | — | trigger-gain-control = crossing, ai or vendors | *(ref `doors.gain-control.program.operate`)* Quarterly reporting in one format, with one view across everything you own. |
| 17 | `gc-early-r1` | — | trigger-gain-control = early | Whichever part gets loud first, the map is the same first step. |

**Room shows** — *base (node write):* `gc-wall`, `gc-amber-left`, `gc-amber-right`, `gc-model`, `gc-console` all cleared to null.
*crossing:* `gc-cross-r1` cues `gc-wall`, writes `gc-wall` sign: {offer:privacy-leadership-launch} · `gc-cross-r2` writes `gc-amber-left` list: A baseline / A named privacy lead / Someone running it · `gc-cross-r3` writes `gc-amber-right` sign: Certificate track: / {door:win-trust.title} · `gc-cross-r4` writes `gc-wall` list: {offer:privacy-leadership-launch} / {offer:data-mapping-data-inventory} · `gc-cross-r5` writes `gc-wall` list: {offer:privacy-leadership-launch} / {offer:data-mapping-data-inventory} / {offer:regulator-liaison-dsar-escalation-support}.
*ai:* `gc-ai-r1` cues `gc-wall`, writes `gc-wall` sign: {offer:ai-governance-advisory} · `gc-ai-r2` writes `gc-wall` list: {offer:ai-governance-advisory} / {offer:security-architecture-reviews} · `gc-ai-r3` writes `gc-wall` list: {offer:ai-governance-advisory} / {offer:security-architecture-reviews} / {offer:secure-sdlc-program-development} · `gc-ai-r4` writes `gc-wall` list: {offer:ai-governance-advisory} / {offer:security-architecture-reviews} / {offer:secure-sdlc-program-development} / {offer:vulnerability-management-program-development} (four items, the write cap) and `gc-amber-left` list: What gets fixed / Who fixes it / What waits · `gc-ai-r5` writes `gc-amber-right` sign: Then: / {program:sea} and `gc-console` glow.
*vendors:* `gc-ven-r1` cues `gc-wall`, writes `gc-wall` sign: {program:vcp} · `gc-ven-r2` writes `gc-amber-left` list: Who you rely on ✓ / What they hold ✓ / Last checked ✓ · `gc-ven-r3` writes `gc-amber-right` sign: Then: / a block at a time, and `gc-console` glow · `gc-ven-r4` writes `gc-wall` list: {offer:asset-governance-program-development} / {program:vcp} · `gc-ven-r5` writes `gc-wall` list: {offer:asset-governance-program-development} / {program:vcp} / {offer:audit-support}.
*all three:* `gc-r-op` writes `gc-amber-right` status: One format, one view.
*early:* `gc-early-r1` cues `gc-wall`, writes `gc-wall` sign: {offer:data-mapping-data-inventory}; `gc-amber-left`, `gc-amber-right`, `gc-model` and `gc-console` stay dark.
`gc-model` and `gc-console` carry no text in this node or any other — `gc-console` takes a glow only and is never the object of a cue.
**Choice** — none; next `gc-proof`
**Ask chips** — packages · vendor · ai · pricing
**Sources** — `gc-cross-r1`: 3HUE service catalog, September 2026 · proposed · `gc-cross-r2`: 3HUE service catalog, September 2026 · adapted · `gc-cross-r3`: 3HUE service catalog, September 2026 · derived · `gc-cross-r4`: 3HUE service catalog, September 2026 · proposed · `gc-cross-r5`: 3HUE service catalog, September 2026 · proposed · `gc-ai-r1`: 3hue.net, AI governance; 3HUE service catalog, September 2026 · adapted · `gc-ai-r2`: 3HUE service catalog, September 2026 · proposed · `gc-ai-r3`: 3HUE service catalog, September 2026 · proposed · `gc-ai-r4`: 3HUE service catalog, September 2026 · adapted · `gc-ai-r5`: 3hue.net, ISG managed programs; 3HUE service catalog, September 2026 · proposed · `gc-ven-r1`: 3hue.net, ISG managed programs; 3HUE service catalog, September 2026 · adapted · `gc-ven-r2`: 3hue.net, ISG managed programs · adapted · `gc-ven-r3`: 3HUE service catalog, September 2026 · derived · `gc-ven-r4`: 3HUE service catalog, September 2026 · proposed · `gc-ven-r5`: 3HUE service catalog, September 2026 · proposed · `gc-r-op`: ref → The Forcing Function §02, What 3HUE sells them · proposed (with the rest of the program block) · `gc-early-r1`: Tour script, linking line · proposed

---

### `gc-proof` — one framework, a thousand times

*scene:* door:gain-control

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `gc-p1` | — | always | *(ref `doors.gain-control.proof.0`)* 1,000+ systems certified under one scalable assessment framework. |
| 2 | `gc-p2` | — | always | One framework, applied the same way every time. That is what makes a count like that possible. |
| 3 | `gc-p3` | — | always | It is the reason not to hire a different consultant for every corner of what you own. |

**Room shows** — *base (node write):* `gc-wall`, `gc-amber-left`, `gc-amber-right` cleared to null; `gc-console` cleared. `gc-p1` cues `gc-model`, writes `gc-wall` card with one item, {ref:doors.gain-control.proof.0}, and `gc-model` glow. `gc-p2` writes `gc-amber-right` sign: One framework / Every time. `gc-p3` writes nothing. `gc-amber-left` stays dark for the whole node: the client descriptor on `doors.gain-control.proof[0].basis` is provenance, not visitor copy, and never goes on the glass.
**Choice** — none; next `gc-next`
**Ask chips** — proof · different · big-firm · theater
**Sources** — `gc-p1`: ref → basis "A large North American bank, published customer story, client unnamed" · substantiated · `gc-p2`: A large North American bank, published customer story · derived · `gc-p3`: The Message Stack §06, objection handling · adapted

---

### `gc-next` — the one thing to bring

*scene:* door:gain-control

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `gc-cross-n` | — | trigger-gain-control = crossing | Your next step: bring the list of places personal data lives. Incomplete is normal. |
| 2 | `gc-ai-n` | — | trigger-gain-control = ai | Your next step: bring the list of AI tools in use, including the ones nobody approved. |
| 3 | `gc-ven-n` | — | trigger-gain-control = vendors | Your next step: bring your vendor list, and mark the ones that hold your data. |
| 4 | `gc-early-n` | — | trigger-gain-control = early | Take a summary with you, and come back when someone starts asking. |
| 5 | `gc-decision` | — | always | *(ref `doors.gain-control.decision`)* Make what you already own visible, owned, and looked at on a rhythm. |

**Room shows** — *base (node write):* `gc-wall`, `gc-amber-left`, `gc-amber-right`, `gc-model`, `gc-console` all cleared to null, so nothing from the branch survives into the close. The four branch lines write nothing. `gc-decision` cues `gc-wall` and writes `gc-wall` sign: {ref:doors.gain-control.decision}. The room ends on exactly one lit statement and no live glow. `gc-wall` is `station: urgency`; Gain Control has no text-carrying `decision` station, which is why the close lands on the urgency screen — see the manifest note below.
No line in this node speaks the price sentence: `path` and `path-all` own it, once per visitor, and the `pricing` chip is still on this node for anyone who wants it.
**Choice** — "Where next?" (id `gc-next`, remembers nothing): "Show me where I'd start" (sub: "The tower: your first step, and what follows") → `path` · "Walk another door" (sub: "{str:legend}") → `lobby-again` · "Ask {guide} a question" (sub: "Answers from 3HUE's approved material") → action `ask` · "{str:talk}" → action `talk`
Option ids, in order: `start` · `another` · `ask` · `talk`.
**Ask chips** — quote · where-to-start · pricing · vendor
**Sources** — `gc-cross-n`: Tour script, linking line · proposed · `gc-ai-n`: Tour script, linking line · proposed · `gc-ven-n`: Tour script, linking line · proposed · `gc-early-n`: The Message Stack §07, battlecards · adapted · `gc-decision`: ref → 3HUE service catalog, September 2026 · proposed (the field carries no source or status today; both must be added with the reworded string)

---

### `all-gc` — the same room on the everything walk

*scene:* door:gain-control

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `all-gc-1` | — | always | {door:gain-control.title} holds what you already own: your data, your vendors, and how your systems get built. |
| 2 | `all-gc-2` | — | always | The first step here is small: {offer:data-mapping-data-inventory}. You cannot govern what you have not listed. |
| 3 | `all-gc-3` | — | always | After that it forks: {offer:privacy-leadership-launch} for privacy, the {program:vcp} for vendors. |

**Room shows** — *base (node write):* `gc-wall`, `gc-amber-left`, `gc-amber-right`, `gc-model`, `gc-console` all cleared to null. `all-gc-1` cues `gc-wall`, writes `gc-wall` list: Your data / Your vendors / How it gets built. `all-gc-2` cues `gc-amber-left`, writes `gc-amber-left` sign: First step: / {offer:data-mapping-data-inventory}. `all-gc-3` writes `gc-amber-right` sign: {offer:privacy-leadership-launch} / {program:vcp} and `gc-model` glow. The first step named here is the same offer `path-all-gc` and `sum-all-gc` name downstream, so the tower and the email repeat what the room said rather than contradicting it.
**Choice** — none; next `all-sr`
**Ask chips** — vendor · ai · packages · msp
**Sources** — `all-gc-1`: 3HUE service catalog, September 2026 · derived · `all-gc-2`: 3HUE service catalog, September 2026 · proposed · `all-gc-3`: 3hue.net, ISG managed programs; 3HUE service catalog, September 2026 · proposed

---

**Manifest changes this chapter requires**

- `tools/check-manifest.js:175` — `if ((d.serviceFamilies || []).length !== 4)` becomes a minimum of three (`< 3`). Gain Control lists three families under this contract.
- `tools/check-manifest.js:185–186` — delete the `O1` icp assertion, and delete `doors[].icp` on all three doors. `doors.gain-control.icp` is "Portfolio owners", the label this chapter exists to remove.
- `content/experience.json` › `doors[1].triggers` → `["Privacy rules now reach across the whole business.", "Nobody owns how AI touches your data.", "Other people's systems hold your data."]`
- `doors[1].serviceFamilies` → three entries: **Privacy Management & Data Protection** (examples: Data Mapping & Data Inventory · Data Protection Impact Assessment (DPIA) · AI Governance & Privacy Advisory · Regulator Liaison & DSAR Escalation Support) · **Vendor & Third-Party Risk Management** (Managed Vendor Compliance Program (VCP) · Asset Governance Program Development · Audit Support & Liaison Services) · **Security Engineering & Architecture** (Security Architecture Reviews · Secure SDLC Program Development · Vulnerability Management Program Development).
- `doors[1].packages` → `["privacy-leadership-launch"]`, and the same id leaves `doors[2].packages` (Stay Ready) in the same commit, or `:441` fails on both doors at once.
- `doors[1].programs` → `["vcp","sea"]`. `rmp` and `vciso` leave; without `sea`, `starts.ai.then = ["security-engineering"]` fails `:442`.
- `doors[1].maturityEmphasis` → `["assess","strengthen","operate"]`. `advance` drops with the retired reporting start; `strengthen` enters for the engineering branch. Every ring below is then in the list, so `:460` does not warn.
- `doors[1].starts` → replaced wholesale, all four with source "3HUE service catalog, September 2026" and status `proposed`: **`crossing`** `{trigger:0, lead:"privacy-leadership-launch", with:["data-mapping-data-inventory","regulator-liaison-dsar-escalation-support"], ring:["assess","operate"]}` · **`ai`** `{trigger:1, lead:"ai-governance-advisory", with:["security-architecture-reviews","secure-sdlc-program-development","vulnerability-management-program-development"], then:["security-engineering"], ring:["strengthen"]}` · **`vendors`** `{trigger:2, lead:"managed-vcp", with:["asset-governance-program-development","audit-support"], then:["vcp-additional-vendor-monitoring-5-vendor-block"], ring:["operate"]}` · **`early`** `{trigger:null, lead:"data-mapping-data-inventory", ring:[]}`. Retired: `starts.acquisition`, `starts.reporting`, `starts.control`.
- `doors[1].program.{start,build,operate}` → reworded, which moves the whole object from `approved-copy` to `proposed` in one step (status is per-object), taking `gc-ch-2` and `gc-r-op` with it. Proposed wording: `start` "A map of what you hold: the data, the vendors and the systems." · `build` "One control set, applied the same way wherever it lands." · `operate` "Quarterly reporting in one format, with one view across everything you own."
- `doors[1].decision` → becomes a sourced object, not a bare string: text "Make what you already own visible, owned, and looked at on a rhythm.", source "3HUE service catalog, September 2026", status `proposed`. The current string ends on "without slowing operators down", one word off Stay Ready's retired label, and `resolveRef` finds no status on it, so `gc-decision` renders sourceless today. (`needSource` does not cover `decision` on any of the three doors.)
- `doors[1].opening`, `doors[1].stat`, `doors[1].statSecondary` → quoted by nothing after this chapter. They are the 81%/29% and 26% deal-diligence figures, which describe a company type; retire them rather than rehome them in this room.
- `doors[1].audience` and `doors[1].share.description` → both read "For ownership and operating teams that need shared visibility… across multiple companies." That is the retired buyer label in a sentence, and `share.description` is visitor-visible. Rewrite both to name the work, not the audience.
- `content/tour.json` › `chapters[3]` → id `door-gain-control`, title `{door:gain-control.title}`, landmark `door:gain-control`, entry `gc`.
- `content/tour.json` › `nodes.gc-moment`, `nodes.gc-change`, `nodes.gc-receive`, `nodes.gc-proof`, `nodes.gc-next` → `scene` becomes `{kind:"door",door:"gain-control"}`. All five are `keep` today and all five carry writes, which is a hard `:714` error at each write.
- `nodes.<id>.ask` for all seven nodes → exactly the lists above. `private-equity`, `vciso` and `rmp` leave this room; `private-equity` is a chip on no node in the script.

**Still open for the owner**

- **Gain Control has no text-carrying `services` surface and no `decision` surface.** The door declares six stations and `surfaces.json` measures five surfaces across three of them, of which only `gc-wall` (urgency), `gc-amber-left` (gap) and `gc-amber-right` (program) take text. `gc-receive` names nine offers and two programs across its branches and has to write every one of them on the urgency screen; `gc-next` has to put the decision statement there too. The fix is one scrim-with-text-box at station `services`, modelled on `sr-rack`, and one `region`-or-`glass` with text at station `decision`, modelled on `sr-panel-3` or `wt-niche` — not on `wt-binders`, which is `text: null`. Until they exist this room cannot end the way the other two do.
- **Four of this room's privacy services have no `offers` entry and so cannot be spoken**: Data Subject Rights Operations, Privacy Training & Awareness Program, Privacy Program CONOPS Review & Update, IT/IS Process Engineering. The first is the most visitor-legible service on the privacy shelf. Four one-line additions to `offers` would let the room name them.
- **Security Engineering & Architecture is reachable only through the `ai` button.** `MAX_OPTIONS = 4` means six engineering services sit behind a button that is nominally about AI. If the owner wants a build-and-ship branch of its own, one of `crossing`, `ai` or `vendors` has to give up its button.
- **`guide.voice.say` has no entry for VCP, DSAR or SDLC**, all spoken in this room. Nothing in the lint catches a missing entry, so they render mispronounced. Add them before any voice is cut.
- **Ask has no privacy-programme question.** `privacy` is "What happens to my answers?", about the visitor's own data on the site. This room now owns the whole privacy shelf; a question like "Who runs privacy if we don't have anyone?" is the natural chip, but the chip table is closed and would have to change first.
- **`who` cannot express "the other guide steps in."** `gc-cross-r3`, the hand-off to Win Trust, is the one beat here that wants a second voice, and `:762` accepts only `avi` or `huey` — either is flat half the time. The line ships unpinned.


---

## Stay Ready

### `sr` — Standing in the door of Stay Ready

*scene:* door:stay-ready

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `sr-ack` | — | situation = run | They want to see it running, not just written down. That's this room. |
| 2 | `sr-2` | — | always | *(ref `doors.stay-ready.opening`)* Your controls passed in December. The question is what they were doing in March. |
| 3 | `sr-holds` | — | always | This room is what has to hold up when something happens, or when somebody checks. |
| 4 | `sr-shelf` | — | always | Response. Continuity. Detection. And the programs that keep risk and findings current between checks. |
| 5 | `sr-stat` | — | always | *(ref `doors.stay-ready.stat`)* 72% still rely on periodic assessments; only 28% monitor continuously. |
| 6 | `sr-ask` | — | always | Say what's in front of you, and the room will show you the rest. |

**Room shows** — Node base state (before any line): every surface cleared — `sr-monitor-1`, `sr-monitor-2`, `sr-monitor-3`, `sr-panel-1`, `sr-panel-2`, `sr-panel-3`, `sr-rack`, `sr-clock`.
`sr-ack` frames nothing and writes nothing — the room's own opener owns the first frame.
`sr-2` frames `sr-monitor-2`; writes `sr-monitor-1` status: December ✓ · `sr-monitor-2` status: March ? · `sr-monitor-3` status: Today ? · `sr-clock` status: Since the last check.
`sr-holds` frames nothing and writes nothing — the room stays on the December/March pair while the line lands.
`sr-shelf` frames `sr-rack`; writes `sr-panel-1` sign: Response *(at "Response")* · `sr-panel-2` sign: Continuity *(at "Continuity")* · `sr-panel-3` sign: Detection *(at "Detection")* · `sr-rack` glow *(at "programs")*.
`sr-stat` frames `sr-monitor-3`; writes `sr-monitor-3` card: {ref:doors.stay-ready.stat} (replacing Today ?) · callout `doors.stay-ready.stat`.
`sr-ask` frames nothing and writes nothing.
**Choice** — "What's in front of you?" (id `sr-trigger`, remembers `trigger-stay-ready`): "A finding with a date on it" / *Open, and someone is waiting* → `sr-moment` · "An incident, or a near miss" / *Response, and what has to keep working* → `sr-moment` · "Alerts nobody is reading" / *Detection and response, run for you* → `sr-moment` · "Nobody's asking yet" / *No finding, no date, nobody waiting* → `sr-moment`. Option ids: `exam` · `incident` · `detect` · `early`.
**Ask chips** — exam-findings · incident · mdr · live-incident
**Sources** — `sr-ack`: Tour script, routing line · proposed. `sr-2`: ref `doors.stay-ready.opening` — The Forcing Function §06, approved opening line · approved-copy. `sr-holds`: The Message Stack §01, core narrative · adapted. `sr-shelf`: 3HUE service catalog, September 2026 · derived. `sr-stat`: ref `doors.stay-ready.stat` — RegScale, 2026 State of Continuous Controls Monitoring · verified. `sr-ask`: Tour script, linking line · proposed.

---

### `sr-moment` — What that actually looks like on the day

*scene:* door:stay-ready

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `sr-exam-m1` | — | trigger = exam | Then there's a finding, a letter and a date. |
| 2 | `sr-exam-m2` | — | trigger = exam | And the finding is about what was running, not about what was written down. |
| 3 | `sr-inc-m1` | — | trigger = incident | Then the question is who does what, in what order, and who gets told. |
| 4 | `sr-inc-m2` | — | trigger = incident | And the day after: what has to keep working while you fix it. |
| 5 | `sr-det-m1` | — | trigger = detect | Then the alerts are already arriving. Nobody's job is to read them. |
| 6 | `sr-det-m2` | — | trigger = detect | The tools are usually already bought. What's missing is someone to run them. |
| 7 | `sr-early-m2` | — | trigger = early | Then you may be early, and 3HUE would rather say so than sell you something. |
| 8 | `sr-early-m3` | — | trigger = early | Most of this room gets bought after a scare, or after a plan has to be used. |

**Room shows** — Node base state (before any line): `sr-monitor-1` status: December ✓ · `sr-monitor-2` status: March ? · `sr-monitor-3` status: Today ? · `sr-clock` status: Since the last check · `sr-panel-1` cleared · `sr-panel-2` cleared · `sr-panel-3` cleared · `sr-rack` cleared. The shelf signs from `sr` go out; this node is about the day, not the shelf.
*exam:* `sr-exam-m1` frames `sr-panel-2`; writes `sr-panel-1` sign: Finding open · `sr-panel-2` sign: Remediation due · `sr-panel-3` sign: Examiner's letter · `sr-clock` status: Time to the date. `sr-exam-m2` frames `sr-monitor-3`; writes `sr-monitor-3` status: What's running?
*incident:* `sr-inc-m1` frames `sr-panel-2`; writes `sr-panel-1` sign: Who leads? *(at "does")* · `sr-panel-2` sign: In what order? *(at "order")* · `sr-panel-3` sign: Who gets told? *(at "told")* · `sr-clock` status: Hour one. `sr-inc-m2` frames `sr-rack`; writes `sr-rack` sign: What still has to run *(at "working")*.
*detect:* `sr-det-m1` frames `sr-panel-2`; writes `sr-panel-1` sign: Alerts arriving *(at "alerts")* · `sr-panel-2` sign: Read by whom? *(at "read")* · `sr-clock` status: Alert to answer. `sr-panel-3` stays cleared — the missing third panel is the point. `sr-det-m2` frames `sr-rack`; writes `sr-rack` glow *(at "run")*.
*early:* `sr-early-m2` frames `sr-monitor-2`; writes `sr-monitor-2` status: No date yet. `sr-early-m3` frames nothing and writes nothing; the dial stays on Since the last check, which is still true.
**Choice** — none. Continues to `sr-change`.
**Ask chips** — incident · live-incident · mdr · exam-findings
**Sources** — `sr-exam-m1`: The Forcing Function §04, trigger events · adapted. `sr-exam-m2`: The Message Stack §08, words we use · adapted. `sr-inc-m1`: 3hue.net, Cyber-Incident Response Program · adapted. `sr-inc-m2`: Tour script, linking line · proposed. `sr-det-m1`: Tour script, linking line · proposed. `sr-det-m2`: The Message Stack §01, core narrative · adapted. `sr-early-m2`: The Forcing Function §05, who to decline · adapted. `sr-early-m3`: The Forcing Function §05, who to decline · adapted.

---

### `sr-change` — Deployed is not operating

*scene:* door:stay-ready

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `sr-ch-1` | — | trigger = exam, incident or detect | Deployed is not operating. The gap between the two is where audits and incidents happen. |
| 2 | `sr-ch-mfa` | — | trigger = exam, incident or detect | Most small businesses have turned MFA on. Only about half require it everywhere. |
| 3 | `sr-ch-3` | — | trigger = exam, incident or detect | *(ref `doors.stay-ready.program.operate`)* Remediation that closes findings and keeps them closed, with board-ready risk translation. |
| 4 | `sr-exam-c1` | — | trigger = exam | After: the finding closes on its date, and stays closed after it. |
| 5 | `sr-inc-c1` | — | trigger = incident | After: the first real incident isn't the first rehearsal. |
| 6 | `sr-det-c1` | — | trigger = detect | After: someone outside your team reads what the tools are saying, and answers it. |
| 7 | `sr-early-c2` | — | trigger = early | Before a date exists, the useful thing is knowing what your controls are actually doing. |
| 8 | `sr-early-c3` | — | trigger = early | Then run the bad day on paper, before you have to run it for real. |

**Room shows** — Node base state (before any line): `sr-monitor-1` status: December ✓ · `sr-monitor-2` status: March ? · `sr-monitor-3` status: Today ? · `sr-clock` status: Since the last check · `sr-panel-1` cleared · `sr-panel-2` cleared · `sr-panel-3` cleared · `sr-rack` cleared.
`sr-ch-1` frames `sr-panel-2`; writes `sr-panel-1` status: Deployed ✓ *(at "Deployed")* · `sr-panel-2` status: Operating? *(at "operating")*.
`sr-ch-mfa` frames `sr-monitor-3`; writes `sr-monitor-3` card: {ref:doors.stay-ready.statSecondary} · callout `doors.stay-ready.statSecondary`. The exact figures reach the visitor on the glass and in the callout, with their own printed source; the spoken line is the sayable version.
`sr-ch-3` frames `sr-panel-2`; writes `sr-panel-1` status: Operated ✓ · `sr-panel-2` status: Monitored ✓ · `sr-monitor-2` status: March ✓ · `sr-clock` status: No gap. This is the room's after-state and the only place the dial reads clean. `sr-panel-3` stays cleared: the decision surface carries no claim before the decision.
`sr-exam-c1`, `sr-inc-c1`, `sr-det-c1` frame nothing and write nothing — the after-state above is already on the glass.
*early:* `sr-early-c2` frames `sr-monitor-3`; writes `sr-monitor-3` status: What's running? `sr-early-c3` frames `sr-panel-2`; writes `sr-panel-2` sign: {offer:ir-ttx}. The early lane never reaches the after-state, so its dial stays on Since the last check.
**Choice** — none. Continues to `sr-receive`.
**Ask chips** — remediation-owner · mdr · incident · early
**Sources** — `sr-ch-1`: The Message Stack §01, core narrative; §08, words we use · adapted. `sr-ch-mfa`: National Cybersecurity Alliance with CISA, 2026 · adapted. `sr-ch-3`: ref `doors.stay-ready.program.operate` — The Forcing Function §02, What 3HUE sells them · approved-copy. `sr-exam-c1`: 3hue.net, ISG managed programs · adapted. `sr-inc-c1`: 3hue.net, Cyber-Incident Response Program · adapted. `sr-det-c1`: 3hue.net, continuous risk management · adapted. `sr-early-c2`: The Message Stack §08, words we use · adapted. `sr-early-c3`: 3HUE service catalog, September 2026 · proposed.

---

### `sr-receive` — What's actually on this shelf

*scene:* door:stay-ready

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `sr-exam-start` | — | trigger = exam | The start is a {offer:controls-gap-assessment}, sampling the controls the finding is about. |
| 2 | `sr-exam-owner` | — | trigger = exam | After that, every finding gets an owner and a date, tracked under {offer:risk-register-poam}. |
| 3 | `sr-exam-managed` | — | trigger = exam | The {program:rmp} keeps the risk work moving between exams. |
| 4 | `sr-inc-fast` | — | trigger = incident | The start is {offer:ir-fast-start}: a plan, playbooks, and a rehearsal before you need one. |
| 5 | `sr-inc-bcp` | — | trigger = incident | And for the day after, {offer:bcp-development}: what has to keep working while you fix the rest. |
| 6 | `sr-inc-r3` | — | trigger = incident | If an incident is live right now, don't wait for a package. Talk to the team today. |
| 7 | `sr-inc-live` | — | trigger = incident | A live one is a different thing you buy: {offer:incident-command}. |
| 8 | `sr-inc-r4` | — | trigger = incident | The {program:cirp} keeps it current: clear roles, escalation paths, and lessons fed back into the risk register. |
| 9 | `sr-inc-mxdr` | — | trigger = incident | And if nobody is reading the alerts either, {offer:mxdr-complete} is the other side of this room. |
| 10 | `sr-det-r1` | — | trigger = detect | The start is {offer:mxdr-complete}: monitoring, detection and response, run across the systems you already have. |
| 11 | `sr-det-tier` | — | trigger = detect | {offer:mxdr-starter} is the first tier inside it, if that's where you need to begin. |
| 12 | `sr-det-r2` | — | trigger = detect | What it covers is scoped with you. So is who gets called when something fires. |
| 13 | `sr-det-r3` | — | trigger = detect | And if the plan for the bad night isn't written, {offer:ir-fast-start} is the other side. |
| 14 | `sr-early-r2` | — | trigger = early | So the start here is a {offer:controls-gap-assessment}: what your controls are actually doing. |
| 15 | `sr-early-ttx` | — | trigger = early | And a day spent rehearsing what you'd do beats another binder on a shelf. |

**Room shows** — Node base state (before any line): every surface cleared — `sr-monitor-1`, `sr-monitor-2`, `sr-monitor-3`, `sr-panel-1`, `sr-panel-2`, `sr-panel-3`, `sr-rack`, `sr-clock`. The after-state and the dial go dark before the shelf is shown; the dial is for the gap, and this node is not about the gap.
*exam:* `sr-exam-start` frames `sr-monitor-1`; writes `sr-monitor-1` sign: {offer:controls-gap-assessment}. `sr-exam-owner` frames `sr-panel-1`; writes `sr-panel-1` sign: {offer:risk-register-poam} · `sr-monitor-2` status: Owner and date. `sr-exam-managed` frames `sr-rack`; writes `sr-rack` sign: Then: {program:rmp}.
*incident:* `sr-inc-fast` frames `sr-panel-1`; writes `sr-panel-1` sign: {offer:ir-fast-start} · `sr-monitor-1` sign: {offer:ir-plan} · `sr-monitor-2` sign: {offer:ir-playbook} · `sr-monitor-3` sign: {offer:ir-ttx} — the package on the glass, three of the things it carries on the screens. `sr-inc-bcp` frames `sr-panel-2`; writes `sr-panel-2` sign: {offer:bcp-development}. `sr-inc-r3` frames `sr-clock`; writes `sr-clock` status: Now *(at "now")* — the one time the dial reads the present instead of a gap. `sr-inc-live` frames `sr-panel-3`; writes `sr-panel-3` sign: Not in the package · {offer:incident-command}. `sr-inc-r4` frames `sr-rack`; writes `sr-rack` sign: Then: {program:cirp}. `sr-inc-mxdr` frames `sr-rack`; writes `sr-rack` sign: Then: {program:cirp} / Also: {offer:mxdr-complete}.
*detect:* `sr-det-r1` frames `sr-panel-1`; writes `sr-panel-1` sign: {offer:mxdr-complete} · `sr-monitor-1` sign: {offer:mxdr-starter} · `sr-monitor-2` sign: {offer:mxdr-siem-add-on} · `sr-monitor-3` sign: {offer:managed-security-controls-validation-for-endpoints} — the package on the glass, exactly its three contents on the screens. `sr-det-tier` frames `sr-monitor-1` and writes nothing; the screen already says Starter is inside Complete. `sr-det-r2` frames `sr-panel-2`; writes `sr-panel-2` sign: Scoped with you · `sr-rack` glow *(at "scoped")*. `sr-det-r3` frames `sr-panel-3`; writes `sr-panel-3` sign: {offer:ir-fast-start}.
*early:* `sr-early-r2` frames `sr-monitor-1`; writes `sr-monitor-1` sign: {offer:controls-gap-assessment}. `sr-early-ttx` frames `sr-monitor-2`; writes `sr-monitor-2` sign: {offer:ir-ttx} · `sr-panel-2` sign: Test it / before you need it.
**Choice** — none. Continues to `sr-proof`.
**Ask chips** — packages · mdr · live-incident · pricing
**Sources** — `sr-exam-start`: 3HUE service catalog, September 2026 · adapted. `sr-exam-owner`: 3HUE service catalog, September 2026 · adapted. `sr-exam-managed`: 3hue.net, ISG managed programs · adapted. `sr-inc-fast`: 3HUE service catalog, September 2026 · adapted. `sr-inc-bcp`: 3HUE service catalog, September 2026 · proposed. `sr-inc-r3`: Tour script, linking line · proposed. `sr-inc-live`: 3HUE service catalog, September 2026 · proposed. `sr-inc-r4`: 3hue.net, Cyber-Incident Response Program; 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted. `sr-inc-mxdr`: 3HUE service catalog, September 2026 · proposed. `sr-det-r1`: 3hue.net, continuous risk management; 3HUE service catalog, September 2026 · adapted. `sr-det-tier`: 3HUE service catalog, September 2026 · derived. `sr-det-r2`: 3HUE service catalog, September 2026 · proposed. `sr-det-r3`: 3HUE service catalog, September 2026 · proposed. `sr-early-r2`: 3HUE service catalog, September 2026 · adapted. `sr-early-ttx`: The Message Stack §08, words we use · adapted. No coverage, speed or volume claim is made for managed detection and response anywhere in this node; `sr-det-r2` is the single line that answers the coverage question, and it answers it with scope.

---

### `sr-proof` — Who actually closed things like this

*scene:* door:stay-ready

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `sr-p1` | — | always | *(ref `doors.stay-ready.proof.0`)* Engagements are scoped and delivered by the same practitioner, whose background includes closing FDA 483 observations and remediating bank Matters Requiring Attention under sustained examination. |
| 2 | `sr-p4` | — | always | Findings like those don't close because someone advised on them. Someone closed them. |

**Room shows** — Node base state (before any line): `sr-monitor-1` status: December ✓ · `sr-monitor-2` status: March ? · `sr-monitor-3` status: Today ? · `sr-panel-1` cleared · `sr-panel-2` cleared · `sr-panel-3` cleared · `sr-rack` cleared · `sr-clock` cleared. Every shelf sign from `sr-receive` goes out before the proof beat; nothing this room recommended is still lit behind somebody else's record.
`sr-p1` frames `sr-panel-1`, the room's measured proof surface; writes `sr-panel-1` sign: FDA 483 observations closed · `sr-panel-2` sign: Bank MRAs remediated · `sr-panel-3` sign: Under sustained examination · callout `doors.stay-ready.proof.0`.
`sr-p4` frames nothing and writes nothing.
**Choice** — none. Continues to `sr-next`.
**Ask chips** — proof · exam-findings · remediation-owner · different
**Sources** — `sr-p1`: ref `doors.stay-ready.proof.0` — basis 3HUE approved 100-word boilerplate · approved-copy. `sr-p4`: The Message Stack §01, core narrative · adapted.

---

### `sr-next` — What you'd bring, and what you'd decide

*scene:* door:stay-ready

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `sr-exam-next` | — | trigger = exam | Your next step: bring the finding, its date, and who owns it today. |
| 2 | `sr-inc-n` | — | trigger = incident | Your next step: walk the team through your last scare. They scope the plan around it. |
| 3 | `sr-det-n` | — | trigger = detect | Your next step: bring the list of tools you already pay for. |
| 4 | `sr-early-next` | — | trigger = early | Take a summary with you, and come back when something puts a date on it. |
| 5 | `sr-decision` | — | always | *(ref `doors.stay-ready.decision`)* Establish the accountable programs and managed practices that make readiness continuous. |

**Room shows** — Node base state (before any line): every surface cleared — `sr-monitor-1`, `sr-monitor-2`, `sr-monitor-3`, `sr-panel-1`, `sr-panel-2`, `sr-panel-3`, `sr-rack`, `sr-clock`. The room goes quiet for the decision.
`sr-exam-next`, `sr-inc-n`, `sr-det-n` and `sr-early-next` frame nothing and write nothing.
`sr-decision` frames `sr-panel-3`; writes `sr-panel-3` sign: {ref:doors.stay-ready.decision}. `sr-panel-3` is this room's measured decision surface, and it is the only thing lit when the visitor chooses.
**Choice** — "Where next?" (id `sr-next`, remembers nothing): "Show me where I'd start" / *The tower: your first step, and what follows* → `path` · "Walk another door" / *{str:legend}* → `lobby-again` · "Ask {guide} a question" / *Answers from 3HUE's approved material* → action `ask` · "{str:talk}" → action `talk`. Option ids: `start` · `another` · `ask` · `talk`.
**Ask chips** — quote · where-to-start · live-incident · pricing
**Sources** — `sr-exam-next`: The Forcing Function §04, trigger events · adapted. `sr-inc-n`: Tour script, linking line · proposed. `sr-det-n`: Tour script, linking line · proposed. `sr-early-next`: The Message Stack §07, battlecards · adapted. `sr-decision`: ref `doors.stay-ready.decision` — the field carries no source or status of its own, so nothing prints beneath it.

---

### `all-sr` — The third room on the everything walk

*scene:* door:stay-ready

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `all-sr-1` | — | always | *(ref `doors.stay-ready.opening`)* Your controls passed in December. The question is what they were doing in March. |
| 2 | `all-sr-3` | — | always | Behind this door: response, continuity, detection, and the programs that run them. |
| 3 | `all-sr-4` | — | always | The start depends on the date. With nothing forcing it, it's a {offer:controls-gap-assessment}. |
| 4 | `all-sr-5` | — | always | With a plan missing, {offer:ir-fast-start}. With alerts nobody reads, {offer:mxdr-complete}. |

**Room shows** — Node base state (before any line): `sr-monitor-1` status: December ✓ · `sr-monitor-2` status: March ? · `sr-monitor-3` status: Today ? · `sr-clock` status: Since the last check · `sr-panel-1` cleared · `sr-panel-2` cleared · `sr-panel-3` cleared · `sr-rack` cleared.
`all-sr-1` frames `sr-monitor-2` and writes nothing beyond the node base state.
`all-sr-3` frames `sr-rack`; writes `sr-panel-1` sign: Response · `sr-panel-2` sign: Continuity · `sr-panel-3` sign: Detection · `sr-rack` glow *(at "programs")* — the same three signs this room shows at `sr-shelf`, so the everything walker sees the shelf the door walker sees.
`all-sr-4` frames `sr-monitor-1`; writes `sr-monitor-1` sign: {offer:controls-gap-assessment}. This is the door's own no-trigger first step, so the tower's `path-all-sr` echoes this screen rather than contradicting it.
`all-sr-5` frames `sr-monitor-3`; writes `sr-monitor-2` sign: {offer:ir-fast-start} · `sr-monitor-3` sign: {offer:mxdr-complete}. Both are conditional on a date this visitor has not named, which is why neither is written as *the* start.
**Choice** — "Three doors walked. Which one is yours?" (id `all-sr-start`, remembers `yours`): "{door:win-trust.title}" / *{door:win-trust.promise}* → `path-all` · "{door:gain-control.title}" / *{door:gain-control.promise}* → `path-all` · "{door:stay-ready.title}" / *{door:stay-ready.promise}* → `path-all` · "Not sure yet" / *Show me all three first steps* → `path-all`. Option ids: `win-trust` · `gain-control` · `stay-ready` · `none`.
**Ask chips** — incident · mdr · exam-findings · packages
**Sources** — `all-sr-1`: ref `doors.stay-ready.opening` — The Forcing Function §06, approved opening line · approved-copy. `all-sr-3`: 3HUE service catalog, September 2026 · derived. `all-sr-4`: 3HUE service catalog, September 2026 · proposed. `all-sr-5`: 3HUE service catalog, September 2026 · proposed.

---

**Manifest changes this chapter requires**

- `content/experience.json` → `doors[2].triggers[2]` becomes "Security tooling is generating alerts that nobody is reading." (`triggers[0]` and `triggers[1]` unchanged.)
- `content/experience.json` → `doors[2].starts.crossing` is deleted and `doors[2].starts.detect` added: `{trigger: 2, lead: "mxdr-complete", alt: "mxdr-starter", ring: ["operate"], source: "3HUE service catalog, September 2026; The Forcing Function §04, trigger events", status: "proposed"}`. `doors[2].starts.exam`, `.incident` and `.early` are unchanged, so `starts.early.lead` stays `controls-gap-assessment` — which is what `sr-early-r2`, `all-sr-4` and the tower's `start-sr-early` all name.
- `content/experience.json` → `doors[2].serviceFamilies[3]` replaces Privacy Management & Data Protection with `{name: "Managed Detection & Response (MDR / MXDR)", examples: ["Managed Detection & Response — Complete", "MXDR Starter", "MXDR — SIEM Add-on", "Managed Security Controls Validation for Endpoints"]}`. All four are Builder services in that exact category and all four have `offers` entries, so `:398–404` pass; the door still lists four families, so `:175` passes for this door whether or not that rule is relaxed for the other two.
- `content/experience.json` → `doors[2].packages` becomes `["ir-fast-start", "mxdr-complete"]`. `pci-dss-readiness` moves to Win Trust and `privacy-leadership-launch` to Gain Control in the same commit; `mxdr-complete` must stay here or `starts.detect.lead` fails `:441`.
- `content/experience.json` → `doors[2].programs` unchanged, `["rmp", "cirp", "soc"]`. `soc` is what puts `mxdr-starter` in this door's LISTED set and `rmp`/`cirp` are what `sr-exam-managed` and `sr-inc-r4` speak as `{program:rmp}` and `{program:cirp}`.
- `content/experience.json` → `doors[2].icp` ("Regulated operators") is deleted, and `tools/check-manifest.js:185–186` (the `O1` assertion) is deleted with it.
- `tools/check-manifest.js:175` — `if ((d.serviceFamilies || []).length !== 4)` becomes *at least three*, in the same commit as the Win Trust and Gain Control family lists. Stay Ready does not need the relaxation, but the commit does not build without it.
- Nothing in this chapter requires a change to `doors[2].opening`, `.stat`, `.statSecondary`, `.program`, `.decision`, `.maturityEmphasis` or `content/surfaces.json`. All eight `sr-*` surfaces exist, all eight carry text, and none is `target: false`.

**Still open for the owner**

- `doors[2].proof[0].text` is 25 words, `approved-copy`, and unsayable at the phrase "remediating bank Matters Requiring Attention under sustained examination". It plays here at `sr-p1` and twice more in Ask. A shorter wording — "The same practitioner scopes the work and delivers it. He has closed FDA findings and bank examiner findings while the exam was still running." — needs the owner's sign-off before it can replace approved copy, and it changes all three places at once.
- `doors[2].triggers[2]` is new copy. The buttons on `sr-trigger` do not speak it, but the lobby door detail and the kiosk render `triggers` under "What creates urgency", so the sentence reaches visitors and needs approval.
- The `detect` lane has no proof of any kind, and none exists in the manifest. Either a sourced one is found, or the room ships with the practitioner record carrying all four lanes.
- `incident-command` is `category: "Fractional Executive & Retainer Services"`, which is not one of this door's four families. `:441` never tests `live`, so `starts.incident.live` passes, and `sr-inc-live` now says out loud that it is not in the package — but it is the one offer this room names whose shelf the room does not hold.
- `doors[2].audience` and `doors[2].share.description` still describe a company type ("regulated and risk-heavy operators"). No line in this chapter reads either field, so nothing here breaks, but both render on the lobby card and the share card after `icp` is deleted.


---

## Tower

### `path` — the tower, where your first step is named

*scene:* path (the tower, no stage lit)

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `path-1` | — | always | This is the tower: {stage:assess}, {stage:strengthen}, {stage:operate} and {stage:advance}. Four stages, one route. |
| 2 | `path-2` | — | always | *(ref `path.whereToStart`)* Each door has its own first step, scoped to the obligation in front of you. |
| 3 | `path-arc` | — | always | Whatever you buy here, the shape is the same: {ref:arc.0} it, {ref:arc.1} it, {ref:arc.2} it. |
| 4 | `start-wt-deal` | — | door = win-trust AND trigger-win-trust = deal | For you, it starts on {stage:assess} and carries into {stage:strengthen}: {offer:soc-2-readiness}. |
| 5 | `start-wt-evidence` | — | door = win-trust AND trigger-win-trust = evidence | For you, it starts on {stage:assess}: the {offer:initial-risk-assessment}, with {offer:rfp-response} for the questionnaire in hand. |
| 6 | `start-wt-scope` | — | door = win-trust AND trigger-win-trust = scope | For you, it starts on {stage:strengthen}: {offer:isms-scope-soa-development}, so the audit has a written boundary. |
| 7 | `start-wt-early` | — | door = win-trust AND trigger-win-trust = early | For you, there's no start yet. When someone asks, it's usually the {offer:initial-risk-assessment}. |
| 8 | `start-gc-crossing` | — | door = gain-control AND trigger-gain-control = crossing | For you, it starts on {stage:assess} and runs on {stage:operate}: {offer:privacy-leadership-launch}, built on {offer:data-mapping-data-inventory}. |
| 9 | `start-gc-ai` | — | door = gain-control AND trigger-gain-control = ai | For you, it starts on {stage:strengthen}: {offer:ai-governance-advisory}, with {offer:security-architecture-reviews} on what the models touch. |
| 10 | `start-gc-vendors` | — | door = gain-control AND trigger-gain-control = vendors | For you, it starts on {stage:operate}: the {program:vcp}, with {offer:asset-governance-program-development} behind it. |
| 11 | `start-gc-early` | — | door = gain-control AND trigger-gain-control = early | For you, there's no start yet. When someone asks about your data, it's usually {offer:data-mapping-data-inventory}. |
| 12 | `start-sr-exam` | — | door = stay-ready AND trigger-stay-ready = exam | For you, it starts on {stage:operate}: a {offer:controls-gap-assessment}, with {offer:risk-register-poam} to carry the findings. |
| 13 | `start-sr-incident` | — | door = stay-ready AND trigger-stay-ready = incident | For you, it starts on {stage:strengthen}: {offer:ir-fast-start}, with {offer:bcp-development} beside it. |
| 14 | `start-sr-detect` | — | door = stay-ready AND trigger-stay-ready = detect | For you, it starts on {stage:operate}: {offer:mxdr-complete}, so somebody is reading what the tools say. |
| 15 | `start-sr-early` | — | door = stay-ready AND trigger-stay-ready = early | For you, there's no start yet. When the next exam is on the calendar, it's usually a {offer:controls-gap-assessment}. |
| 16 | `start-open` | — | notVisited door-win-trust, door-gain-control, door-stay-ready | No door is picked yet. When one is, it usually opens with the {offer:initial-risk-assessment}. |
| 17 | `path-price` | — | notVisited close | There's no list price here. Pricing follows scope and commitment, and the team scopes it with you. |

**Room shows** — nothing is written here: the tower carries no measured surface, so this node holds no `write` at all, which is what keeps `{kind:"path"}` legal for it. The ring is the only display. Ring dark under `path-1`, `path-2` and `path-arc` — no cue, so nothing is lit before the visitor's own start is named · `assess` lit by `start-wt-deal` (cue `{stage: assess}`), `start-wt-evidence` (cue `{stage: assess}`), `start-gc-crossing` (cue `{stage: assess}`) and `start-open` (cue `{stage: assess}`) · `strengthen` lit by `start-wt-scope` (cue `{stage: strengthen}`), `start-gc-ai` (cue `{stage: strengthen}`) and `start-sr-incident` (cue `{stage: strengthen}`) · `operate` lit by `start-gc-vendors` (cue `{stage: operate}`), `start-sr-exam` (cue `{stage: operate}`) and `start-sr-detect` (cue `{stage: operate}`) · the ring stays dark through `start-wt-early`, `start-gc-early` and `start-sr-early`: no cue, because there is no start yet to light, and the manifest gives all three `ring: []` · `path-price` carries no cue, and whatever the start line lit stays lit under it. Every stage a cue names is the same stage that start's `ring` names in `content/experience.json`.

**Choice** — "Is a program in place today?" (id `program`, remembers `program`): "Nothing formal yet" / sub "Nothing written down, or nothing recent" → `start-baseline` (stores `none`) · "It's due a fresh look" / sub "Written down, not looked at lately" → `start-review` (stores `review`) · "It's running" / sub "Owned, operated, evidenced" → `start-running` (stores `running`)

**Ask chips** — pricing · quote · prepare · after

**Sources** — `path-1`: Lobby manifest: stages · derived · `path-2`: ref `path.whereToStart`, which prints "3HUE service catalog, September 2026; The Forcing Function §02" · proposed · `path-arc`: Lobby manifest: the three steps · derived · `start-wt-deal`, `start-wt-evidence`, `start-wt-scope`, `start-wt-early`, `start-gc-crossing`, `start-gc-ai`, `start-gc-vendors`, `start-gc-early`, `start-sr-exam`, `start-sr-incident`, `start-sr-detect`, `start-sr-early`: 3HUE service catalog, September 2026 · proposed · `start-open`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience); 3HUE service catalog, September 2026 · adapted · `path-price`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted

---

### `start-baseline` — nothing formal yet, so the baseline comes first

*scene:* path · stage: assess

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `baseline-open` | — | always | Then the order matters, and the first thing is a baseline. |
| 2 | `baseline-1` | — | door = win-trust AND trigger-win-trust = deal, evidence or early; **or** door = gain-control AND trigger-gain-control = crossing or early | Then nothing goes in front of it. The baseline is part of that first step. |
| 3 | `baseline-2` | — | door = win-trust AND trigger-win-trust = scope; **or** door = gain-control AND trigger-gain-control = ai or vendors; **or** door = stay-ready AND trigger-stay-ready = exam, incident, detect or early; **or** notVisited door-win-trust, door-gain-control, door-stay-ready | The {offer:initial-risk-assessment} comes first, so there's a baseline to build on. |

**Room shows** — nothing is written here: no measured surface, no `write`. The ring only. `assess` lit by the node's own scene and held for every line · `baseline-2` re-cues `{stage: assess}` as the line that names the assessment · `baseline-open` and `baseline-1` carry no cue, so the stage the scene lit simply holds.

**Choice** — none. The node continues to `close`.

**Ask chips** — prepare · after · timeline · pricing

**Sources** — `baseline-open`: Tour script, linking line · proposed · `baseline-1`: 3HUE service catalog, September 2026 · proposed · `baseline-2`: 3HUE service catalog, September 2026; 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted

---

### `start-review` — a program on paper, due a fresh look

*scene:* path · stage: strengthen

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `review-1` | — | always | Then start by reviewing what you have. |
| 2 | `review-wt` | — | door = win-trust AND trigger-win-trust = deal, evidence, scope or early | For you: {offer:is-program-review} and {offer:soa-review}. |
| 3 | `review-gc` | — | door = gain-control AND trigger-gain-control = crossing, ai, vendors or early | For you: {offer:security-architecture-reviews}, and a {offer:data-protection-impact-assessment-dpia} where the data moves. |
| 4 | `review-sr` | — | door = stay-ready AND trigger-stay-ready = exam, incident, detect or early | For you: {offer:cirp-review} and {offer:bcp-review}. |
| 5 | `review-any` | — | notVisited door-win-trust, door-gain-control, door-stay-ready | For you: the {offer:annual-risk-update}, then whichever review fits the door you pick. |

**Room shows** — nothing is written here: no measured surface, no `write`. The ring only. `strengthen` lit by the node's own scene and held for every line · no line carries its own cue.

**Choice** — none. The node continues to `close`.

**Ask chips** — after · prepare · remediation-owner · pricing

**Sources** — `review-1`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted · `review-wt`: 3HUE service catalog, September 2026 · proposed · `review-gc`: 3HUE service catalog, September 2026 · proposed · `review-sr`: 3HUE service catalog, September 2026 · proposed · `review-any`: 3HUE service catalog, September 2026 · proposed

---

### `start-running` — the program is already running

*scene:* path · stage: operate

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `running-1` | — | always | Then the work is scoped around what you already run. |
| 2 | `running-2` | — | always | 3HUE joins what's running rather than replacing it. |
| 3 | `running-3` | — | always | If you want it operated rather than advised, that's a managed program. |

**Room shows** — nothing is written here: no measured surface, no `write`. The ring only. `operate` lit by the node's own scene and held for all three lines · no line carries its own cue.

**Choice** — none. The node continues to `close`.

**Ask chips** — after · msp · platform · aivric

**Sources** — `running-1`: Tour script, linking line · proposed · `running-2`: The Message Stack §06, objection handling; §07, battlecards · adapted · `running-3`: Lobby manifest: pillars · derived

---

### `path-all` — the everything-walker's first step

*scene:* path (the tower, no stage lit)

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `path-all-1` | — | always | Three doors, three first steps, one path: {stage:assess}, {stage:strengthen}, {stage:operate} and {stage:advance}. |
| 2 | `path-all-2` | — | always | *(ref `path.whereToStart`)* Each door has its own first step, scoped to the obligation in front of you. |
| 3 | `path-all-arc` | — | always | Whatever you buy here, the shape is the same: {ref:arc.0} it, {ref:arc.1} it, {ref:arc.2} it. |
| 4 | `path-all-wt` | — | always | {door:win-trust.title} usually starts with {offer:soc-2-readiness}, or the {offer:initial-risk-assessment} if no framework is named yet. |
| 5 | `path-all-gc` | — | always | {door:gain-control.title} starts with {offer:data-mapping-data-inventory}: what you hold, and where it goes. |
| 6 | `path-all-sr` | — | always | {door:stay-ready.title} starts with a {offer:controls-gap-assessment} on what is already running. |
| 7 | `path-all-yours` | — | yours = win-trust, gain-control or stay-ready | You named {answer:yours}. That door's first step is the one to take with you. |
| 8 | `path-all-none` | — | yours = none | You didn't name one, and you don't have to. Without a door, the first step is usually the {offer:initial-risk-assessment}. |
| 9 | `path-all-price` | — | notVisited close | There's no list price here. Pricing follows scope and commitment, and the team scopes it with you. |

**Room shows** — nothing is written here: no measured surface, no `write`. The ring only. Ring dark under `path-all-1`, `path-all-2` and `path-all-arc` · `assess` lit by `path-all-wt` (cue `{stage: assess}`) and held by `path-all-gc` (cue `{stage: assess}`) · `operate` lit by `path-all-sr` (cue `{stage: operate}`) · `path-all-yours` carries no cue: it speaks about a door the line itself does not name, and the three doors do not share one stage, so the ring rests where `path-all-sr` left it rather than making a claim the line cannot support (see "Still open") · `path-all-none` re-lights `assess` (cue `{stage: assess}`), which is that visitor's own step · `path-all-price` carries no cue and holds whatever is lit.

**Choice** — none. The node continues to `close`.

**Ask chips** — where-to-start · prepare · after · pricing

**Sources** — `path-all-1`: Lobby manifest: stages · derived · `path-all-2`: ref `path.whereToStart`, which prints "3HUE service catalog, September 2026; The Forcing Function §02" · proposed · `path-all-arc`: Lobby manifest: the three steps · derived · `path-all-wt`: 3HUE service catalog, September 2026 · proposed · `path-all-gc`: 3HUE service catalog, September 2026 · proposed · `path-all-sr`: 3HUE service catalog, September 2026 · proposed · `path-all-yours`: Tour script, linking line · proposed · `path-all-none`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience); 3HUE service catalog, September 2026 · adapted · `path-all-price`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted

---

**Manifest changes this chapter requires**

- `doors[0].triggers[2]` (`win-trust`) → "A certification audit is booked with no written scope."
- `doors[0].starts`: delete `ai`; add `scope` = `{trigger: 2, lead: "isms-scope-soa-development", alt: "iso-27001-readiness", with: ["system-security-privacy-plan-sspp-development"], then: ["managed-isp"], ring: ["strengthen"], source: "3HUE service catalog, September 2026; The Forcing Function §04, trigger events", status: "proposed"}`. `deal`, `evidence` and `early` are unchanged. Without this rename `start-wt-scope` gates on a value no option stores (`check-manifest.js:632–633`) and `start-wt-ai` is orphaned.
- `doors[0].serviceFamilies` → three families (Risk Assessment & Risk Management · Information Security Program & Governance · ISMS, SSPP & Statement of Applicability); `doors[0].packages` gains `pci-dss-readiness`.
- `doors[1].starts` (`gain-control`) replaced wholesale by `crossing`, `ai`, `vendors`, `early` exactly as C2 writes them. My twelve tower lines each name that start's own lead, so the file and the script move together or neither ships.
- `doors[1].maturityEmphasis` → `["assess","strengthen","operate"]`. `start-gc-ai` cues `{stage: strengthen}` and `start-gc-crossing` cues `{stage: assess}` with `operate` in its ring; today's `["assess","operate","advance"]` warns at `check-manifest.js:460` on `strengthen`, and no Gain Control line lights Advance any more.
- `doors[1].serviceFamilies` → Privacy Management & Data Protection · Vendor & Third-Party Risk Management · Security Engineering & Architecture; `doors[1].packages` → `["privacy-leadership-launch"]`; `doors[1].programs` → `["vcp","sea"]`. `review-gc` names `security-architecture-reviews` and `data-protection-impact-assessment-dpia`, both of which are family examples under this list, so the room's panel lists what the tower recommends to it.
- `doors[2].triggers[2]` (`stay-ready`) → "Security tooling is generating alerts that nobody is reading."; `doors[2].starts`: rename `crossing` → `detect` = `{trigger: 2, lead: "mxdr-complete", alt: "mxdr-starter", ring: ["operate"], source: "3HUE service catalog, September 2026; The Forcing Function §04, trigger events", status: "proposed"}`; `doors[2].serviceFamilies` drops Privacy Management & Data Protection for Managed Detection & Response (MDR / MXDR); `doors[2].packages` loses `pci-dss-readiness` and `privacy-leadership-launch`.
- `tools/check-manifest.js:175` — `if ((d.serviceFamilies || []).length !== 4)` becomes a minimum of three, or Win Trust and Gain Control each fail on their own family lists.
- `tools/check-manifest.js:185–186` — the `O1` icp assertion is deleted along with `doors[].icp`.
- `content/tour.json` `nodes.start-running.scene` → `{kind: "path", stage: "operate"}` (it is `"keep"` today), per C3.
- `content/tour.json`: `start-notyet` and `baseline-3` are deleted, and `path-all-start` is replaced by `path-all-yours` / `path-all-none`. No line in this chapter reads `segment` or `situation` any more.

**Still open for the owner**

- **`path-all-yours` cannot light the ring for the door the visitor named.** The contract fixes it as one line with an OR gate over three `yours` values, and Win Trust and Gain Control both begin on Assess while Stay Ready begins on Operate — so no single cue is true for all three. I have left it uncued, which means the ring rests on Operate from `path-all-sr` while the line speaks. Splitting it into three door-gated lines (`path-all-yours-wt` / `-gc` / `-sr`, same sentence, three cues) would fix the frame; that is a change to C4's published line set, so it is yours to make, not mine.
- **The everything-walker who taps `where-to-start` on `path-all` lands on `path` with nothing to hear.** C8 puts that chip on `path-all` and its `goto` is `path`. That visitor carries `door = stay-ready` from `js/tour.js:449` and no `trigger-*` answer, so none of the twelve start lines fires; `start-open` is gated off because all three door chapters are visited. They get `path-1`, `path-2`, `path-arc`, `path-price` and the program question. Either add one `yours`-gated tower line, or accept the thin frame — the visitor has just been given their step at `path-all`, one node earlier.
- **Gain Control's "fresh look" branch changed offers.** `rmp-review` and `annual-risk-update` are Risk Assessment & Risk Management, which leaves Gain Control's shelf under C2, and the RMP is no longer one of its programs. I re-pointed `review-gc` to `security-architecture-reviews` and the DPIA, both on the new shelf. Confirm those are the right answer for a Gain Control visitor whose program is written down but stale, or name two others from that door's three families.
- **`start-baseline`, `start-review` and `start-running` are still unreachable on the everything route,** because `path-all` has no choice. Adding the `program` choice to `path-all` would make all three reachable and would let close's Talk option show as Suggested, which reads `program`. I have not added it: this visitor asked to see everything rather than be sorted, and all three nodes are already safe for them if you do.


---

## Close and summary

### `close` — the last stop: what you'd do next

*scene:* `rest`

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `close-back-huey` | huey | answers `lead` = avi | Welcome back. |
| 2 | `close-back-avi` | avi | answers `lead` = huey | Welcome back. |
| 3 | `close-1-all` | — | answers `yours` = win-trust, gain-control or stay-ready | You've seen all three, and you named the one that's yours. |
| 4 | `close-1-none` | — | answers `yours` = none | You've seen all three. All three begin in the same place. |
| 5 | `close-1` | — | any of: `trigger-win-trust` = deal, evidence, scope · `trigger-gain-control` = crossing, ai, vendors · `trigger-stay-ready` = exam, incident, detect | That's your door, and where you'd start. |
| 6 | `close-2` | — | always | Your summary names that first step, so the conversation with the team starts there. |
| 7 | `close-person` | — | always | Some of this needs a person, not a program. If that's you, say so when you talk to us. |
| 8 | `close-3` | — | any of: notVisited `door-win-trust` · notVisited `door-gain-control` · notVisited `door-stay-ready` | You can talk to the team, take the summary, walk another door, or ask us anything. Nothing leaves this browser unless you send it. |
| 9 | `close-3-all` | — | visited `door-win-trust` + `door-gain-control` + `door-stay-ready` | You can talk to the team, take the summary, or ask us anything. Nothing leaves this browser unless you send it. |

**Room shows** — nothing. `close` is a `rest` scene on the lobby plate, and `surfaces.json` measures surfaces only for `win-trust`, `gain-control` and `stay-ready`, so there is no lobby surface to write and none left lit from a room: `tools/check-manifest.js:714` would reject a write here in any case. No line carries a `cue`. The only cue a rest scene takes is `{door:<id>}`, and pinning one doorway would tell a two-door or three-door visitor that the wrong one is theirs. No line speaks the price sentence: under C7 it is spoken once, at `path` or `path-all`, both gated `notVisited: ["close"]`, and read once more at `sum-price`.

**Choice** — "What would you like to do?" (id `close`, remembers nothing): "{str:talk}" → action `talk`, suggested when `program` = none, review or running · "{str:tourSummary}" (sub: Opens your email app, or copy it) → action `summary` · "Walk another door" (sub: {str:legend}) → `lobby-again` · "Ask {guide} a question" (sub: Answers from 3HUE's approved material) → action `ask`

**Ask chips** — quote · hire · proof · privacy

**Sources** — `close-back-huey`: Tour script, linking line · proposed · `close-back-avi`: Tour script, linking line · proposed · `close-1-all`: Tour script, linking line · proposed · `close-1-none`: 3HUE service catalog, September 2026 · proposed · `close-1`: Tour script, linking line · proposed · `close-2`: Tour script, linking line · proposed · `close-person`: Tour script, linking line · proposed · `close-3`: Tour script, linking line · proposed · `close-3-all`: Tour script, linking line · proposed

---

### `summary` — the email the visitor sends themselves

*scene:* — (`tour.summary`, not a node: read, never spoken, never staged)

Subject: **Your 3HUE tour, and where you'd start**

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `sum-intro` | — | always | Your tour of the 3HUE lobby with {guide}. This summary was built in your browser. |
| 2 | `sum-what` | — | always | 3HUE builds and operates security, compliance and AI governance programs for organizations that have to prove their controls work — and have no one inside to run them. |
| 3 | `sum-situation` | — | answers `situation` = prove, own, run or browse | What you told us at the door: {answer:situation} |
| 4 | `sum-front` | — | always | One step is shared. Any of the three can begin in the same place: the {offer:initial-risk-assessment}. |
| 5 | `sum-wt` | — | visited `door-win-trust` | {door:win-trust.title}: {door:win-trust.promise} |
| 6 | `sum-wt-deal` | — | visited `door-win-trust` · `trigger-win-trust` = deal | Where you'd start: {offer:soc-2-readiness}, or {offer:iso-27001-readiness} if your buyer names ISO. {program:isp} keeps it current. |
| 7 | `sum-wt-evidence` | — | visited `door-win-trust` · `trigger-win-trust` = evidence | Where you'd start: the {offer:initial-risk-assessment}, with {offer:rfp-response} for the questionnaire already in your inbox. {program:isp} keeps it current. |
| 8 | `sum-wt-scope` | — | visited `door-win-trust` · `trigger-win-trust` = scope | Where you'd start: {offer:isms-scope-soa-development}, so the audit has a written boundary before it begins. {program:isp} keeps it current. |
| 9 | `sum-gc` | — | visited `door-gain-control` | {door:gain-control.title}: {door:gain-control.promise} |
| 10 | `sum-gc-crossing` | — | visited `door-gain-control` · `trigger-gain-control` = crossing | Where you'd start: {offer:privacy-leadership-launch}, beginning with {offer:data-mapping-data-inventory} so you know what you hold and where. |
| 11 | `sum-gc-ai` | — | visited `door-gain-control` · `trigger-gain-control` = ai | Where you'd start: {offer:ai-governance-advisory}, with {offer:security-architecture-reviews} on the build side. {program:sea} carries the engineering work. |
| 12 | `sum-gc-vendors` | — | visited `door-gain-control` · `trigger-gain-control` = vendors | Where you'd start: {program:vcp}, after {offer:asset-governance-program-development} names what you own. {offer:audit-support} covers the auditor, theirs or yours. |
| 13 | `sum-sr` | — | visited `door-stay-ready` | {door:stay-ready.title}: {door:stay-ready.promise} |
| 14 | `sum-sr-exam` | — | visited `door-stay-ready` · `trigger-stay-ready` = exam | Where you'd start: a {offer:controls-gap-assessment}, then {offer:risk-register-poam} until every finding closes. {program:rmp} keeps it that way. |
| 15 | `sum-sr-incident` | — | visited `door-stay-ready` · `trigger-stay-ready` = incident | Where you'd start: {offer:ir-fast-start}, with {offer:bcp-development} beside it. {program:cirp} keeps it rehearsed afterwards. |
| 16 | `sum-sr-detect` | — | visited `door-stay-ready` · `trigger-stay-ready` = detect | Where you'd start: {offer:mxdr-complete}, or {offer:mxdr-starter} if you want the smaller footprint first. |
| 17 | `sum-all-wt` | — | answers `yours` = win-trust | You named {door:win-trust.title}. Inside that door, the first step is the {offer:initial-risk-assessment}. |
| 18 | `sum-all-gc` | — | answers `yours` = gain-control | You named {door:gain-control.title}. Inside that door, the first step is {offer:data-mapping-data-inventory}. |
| 19 | `sum-all-sr` | — | answers `yours` = stay-ready | You named {door:stay-ready.title}. Inside that door, the first step is a {offer:controls-gap-assessment}. |
| 20 | `sum-all-none` | — | answers `yours` = none | You didn't name a door, and you don't have to. Without one, the first step is usually the {offer:initial-risk-assessment}. |
| 21 | `sum-early` | — | any of: `trigger-win-trust` = early · `trigger-gain-control` = early · `trigger-stay-ready` = early | You said nobody is asking yet. The shared first step above is the one to take before they do. |
| 22 | `sum-program` | — | answers `program` = none, review or running | Program in place today: {answer:program} |
| 23 | `sum-price` | — | always | There's no list price here. Pricing follows scope and commitment, and the team scopes it with you. |
| 24 | `sum-talk` | — | always | Talk to the team: {url:booking} |

**Room shows** — nothing. The summary is the mailto body and the Copy text (`tools/check-manifest.js:935`); it has no scene, no cue and no write, and `lintLine` is called on it with no scene, so a write would be a hard error.

**Choice** — none. The summary is an action on `close`, not a node.

**Ask chips** — none. The summary carries no Ask surface.

**Sources** — `sum-intro`: Tour script, linking line · proposed · `sum-what`: The Message Stack §09, boilerplate · approved-copy · `sum-situation`: The visitor's answer at arrival · derived · `sum-front`: 3HUE service catalog, September 2026 · proposed · `sum-wt`, `sum-gc`, `sum-sr`: Lobby manifest: door title and promise · derived · `sum-wt-deal`, `sum-wt-evidence`, `sum-wt-scope`, `sum-gc-crossing`, `sum-gc-ai`, `sum-gc-vendors`, `sum-sr-exam`, `sum-sr-incident`, `sum-sr-detect`, `sum-all-wt`, `sum-all-gc`, `sum-all-sr`, `sum-all-none`: 3HUE service catalog, September 2026 · proposed · `sum-early`: 3HUE service catalog, September 2026; The Forcing Function §05, who to decline · proposed · `sum-program`: The visitor's answer on the maturity path · derived · `sum-price`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted · `sum-talk`: Lobby manifest: site.bookingUrl (O2) · derived

---

**Manifest changes this chapter requires**

- `content/tour.json` → `chapters[6].title`: `"The round table"` → `"What you'd do next"`. `entry` stays `close`, `landmark` stays `lobby`, no `eyebrow`. `:841` accepts the landmark; `:839` runs `checkText` over the new title and it carries no figure, no brand slip and no typed Builder name.
- `content/tour.json` → `summary.subject`: `"Your tour of the 3HUE lobby"` → `"Your 3HUE tour, and where you'd start"`.
- `content/tour.json` → `nodes.close.lines`: `close-1-all` re-gated from `{answers:{segment:["all"]}}` to `{answers:{yours:["win-trust","gain-control","stay-ready"]}}` and re-voiced; `close-1-none`, `close-person`, `close-3-all` added; `close-1`'s `when` becomes the OR-list over the nine non-`early` trigger values; `close-3` gains its `notVisited` OR-list. No `segment` gate survives anywhere in this chapter.
- `content/tour.json` → `nodes.close.ask`: `["quote","proof","different","privacy"]` → `["quote","hire","proof","privacy"]`.
- `content/tour.json` → `nodes.close.choice.options[0].suggest` stays `{answers:{program:["none","review","running"]}}`; the proposed `segment = all` branch is dropped. The choice still declares no `remember`.
- `content/tour.json` → `summary.lines`: **deleted** — `sum-wt-trigger`, `sum-wt-ai`, `sum-wt-early`, `sum-gc-trigger`, `sum-gc-acquisition`, `sum-gc-reporting`, `sum-gc-control`, `sum-gc-privacy`, `sum-gc-early`, `sum-sr-trigger`, `sum-sr-crossing`, `sum-sr-early`, `sum-managed`, `sum-all-start`. **Added** — `sum-what`, `sum-situation`, `sum-front`, `sum-wt-scope`, `sum-gc-crossing`, `sum-gc-ai`, `sum-gc-vendors`, `sum-sr-detect`, `sum-all-wt`, `sum-all-gc`, `sum-all-sr`, `sum-all-none`, `sum-early`, `sum-program`, `sum-price`.
- `content/experience.json` → `doors[0].starts`: `ai` retired, `scope` added (`lead: isms-scope-soa-development`, `alt: iso-27001-readiness`, `with: [system-security-privacy-plan-sspp-development]`, `then: [managed-isp]`). Without it `sum-wt-scope` is a `:632` error and a `scope` visitor's email names no step.
- `content/experience.json` → `doors[1].starts`: replaced wholesale by `crossing` / `ai` / `vendors` / `early`, with `early.lead` = `data-mapping-data-inventory`. `sum-gc-crossing`, `sum-gc-ai`, `sum-gc-vendors` and `sum-all-gc` all read from this set; `sum-all-gc` names `early.lead` specifically.
- `content/experience.json` → `doors[1].packages` gains `privacy-leadership-launch` and `doors[1].programs` becomes `["vcp","sea"]`, so `{program:sea}` in `sum-gc-ai` and `{program:vcp}` in `sum-gc-vendors` name programs Gain Control actually runs (`:441`, `:442`).
- `content/experience.json` → `doors[2].starts`: `crossing` renamed `detect` (`lead: mxdr-complete`, `alt: mxdr-starter`). Without it `sum-sr-detect` is a `:632` error.
- `content/tour.json` → `nodes.all-sr.choice`: id `all-sr-start`, `remember: "yours"`, option ids `win-trust` / `gain-control` / `stay-ready` / `none`. `close-1-all`, `close-1-none` and all four `sum-all-*` are dead `:632` errors until this lands; it is the only writer of `yours`.
- `content/tour.json` → `nodes.arrive-question.choice`: `remember: "situation"`, option ids `prove` / `own` / `run` / `browse`. `sum-situation` reads it, and its stem is written for all four labels including "I'd rather see all three".
- `tools/check-manifest.js:175` — `if ((d.serviceFamilies || []).length !== 4)` becomes *at least three*; `:185–186` — the `O1` icp assertion is deleted with `doors[].icp`. Both must move in the same commit as the `starts` changes above or the whole trigger set fails to lint.
- Voice (not rendered here): `close-1-all`, `close-1-none`, `close-person` and `close-3-all` are new line ids and need a first render. `close-back-huey`, `close-back-avi`, `close-1`, `close-2` and `close-3` keep their exact text and need none. Summary lines are never spoken.

**Still open for the owner**

- **`close-1` deliberately excludes the three `early` values.** An `early` visitor hears `close-2` instead of "That's your door, and where you'd start." Adding `early` to the three lists is a one-word change per list, but then `close-2`'s "your summary names that first step" points at `sum-front`'s shared step while the tower named that door's own `early` lead — and under C2 those are now three different offers. My recommendation is to leave `early` out.
- **`sum-early` names no offer, for the same reason.** C1 makes it one shared line across three doors whose `early` leads are now `initial-risk-assessment`, `data-mapping-data-inventory` and `controls-gap-assessment`. It can point at the shared step or at nothing; it cannot name the visitor's own. Naming all three would need three gated lines, which the shared-`sum-early` design forecloses.
- **A visitor who walks all three, names a door, then walks a real door from `lobby-again` hears both `close-1-all` and `close-1`.** That is what C4's gating produces and the two sentences read in order without contradiction, but `close` is the only node where two "that's your door" beats can stack. Worth an ear before sign-off.
- **`incident-command` is not named in the email.** It is `stay-ready.starts.incident.live`, and `:456` requires it to exist, but its category is Fractional Executive & Retainer Services — the people shelf R1 removed. `sr-inc-live` names it in the room. Decide whether a forwarded summary should carry it for a reader who is in an incident right now.
- **Subject line.** "Your 3HUE tour, and where you'd start" replaces "Your tour of the 3HUE lobby" because the email's payload is the first step, not the visit. Pure copy choice.


---

## Ask console

# Chapter — Ask console

*Scope: `ask.intro` plus the 35 live questions, and `nodes.<id>.ask` chips. Ask entries are not nodes: they carry no `scene` field in the JSON, no `when` (Ask answers are never gated on an answer key), and no `write` — `check-manifest.js:783` refuses a write outside a node's own lines, so no Ask line touches a surface. `*scene:* keep` below is the sheet's convention for "the room stays as the visitor left it", not a JSON value. The `who` column is `—` on every line in this chapter: no Ask answer is pinned to a guide, so `withGuides` (`:552`) resolves `{guide:*}` for whichever guide the visitor put in the lead. vCIO, Get-Well and AI Snapshot stay held and are outside the 35.*

---

### `ask-intro` — the line under the Ask field
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-intro` | — | — | Ask me about 3HUE. I answer only from 3HUE's approved material, and every answer shows where it comes from. |

**Sources** — `ask-intro`: Tour script, linking line · proposed

---

### `ask · what-is-3hue` — the orientation answer
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-what-1` | — | — | 3HUE builds and operates security, compliance and AI governance programs for organizations that have to prove their controls work — and have no one inside to run them. |
| 2 | `ask-what-3` | — | — | People call when someone with leverage asks for proof: a customer, an auditor, a regulator, an investor. Usually with a date. |

**Question** — "What is 3HUE?" · keys: 3hue · who · company · firm · about · what do you do · consulting · Learn more `about` · Take me there: none
**Sources** — `ask-what-1`: The Message Stack §09, boilerplate · approved-copy · `ask-what-3`: The Forcing Function §01, the fit model; §04, trigger events · adapted

---

### `ask · guides` — who is talking
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-guides-1` | — | — | We're your two guides for this lobby. One of us leads and the other stays close, and you chose who leads. |
| 2 | `ask-guides-2` | — | — | *(ref `guide.disclosure`)* Avi's and Huey's voices are synthetic: computer-generated speech, not recordings of people. |

**Question** — "Who are {guide:avi} and {guide:huey}?" · keys: guide · guides · who are you · avi · huey · your name · voice · real person · human · synthetic · recording · Learn more: none · Take me there: none
**Sources** — question-level: ElevenLabs, licensed synthetic voices · derived (inherited by `ask-guides-2`) · `ask-guides-1`: Tour script, linking line · proposed

---

### `ask · different` — against a consultant
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-different-1` | — | — | Two things. 3HUE runs the program instead of handing you a plan, and the same advisor who scopes the work delivers it. |
| 2 | `ask-different-2` | — | — | 3HUE doesn't sell technology. It sells outcomes: a program someone runs, and can prove. |

**Question** — "How is 3HUE different from a consultant?" · keys: different · difference · consultant · consultancy · advisor · why you · why 3hue · unique · choose · Learn more `about` · Take me there: none
**Sources** — `ask-different-1`: The Message Stack §03, three pillars; §05, claims library · adapted · `ask-different-2`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience); The Message Stack §03, three pillars · adapted

---

### `ask · where-to-start` — the shared front step
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-start-4` | — | — | Not from a door. Whichever door fits you, the first step is usually the same: an assessment of where you actually stand. |
| 2 | `ask-start-2` | — | — | With no program yet, that's usually the {offer:initial-risk-assessment}. With one running, a review. With an exam coming, a {offer:controls-gap-assessment}. |
| 3 | `ask-start-3` | — | — | It begins with a conversation with the team about the obligation in front of you. |

**Question** — "Where do we start?" · keys: start · begin · first · first step · entry · step · engage · how does it start · Learn more `contact` · Take me there: `path`
**Sources** — `ask-start-4`: 3HUE service catalog, September 2026 · adapted · `ask-start-2`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience); 3HUE service catalog, September 2026 · adapted · `ask-start-3`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted

---

### `ask · prepare` — what to have ready
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-prepare-1` | — | — | Very little up front. A first meeting sets the scope, and the analysts work from the policies, controls and audit reports you already have. |
| 2 | `ask-prepare-2` | — | — | Having people from IT, security and compliance free for short interviews is what speeds it up most. |

**Question** — "What should we prepare for an assessment?" · keys: prepare · preparation · need · bring · before · documents · inventory · ready · Learn more `risk-posture` · Take me there: none
**Sources** — both lines: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted

---

### `ask · after` — after the first step
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-after-1` | — | — | Then {ref:arc.1} and {ref:arc.2}. The findings become a prioritized plan with named owners, and if you want 3HUE to run the program, it does. |
| 2 | `ask-after-2` | — | — | If you'd rather take the plan and run it yourself, that works too — and an internal hire inherits something rather than starting over. |

**Question** — "What happens after the first step?" · keys: after · then · next · build · operate · program · ongoing · gap assessment · results · Learn more `isg-programs` · Take me there: none
**Sources** — `ask-after-1`: The lobby's three steps; 3HUE, Inside 3HUE tour, Ask (3hue.net/experience); The Ship List §03, landing page copy · adapted · `ask-after-2`: The Ship List §03, landing page copy · adapted

---

### `ask · remediation-owner` — who owns the fix
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-owner-1` | — | — | Accountability stays with you. Every gap gets a named owner and a due date, tracked under {offer:risk-register-poam}. |
| 2 | `ask-owner-2` | — | — | 3HUE does the heavy lifting. The managed programs track and drive the actions, and 3HUE's engineers can make fixes directly. |

**Question** — "Who owns remediation?" · keys: owns · owner · ownership · responsible · remediation · accountability · who fixes · fix · Learn more `risk-posture` · Take me there: none
**Sources** — both lines: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted

---

### `ask · risk-priority` — how risk is ranked
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-priority-1` | — | — | By business impact, not only technical severity. |
| 2 | `ask-priority-2` | — | — | The {program:rmp} scores each risk against your risk appetite and your obligations, and records it in the risk register. |

**Question** — "How is risk prioritized?" · keys: prioritized · prioritize · priority · ranked · severity · impact · score · risk appetite · Learn more `risk-posture` · Take me there: none
**Sources** — both lines: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted

---

### `ask · rmp` — the risk management program
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-rmp-1` | — | — | It sets up a risk function that identifies, prioritizes and reduces security risk continuously, with a risk register, assessments and remediation tracking. |
| 2 | `ask-rmp-2` | — | — | It keeps you ready for regulatory reviews and partner due diligence. It sits behind {door:stay-ready.title}. |

**Question** — "What is the {program:rmp}?" · keys: risk management · risk program · rmp · risk register · risk function · Learn more `isg-programs` · Take me there: `sr` (was `gc`)
**Sources** — `ask-rmp-1`: 3hue.net, ISG managed programs · adapted · `ask-rmp-2`: 3hue.net, ISG managed programs; 3HUE service catalog, September 2026 · adapted

---

### `ask · vendor` — third-party risk
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-vendor-1` | — | — | The {program:vcp} holds vendor practices to your risk tolerance, your contracts and your regulators' expectations. |
| 2 | `ask-vendor-2` | — | — | It keeps vendor assurance audit-ready and checks your highest-risk vendors proactively. It sits behind {door:gain-control.title}. |

**Question** — "How do you manage vendor and third-party risk?" · keys: vendor · vendors · third party · third-party · supplier · vcp · supply chain · Learn more `isg-programs` · Take me there: `gc` (new)
**Sources** — `ask-vendor-1`: 3hue.net, ISG managed programs · adapted · `ask-vendor-2`: 3hue.net, ISG managed programs; 3HUE service catalog, September 2026 · adapted

---

### `ask · incident` — what a response looks like
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-incident-1` | — | — | The {program:cirp} gives you a plan and clear roles: who decides, who escalates, and how containment and recovery are run. |
| 2 | `ask-incident-2` | — | — | Tabletop exercises mean the first real incident isn't the first rehearsal. To start, there's {offer:ir-fast-start}, behind {door:stay-ready.title}. |

**Question** — "What happens during a security incident?" · keys: incident · breach · ransomware · response · attack · hacked · emergency · tabletop · Learn more `cirp` · Take me there: `sr`
**Sources** — `ask-incident-1`: 3hue.net, Cyber-Incident Response Program · adapted · `ask-incident-2`: 3hue.net, Cyber-Incident Response Program; 3HUE service catalog, September 2026 · adapted

---

### `ask · live-incident` — someone is in one now
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-live-1` | — | — | Then don't wait for a tour. Talk to the team now. |
| 2 | `ask-live-2` | — | — | For a live incident, 3HUE offers {offer:incident-command}. |

**Question** — "We're in an incident right now." · keys: right now · live incident · happening now · under attack · urgent · help now · Learn more `contact` · Take me there: none, deliberately — someone in an incident is not walked into a room
**Sources** — `ask-live-1`: Tour script, linking line · proposed · `ask-live-2`: 3HUE service catalog, September 2026 · proposed

---

### `ask · mdr` — managed detection and response
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-mdr-1` | — | — | Monitoring, detection and response run for you: alerts correlated across your systems, threats hunted, and controls tested. |
| 2 | `ask-mdr-2` | — | — | On the service list it's {offer:mxdr-complete}, behind {door:stay-ready.title}. |

**Question** — "What does managed detection and response include?" · keys: mdr · mxdr · soc · monitoring · detection · xdr · security operations · threat hunting · Learn more `operations` · Take me there: `sr` (new)
**Sources** — `ask-mdr-1`: 3hue.net, continuous risk management · adapted · `ask-mdr-2`: 3HUE service catalog, September 2026 · proposed

---

### `ask · vciso` — what the role does
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-vciso-1` | — | — | Executive security leadership that works with your team: it shapes strategy, drives decisions, oversees compliance and owns the board conversation. |
| 2 | `ask-vciso-2` | — | — | How much you use is your call. {offer:ciso-support} builds your own capability, behind {door:win-trust.title}. |

**Question** — "What is {program:vciso}?" · keys: vciso · virtual ciso · fractional · fractional ciso · security leadership · ciso as a service · Learn more `isg-programs` · Take me there: none
**Sources** — `ask-vciso-1`: 3hue.net, ISG managed programs; 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted · `ask-vciso-2`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience); 3HUE service catalog, September 2026 · adapted

---

### `ask · have-ciso` — there is already one in post
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-haveciso-1` | — | — | That's common. The managed programs run alongside your own leadership. When the incumbent is stretched, there's {program:vciso}. |

**Question** — "What if we already have a CISO?" · keys: already have · our ciso · existing ciso · cio · security leader · incumbent · Learn more `isg-programs` · Take me there: none
**Sources** — `ask-haveciso-1`: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted

---

### `ask · hire` — why not hire instead
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-hire-1` | — | — | Eventually you probably should. The question is whether there is a full-time job there yet, or a program that has to exist now. |
| 2 | `ask-hire-2` | — | — | 3HUE runs the program now and builds it so that hire inherits something rather than starting over. |
| 3 | `ask-hire-3` | — | — | And if what you want is a person rather than a program, say that to the team. |

**Question** — "Why not just hire a CISO?" · keys: hire · hiring · employee · full-time · in-house · headcount · someone · Learn more `isg-programs` · Take me there: none
**Sources** — `ask-hire-1`, `ask-hire-2`: The Message Stack §06, objection handling · adapted · `ask-hire-3`: Tour script, linking line · proposed

---

### `ask · frameworks` — which standards
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-frameworks-1` | — | — | It depends on who is asking you to prove it. If an examiner is asking, 3HUE works in the frameworks the exam already uses. |
| 2 | `ask-frameworks-2` | — | — | If an enterprise buyer is asking, it's usually SOC 2 or ISO 27001. |
| 3 | `ask-frameworks-3` | — | — | You'd take {offer:soc-2-readiness} or {offer:iso-27001-readiness}, not both — whichever your buyer named. |

**Question** — "Which frameworks do you work with?" · keys: framework · frameworks · soc 2 · iso · 27001 · nist · ffiec · cobit · pci · standard · Learn more `frameworks` · Take me there: none
**Sources** — `ask-frameworks-1`, `ask-frameworks-2`: 3hue.net, framework library; The Forcing Function §04, trigger events · adapted · `ask-frameworks-3`: 3HUE service catalog, September 2026 · proposed

---

### `ask · timeline` — how long
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-timeline-1` | — | — | It depends on the obligation and the date on it. |
| 2 | `ask-timeline-2` | — | — | The first step is scoped to that date, and the plan you get back says how long the rest takes. |

**Question** — "How long does it take?" · keys: how long · long · take · how much time · fast · quickly · timeline · speed · when · Learn more `contact` · Take me there: none
**Sources** — both lines: The Ship List §03, landing page copy · adapted

---

### `ask · pricing` — how pricing works
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-price-3` | — | — | Scope and commitment set it: what has to be proved, by when, and whether 3HUE runs it afterwards. |
| 2 | `ask-price-2` | — | — | Price it against the deal, exam or exit that's waiting on it, not against a tool subscription. |

**Question** — "How does pricing work?" · keys: price · pricing · cost · costs · fee · budget · expensive · rate · how much · Learn more `contact` · Take me there: none
**Sources** — `ask-price-3`: The Message Stack §06, objection handling; 3HUE, Inside 3HUE tour, Ask (3hue.net/experience) · adapted · `ask-price-2`: The Message Stack §06, objection handling; The Forcing Function §01, the fit model · adapted

---

### `ask · quote` — can I get one here
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-quote-1` | — | — | Not on this site. The team builds it with you; your summary names your first step. |

**Question** — "Can I get a quote here?" · keys: quote · estimate · proposal · build a quote · get a price · Learn more `contact` · Take me there: none
**Sources** — `ask-quote-1`: Tour script, linking line · proposed

---

### `ask · packages` — what a package holds, and where each sits
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-packages-1` | — | — | A package bundles the first steps for one obligation. {offer:soc-2-readiness} runs from the {offer:initial-risk-assessment} to the auditor's walkthroughs. |
| 2 | `ask-packages-2` | — | — | Take {offer:soc-2-readiness} or {offer:iso-27001-readiness}, one or the other, whichever your buyer named. Both sit behind {door:win-trust.title}. |
| 3 | `ask-packages-3` | — | — | {offer:iso-27701-readiness} and {offer:pci-dss-readiness} sit there too. |
| 4 | `ask-packages-4` | — | — | {offer:privacy-leadership-launch} is behind {door:gain-control.title}. {offer:ir-fast-start} and {offer:mxdr-complete} are behind {door:stay-ready.title}. |

**Question** — "What's in a package like {offer:soc-2-readiness}?" · keys: package · packages · bundle · readiness · fast start · launch · Learn more `security-compliance` · Take me there: none
**Sources** — all four lines: 3HUE service catalog, September 2026 · adapted

---

### `ask · auditor` — are you the auditor
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-auditor-1` | — | — | No. 3HUE prepares you for the auditor and coordinates the walkthroughs. The audit firm issues the report. |

**Question** — "Are you the auditor?" · keys: auditor · audit firm · cpa · issue the report · attest · audit · Learn more `security-compliance` · Take me there: none
**Sources** — `ask-auditor-1`: 3hue.net, security and compliance services · adapted

---

### `ask · msp` — we already have a provider
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-msp-1` | — | — | Ask them three questions. Which framework are we assessed against? Who signs off on risk acceptance? What happens when an auditor challenges a control? |
| 2 | `ask-msp-2` | — | — | If the answers are good, you're in fine shape. If they're vague, that's the gap 3HUE fills, alongside your MSP, not instead of it. |

**Question** — "Our MSP already handles security. Where do you fit?" · keys: msp · mssp · managed service · it provider · outsourced · existing team · integrate · Learn more `isg-programs` · Take me there: none
**Sources** — `ask-msp-1`: The Message Stack §06, objection handling · adapted · `ask-msp-2`: The Message Stack §06, objection handling; §07, battlecards · adapted

---

### `ask · platform` — we already bought a tool
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-platform-1` | — | — | Keep it. A platform tells you what's wrong. The question is who fixes it, who answers the questionnaire, and who negotiates scope with the auditor. |
| 2 | `ask-platform-2` | — | — | That's the job 3HUE does, on top of the tool you already bought. |

**Question** — "We already pay for a compliance platform. Why would we need you?" · keys: platform · tool · software · compliance platform · automation · already pay · Learn more `security-compliance` · Take me there: none
**Sources** — both lines: The Message Stack §06, objection handling · adapted

---

### `ask · grc-system` — where the system runs
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-grc-1` | — | — | On your platform, not 3HUE's. {offer:m365-modern-grc-system-deployment-maintenance} stands it up in the tenant you already have. |
| 2 | `ask-grc-3` | — | — | If you already run an enterprise GRC platform, 3HUE configures and maintains that instead. |

**Question** — "Where does the GRC system run?" · keys: grc · grc system · m365 · microsoft · hosted · portal · where does it run · Learn more `cloudsignals` · Take me there: none
**Sources** — both lines: 3HUE, Inside 3HUE tour, Ask (3hue.net/experience); 3HUE service catalog, September 2026 · adapted

---

### `ask · aivric` — what the platform is
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-aivric-1` | — | — | AiVRIC is the platform 3HUE's managed programs run on, so the evidence stays current between audits instead of being assembled before each one. |
| 2 | `ask-aivric-2` | — | — | The module available today is CloudSignals+RiskOps. Everything else is in development. |

**Question** — "What is AiVRIC?" · keys: aivric · cloudsignals · riskops · the platform · product · module · Learn more `cloudsignals` · Take me there: none
**Sources** — `ask-aivric-1`: The Message Stack §09, boilerplate; §01, core narrative · adapted · `ask-aivric-2`: The Message Stack §05, claims library; 3HUE Brand Sheet §06, naming conventions · adapted

---

### `ask · theater` — isn't this theatre
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-theater-1` | — | — | Mostly, yes. A certificate says controls existed during a window. |
| 2 | `ask-theater-2` | — | — | That's why 3HUE sells the operating layer, not the certificate. You get the report your buyer needs, and a program you need. |

**Question** — "Isn't this just compliance theater?" · keys: theater · theatre · checkbox · box ticking · certificate · paper · Learn more: none · Take me there: none
**Sources** — both lines: The Message Stack §06, objection handling · adapted

---

### `ask · guarantee` — can you promise a pass
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-guarantee-1` | — | — | No, and be careful with anyone who says otherwise. |
| 2 | `ask-guarantee-2` | — | — | What 3HUE can do is tell you before you start whether you'll pass. |
| 3 | `ask-guarantee-3` | — | — | Then scope the work to what the standard actually requires, and manage the auditor so there are no surprises. |

**Question** — "Can you guarantee we pass?" · keys: guarantee · pass · promise · fail · certain · sure · Learn more: none · Take me there: none
**Sources** — `ask-guarantee-1`: The Ship List §03, landing page copy · adapted · `ask-guarantee-2`, `ask-guarantee-3`: The Message Stack §06, objection handling · adapted

---

### `ask · big-firm` — against a large firm
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-big-firm-1` | — | — | Here, the person in the room is the person doing the work, and the scope stays where it was set. |
| 2 | `ask-big-firm-2` | — | — | And when the report is delivered, 3HUE is still running the program. Continuity is usually the difference that matters. |

**Question** — "How is this different from a big-firm readiness engagement?" · keys: big firm · large firm · accounting firm · readiness engagement · partner · analysts · Learn more `about` · Take me there: none
**Sources** — both lines: The Message Stack §06, objection handling · adapted

---

### `ask · ai` — governing AI
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-ai-1` | — | — | With four questions: what can it access, what can it change, who approved it, and what proves it stayed inside. |
| 2 | `ask-ai-2` | — | — | Here the start is {offer:ai-governance-advisory}, built around them, behind {door:gain-control.title}. |

**Question** — "Our customers are asking how we govern AI. Where do we begin?" · keys: ai · artificial intelligence · ai governance · model · llm · machine learning · ai risk · Learn more `ai-governance` · Take me there: `gc` (was `wt`)
**Sources** — `ask-ai-1`: The Forcing Function §04, trigger events · adapted · `ask-ai-2`: 3HUE service catalog, September 2026 · proposed

---

### `ask · private-equity` — a fund with holdings
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-pe-1` | — | — | Yes. For a fund, the first step is the {offer:initial-risk-assessment}, one per company, on the same framework every time. |
| 2 | `ask-pe-4` | — | — | Vendors, privacy and security engineering across the estate sit behind {door:gain-control.title}. |
| 3 | `ask-pe-5` | — | — | When you want one operating picture across holdings, {program:rmp} runs it, behind {door:stay-ready.title}. |

**Question** — "Do you work with private equity portfolios?" · keys: private equity · pe · fund · sponsor · portfolio · family office · acquisition · diligence · Learn more `private-equity` · Take me there: `gc` (unchanged) · chip on no node (C8): typed or spoken only
**Sources** — `ask-pe-1`: 3HUE service catalog, September 2026 · proposed · `ask-pe-4`, `ask-pe-5`: 3HUE service catalog, September 2026 · adapted

---

### `ask · exam-findings` — open findings from an exam
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-exam-1` | — | — | It starts with a {offer:controls-gap-assessment} on what is actually running, not what the policies say. |
| 2 | `ask-exam-4` | — | — | Then every finding is tracked under {offer:risk-register-poam} until it closes. Both are the first step every door shares. |
| 3 | `ask-exam-5` | — | — | What keeps findings closed afterwards sits behind {door:stay-ready.title}. |

**Question** — "We have open exam findings. What does the work look like?" · keys: exam · examiner · finding · findings · mra · regulator · bank · credit union · Learn more `financial-services` · Take me there: `sr` (unchanged)
**Sources** — `ask-exam-1`: 3HUE service catalog, September 2026 · proposed · `ask-exam-4`, `ask-exam-5`: 3HUE service catalog, September 2026 · adapted

---

### `ask · proof` — the three proofs on record
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-proof-1` | — | — | *(ref `doors.win-trust.proof.0`)* No formal security program, then SOC 2 Type I with zero findings and multi-entity SOC 2 Type II across a software portfolio. |
| 2 | `ask-proof-2` | — | — | *(ref `doors.gain-control.proof.0`)* 1,000+ systems certified under one scalable assessment framework. |
| 3 | `ask-proof-3` | — | — | *(ref `doors.stay-ready.proof.0`)* Engagements are scoped and delivered by the same practitioner, whose background includes closing FDA 483 observations and remediating bank Matters Requiring Attention under sustained examination. |

**Question** — "What proof do you have?" · keys: proof · evidence · customer · case study · story · result · references · track record · Learn more `transit-story` · Take me there: none
**Sources** — `ask-proof-1`: Transit Technologies engagement, published customer story · substantiated · `ask-proof-2`: A large North American bank, published customer story, client unnamed · substantiated · `ask-proof-3`: 3HUE approved 100-word boilerplate · approved-copy

---

### `ask · privacy` — what happens to my answers
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-privacy-1` | — | — | This lobby has no sign-up, no analytics and no sign-in. What you type into Ask is matched in this tab and never sent. |
| 2 | `ask-privacy-2` | — | — | Your answers stay in this browser tab, and the summary goes nowhere unless you send it yourself. |
| 3 | `ask-privacy-3` | — | — | If you use the microphone, your browser's own speech service may handle the audio. 3HUE never receives it. |

**Question** — "What happens to my answers?" · keys: privacy · data · answers · tracking · stored · send · email · microphone · Learn more: none · Take me there: none
**Sources** — `ask-privacy-1`, `ask-privacy-2`: How this lobby is built: static files, nothing collected · proposed · `ask-privacy-3`: How this lobby is built: the browser handles the microphone · proposed

---

### `ask · early` — nobody has asked yet
*scene:* keep

| # | line id | who | when | line |
|---|---|---|---|---|
| 1 | `ask-early-1` | — | — | Maybe not yet. The trigger is usually a customer, an insurer, an investor or a regulator asking for proof, with a date. |
| 2 | `ask-early-2` | — | — | If nobody has asked, you may be early, and 3HUE would rather tell you that than sell you something. |

**Question** — "Nobody has asked us to prove anything yet. Should we talk?" · keys: early · nobody · not yet · later · no trigger · should we talk · Learn more: none · Take me there: none
**Sources** — `ask-early-1`: The Message Stack §07, battlecards; The Forcing Function §05, who to decline · adapted · `ask-early-2`: The Ship List §06, discovery script · adapted

---

### `node chips` — what each node suggests
*scene:* keep

Transcribed from the contract's chip table (C8) with no addition, drop or reorder. Every id is one of the 35 approved questions; no node carries more than four (`MAX_SUGGEST`, `:512`, enforced at `:889`) and none repeats (`:890`).

**Ask chips** `arrive` — different · proof · privacy · early
**Ask chips** `handoff-avi` — guides · different · proof · privacy
**Ask chips** `handoff-huey` — guides · different · proof · privacy
**Ask chips** `arrive-question` — what-is-3hue · early · timeline · privacy
**Ask chips** `lobby` — frameworks · packages · different · early
**Ask chips** `lobby-again` — packages · after · different · proof
**Ask chips** `wt` — frameworks · packages · auditor · guarantee
**Ask chips** `wt-moment` — frameworks · auditor · guarantee · timeline
**Ask chips** `wt-change` — frameworks · hire · platform · different
**Ask chips** `wt-receive` — packages · auditor · timeline · pricing
**Ask chips** `wt-proof` — proof · theater · guarantee · big-firm
**Ask chips** `wt-next` — quote · where-to-start · pricing · after
**Ask chips** `all-wt` — frameworks · packages · auditor · guarantee
**Ask chips** `gc` — vendor · ai · msp · packages
**Ask chips** `gc-moment` — vendor · ai · early · msp
**Ask chips** `gc-change` — vendor · ai · different · timeline
**Ask chips** `gc-receive` — packages · vendor · ai · pricing
**Ask chips** `gc-proof` — proof · different · big-firm · theater
**Ask chips** `gc-next` — quote · where-to-start · pricing · vendor
**Ask chips** `all-gc` — vendor · ai · packages · msp
**Ask chips** `sr` — exam-findings · incident · mdr · live-incident
**Ask chips** `sr-moment` — incident · live-incident · mdr · exam-findings
**Ask chips** `sr-change` — remediation-owner · mdr · incident · early
**Ask chips** `sr-receive` — packages · mdr · live-incident · pricing
**Ask chips** `sr-proof` — proof · exam-findings · remediation-owner · different
**Ask chips** `sr-next` — quote · where-to-start · live-incident · pricing
**Ask chips** `all-sr` — incident · mdr · exam-findings · packages
**Ask chips** `path` — pricing · quote · prepare · after
**Ask chips** `start-baseline` — prepare · after · timeline · pricing
**Ask chips** `start-review` — after · prepare · remediation-owner · pricing
**Ask chips** `start-running` — after · msp · platform · aivric
**Ask chips** `path-all` — where-to-start · prepare · after · pricing
**Ask chips** `close` — quote · hire · proof · privacy

Two routing rules the lint cannot see, both held: `where-to-start` (`goto: path`) sits only on `wt-next`, `gc-next`, `sr-next` and `path-all`, so no chip walks a visitor to the tower before a room; and every door-`goto` chip sits only inside its own room — `vendor` and `ai` (`goto: gc`) on the six Gain Control nodes, `incident`, `mdr` and `exam-findings` (`goto: sr`) on the Stay Ready nodes. `private-equity` and `rmp` carry a door `goto` and are on no node at all.

Six questions carry no chip and are reachable by typing or microphone only: `risk-priority`, `rmp`, `vciso`, `have-ciso`, `grc-system`, `private-equity`. That is the contract's count, not a gap.

---

**Conformed under the contract**

- **`ask-what-1` is restored, not retired** (C9). The Message Stack §09 boilerplate stands whole at `approved-copy`, the same string as `arrive-2` and `sum-what`; at 28 filled words it is under `MAX_WORDS = 35`, so `:775` does not warn. The draft's `ask-what-2` paraphrase is cut. `ask-what-3` survives unchanged as the answer's second line — with no door label describing a buyer, the trigger sentence is what tells a visitor whether they are the right person.
- **`ask-price-1` is retired for `ask-price-3`** (C7). The R5 sentence now lives at `path-price`, `path-all-price` and `sum-price` only; a visitor standing at `path` who taps `pricing` no longer hears the sentence the guide just said. `ask-price-2` is unchanged.
- **Seven token-kind collisions honoured** (C5). `{program:rmp}` at `ask-priority-2`, in the `rmp` question stem and at `ask-pe-5` (the draft's `{offer:managed-rmp}` is gone); `{program:vcp}` at `ask-vendor-1`; `{program:cirp}` at `ask-incident-1`. `{offer:mxdr-complete}` stays — "MXDR Complete Protection" is a different Builder name from `programs.soc`.
- **No Builder name is typed as plain text** (seam 8a, 8c, 8d, 8e). `ask-packages-1` stops listing SOC 2 Readiness's contents in prose and names `{offer:initial-risk-assessment}` as a token instead; it no longer says "audit support", which under C5 belongs to Gain Control as `{offer:audit-support}` and is Win Trust's problem to drop, not Ask's to repeat. `ask-owner-1` stops spelling out POA&M and names `{offer:risk-register-poam}`. `ask-grc-1` names `{offer:m365-modern-grc-system-deployment-maintenance}` rather than approximating it, with `ask-grc-3` carrying the enterprise-platform case. `ask-incident-1` stops saying "incident command" in prose two answers away from `{offer:incident-command}`.
- **The lowercase-vCISO dodge is gone** (seam 8c). `programs.vciso.held === true`, and `:305` says a held name stands only as a program name — so it is spoken as `{program:vciso}` at `ask-haveciso-1` and in the question stem, which now reads "What is {program:vciso}?" The keys are untouched, so "virtual ciso" still matches by typing.
- **`ask-hire-1` no longer sizes the visitor** (seam 5b, 7). "At your size, a full-time hire would be under-used for the first year" was the script's only company-size judgement and its only quantified claim not carried by a ref — and "first year" is price-shaped under `PRICEY` (`:286`). It now asks whether there is a full-time job there yet.
- **`ask-exam-3` is dropped from `exam-findings`** (ear test 10.1). `doors.stay-ready.proof.0` is 25 words of institutional noun-stacks and landed three times in one tour; it stays where a proof belongs, at `ask-proof-3`, and once in the Stay Ready room. The exam answer keeps `learnMore: financial-services`.
- **Five lines are cut to the ear** (R12, ear test runners-up). `ask-prepare-1` 26 → 24 words and a four-item list becomes three; `ask-msp-1` becomes three short questions instead of one 26-word sentence; `ask-after-2` 26 → 24; `ask-theater-2` 26 → 22; `ask-exam-1` splits into `ask-exam-1` + `ask-exam-4` so no line runs two five-word product names together. Every text line in this chapter is now 25 filled words or fewer except `ask-what-1`, which the contract fixes verbatim.
- **`ask-start-2` carries all three cases in 24 words** and `ask-start-4` says the sorting rule out loud, replacing the retired `ask-start-1` ref to `path.whereToStart`. Nothing here duplicates `arrive-shared`: C6 gives that sentence to `arrive-question`, and these words are different and answer a different question.
- **Two printed citations that named a retired framing are re-pointed.** `ask-different-2` and `ask-pe-1` printed "The Forcing Function §02, the three segments" to the visitor. Both now cite what the surviving wording actually rests on. I changed no citation whose line body I did not rewrite; the other six lines printing that string (`arrive-q1`, `lobby-2`, `lobby-3`, `lobby-4`, `wt-deal-m1`, `wt-deal-n`, `sr-exam-m1`) belong to other chapters.
- **The chip table is the contract's, not the draft's** (seam D, item 9). Every disagreement between this chapter and the six others is resolved by C8: `what-is-3hue` and `guides` leave `arrive`, `private-equity` leaves all five Gain Control nodes, `where-to-start` leaves `lobby-again`, `aivric` gains a home on `start-running`, and `pricing` stays on both tower nodes.
- **Held facts.** Every answer was re-checked against the banned list: program hours, the 15-minute figure, Whitedog, 60%, "under 6 months", "as fast as 90 days", 50%, the maturity scorecard, "around the clock" and the threat statistics appear nowhere in this chapter, nor does any `vocabulary.forbidden`, `retired` or `avoid` term. Two figures reach the visitor and both arrive through refs that print their own source and status (`ask-proof-1`, `ask-proof-2`).
- **Count.** 35 questions, 78 spoken lines including `ask.intro`. New ids: `ask-start-4`, `ask-priority-2`, `ask-frameworks-3`, `ask-timeline-2`, `ask-price-3`, `ask-packages-3`, `ask-packages-4`, `ask-guarantee-3`, `ask-hire-3`, `ask-grc-3`, `ask-pe-4`, `ask-pe-5`, `ask-exam-4`, `ask-exam-5`. Retired ids: `ask-start-1`, `ask-price-1`, `ask-pe-2`, `ask-pe-3`, `ask-exam-2`, `ask-exam-3`, and the draft's `ask-what-2`. Ids kept through a text rewrite: `ask-what-1`, `ask-prepare-1`, `ask-after-2`, `ask-owner-1`, `ask-priority-1`, `ask-rmp-2`, `ask-vendor-2`, `ask-incident-1`, `ask-incident-2`, `ask-mdr-2`, `ask-vciso-2`, `ask-haveciso-1`, `ask-hire-1`, `ask-frameworks-1`, `ask-frameworks-2`, `ask-quote-1`, `ask-packages-1`, `ask-packages-2`, `ask-msp-1`, `ask-grc-1`, `ask-theater-2`, `ask-guarantee-2`, `ask-ai-2`, `ask-pe-1`, `ask-exam-1`. Nothing is rendered as voice yet, so no audio is invalidated.
- **Verified mechanically against the live repo.** Every text line above was run through the real `figures()`, `builderTypedNames()`, `stripTokens()` and `fillTemplate()` from `js/tourtext.js` and `tools/check-manifest.js` with the shipped `content/experience.json`: no unresolved token, no figure entering through a token or typed into the script, no forbidden/retired/avoid term, no brand slip, no typed door title, stage name, guide name or Builder name, and no line over 25 filled words but `ask-what-1`. Every `learnMore` key is in `site.learnMore.pages`; every `goto` (`path`, `gc` ×2, `sr` ×4) is a node in the 33.

**Manifest changes this chapter requires**

- `content/experience.json` → `doors.win-trust.packages` becomes `["soc-2-readiness","iso-27001-readiness","iso-27701-readiness","pci-dss-readiness"]`. `ask-packages-2` and `ask-packages-3` put all four behind Win Trust; today PCI-DSS Readiness is on Stay Ready.
- `content/experience.json` → `doors.gain-control.packages` becomes `["privacy-leadership-launch"]` (it is `[]` today) and `doors.stay-ready.packages` becomes `["ir-fast-start","mxdr-complete"]`. Prerequisite for `ask-packages-4`, `ask-incident-2` and `ask-mdr-2`.
- `content/experience.json` → `doors.gain-control.programs` becomes `["vcp","sea"]` (today `["rmp","vcp","vciso"]`). Prerequisite for `ask-vendor-2`; it is also what leaves `programs.vciso` on no door, which is why `ask-haveciso-1` and the `vciso` question name the program without claiming a door.
- `content/experience.json` → `doors.gain-control.serviceFamilies` becomes Privacy Management & Data Protection · Vendor & Third-Party Risk Management · Security Engineering & Architecture. Prerequisite for `ask-ai-2` (AI Governance & Privacy Advisory is a privacy service) and `ask-pe-4`.
- `content/experience.json` → `doors.stay-ready.serviceFamilies` drops Privacy Management & Data Protection for Managed Detection & Response (MDR / MXDR). Prerequisite for `ask-mdr-2`.
- `tools/check-manifest.js:175` → `if ((d.serviceFamilies || []).length !== 4)` becomes an at-least-three test, or the two three-family doors above cannot ship.
- `tools/check-manifest.js:185-186` → the `O1` icp assertion is deleted with `doors[].icp`. That also removes the buyer-label entries from the typed-name list built at `:573`, which is what lets `ask-frameworks-1/2` and the `private-equity` question stand rewritten rather than retired.
- No lint rule has to change for Ask itself: `ask.questions` stays at 35 with no cap, every question keeps a source and a status (`:781`), no printed source matches `INTERNAL_SOURCE`, and every `learnMore` key already exists in `site.learnMore.pages`.

**Still open for the owner**

- **`rmp` is spoken as Stay Ready's and filed as Win Trust's.** C5 gives the Managed Risk Management Program name to Stay Ready — `ask-rmp-2`, `ask-pe-5` and the `rmp` question's `goto: sr` all say so — while C2 keeps `doors.win-trust.programs = ["isp","rmp"]`. `doors[].programs` is an `O15_IDS` list the lint treats as never shown, but the quote builder reads it. Either drop `rmp` from Win Trust's list or accept one name on two shelves.
- **`doors.stay-ready.proof.0` is 25 words nobody can say aloud** and it is `approved-copy`, so only you can reword it in the manifest. It is spoken once in the Stay Ready room and read once here at `ask-proof-3`. A shorter version ("The same practitioner scopes the work and delivers it. He has closed FDA findings and bank examiner findings while the exam was still running.") needs your sign-off before either place can use it.
- **`incident-command` has no door family.** Its category is Fractional Executive & Retainer Services, which is on no door's list under C2. `ask-live-2` names it deliberately and claims no door, which is the honest reading — but if you want the live-incident purchase to have a shelf, that family has to go somewhere.
- **The question stem "What is {program:vciso}?" renders with the Builder's em dash** — "What is Virtual CISO — Support?". It is correct and it is the only legal way to name a held service. If you want it to read more naturally, the Builder name has to change, which is outside this script.
- **Gain Control's largest shelf still has no question of its own.** Privacy Management & Data Protection is 12 live services and only `ai` and `packages` touch it. The shape, if you want it: "Do you run privacy programs?", answered with `{offer:privacy-leadership-launch}`, `{offer:managed-privacy}` and `{offer:data-mapping-data-inventory}` behind `{door:gain-control.title}`, `learnMore: isg-programs`, `goto: gc`. It would make 36 questions and would need a slot in the C8 chip table to be visible.
