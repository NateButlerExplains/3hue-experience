# Copy sheet: the quote builder's names (O15)

For Nate and the owner to re-sign. The door panels and the path panel were approved on 2026-09-10 as published at commit 7fa92e4 (`docs/COPY-GATE.md`). O15 makes the quote builder (builder.3hue.net, capture of 2026-09-09) the catalog of record, so the fields below change, and new fields become visible. "Old" is the approved text at 7fa92e4; "new" is `content/experience.json` on the `tour-rooms` branch. Names are exact Builder names (`content/builder-names.json`, names only: no codes, no prices, no hours).

Generated from the two manifests; regenerate after any change to these fields. Nothing here is live until the owner signs; the branch stays gated.

## Decisions this sheet needs

1. **Starts.** "Every path starts with a Snapshot" becomes one first step per door and trigger (below). The pairings are our proposal from the Builder and The Forcing Function §04; no 3HUE source makes them. Approve, change or drop each.
2. **Package contents.** The capture shows each package's description and service count, not its items. The contents used for the overlap rules are inferred from the descriptions (four of seven add up exactly to the observed first-year totals; the other three reconcile only with a policy tier or hour count the capture does not record). Confirm each.
3. **vCISO.** The program is named "Virtual CISO — Support", a Builder item marked [Confirm price], so it is held and not shown. The alternatives are Virtual CISO — Fractional (also [Confirm price]) and CISO Support (available). Which one?
4. **Security Compliance Services** has no Builder item, so it is held with no name and cannot be shown or voiced. Add it to the Builder, or leave it out?
5. **Gain Control has no package**, so its panel shows no bundles list. Is one planned?
6. **Learn more targets.** Initial Risk Assessment links to the 3hue.net Risk Posture Assessment page (assumed to be the same offer). Security Engineering Services links to the ISG managed programs page, as no allowlisted page covers engineering. Confirm or correct.

## Changed approved fields

### Service families (all three doors)

Family names become exact Builder category names; items are exact non-draft Builder items. Gain Control drops its two draft-only families. Stay Ready's managed detection family moves to its packages and programs. The hover plates on the lobby doors show the same family names.

#### Win Trust

Old:

- **Risk assessment and risk management**: Initial Risk Assessment · Periodic Controls Gap Assessment · Cyber-Risk Advisory
- **Information security program and governance**: Written IS Policies & Standards · CISO Support · RFP Response Services · Security Terms & Conditions Contract Reviews
- **Privacy management and data protection**: Privacy Program Maturity & Risk Assessment · ISO 27701 PIMS Readiness & Implementation · AI Governance & Privacy Advisory
- **ISMS, SSPP, and statement of applicability**: ISMS Scope & SoA Development · System Security & Privacy Plan (SSPP) Development

New:
<!-- gen:families:win-trust -->

- **Risk Assessment & Risk Management**: Initial Risk Assessment · Periodic Controls Gap Assessment · Cyber-Risk Advisory
- **Information Security Program & Governance**: Written IS Policies & Standards · RFP Response Services · Security Terms & Conditions Contract Reviews · Management Review Facilitation
- **ISMS, SSPP & Statement of Applicability**: ISMS Scope & SoA Development · System Security & Privacy Plan (SSPP) Development
<!-- /gen -->

#### Gain Control

Old:

- **Digital maturity paradigm assessments** (no items listed)
- **Managed enterprise architecture programs** (no items listed)
- **Vendor and third-party risk management**: Managed Vendor Compliance Program (VCP) · Asset Governance Program Development · Audit Support & Liaison Services
- **Board and investor performance reporting**: BOD / Investor Performance Reporting · Risk Committee Posture Update · Security Data Analytics & Reporting Development

New:
<!-- gen:families:gain-control -->

- **Privacy Management & Data Protection**: Data Mapping & Data Inventory · Data Protection Impact Assessment (DPIA) · AI Governance & Privacy Advisory · Regulator Liaison & DSAR Escalation Support
- **Vendor & Third-Party Risk Management**: Managed Vendor Compliance Program (VCP) · Asset Governance Program Development · Audit Support & Liaison Services
- **Security Engineering & Architecture**: Security Architecture Reviews · Secure SDLC Program Development · Vulnerability Management Program Development
<!-- /gen -->

#### Stay Ready

Old:

- **Cyber incident response programs**: Cyber-Incident Response Plan Development · IR Playbook Development · Cyber-IR Tabletop Exercise (TTX) · Cyber-IR Operations Command
- **Business continuity and operational resilience**: Business Continuity Plan Development · Operational Resilience Program Development
- **Managed detection and response**: Managed Detection & Response — Complete · MXDR Starter
- **Privacy management and data protection**: Managed Privacy Program · Regulator Liaison & DSAR Escalation Support · Data Protection Impact Assessment (DPIA)

New:
<!-- gen:families:stay-ready -->

- **Risk Assessment & Risk Management**: Periodic Controls Gap Assessment · Manage Risk Register & POA&M · Operational Risk Analysis & Update · Business Impact Assessment & Analysis
- **Cyber Incident Response Program**: Cyber-Incident Response Plan Development · IR Playbook Development · Cyber-IR Tabletop Exercise (TTX) · Cyber-IR Operations Command
- **Business Continuity & Operational Resilience**: Business Continuity Plan Development · BCP Review & Updates · Operational Resilience Program Development
- **Managed Detection & Response (MDR / MXDR)**: Managed Detection & Response — Complete · MXDR Starter · MXDR — SIEM Add-on · Managed Security Controls Validation for Endpoints
<!-- /gen -->

The kiosk's derived count of service families changes from 11 to 9 (unique family names across the doors).

### Where to start (`path.whereToStart`)

Old: Every path starts with a Snapshot: a 10-business-day diagnostic scoped to the obligation in front of you.  
*Source: 3hue.net published offer (AI Risk & Readiness Snapshot in 10 business days); The Forcing Function §02 (substantiated)*

New: Each door has its own first step, scoped to the obligation in front of you.  
*Source: 3HUE service catalog, September 2026; The Forcing Function §02 (proposed)*

Below the lead, the path panel now lists each door's first step per trigger (see "Where you'd start" below).

### The arc (`arc[0]`), the first step of "How it runs"

Old: Snapshot → Build → Operate  
New: Scope → Build → Operate

### The first step in each door's "How it runs" (`program.snapshot` → `program.start`)

- **Win Trust**
  - Old: A Snapshot scoped to the actual obligation, so you know what the contract requires and what it does not. *(The Forcing Function §02, What 3HUE sells them, approved-copy)*
  - New: A first step scoped to the actual obligation, so you know what the contract requires and what it does not. *(The Forcing Function §02, What 3HUE sells them, adapted: approved wording with "a Snapshot" re-worded as "a first step")*
- **Gain Control**: key renamed, wording unchanged: A diligence-grade assessment per acquisition. *(The Forcing Function §02, What 3HUE sells them, approved-copy)*
- **Stay Ready**: key renamed, wording unchanged: Named framework crosswalks in the examiner's language: NIST CSF and 800-53/171 as the spine, mapped to ISO 27001, COBIT, FFIEC, and SOC 2. *(The Forcing Function §02, What 3HUE sells them, approved-copy)*

## New visible fields

### Interface words (`strings`)

- `packages`: Ready-made bundles
- `programs`: Programs that run it
- `starts`: Where you'd start
- `learnMore`: Learn more on 3hue.net

Learn more links open 3hue.net in a new tab; each is named for its page, for example "Learn more on 3hue.net: Audit-Ready Security Program, opens 3hue.net in a new tab".

### Door panels, under "Services on this path"

#### Win Trust
<!-- gen:panels:win-trust -->

**Ready-made bundles**

- **SOC 2 Readiness**: What a first-time SOC 2 Type II candidate needs: policies, a risk assessment, an incident response plan and audit support. · Learn more: https://3hue.net/services/security-compliance-services.html
- **ISO 27001 Certification Readiness**: ISMS scope and Statement of Applicability, a policy library, a risk assessment and management review facilitation, on the path to certification.
- **ISO 27701 Privacy Readiness**: A PIMS gap analysis, a privacy program CONOPS, data mapping and a DPIA: the certification-track privacy bundle.
- **PCI-DSS Readiness**: A controls gap assessment, a policy library, a vulnerability management program and scanner tuning, for PCI scope.

*Source: 3HUE service catalog, September 2026 (adapted)*

**Programs that run it**

- **Managed Information Security & Privacy Management**: IS Program (CONOPS) Development · Written IS Policies & Standards · Managed Information Security & Privacy Management · IS Program CONOPS Review & Update
- **Managed Risk Management Program**: Initial Risk Assessment · Risk Management Program (CONOPS) Development · Managed Risk Management Program · Manage Risk Register & POA&M · Annual Risk Assessment Update · RMP CONOPS Review & Update
<!-- /gen -->

#### Gain Control
<!-- gen:panels:gain-control -->

**Ready-made bundles**

- **Privacy Leadership Launch**: A maturity assessment to set the baseline, then CPO-as-a-Service and a managed program to run it.

*Source: 3HUE service catalog, September 2026 (adapted)*

**Programs that run it**

- **Managed Vendor Compliance Program (VCP)**: Managed Vendor Compliance Program (VCP) · VCP — Additional Vendor Monitoring (5-Vendor Block)
- **Security Engineering Services**: Security Architecture Reviews · Secure SDLC Program Development · Vulnerability Management Program Development · Security Engineering Services · Vulnerability Scanning Config & Tuning
<!-- /gen -->

#### Stay Ready
<!-- gen:panels:stay-ready -->

**Ready-made bundles**

- **Incident Response Fast Start**: Incident response capability in one engagement: a plan, playbooks, a tabletop exercise and standing incident command. · Learn more: https://3hue.net/services/cyber-incident-response-program.html
- **MXDR Complete Protection**: Full-platform XDR with SIEM retention and annual endpoint controls validation. · Learn more: https://3hue.net/services/continuous-risk-management.html

*Source: 3HUE service catalog, September 2026 (adapted)*

**Programs that run it**

- **Managed Risk Management Program**: Initial Risk Assessment · Risk Management Program (CONOPS) Development · Managed Risk Management Program · Manage Risk Register & POA&M · Annual Risk Assessment Update · RMP CONOPS Review & Update
- **Managed Cyber-Incident Response Program**: Cyber-IR Program (CONOPS) Development · Cyber-Incident Response Plan Development · IR Playbook Development · Cyber-IR Tabletop Exercise (TTX) · Managed Cyber-Incident Response Program · Cyber-IR Operations Command · CIRP Review & Update
- **Managed Detection & Response — Complete**: Managed Detection & Response — Complete · MXDR Starter · MXDR — SIEM Add-on · Managed Security Controls Validation for Endpoints
<!-- /gen -->

### Path panel, "Where to start": Where you'd start

Each door's first step for each of its approved triggers: the lead, "/" its alternative, "+" what goes with it. Held items are not shown. The tour also carries what it then runs as, the live-incident route, the tower ring, and the first step for a visitor nobody is asking yet (not shown in the lobby, which has no approved label for it).

#### Win Trust
<!-- gen:starts:win-trust -->

| Trigger | Shown | Then runs as (tour) | Tower ring |
|---|---|---|---|
| An enterprise deal or renewal is blocked by assurance requirements. | SOC 2 Readiness / ISO 27001 Certification Readiness | Managed Information Security & Privacy Management | Assess → Strengthen |
| A customer, insurer, or investor is asking for evidence you cannot assemble quickly. | Initial Risk Assessment + RFP Response Services | Managed Information Security & Privacy Management | Assess |
| A certification audit is booked with no written scope. | ISMS Scope & SoA Development / ISO 27001 Certification Readiness + System Security & Privacy Plan (SSPP) Development | Managed Information Security & Privacy Management | Strengthen |
| *early: nobody is asking yet (tour only)* | Initial Risk Assessment | — | — |

*Source: 3HUE service catalog, September 2026; The Forcing Function §04, trigger events (proposed); 3HUE service catalog, September 2026; The Forcing Function §05, who to decline (proposed)*
<!-- /gen -->

#### Gain Control
<!-- gen:starts:gain-control -->

| Trigger | Shown | Then runs as (tour) | Tower ring |
|---|---|---|---|
| Privacy rules now reach across the whole business. | Privacy Leadership Launch + Data Mapping & Data Inventory + Regulator Liaison & DSAR Escalation Support | — | Assess → Operate |
| Nobody owns how AI touches your data. | AI Governance & Privacy Advisory + Security Architecture Reviews + Secure SDLC Program Development + Vulnerability Management Program Development | Security Engineering Services | Strengthen |
| Other people's systems hold your data. | Managed Vendor Compliance Program (VCP) + Asset Governance Program Development + Audit Support & Liaison Services | VCP — Additional Vendor Monitoring (5-Vendor Block) | Operate |
| *early: nobody is asking yet (tour only)* | Data Mapping & Data Inventory | — | — |

*Source: 3HUE service catalog, September 2026 (proposed)*
<!-- /gen -->

#### Stay Ready
<!-- gen:starts:stay-ready -->

| Trigger | Shown | Then runs as (tour) | Tower ring |
|---|---|---|---|
| An examiner request, audit finding, or remediation deadline is active. | Periodic Controls Gap Assessment + Manage Risk Register & POA&M | Managed Risk Management Program | Operate |
| An incident or continuity concern exposes a readiness gap. | Incident Response Fast Start + Business Continuity Plan Development | Managed Cyber-Incident Response Program · MXDR Complete Protection | Strengthen |
| Security tooling is generating alerts that nobody is reading. | MXDR Complete Protection / MXDR Starter | — | Operate |
| *early: nobody is asking yet (tour only)* | Periodic Controls Gap Assessment | — | — |

*Source: 3HUE service catalog, September 2026; The Forcing Function §04, trigger events (proposed); 3HUE service catalog, September 2026; The Forcing Function §05, who to decline (proposed)*
<!-- /gen -->

### Learn more pages (`site.learnMore.pages`)

Only these https://3hue.net pages; never www., never the pricing page, no query strings, no landing pages. The label is read out as the link's name.

- `about`: About 3HUE (https://3hue.net/about.html)
- `contact`: Contact (https://3hue.net/contact.html)
- `security-compliance`: SOC 2 Type II Readiness (https://3hue.net/services/security-compliance-services.html)
- `isg-programs`: Audit-Ready Security Program (https://3hue.net/services/isg-managed-programs.html)
- `operations`: Managed Security Operations (OPS) (https://3hue.net/services/continuous-risk-management.html)
- `cirp`: Cyber-Incident Response Program (https://3hue.net/services/cyber-incident-response-program.html)
- `risk-posture`: Risk Posture Assessment (https://3hue.net/services/risk-posture-assessment.html)
- `cloudsignals`: CloudSignals+ RiskOps (https://3hue.net/services/cloudsignals-riskops.html)
- `frameworks`: Framework Library (https://3hue.net/frameworks/framework-library.html)
- `saas`: SaaS & Digital Products (https://3hue.net/industries/saas.html)
- `private-equity`: Private Equity & Family Offices (https://3hue.net/industries/private-equity-family-offices.html)
- `financial-services`: Financial Services (https://3hue.net/industries/financial-services.html)
- `transit-story`: Customer story: Transit Technologies (https://3hue.net/customer-stories/transit-technologies.html)
- `bank-story`: Customer story: a large North American bank (https://3hue.net/customer-stories/large-north-american-bank.html)
- `ai-governance`: AI Governance (https://3hue.net/ai-advisory/ai-governance.html)

## Left out on purpose

- Prices, codes, billing units, hours and the Builder descriptions themselves (package summaries are re-written from the descriptions with every figure and price word taken out).
- Draft Builder items (the ITG catalog) and the [Confirm price] items, except the held vCISO program name, which is not shown.
- The AI Risk & Readiness Snapshot: it is not a Builder item (owner question 1).
