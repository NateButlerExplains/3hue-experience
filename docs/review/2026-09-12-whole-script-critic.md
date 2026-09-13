# Tour script v2 — whole-script critique

_Read across all eight chapters at once, looking for contradictions between them rather than faults within them. This is the review that broke Candidate F as originally scored. 2026-09-12._

## 1. Seams

**A. The sort routes four ways; Candidate F has five homes.** Arrival's `arrive-question` offers three door answers plus "Show me everything." Nothing in it asks the question that reaches the round table (33 services) or the kiosk (2). Meanwhile three other chapters wrote for those two homes, each under a different key:

- Tower drafted eight lines gated on `situation: people` and `situation: platform` — values arrival never offers.
- Round table drafted a `table` node whose choice remembers `people` (a different key), reached only from `close`.
- Lobby drafted a kiosk node reached only from an Ask `goto`.

Three chapters wrote the destinations; the one chapter that owns routing wrote no road to either. This is the largest seam in the set.

**B. `situation` is written by one chapter and read by nobody who agreed with it.** Arrival captures it and says downstream reads "land with the door chapters." Tower reads `people`/`platform` (dead). Round table's `sum-situation` reads `{answer:situation}` gated on `visited: arrival` — true for every visitor — so `fillTemplate` prints "What brought you in: " with nothing after it for anyone whose answer is unset (a Tour-map jump, `js/tourmap.js:149`; a restored session, `js/tour.js:338`). And arrival's own contract kills the one condition that did this job today (`baseline-3`, gated on `segment: all`) and proposes rewiring it to `situation: early` — while also assigning `early` to the **"Show me everything"** button. After that, "I want to see all three rooms" and "you may be too early to buy" are the same stored answer, and it feeds `start-*-early`, `sum-*-early` and `ask-early-1`, all of which tell the visitor to wait.

**C. The everything-walker is promised a first step no chapter writes.** Route: `lobby` → `all-wt` → `all-gc` → `all-sr` → `path-all` → `close`. No node on it carries a choice, so no trigger is ever stored. Every "Where you'd start" line in `path` and every `sum-*-trigger` / start line in the summary is gated on a trigger answer and stays silent. Their emailed summary is three door promises and no first step. Worse, `js/tour.js:449` sets `st.answers.door` from the *scene*, so after `all-sr` their stored door is `stay-ready` — `close-1` "That's your door" and every `door`-gated line resolve to Stay Ready for someone who walked three rooms. Round table reasoned this out for the door *cue* and left it in the *words*; tower left `path-all` with no shelf line; arrival's new fourth option pushes more visitors down this route than the lobby did.

**D. The same offer is named in two rooms — nine times, and the chapters disagree about the rule.**

| offer | F home | also named in |
|---|---|---|
| `ai-governance-advisory` | Gain Control (Privacy) | `wt-ai-r1` (WT, untouched), `gc-data-r4` (GC, new), `start-sr-crossing` + `sum-sr-crossing` (SR) — three rooms |
| `managed-isp` | contested | WT's three `starts[].then`, WT's own `wt-r-run` says it "lives behind Stay Ready", SR's follow-up adds `isp` to `stay-ready.programs` |
| `managed-rmp` | Stay Ready (Managed GRC) | `gain-control.starts.control.lead`, SR `sr-run-r2/r3` |
| `initial-risk-assessment` | Win Trust | `sum-gc-acquisition`, `sum-gc-early`, `start-gc-acquisition/-early` |
| `controls-gap-assessment`, `risk-register-poam` | Win Trust | both Stay Ready summary lines, `start-sr-exam`, `ask-exam-1` (whose `goto` is `sr`) |
| `privacy-leadership-launch` | Gain Control | `stay-ready.packages`, `start-sr-crossing`, `sum-sr-crossing` |
| `ciso-support` | Win Trust (ISP&G) | the round table's headline example |
| `incident-command` | round table (Fractional Exec) | `stay-ready.starts.incident.live` — and `check-manifest.js:456` **requires** it there whenever the lead is `ir-fast-start` |

Win Trust invented a rule for this in §A6 (name the door, never the foreign offer), applied it to Gain Control and broke it for Stay Ready in the same document. Gain Control identified its collision and handed it to "the Win Trust author." Round table presents ten cross-room recommendations as its own shelf. No chapter owns the rule, so there are three of them.

**E. Two chapters write opposite futures for the node `lobby`.** Arrival repoints `handoff-avi.next` and `handoff-huey.next` — the only two edges into `lobby` — at `arrive-question`. The lobby chapter simultaneously rewrites `lobby` into a seven-line pointer node and files the new kiosk in chapter `lobby`, whose entry is `lobby`. Because `js/tour.js:419-420` drops any option targeting the current chapter's entry, the kiosk's only exit disappears and the kiosk is a dead end. One chapter orphans the node; the other builds two new rooms on it.

**F. The standing price sentence is now said four ways.** `path-price` (`tour.json`, settled: "There's no list price here. Pricing follows scope and commitment, and the team scopes it with you.") vs. the lobby's `kiosk-5` (truncated), Ask's `ask-price-1`/`-2` (re-split with a semicolon), the round table's `who-price` (same re-split), plus a new `sum-price` in the email. Three chapters each claim their version is "word for word."

**G. "The round table" means two things.** In `tour.json` it is where the non-lead guide waits (`handoff-avi-1`, `handoff-huey-1`) and the title of chapter `close`. In Candidate F it is a shelf of 33 people services. Ask uses the second meaning in four new answers with no introducing line, and Ask opens from `arrive` — so a visitor can hear "a person at the round table" seconds after being told the other guide is sitting there. Same collision for "kiosk": `experience.json.kiosk` is the AiVRIC intelligence display (it prints "Buyer segments", a count of doors), not a Technology Platform shelf.

**H. The legend no longer describes the tour.** `strings.legend` = "Three doors, one path" is the lobby chapter title *and* the sub of `close`'s "Walk another door" option; `strings.pathChip` = "See the maturity path". Tower changes `path-all-1` to "one route," so the spoken line and the on-screen chip disagree on the next screen. And under F the building has three doors, a table and a kiosk — the legend is wrong in a second way that no chapter owns.

**I. The door-opening lines are owned by three chapters and fixed by none.** Arrival routes on the ask, then drops the visitor onto `wt-1`/`gc-1`/`sr-1`, which immediately re-describe a company type ("sponsors and family offices", "software teams", "banks, credit unions, lenders and operators"). Arrival names the problem and leaves all three out of its contract; Win Trust cuts `wt-1`'s audience line on a false premise about where the sort lives; Stay Ready renames `sr-1` and reuses the id. Nobody wrote the three replacement lines.

**J. Stagecraft contradicts speech in three rooms.** Lobby: `st.view.cueDoor` is never cleared (`js/tour.js:457,470`), so "no door is more yours than another" plays with the Stay Ready doorway `aria-current`. Tower: the people branch says the ring isn't theirs while `start-baseline` (`stage: assess`), `start-review` and the new `start-running` (`stage: operate`) each hold a lit segment. Stay Ready: the dial reads "No gap" through `sr-receive`, `sr-proof` and `sr-next`.

---

## 2. Coverage — which homes exist only in the manifest

**The round table (33 services) is the worst.** Only **2 of its 33 services have any id in `experience.json`**: `incident-command` (offer) and "Virtual CISO — Support" (program `vciso`, which sits on `doors.gain-control.programs` and whose only `run` offer, `ciso-support`, is a Win Trust category). The naming rule requires a token; for 31 of these services there is no token to write, which is *why* the round table reached for `{offer:ciso-support}`. Within it:

- **Never spoken at all:** Fractional Executive & Retainer Services (5), IT/IS Project Management (2), Standard Rate Card Services (4) — 11 services in three families a visitor could never learn exist. `table-3` names five of the eight families and the sheet calls that complete.
- The `who-owner` branch offers privacy and technology leadership and then answers only the security branch. "Fractional DPO — SOW & Retainer" is held; the technology one exists only on the Builder's **draft** catalog, which the file's own note says is "never on the site."

**The kiosk (2 services) is a home the walked tour never reaches.** It exists in exactly two places: the lobby chapter's kiosk node (unreachable from the doors, and dead-ended once reached, per seam E) and tower's `start-platform-1/2`, which are dead lines. `aivric-cloudsignals-grcops-cspm-onboarding` and `m365-modern-grc-system-deployment-maintenance` are named nowhere in `tour.json` today. On a normal walk, Technology Platform Deployment & Integration does not exist.

**Gain Control's Security Engineering & Architecture (6) has no program home.** Program `sea` ("Security Engineering Services", `build`: architecture reviews / secure SDLC / vuln-management, `run`: security-engineering, vuln scanning) is on **no door's `programs`** and is named nowhere in `tour.json`; no chapter adds it. `security-engineering` and `vulnerability-scanning-config-tuning` stay unnamed. Program `scs` has `name: null` and `category: null` — a dead entry nobody mentions.

**Stay Ready's Managed GRC Programs (3) is the contested home.** All three (`managed-isp`, `managed-rmp`, `managed-cirp`) are claimed by two rooms; Win Trust's `starts` require `isp` in `win-trust.programs` (`check-manifest.js:441`) at the same moment its own line says the program lives behind Stay Ready.

**Eleven door services have no offer id and therefore cannot be named:** WT — Annual Policy Acknowledgements, Security Awareness Training Management, Phishing Simulation Campaigns, Security & Privacy Control Tailoring, Security Exceptions Management, SSPP Review & Update; GC — Privacy Program CONOPS Review & Update, Data Subject Rights Operations, Privacy Training & Awareness Program, IT/IS Process Engineering; SR — Cyber-IR CONOPS Review & Update.

**Packages:** all 7 do get spoken under the drafts (today `iso-27701-readiness` and `pci-dss-readiness` appear nowhere in `tour.json`). But both new ones are heard **only** in the Win Trust deal/standard branch — one fork of one room — and both require `doors.*.packages` moves no chapter owns.

Arithmetic check: the F split does hold — 10+14+4 = 28 WT, 12+4+6 = 22 GC, 7+3+3+4 = 17 SR, 33 table, 2 kiosk = 102. The manifest carries 66 offers, so 36 of the 102 have no id; 33 of the 66 offers are named in `tour.json` today.

---

## 3. The sort

**Would a real person answer it correctly?** Partly, and not reliably.

- The three door answers describe situations rather than company types, which is right. But the fourth option is not a situation at all — it is a browsing preference. The question mixes two axes, so a visitor who *is* in one of the three situations and also wants to see everything has two true answers and the tour treats the choice as exclusive.
- The Stay Ready button ("…what happens when something breaks, and who's watching in between") is 16 words in two clauses, is the hardest thing on the page to read, and puts 3HUE's MDR pitch in the visitor's mouth — it is the seller's answer wearing the buyer's question. It also carries the inflected form of a forbidden term, which the substring lint misses by accident.
- There is no answer for the two homes that hold 35 of the 102 services (people, platform), no answer for "I already know which room," and no answer for "I'm not being asked anything yet" that is distinct from "show me everything" — because those two share the value `early`.

**Does each answer lead to what the visitor needs?** No, at three points.

1. Next breath: the answer lands on `wt-1`/`gc-1`/`sr-1`, which re-sort the visitor by company type. Someone who picked the data/vendors/access answer is told the room is for family offices.
2. The answer is captured and never spent: nothing reads `situation` except dead lines, and the one live condition it displaces (`baseline-3`) goes silent.
3. Mechanically the node is not yet legal: `who: "lead"` on all three lines is a hard lint error (`who` takes `avi` or `huey` only, `check-manifest.js:762`), and the ask list still carries `where-to-start`, which holds `goto: "path"` — the teleport the chapter says it removed.

Verified baseline: `node tools/check-manifest.js` on the untouched file returns **0 errors, 1 warning** (239 lines, 219 spoken, no voice manifest).

---

## 4. The dead labels

**They are not gone.** Three layers.

*In the eight sheets themselves* — all three strings are typed verbatim in **five** chapters (arrival, lobby, Win Trust, Gain Control, Stay Ready), one of them three times in a single document. These are the artefacts that go to the owner and from which copy gets lifted.

*In the manifest, code and tests — unowned by any chapter:*
- `content/experience.json` doors[].icp ×3
- `tools/check-manifest.js:185` **hard-requires exactly those three strings**; `:570` registers each as a "buyer label" for the paraphrase scan
- `tests/manifest.spec.mjs:163`, `tests/tour-manifest.spec.mjs:21`, `tests/fixtures/renamed.json` ×3, `tests/tour-dialogs.spec.mjs:424`

*On screen, during the tour:* `js/hotspots.js:30` prints `for {icp}` on every door plate, alongside the door's four service family names; `js/panel.js:75` prints it as the panel kicker; `js/walk.js:25` in the walk caption. The tour calls `setCurrent()` on that same hotspot group to light a doorway — so the retired label is the accessible name of the door the guide is pointing at, in the exact moment the lobby chapter says "no door is more yours than another." `media/share/cards.json` ×5 has it baked into shipped share cards.

*In docs, including an already-approved sign-off:* `README.md:3`; `docs/DECISIONS.md` O1; `docs/acceptance-standalone.md` O1; `docs/levelup/overrides.md` O1; `docs/copy-sheets.md` ×3 as "**Buyer label:**" rows — and that sheet was **approved on 2026-09-10**. Retiring O1 reopens a signed decision, not a pending one. `docs/copy-sheets-tour.md` ×9.

*Paraphrases that are really labels, still live:* `wt-1` / `gc-1` / `sr-1`; `ask-frameworks-1` ("For a bank, a credit union or a lender") and `ask-frameworks-2` ("For a software company selling into enterprise") — the two most-asked answers, marked "unchanged" and "merely trimmed"; the three lobby option labels; and the kiosk display's own line label, **"Buyer segments"** (`experience.json.kiosk.lines[0]`), which prints a count of doors as a count of buyer segments on a surface the lobby chapter now walks the visitor to.

---

## 5. What is still missing before this goes to the owner

1. **Two chapters that were never written.** The round table needs to be a room, not the last two minutes of `close`: 31 of its 33 services have no id, its eight families have no manifest object (only doors carry `serviceFamilies`), it has no chapter, no map row, no landmark and no route in. Same for the kiosk, or an explicit decision to drop it as a home.
2. **The manifest migration has no owner.** Nothing in the eight contracts edits: `doors[].icp`; `doors[].serviceFamilies` (and `check-manifest.js:175` requires **exactly four** per door — under F, Win Trust and Gain Control have three); `doors[].packages` (PCI-DSS SR→WT, Privacy Leadership Launch SR→GC); `doors[].programs` (`isp`, `rmp`, `vciso`, and the homeless `sea`, `grc`, `scs`); `doors[].starts` leads/withs/thens that fail the "listed" rule at `:441`; `programs[].category`; `doors[].decision` source/status (all three are bare strings); `maturityEmphasis`; `vocabulary.retired`. Two chapters require **opposite** manifest states for `isp`, so the set cannot be applied as written.
3. **A lint rule that contradicts F, unaddressed:** `check-manifest.js:456` forces Stay Ready's flagship start to name `incident-command`, a round-table offer. The shelf split cannot be clean until that rule changes or that service moves.
4. **A modality that does not exist: voice.** `media/voice/` is absent; all 219 spoken lines are captions-only. Every chapter changes text, several reuse ids for new copy (Stay Ready reuses 11; Ask refills `ask-what-1` and four ref→text lines), and `docs/COPY-GATE.md` requires a re-render per changed line, named by line id. There is no render plan, no id-retirement register, and no additions to `guide.voice.say` for DPIA, SDLC, CPO or VCP.
5. **The gate artefact itself.** `docs/COPY-GATE.md` says the tour is signed off from **one** generated sheet, `docs/copy-sheets-tour.md`, produced by `tools/tour-text.mjs --sheet`, which *refuses to write while the lint reports an error*. Eight hand-written chapter sheets are not that artefact, and at least three of their headline claims are false as written ("no sign-off needed," "word for word," "every name is a token"). The sheet also opens with three named decisions; Candidate F adds at least four more and no chapter updates that block. Note also that the O15 row is still pending and `tour-rooms` is not merged — F rides on unsigned work.
6. **Claims that cannot be sourced as written:** "all nine verified prospects," "Win Trust's 28 services," "ninety seconds," "a hospital group" and "Whitedog" (neither on `vocabulary.allowedCustomers`, which holds only Transit Technologies and a large North American bank), "Most people here start with…" (a frequency claim sourced to a catalogue), "or technology leadership" (draft catalog only), "no numbers on this site" (the door stats print 61%, 68%, 93%, 81%, 86.8%, and `doors.gain-control.proof.0` says 1,000+ systems certified — the rule is no *prices*), and `path-shelf`'s "the door is a shelf, not a buyer type," which is untrue while the lobby labels its own options with `{door:*.icp}`.
7. **Stops with no words:** the everything-walker's first step; `lobby-again` with `visited: []` (no line matches — reachable via a Tour-map jump to `close`); `lobby` with `situation` unset; `start-running` for a visitor with no named start; the kiosk's exit; the round table for anyone wanting fractional, project-management or rate-card work.
8. **Decisions left implicit that are the owner's, not a writer's:** whether O1 is retired at all (it is a signed decision the lint enforces and the painted lobby renders); who owns ISO 27701's four privacy contents; whether a door may recommend another door's shelf and in what words; whether the stage ring reorders (it moves `doors[].maturityEmphasis`, `js/panel.js:64,154` and `js/walk.js:26`); whether "Three doors, one path" survives a five-home model; and whether `situation` is one question or two.

**Bottom line:** the eight chapters are individually coherent and jointly incoherent. The three door rooms are close to shippable once the manifest moves land. Arrival, which now carries the whole routing job, sorts four ways into a five-home model and its answer is read by nothing. The round table and the kiosk are homes on paper — one holds a third of the catalogue and can name two of its 33 services; the other cannot be reached or left. Those two, plus a single owner for the manifest migration and the O1 decision, are what stand between this and an owner review.