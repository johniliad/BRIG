# BRIG — CISO Board Reporting Intelligence Generator

<img width="600" alt="BRIG — Board Risk & Insights Generator brand cover: Security Metrics to Executive Insights — Board-Ready Reports. Built by Dr. John ILIADIS." src="public/img/brig-preview.jpg" />

## About

BRIG demonstrates my ability to bridge technical cybersecurity performance and board-level communication. I designed it to turn security metrics into concise executive reporting, combining graphs, statistics and structured insight rather than simply displaying dashboards. For a recruiter, this is evidence of a core CISO/CIO capability: understanding the technical signal, deciding what matters to leadership, and communicating it clearly enough to support governance, investment and risk decisions.

## So what?

**The problem, in one sentence:** boards do not need another operational dashboard — they need a concise, defensible answer to *"where do we stand, is it improving, and what should we decide?"*, and turning technical cybersecurity metrics into exactly that kind of governance-grade reporting is the problem BRIG solves.

**See it in a few seconds — [video demo](https://youtu.be/GMHAMwTGIQE).**

### What problem this solves, and for whom

Security teams measure a lot and communicate too little of what matters: raw metric dumps and operational dashboards rarely translate into governance, investment or risk decisions. BRIG closes that translation gap. It takes the metrics an organisation already tracks and produces a one-page, evidence-based board narrative — executive position, confidence, material findings, contradictions/counter-signals, recommended board actions and charts — that can be defended line by line, exported to PDF/PowerPoint/JSON, and stress-tested with a built-in **Challenge the Story** counter-analysis before it ever faces the board.

Built for:

- **CISOs, CIOs and security leaders** who must report upward, justify security investment and brief boards or executive committees;
- **boards, audit and risk committees** that need signal and decisions, not noise and tooling screenshots;
- **vCISOs, consultants and MSSPs** who produce recurring security reporting for clients;
- **anyone who has to translate cybersecurity performance into executive language** — the same core CISO/CIO capability this repository demonstrates.

## Methodology

BRIG is **deterministic-first and evidence-based**: the same inputs always produce the same report, and every statement in it is traceable back to user-supplied data. The methodology, the metric library and the rule set are **versioned and stamped into every generated report** (`methodology_version` · `metric_library_version` · `rule_version`), so any report can be tied to the exact rules that produced it. The full write-up lives in [`docs/methodology.md`](docs/methodology.md) and on the in-app **Methodology** page; in detail:

1. **Input model.** A reporting profile plus selected metrics with an explicit data status. Available metrics require a current value; directionality determines whether targets and two-sided tolerances are required. Missing comparison data requires a reason, not an invented value. The comparison-period label is required only when comparison values are supplied.
2. **Validation.** Data status, required evidence, types, ranges and units are validated before review. Low-quality data requires an explanation; changed context-dependent metrics require context.
3. **Trend calculation.** Absolute delta, relative percentage delta, and percentage-point delta for percentage metrics — computed per metric against the comparison period.
4. **Directionality.** `higher_is_better`, `lower_is_better`, `target_range`, `target_value`, `context_dependent`, `not_directional`. There is no blanket "up is good" or "up is bad": an increase in patching coverage is good, an increase in KEV-listed vulnerabilities is bad, and some metrics only make sense against a target.
5. **Magnitude bands.** Negligible ≤ 2%, minor ≤ 5%, moderate ≤ 15%, significant ≤ 30%, material > 30% (percentage metrics measured in percentage points). Versioned defaults, configurable.
6. **Targets and tolerances.** Targets describe the desired result; tolerances describe an escalation boundary. They can support current-position assessment without comparison data, but cannot create a trajectory claim.
7. **Cross-metric relationships.** 53 relationship heuristics (e.g. patching coverage vs exploited-vulnerability exposure) used as analytical signals — never as proof of causality.
8. **Contradiction and nuance detection.** The engine deliberately hunts for patterns where a simplistic conclusion would mislead the board — e.g. availability up while restore-test success is down, or vulnerability volume down while exploited vulnerabilities are up.
9. **Importance and observed signal.** Methodology v2 separates stable inherent importance from the rule-based observed signal. A current-only value is descriptive; it cannot become a positive/concern finding without comparison, target, tolerance or relationship evidence. A detailed evidence score supports ranking, but labels are primary.
10. **Confidence.** *Board Narrative Confidence* separately measures current-value completeness, comparison coverage, median history depth, data quality, provenance, relationships and contradictions. With no comparable data, confidence is capped at Low and the report makes no trajectory claim.
11. **Storyline selection.** 31 story rules with explicit all/any evidence conditions, priority ordering, confidence requirements and counter-signals select one dominant storyline (e.g. *investment without outcome*, *exposure concentration*, *resilience assurance gap*).
12. **Narrative assembly.** An executive position (application-derived indicator, explicitly not a risk rating) plus headline, executive message, key signals, positive developments, areas of concern, strategic priorities and board actions mapped to four decision categories: *maintain course*, *redirect investment*, *accelerate remediation*, *increase assurance*.
13. **Chart selection.** Charts are chosen deterministically per metric and storyline (bar, line, grouped bar, before/after, target bar) and rendered with Chart.js — the AI layer never produces charts or numbers.
14. **Challenge the Story.** A deterministic counter-analysis lists what evidence would weaken or change the narrative, so the story survives scrutiny before the board asks.
15. **Optional AI Executive Writing Layer.** Wording only, never facts: the LLM receives a minimal **ReportFacts** payload (pre-approved numbers and metric keys — never the full library or raw notes), user-entered free text is treated as untrusted data (prompt-injection defence), and the output must pass schema validation, numeric fact-checking against the approved numbers, and a banned-claims filter (e.g. no "industry average", "fully compliant", "we guarantee"). Any failure falls back to the deterministic wording; the user's own edits always win.
16. **Determinism, tested.** Golden scenarios A–J plus determinism and demo end-to-end tests (`npm test`) pin the engine's behaviour, so methodology changes are intentional and reviewable.
17. **Privacy by default.** Private/Deterministic mode computes everything in the browser — no metric values are stored or transmitted. Persistence is opt-in and token-secured; the AI layer is opt-in, one-time-token gated and rate-limited server-side.
18. **Honest limitations.** Results depend on user-supplied data quality and completeness; relationships and storylines are heuristics, not proof of causality; no industry benchmarks are invented; BRIG is an analytical and executive-communication aid — not an audit, certification, or legal/regulatory advice, and framework references (NIST, ISO/IEC 27001, CIS) imply no certification or endorsement.

---

Turn cybersecurity metrics into a board-ready story. Select the measures you have, enter current data and any
available comparison, target or tolerance evidence, and BRIG analyses trends, directionality, relationships and contradictions, then separates
inherent importance, observed signal strength and evidence confidence to produce a concise, defensible Board cybersecurity summary with charts,
PDF (print) and PowerPoint output.

BRIG is **deterministic-first**: the complete report works with no external AI. An optional
**Executive Writing Layer** can improve wording only — never numbers or facts.



---

## What is included

| Area | Status |
|------|--------|
| 120-metric knowledge base with full metadata | ✅ `src/data/metric-library.json` (generated) |
| Deterministic CISO Intelligence Engine | ✅ trend, directionality, inherent importance, observed signal, confidence, storyline |
| 53 metric-relationship heuristics | ✅ `src/data/relationships.ts` |
| 31 story rules + contradiction rules | ✅ `src/engine/storyline.ts`, `contradictions.ts` |
| Challenge the Story (deterministic) | ✅ `src/engine/challenge.ts` |
| Board narrative + evidence ("Why did the generator say this?") | ✅ |
| Deterministic chart selection (Chart.js) | ✅ `src/engine/charts.ts`, `src/charts/ChartView.tsx` |
| One-page HTML report + print / Save-as-PDF | ✅ print stylesheet (`@page A4 landscape`) |
| Server-side PDF (File_PDF) | ✅ `api/reports/pdf.php` (graceful print-HTML fallback if File_PDF absent) |
| PowerPoint export (PptxGenJS, in browser) | ✅ `src/services/pptx.ts` (7 slides, speaker notes, footer) |
| JSON export (report model) | ✅ |
| Opt-in, token-secured saved reports (MySQL) | ✅ `api/reports/` + Save panel + **Open saved** page |
| Optional AI wording (provider-neutral, one-time-token gated) | ✅ PHP proxy + client; safe fallback |
| Demo / synthetic data mode | ✅ `src/data/demo.ts` |
| Methodology + disclaimers + privacy modes | ✅ |
| PHP API + MySQL schema/seed for cPanel | ✅ `api/`, `database/` |
| Golden, evidence-contract and workflow tests | ✅ Vitest suite (`tests/*.test.ts`) |

---

## Quick start (development)

Requirements: **Node.js 18+** (Node 24 tested). PHP is only needed to run the API locally.

```bash
npm install
npm run dev          # http://localhost:5173 — the app runs fully in the browser
```

The deterministic report does **not** need the API. To also exercise the optional AI proxy locally:

```bash
# in a second terminal, from the project root:
php -S 127.0.0.1:8099 -t .
# Vite proxies /api -> http://localhost:8099 (see vite.config.ts)
```

## Build & test

```bash
npm run build        # tsc type-check + Vite production build -> dist/
npm run typecheck    # type-check only
npm test             # Vitest golden scenarios (A–J + determinism)
npm run build:library   # regenerate src/data/metric-library.json from the compact spec
npm run export:seed     # regenerate data/*.json + database/seed.sql
```

---

## Project structure

```
src/
  data/        metric-library.json (120 metrics), library.ts, relationships.ts, demo.ts
  engine/      the deterministic intelligence engine (pure, tested)
    analyze.ts directionality.ts trend.ts materiality.ts relationships.ts
    contradictions.ts storyline.ts confidence.ts findings.ts position.ts
    narrative.ts challenge.ts charts.ts report.ts format.ts
  charts/      ChartView.tsx (Chart.js renderer for ChartSpec)
  pages/       Landing, Profile, Select, Entry, Review, Report, Methodology, Disclaimers
  state/       BrigContext.tsx (app store + memoised analysis)
  services/    llm.ts (API client), pptx.ts (PowerPoint export)
  ui/          shared components
  types.ts     shared domain types (incl. ReportFacts boundary)
api/           PHP 8 API (health, metrics, rules, llm proxy, reports) + lib/
database/      schema.sql + seed.sql (generated)
data/          JSON copies served by the PHP API (generated)
scripts/       metric-spec.mjs (library generator), export-seed.mjs
tests/         engine.test.ts (golden scenarios)
```

---

## Architecture

```
Browser (React + TS + Vite)
  metric selection -> data entry -> CISO Intelligence Engine (deterministic)
     -> ReportFacts (analytical boundary)
     -> deterministic charts + narrative + Challenge the Story
     -> HTML / print-PDF / PPTX / JSON

Optional: ReportFacts -> /api/llm/generate.php (PHP proxy)
     -> provider adapter (Gemini / Groq / Cohere / OpenRouter) -> validated JSON wording
     -> if anything fails: deterministic report remains available
```

- **Determinism (R1–R3):** all analysis, charts and slides are produced by pure TypeScript with no
  LLM. `tests/engine.test.ts` asserts identical `ReportFacts` for identical input.
- **ReportFacts boundary (R9):** only a minimal evidence summary crosses to the LLM — never the full
  metric library (`api/lib/llm_service.php`).
- **Provider neutrality (R6–R7):** adapters live behind one interface; limits/privacy are config data.
- **Fallback (R11):** provider outages, 429s, invalid JSON and failed validation all resolve to the
  deterministic report with the message: *"AI enhancement is temporarily unavailable. Your
  deterministic Board report remains available."*
- **AI wording in exports:** when AI wording is validated, the on-screen report and the Server PDF,
  PPTX and JSON exports carry it (with a disclosure note); every figure, finding and calculation
  remains deterministic.

---

## Requirements coverage (highlights)

- **120 metrics** with definition, unit, data type, directionality, board/trend/risk relevance,
  executive meaning, visualisations, related metrics, story tags and caveats.
- **Directionality-aware trends:** higher/lower-is-better, target value/range, and *context-dependent* metrics are
  never judged with a blanket "up is bad".
- **Evidence model** separates inherent importance, rule-based observed signal strength and confidence (`src/engine/materiality.ts`).
- **Board Narrative Confidence** reflects evidence quality, not model probability.
- **Storylines** include improving resilience, hidden deterioration, exposure concentration,
  investment outcomes/gaps, human-risk gap, resilience assurance gap, supplier concentration and more.
- **Golden scenarios A–J** are implemented and tested, including "more incidents + better response is
  not worse resilience" and "100+ metrics stays concise (no KPI dump)".
- **No invented benchmarks, causality or compliance claims**; disclaimers and methodology are present.

## Privacy & security

- **Private / Deterministic** is the default: all computation is in the browser; nothing is stored or
  transmitted.
- **AI-Assisted** requires explicit opt-in and shows a provider-specific privacy notice before any
  transmission. Only a minimal `ReportFacts` payload is sent.
- **Demo** uses clearly-labelled fictional data.
- Server-side secrets only: API keys are read from a private config file **outside the web root**
  (`api/lib/config.php`) and never appear in the frontend bundle.
- Public AI governor: per-IP/minute, per-IP/hour, per-session and global daily limits
  (`api/lib/ratelimit.php`), with atomic locked counters. JSON endpoints also enforce
  application-level request-body limits.
- `.htaccess` sets security headers, disables directory listing and blocks `/data`, `/database`,
  `/scripts`, `/tests`, dotfiles, and `*.sql`/`*.example.php`.
- The PHP proxy separates trusted instructions, trusted `ReportFacts`, and untrusted user notes;
  output is schema- and fact-validated (numbers must match approved numbers; banned claims rejected).

---

## cPanel deployment

> Full, step-by-step instructions (File_PDF, MySQL, private config, HTTPS, troubleshooting): **`docs/deployment.md`**.

The production server needs **Apache + PHP 8.3+ + MySQL** — **no Node.js runtime**.

1. `npm run build` locally to produce `dist/` plus the generated `dist/.htaccess` (it carries the
   Cloudflare origin secret — see `docs/deployment.md` §15).
2. Upload the **contents** of `dist/` to the application web root (e.g. `public_html/brig/`).
3. Upload the `api/` folder and the `data/` folder (JSON copies). Keep the PHP files as-is.
4. *(Optional DB)* In phpMyAdmin: import `database/schema.sql`, then `database/seed.sql`.
5. Copy `private-config.example.php` to a location **outside** the web root (e.g.
   `/home/USER/brig_private-config/brig.php`) and fill in DB credentials and any provider keys. It is
   loaded automatically, or set `BRIG_CONFIG_PATH`.
   A file named `brig.php` in the repository root is **not loaded** and is not needed; do not place
   credentials there.
6. Ensure `api/` is served by PHP (default on cPanel) and `.htaccess` is enabled.
7. Smoke-test: `GET /api/health.php`, then open the site. The app works even if the DB is not set up
   (the metric knowledge base is read from `data/metric-library.json`).

> The deterministic analysis runs entirely in the browser, so the core product does not depend on the
> database. MySQL powers the optional knowledge base and saved-report persistence.

## Workflow conveniences

- Drafts autosave in browser `localStorage` and can be explicitly removed or discarded on reset.
- Metric data can be imported/exported as CSV, including source system, owner, extraction date and
  methodology notes.
- The entry and review stages expose completeness/data-quality warnings; narrative edits are used by
  every export and by optional server persistence.
- Hash-based routes work from both a domain root and a subfolder deployment without extra rewrites.

## AI provider configuration (optional)

Providers are **data, not code**. Enable one in your private config:

```php
'providers' => [
  'groq' => ['enabled' => true, 'api_key' => 'xxxx', 'model' => 'llama-3.1-8b-instant'],
  // OpenRouter (OpenAI-compatible router; any model id)
  'openrouter' => ['enabled' => true, 'api_key' => 'sk-or-v1-...', 'model' => 'openai/gpt-4o-mini'],
],
```

The app never assumes today's free-tier limits or terms are permanent — policy links and privacy
classes are configuration. **Re-verify** provider docs at deploy time:
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Groq data controls: https://console.groq.com/docs/your-data
- Cohere rate limits: https://docs.cohere.com/v1/docs/rate-limits
- OpenRouter privacy: https://openrouter.ai/privacy

Without a configured provider, the AI panel shows a graceful fallback and the deterministic report
remains fully usable.

---

## Methodology & disclaimers

See **Methodology** and **Disclaimers** in the app (top navigation). BRIG is an independently
developed analytical and executive-communication aid. It is **not** an audit, certification, legal or
regulatory advice, or a substitute for professional judgement. Results depend on user-supplied data;
inferred relationships are analytical signals, not proof of causality.

## Known limitations (v1)

- The deterministic engine runs client-side (by design). The PHP `/api/metrics` and rule endpoints
  expose the shared knowledge base for future server-side or integration use.
- Report persistence (`/api/reports/save.php`) is **opt-in** and token-secured with expiry; it is off
  unless a database is configured. The default workflow persists nothing.
- PDF is produced two ways: the browser's print dialog ("Print / Save as PDF") with an A4-landscape
  stylesheet, or server-side via **File_PDF** when installed (drawn programmatically from the report
  model; falls back to a print-ready HTML page otherwise).
- AI output is only accepted after passing schema + numeric fact validation; otherwise the
  deterministic wording is used.

## Licence and third-party notices

BRIG is licensed under the **Apache License 2.0** (see `LICENSE` and `NOTICE`). The built application
also conveys third-party code under MIT, ISC and Zlib licences (React, Chart.js, PptxGenJS, JSZip, …).
Their attribution and the full licence texts are in `THIRD-PARTY-NOTICES.md`, which the build deploys as
`/THIRD-PARTY-NOTICES.txt` together with `/LICENSE.txt`. Both are linked from the app footer and from
the branded `403`/`404`/`500` pages.

Adding, removing or upgrading a dependency means updating `THIRD-PARTY-NOTICES.md` before the next
release — see `docs/deployment.md` §16.

## Scripts reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm test` | Vitest golden scenarios |
| `npm run build:library` | Regenerate `src/data/metric-library.json` |
| `npm run export:seed` | Regenerate `data/*.json` + `database/seed.sql` |
| `npm run secret:new` | Generate a Cloudflare origin-lock secret |
| `npm run deploy:package` | Assemble `deploy/` — the exact upload set for Apache (§15–16) |
