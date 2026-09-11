# Content sources

Field-level provenance for `content/experience.json` and the guided-tour script `content/tour.json`. Fork = `NateButlerExplains/3Hue-Market-Intel` @ f04c0b4; "library" below is its `assets/strategy/2026-09-08-09-source-library/`. The source documents were read with a local extractor; they are not copied here.

Section numbers are the ones printed in each document:

- **The Forcing Function** (library `02-market-and-icp/forcing-function.pdf`): §01 fit model, §02 the three segments, §03 buying committee, §04 trigger events, §05 who to decline, §06 what to say to each, §07 evidence base.
- **The Message Stack** (library `03-messaging-and-campaigns/message-stack.pdf`): §01 core narrative, §02 positioning statement (marked internal), §03 three pillars, §04 message by segment, §05 claims library, §06 objection handling, §07 battlecards, §08 words we use and words we don't, §09 boilerplate.
- **The Ship List** (library `03-messaging-and-campaigns/ship-list.html`, "approved against the Message Stack claims library"): §03 landing page copy, §04 post series, §06 discovery script, §07 offer one-pagers.
- **Brand Sheet** (library `01-company-and-brand/brand-sheet.pdf`): §06 verbal identity and naming conventions.

## content/experience.json

| Manifest field | Source |
|---|---|
| `lobby.*`, `stages[]`, `doors[].{title,promise,audience,icp,triggers,tension,gap,decision,serviceFamilies[].name,maturityEmphasis,color}` | fork `app/experience-data.ts` `LOBBY_CONTENT` (verbatim; O1 labels) |
| `doors[].opening` | `forcing-function.pdf` §06 "What to say to each", the three approved opening lines |
| `doors[].stat`, `doors[].statSecondary` | `forcing-function.pdf` §07 load-bearing sources and `message-stack.pdf` §05 claims library (VERIFIED rows only): Secureframe 2026 Benchmark; Kroll, Private Equity Cybersecurity, Feb 2026; RegScale 2026 State of Continuous Controls Monitoring; National Cybersecurity Alliance with CISA 2026 |
| `doors[].proof` | `forcing-function.pdf` §02 "Proof 3HUE already owns" (Transit Technologies; a large North American bank) and `message-stack.pdf` §09 approved 100-word boilerplate (Stay Ready) |
| `doors[].program` | `forcing-function.pdf` §02 "What 3HUE sells them", pricing sentences removed |
| `doors[].serviceFamilies[].examples` | fork `docs/discovery/solution-builder-catalog-2026-09-09/catalog.json`, exact service names with no `catalogStatus: draft`; no codes, no prices |
| `path.whereToStart` | 3hue.net published offer "AI Risk & Readiness Snapshot in 10 business days" (`message-stack.pdf` §05, SUBSTANTIATED) plus `forcing-function.pdf` §02 "Snapshot scoped to the actual obligation" |
| `pillars`, `arc` | `message-stack.pdf` §03 three pillars and `capability-map.pdf` offer architecture Snapshot → Build → Operate |
| `vocabulary.*` | `message-stack.pdf` §08 words we use and words we don't, and the §05 claims marked DO NOT USE; `docs/levelup/source/LEVELUP.md` retired sign names |
| `kiosk.*` | `docs/levelup/source/5-kiosk-share.md`, re-scoped under O9 |
| `strings.*`, `walk.captions.*` | `docs/levelup/source/{2a,2b,4,6}-*.md` |
| `strings.tour*` | the guided tour's interface words (card states and controls, the Tour map, Ask AiVRIC, the microphone disclosure, the summary actions), written for this build under O10/O11; the sentences among them are listed for sign-off under "Interface words" in `docs/copy-sheets-tour.md` |
| `sources[]` | not visible: the fork paths of the documents above (The Forcing Function, The Message Stack, The Ship List, Brand Sheet, the catalog, the lobby content, LEVELUP.md), pinned at f04c0b4 |
| `tour.*` | settings, not visible: the gate (O11), the script path and the voice folder (O10) |
| `guide.name`, `guide.title` | O10: the AiVRIC guide persona adopted from the owner's tour; AiVRIC as "the platform 3HUE built" is `message-stack.pdf` §09 boilerplate |
| `guide.disclosure` | O10; Microsoft's Code of Conduct for Azure AI Speech asks that listeners are told the voice is synthetic |
| `guide.voice.*` | settings, not visible: Azure AI Speech `en-US-AvaNeural`, rendered at build time (O10) |

## content/tour.json

Every text line carries its own `source` and `status`, and `docs/copy-sheets-tour.md` (written by `node tools/tour-text.mjs --sheet`) lists each line with them, its hash and the three decisions the sheet needs. Line sources are plain citations, because Ask AiVRIC shows each answer's source to the visitor.

| Tour field | Source |
|---|---|
| `nodes.*.lines[]` with `ref` | the manifest field it names, shown with that field's own source and status (table above) |
| `nodes.*.lines[]` with `text` | as each line's `source` says: The Forcing Function cover and §01–§06, The Message Stack §01, §03, §04, §05, §06, §08, §09, The Ship List §03, §04, §06, §07, Brand Sheet §06. Status `adapted` (approved wording shortened or re-voiced as AiVRIC, with figures, vendor names and comparisons taken out), `proposed` (new linking copy), `derived` (assembled from manifest fields) or `approved-copy` (boilerplate used verbatim) |
| names inside lines, labels and sub-labels | tokens filled from the manifest, never typed: door titles and promises, buyer labels, triggers, stage names, `arc`, `kiosk.header`, `path.title`, `strings.*`, `guide.name`, and catalog service names through `doors[].serviceFamilies[].examples[]` |
| figures | only through `ref` to `doors[].opening`, `stat`, `statSecondary`, `proof` and `path.whereToStart`, so each prints its source; callout tiles show the same fields |
| service pairings (`wt-ai-2`, `sr-incident-2`, `baseline-1`, `operate-2`, `ask-ai-2`) | catalog names with no draft status (row above); which service follows which answer is our proposal, copy-sheet decision 1 |
| typed `choice.prompt`, option `label` and `sub`, chapter titles | new tour copy, listed in the copy sheet |
| `ask.questions[]` (Ask AiVRIC) | questions written for the tour; answers from The Message Stack §02 (marked internal: copy-sheet decision 2), §01, §03, §04, §05, §06, §07, §09, The Ship List §03 and §06, The Forcing Function §01, §02, §04 and §05, Brand Sheet §06, or refs to manifest fields; `voice` answers with `guide.disclosure`; `privacy` describes how this site is built (O10: static files, nothing collected) |
| `summary` (the mailto body and Copy) | the visitor's own answers labelled from the manifest, visited chapter titles, refs to `doors[].stat` and `path.whereToStart`, `site.url`, `site.bookingUrl` (O2) |

Left out on purpose: the A-LIGN 2026 figure cited in The Forcing Function §01 and §04 (not in the claims library; copy-sheet decision 3), CMMC (TIME-SENSITIVE in the claims library), the CISO-to-business ratio and the salary range (figures with no manifest field; the range reads as a price), and every line of the owner's own tour.

Re-check every statistic each January (message-stack standing rule). A figure whose source cannot be re-verified is removed, not left in place.
