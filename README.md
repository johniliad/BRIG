# BRIG — CISO Board Reporting Intelligence Generator

Turn cybersecurity metrics into a board-ready story. Select the measures you have, enter current and
comparison-period data, and BRIG analyses trends, directionality, relationships, contradictions,
materiality and confidence to produce a concise, defensible Board cybersecurity summary with charts,
PDF (print) and PowerPoint output.

BRIG is **deterministic-first**: the complete report works with no external AI. An optional
**Executive Writing Layer** can improve wording only — never numbers or facts.



---

## What is included

| Area | Status |
|------|--------|
| 120-metric knowledge base with full metadata | ✅ `src/data/metric-library.json` (generated) |
| Deterministic CISO Intelligence Engine | ✅ trend, directionality, materiality, confidence, storyline |
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
| Golden scenario tests (A–J + determinism + demo end-to-end) | ✅ `tests/engine.test.ts` (13 passing) |

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
- **Directionality-aware trends:** higher/lower-is-better, target, and *context-dependent* metrics are
  never judged with a blanket "up is bad".
- **Materiality** uses a versioned weighted formula (`src/engine/materiality.ts`).
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
  (`api/lib/ratelimit.php`).
- `.htaccess` sets security headers, disables directory listing and blocks `/data`, `/database`,
  `/scripts`, `/tests`, dotfiles, and `*.sql`/`*.example.php`.
- The PHP proxy separates trusted instructions, trusted `ReportFacts`, and untrusted user notes;
  output is schema- and fact-validated (numbers must match approved numbers; banned claims rejected).

---

## cPanel deployment

> Full, step-by-step instructions (File_PDF, MySQL, private config, HTTPS, troubleshooting): **`docs/deployment.md`**.

The production server needs **Apache + PHP 8.3+ + MySQL** — **no Node.js runtime**.

1. `npm run build` locally to produce `dist/`.
2. Upload the **contents** of `dist/` to the application web root (e.g. `public_html/brig/`).
3. Upload the `api/` folder and the `data/` folder (JSON copies). Keep the PHP files as-is.
4. *(Optional DB)* In phpMyAdmin: import `database/schema.sql`, then `database/seed.sql`.
5. Copy `private-config.example.php` to a location **outside** the web root (e.g.
   `/home/USER/brig_private-config/brig.php`) and fill in DB credentials and any provider keys. It is
   loaded automatically, or set `BRIG_CONFIG_PATH`.
6. Ensure `api/` is served by PHP (default on cPanel) and `.htaccess` is enabled.
7. Smoke-test: `GET /api/health.php`, then open the site. The app works even if the DB is not set up
   (the metric knowledge base is read from `data/metric-library.json`).

> The deterministic analysis runs entirely in the browser, so the core product does not depend on the
> database. MySQL powers the optional knowledge base and saved-report persistence.

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

## Scripts reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm test` | Vitest golden scenarios |
| `npm run build:library` | Regenerate `src/data/metric-library.json` |
| `npm run export:seed` | Regenerate `data/*.json` + `database/seed.sql` |
