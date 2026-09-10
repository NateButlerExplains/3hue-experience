# Content sources

Field-level provenance for `content/experience.json`. Fork = `NateButlerExplains/3Hue-Market-Intel` @ f04c0b4. The source library PDFs were read with a local extractor; they are not copied here.

| Manifest field | Source |
|---|---|
| `lobby.*`, `stages[]`, `doors[].{title,promise,audience,icp,triggers,tension,gap,decision,serviceFamilies[].name,maturityEmphasis,color}` | fork `app/experience-data.ts` `LOBBY_CONTENT` (verbatim; O1 labels) |
| `doors[].opening` | fork `assets/strategy/2026-09-08-09-source-library/02-market-and-icp/forcing-function.pdf` §06 "What to say to each", the three approved opening lines |
| `doors[].stat`, `doors[].statSecondary` | `forcing-function.pdf` §07 load-bearing sources and `message-stack.pdf` §02 claims library (VERIFIED rows only): Secureframe 2026 Benchmark; Kroll, Private Equity Cybersecurity, Feb 2026; RegScale 2026 State of Continuous Controls Monitoring; National Cybersecurity Alliance with CISA 2026 |
| `doors[].proof` | `forcing-function.pdf` §02 "Proof 3HUE already owns" (Transit Technologies; a large North American bank) and `message-stack.pdf` §09 approved 100-word boilerplate (Stay Ready) |
| `doors[].program` | `forcing-function.pdf` §02 "What 3HUE sells them", pricing sentences removed |
| `doors[].serviceFamilies[].examples` | fork `docs/discovery/solution-builder-catalog-2026-09-09/catalog.json`, exact service names with no `catalogStatus: draft`; no codes, no prices |
| `path.whereToStart` | 3hue.net published offer "AI Risk & Readiness Snapshot in 10 business days" (message-stack §02, SUBSTANTIATED) plus forcing-function §02 "Snapshot scoped to the actual obligation" |
| `pillars`, `arc` | `message-stack.pdf` §01 positioning (three pillars) and `capability-map.pdf` offer architecture Snapshot → Build → Operate |
| `vocabulary.*` | `message-stack.pdf` §07 vocabulary and §08 claims not to use; `docs/levelup/source/LEVELUP.md` retired sign names |
| `kiosk.*` | `docs/levelup/source/5-kiosk-share.md`, re-scoped under O9 |
| `strings.*`, `walk.captions.*` | `docs/levelup/source/{2a,2b,4,6}-*.md` |

Re-check every statistic each January (message-stack standing rule). A figure whose source cannot be re-verified is removed, not left in place.
