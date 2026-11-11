# BRIG Deployment Guide (cPanel / Apache / PHP / MySQL)

This guide deploys BRIG to a standard cPanel host. The **frontend is static** (no Node.js on the server);
the optional PHP API provides the metric knowledge base, the AI proxy, server-side PDF (File_PDF) and
opt-in report persistence. **The deterministic report works even if PHP/MySQL/File_PDF are all absent.**

---

## 1. Target environment

| Component | Requirement |
|-----------|-------------|
| Web server | Apache with `.htaccess`/mod_rewrite allowed |
| PHP | 8.3+ (8.1+ minimum) with extensions: `pdo_mysql`, `curl`, `dom`, `mbstring`, `gd`, `xml`, `zip` |
| Database | MySQL 8.x / MariaDB 10.4+ (optional — only for persistence & DB-backed KB) |
| File_PDF | Optional — install via PEAR or upload the class, for server-side PDF |
| Node.js | **Not required on the server** (build locally only) |

Check extensions in cPanel → **Select PHP Version → Extensions**, or locally: `php -m`.

---

## 2. What gets deployed

```
public_html/  (your app web root, e.g. public_html/brig/)
├── index.html            # from dist/
├── assets/               # from dist/
├── .htaccess             # root security + routing
├── robots.txt            # crawler rules (internal API excluded)
├── sitemap.xml           # submit to Google Search Console
├── llms.txt              # LLM-readable description (llmstxt.org)
├── api/                  # PHP backend (upload as-is)
│   ├── health.php metrics.php metric-relationships.php story-rules.php analyse.php
│   ├── llm/  reports/  lib/  composer.json
│   └── vendor/           # optional: place File/PDF.php here (auto-detected) — not committed
└── data/                 # JSON knowledge base served by the API
    ├── metric-library.json  relationships.json  story-rules.json

/home/USER/brig_private-config/brig.php   # SECRETS (DB creds, provider keys) — OUTSIDE web root
```

The `database/`, `scripts/` and `tests/` folders are **build/dev only** and are not required in production
(and are blocked by `.htaccess` if present).

---

## 3. Step 1 — Build the frontend (local machine)

```bash
npm install
npm run build        # produces dist/
```

`dist/` contains `index.html`, hashed JS/CSS in `assets/`, and nothing server-specific.

---

## 4. Step 2 — Upload files

Using cPanel **File Manager** or SFTP:

1. Upload the **contents** of `dist/` into your app web root (e.g. `public_html/brig/`).
2. Upload the `api/` folder into the same web root.
3. Upload the `data/` folder into the same web root.
4. Upload the root `.htaccess` into the web root.
5. Upload `robots.txt`, `sitemap.xml` and `llms.txt` into the web root.

> If your app lives in a subfolder, the API base path is relative (`/api/...`) and works from the app
> root. If you host at a domain root, upload straight into `public_html/`.

Final check — these URLs should exist after upload:
- `https://yourdomain.com/brig/` → the app
- `https://yourdomain.com/brig/api/health.php` → JSON `{"ok":true,...}`
- `https://yourdomain.com/robots.txt` → crawler rules (API disallowed)
- `https://yourdomain.com/sitemap.xml` → sitemap for Google
- `https://yourdomain.com/llms.txt` → description for LLM assistants

---

## 5. Step 3 — (Optional) Server-side PDF via File_PDF

PDF is drawn on the server by the **File_PDF** class (an FPDF-style library, e.g. the PEAR File_PDF
package) from the same report model. If File_PDF is not available, the “Server PDF (File_PDF)” button
falls back to a print-ready HTML page (use the browser's Print → Save as PDF). The plain “Print / Save
as PDF” button always works with no server dependency.

### Option A — PEAR install (if available on the host)

Many cPanel hosts provide PEAR. In **Terminal** (or via cPanel):
```bash
pear install File_PDF
```
The loader auto-detects `File/PDF.php` on PHP's include path.

### Option B — Upload the class file

Place the File_PDF class anywhere PHP can read. The endpoint also auto-detects these locations:
- `api/vendor/File/PDF.php`
- `<project>/vendor/File/PDF.php`
- `<project>/File_PDF.php`

### Option C — Explicit path (recommended on shared hosting)

Point to the class file in the private config (outside the web root):

```php
'pdf' => ['file_pdf_path' => '/home/USER/php/File/PDF.php'],
```

### Verify PDF

```bash
curl -s -X POST https://yourdomain.com/brig/api/reports/pdf.php \
  -H 'Content-Type: application/json' \
  -d '{"model":{"profile":{"organisationLabel":"Test"},"narrative":{"headline":"Test"},"executivePosition":{},"confidence":{},"findings":[],"charts":[],"metadata":{}}}' \
  -o test.pdf -D -
```

- `Content-Type: application/pdf` → File_PDF generated the PDF.
- `Content-Type: text/html` → File_PDF not detected (fallback). Install/upload it or set `pdf.file_pdf_path`.

> File_PDF uses core PDF fonts (Latin-1). Enable `ext-iconv` so UTF-8 text (dashes, arrows, curly quotes)
> is transliterated cleanly; otherwise uncommon characters are dropped. No `gd`/`dom` requirement.

---

## 6. Step 4 — (Optional) Enable MySQL persistence

Report saving is **opt-in in the UI and token-secured** (a random token is shown once; only its SHA-256
hash is stored; records expire automatically, default 30 days, max 90). The app works with **no database**;
if none is configured, the save panel returns a clear "persistence not configured" message.

### Create the database and user (cPanel)

1. **MySQL Databases** → create database `iliadis_brig`.
2. Create a user `iliadis_brig_user` with a strong password, and add it to the database with All Privileges.
3. Add the user to the database with **All Privileges**.

### Import the schema and seed

In **phpMyAdmin** for that database:
1. Import `database/schema.sql`.
2. Import `database/seed.sql` (120 metrics, 53 relationships, 31 story rules, provider rows, methodology).

> **Upgrading from an earlier version** (schema already imported without the full-model column):
> ```sql
> ALTER TABLE saved_reports ADD COLUMN report_model_json JSON NULL AFTER narrative_json;
> ```

### Tell the API about the database

Put credentials in the **private config outside the web root** (next step). Example:

```php
'db' => [
  'dsn'  => 'mysql:host=localhost;dbname=iliadis_brig;charset=utf8mb4',
  'user' => 'iliadis_brig_user',
  'pass' => 'YOUR_STRONG_PASSWORD',
],
```

### Verify persistence

```bash
# With DB configured, a save returns JSON with id + token; without DB it returns 503 persistence_disabled.
curl -s -X POST https://yourdomain.com/brig/api/reports/save.php \
  -H 'Content-Type: application/json' \
  -d '{"model":{"narrative":{},"facts":{"approved_numbers":[],"approved_metric_keys":[]},"profile":{}}}'
```

In the app: generate a report → **Save report to server** → copy the **id** and **token** → later
**Open saved** (top nav) → paste both → the report renders.

---

## 7. Step 5 — Private configuration (secrets, OUTSIDE the web root)

Copy `private-config.example.php` to `~/brig_private-config/brig.php` (**outside** `public_html`):

```
/home/USER/brig_private-config/brig.php
```

The loader (`api/lib/config.php`) looks for `BRIG_CONFIG_PATH`, then `~/brig_private-config/brig.php`, then `<projectRoot>/private-config/brig.php`, and
`<documentRoot>/../brig_private-config/brig.php`. You can also set the environment variable
`BRIG_CONFIG_PATH` to an absolute path (e.g. via a cPanel PHP-FPM env or `.htaccess` `SetEnv`).

Example `/home/USER/brig_private-config/brig.php`:

```php
<?php
return [
  'db' => [
    'dsn'  => 'mysql:host=localhost;dbname=iliadis_brig;charset=utf8mb4',
    'user' => 'iliadis_brig_user',
    'pass' => '••••••••',
  ],
  'governor' => [
    'per_ip_per_minute' => 6,
    'per_ip_reports_per_hour' => 20,
    // Keyed on the redeemed AI session (per token), not the client IP.
    'per_session_ai_regenerations' => 20,
    'global_daily_requests' => 300,
  ],
  'pdf' => [
    // Omit to auto-detect api/vendor/autoload.php
    'autoload_path' => null,
  ],
  'providers' => [
    // Enable only providers you are authorised to use. Keys never reach the browser.
    'groq' => ['enabled' => true, 'api_key' => 'gsk_...', 'model' => 'llama-3.1-8b-instant'],
    // 'gemini' => ['enabled' => true, 'api_key' => 'AIza...', 'model' => 'gemini-1.5-flash'],
    // 'cohere' => ['enabled' => true, 'api_key' => '...', 'model' => 'command-r'],
  ],
];
```

> Never place API keys or DB passwords in `public_html`, the React bundle, or any committed file.

---

## 8. Step 6 — (Optional) Enable an AI provider

1. Create a key with Gemini, Groq, Cohere or OpenRouter (server-side).
2. Add it to the `providers` block in your private config with `'enabled' => true` (key presence is the switch).
   You can also set an env var instead of a literal key: `BRIG_GEMINI_KEY`, `BRIG_GROQ_KEY`,
   `BRIG_COHERE_KEY`, `BRIG_OPENROUTER_KEY`.
3. In the app, choose **AI-Assisted** mode (top bar). The AI panel lists enabled providers and shows
   the provider-specific privacy notice before any transmission.
4. Verify:
   ```bash
   curl -s https://yourdomain.com/brig/api/llm/providers.php
   ```
   `enabled` is `true` only when a key is present. `generate.php` only sends **ReportFacts** and
   falls back to the deterministic report on any failure/429.

**OpenRouter** is OpenAI-compatible. Set:
```php
'openrouter' => [
  'enabled' => true,
  'api_key' => 'sk-or-v1-...',
  'model'   => 'openai/gpt-4o-mini',   // any OpenRouter model id
],
```
OpenRouter routes to the downstream model provider, so its data handling depends on that provider.

Re-verify provider terms at deploy time (they change):
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Groq data controls: https://console.groq.com/docs/your-data
- Cohere rate limits: https://docs.cohere.com/v1/docs/rate-limits
- OpenRouter privacy: https://openrouter.ai/privacy

---

---

## 8.1 AI access tokens (one-time — required for AI)

AI generation stays disabled until a visitor redeems a **single-use 256-bit access token**:

- 400 tokens were issued to you. The plaintext list is `ai-access-tokens.txt` — **keep it private and never commit it** (it is git-ignored). Only their SHA-256 hashes ship in the app: `api/lib/ai-tokens-allowed.php` (safe to commit).
- A user enters one token in the AI panel → `POST /api/ai/unlock.php` consumes it (atomic) and returns a short AI session (default TTL 3h) → `POST /api/llm/generate.php` requires that session.
- A used token cannot be reused (HTTP `409 token_used`). Without a session, generation returns HTTP `403 ai_locked`.
- Runtime state (used markers + sessions) is stored privately outside the web root — default `~/brig-ai-tokens/` (override with `ai.token_store_path`).
- To issue a new batch: `node scripts/gen-ai-tokens.mjs` (overwrites the allowed-hash file, so any unused tokens from the previous batch become invalid).
- Redeem attempts are rate-limited per IP (`ai.redeem_per_minute`, default 20/min).

Verify:
```bash
curl -s -X POST https://YOURDOMAIN/brig/api/ai/unlock.php \
  -H 'Content-Type: application/json' -d '{"token":"<one token from ai-access-tokens.txt>"}'
# -> {"ok":true,"session":"<64 hex>","expires_at":"..."}
```

### AI rate limits (HTTP 429) & troubleshooting

The public AI governor enforces four windows: per-IP per minute, per-IP per hour,
per-session regenerations, and a global daily budget. If you see
`429 rate_limited_session`, `429 rate_limited_ip`, or `429 rate_limited_hour`:

- `per_session_ai_regenerations` is keyed on the **redeemed AI session (one per
  token)**, not the client IP, so every token/session has its own allowance.
  Raise it in your private config for heavier testing (default `20`).
- To clear all counters immediately on the host:
  `php api/tools/reset_ratelimit.php` (CLI only; over HTTP it returns 403).
- Counters live in the system temp directory (`…/brig-ratelimit`) and expire on
  their own per each window, so a block lifts automatically.
- The AI panel's success line reports the provider/model actually used
  (e.g. "Enhanced wording from Groq · llama-3.1-8b-instant"); `POST /api/llm/generate.php`
  also returns `X-BRIG-Provider-Requested` / `X-BRIG-Provider-Used` headers so you can
  confirm routing in DevTools → Network.


## 9. Step 7 — Apache, HTTPS and permissions

- **HTTPS:** enable AutoSSL (Let's Encrypt) in cPanel → **SSL/TLS Status**. Force HTTPS (see below).
- **.htaccess:** the root `.htaccess` sets security headers, disables directory listing, blocks
  `/data`, `/database`, `/scripts`, `/tests`, `/private-config`, dotfiles, `*.sql`, `*.example.php`, and
  (via `api/.htaccess`) `/api/lib`, `/api/vendor`, `/api/storage`.
- **Permissions:** folders `755`, files `644`. No world-writable directories needed.

Optional — force HTTPS by adding to the **root** `.htaccess` (only if not already handled by the host):

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## 10. Step 8 — Verification checklist

| Check | How | Expected |
|-------|-----|----------|
| App loads | open site | Landing page renders |
| API alive | `GET /api/health.php` | `{"ok":true,"db_connected":true/false,...}` |
| Metrics | `GET /api/metrics.php` | `count: 120` |
| Relationships | `GET /api/metric-relationships.php` | `count: 53` |
| Story rules | `GET /api/story-rules.php` | `count: 31` |
| Providers | `GET /api/llm/providers.php` | list; `enabled` reflects config |
| Server PDF | `POST /api/reports/pdf.php` | `application/pdf` (File_PDF) or `text/html` fallback |
| Persistence | `POST /api/reports/save.php` | JSON `id`+`token` (or 503 if no DB) |
| Demo | click “See Example Report (demo)” | Report renders with counter-signals |
| Determinism | `npm test` (locally) | 13 tests pass |

---

## 11. Security summary (what is enforced)

- **No secrets in the bundle.** Provider keys and DB credentials are read server-side from a private
  config outside the web root.
- **ReportFacts-only AI.** The proxy sends a minimal evidence payload, separates trusted instructions /
  trusted facts / untrusted notes, and **validates output** (schema + numeric match to approved numbers +
  banned-claim filter). Any failure → deterministic fallback.
- **Public AI governor** (per-IP/min, per-IP/hour, per-session, global daily) with 429 + `Retry-After`.
- **Opt-in persistence**: token shown once, only its hash stored, automatic expiry, per-IP save limit.
- **Defensive `.htaccess`** (headers, listing off, sensitive folders/files blocked), prepared statements,
  strict input checks, no debug traces.
- **Privacy default:** Private/Deterministic mode does all computation in the browser; nothing is stored
  or transmitted.

---

## 12. Updating / regenerating

```bash
# Knowledge base / rules changed?
npm run build:library     # regenerate src/data/metric-library.json
npm run export:seed       # regenerate data/*.json and database/seed.sql
npm run build             # rebuild dist/

# Then re-upload dist/ and data/ (and re-import database/seed.sql if using MySQL).
```

To enable server-side PDF after the fact: install File_PDF (Step 3) or set `pdf.file_pdf_path`.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Blank app / 404 on assets | `dist/` not uploaded to the right root | upload `dist/` contents to app root |
| **`"An unexpected server error occurred."`** on save/AI | an uncaught PHP exception (most often a **syntax error in the private config**) | open `/api/health.php` — see the next rows |
| `health.php` shows `config_loaded:false` | private config has a **PHP syntax error** or **does not `return` an array** | read `config_error`, then run `php -l ~/brig_private-config/brig.php` and fix it |
| `health.php` returns 500 / blank | PHP version / extension | set PHP 8.3+, enable required extensions |
| AI panel: "backend is not reachable" | `api/llm/providers.php` is erroring — check `/api/health.php` `config_error` | fix config; then confirm `providers_with_keys > 0` |
| `db_connected:false` | DB creds missing/wrong or DB down | set `db` in private config; check DSN/user/password |
| `db_configured:true` but `db_connected:false` | wrong creds, DB not created, or `pdo_mysql` missing | create DB/user, grant privileges, enable `pdo_mysql` |
| Save returns 503 `persistence_disabled` | no DB configured | configure DB (Step 4) |
| Save returns 500 `save_failed` | DB connected but `saved_reports` table missing | import `database/schema.sql` (+ `seed.sql`) |
| Server PDF returns `text/html` | File_PDF not available | install File_PDF (PEAR) or set `pdf.file_pdf_path` |
| PDF text shows `?` for accents/dashes | `ext-iconv` disabled | enable `iconv` in cPanel → Select PHP Version |
| AI panel says unavailable | no provider enabled / key missing | enable a provider with a valid key |
| AI 401 "Invalid API Key" | key is wrong/expired, belongs to another provider, is wrapped in quotes/spaces, or you edited a config file the app doesn't load | use the real key (Groq `gsk_…`, Gemini `AIza…`, OpenRouter `sk-or-…`); open `/api/health.php` → `config_source` + `providers[].key_shape_ok` |
| AI 429 `rate_limited_session` | per-session regeneration cap | raise `per_session_ai_regenerations` (default 20) or `php api/tools/reset_ratelimit.php` |
| AI 429 `rate_limited_ip` / `rate_limited_hour` | per-IP governor | wait, or `php api/tools/reset_ratelimit.php`; tune `governor` |
| API 404s under a subfolder | base path | API is same-origin `/api/...`; host app at the path you expect |
| `.htaccess` 500 | `Header`/`RewriteEngine` unsupported | comment the offending block; most cPanel hosts support both |

---

## 14. Cost & limits notes

- The **deterministic product is free to run** — no external calls, no AI cost.
- AI usage is the only variable cost; the governor caps it. Free tiers change — keep provider limits in
  config and re-verify policy links at deploy time. The deterministic report never depends on them.


