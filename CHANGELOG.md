# Changelog

All notable changes to BRIG — CISO Board Reporting Intelligence Generator.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] — 2026-11-16

### Changed

- The homepage brand-cover image now renders at **308 px** (a 65% reduction from the previous
  880 px cap), centered under the hero with its caption aligned. The asset itself is unchanged —
  the 1600×1067 source keeps the social card (`og:image`) and the GitHub social preview at full
  quality.

## [1.1.1] — 2026-11-16

### Security

Remediates the OWASP ZAP baseline findings (HSTS, CSP, X-Content-Type-Options, anti-clickjacking,
cookie flags, cross-domain configuration, sub-resource integrity, redirect bodies):

- **Strict-Transport-Security** — `max-age=31536000; includeSubDomains` on every response
  (`Header always set` in the web root `.htaccess`; mirrored in `api/lib/bootstrap.php`), plus a
  loop-safe force-HTTPS 301 with a minimal body, placed **after** the origin lock (CR1 ordering).
- **Content Security Policy everywhere** — one strict site-wide policy on all responses (SPA,
  static assets, API JSON, branded error documents): `default-src 'self'` as the fallback for every
  fetch-style directive, `object-src 'none'`, `frame-src 'self'`, `base-uri`/`form-action 'self'`,
  `frame-ancestors 'none'` (+ `X-Frame-Options: DENY`), `upgrade-insecure-requests`.
- **CSP without `style-src 'unsafe-inline'`** — the error-page `<style>` blocks and the print
  stylesheet are whitelisted by **build-time sha256 hashes** (`scripts/render-htaccess.mjs` renders
  `__BRIG_CSP_STYLE_HASHES__` into `dist/.htaccess`). The printable-PDF fallback was refactored to
  be CSP-clean: its CSS moved to `api/lib/print.css`, the banner/subtitle style attributes became
  classes, and the bar chart is now an inline SVG (widths are SVG geometry attributes, which CSP
  does not restrict — the printable window inherits the SPA's CSP because it is filled with
  `document.write`).
- **X-Content-Type-Options & anti-clickjacking on every response** — the header block moved from
  `Header set` (2xx only) to `Header always set`, so the branded error documents and Apache-level
  404/403 responses carry them too.
- **Cookie hardening** — any `Set-Cookie` emitted by the origin gets missing flags appended
  (`HttpOnly`, `Secure`, `SameSite=Strict`) via conditional `Header always edit` rules; PHP session
  cookie defaults hardened (`cookie_httponly`, `cookie_secure`, `cookie_samesite`,
  `use_strict_mode`).
- **Cross-domain configuration** — the API never echoes `*` or unlisted `Origin` values, and
  `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy: same-origin` are sent on every
  response.
- **Sub-resource integrity** — `scripts/postbuild-html.mjs` stamps `integrity="sha384-…"` on the
  built bundle `<script>`/`<link>` tags (Cloudflare Auto-Minify/Rocket Loader must stay off).
- **Big-redirect surface removed** — `DirectorySlash Off` stops `/dir` → `/dir/` 301 responses.
- **API hardening order fix** — `brig_apply_headers()` now sends all static security headers
  before touching the config, so even a broken private-config cannot strip them; the CORS block
  is isolated in a try/catch, and `api/reports/pdf.php` sends the header set too.

### Changed

- `api/.htaccess` no longer repeats the shared security headers (the web root `.htaccess` already
  applies to `/api` as a subdirectory); it keeps only the API-specific `X-Robots-Tag`.
- `api/lib/print.css` is new and must stay byte-identical to the `<style>` block embedded by
  `api/lib/pdf_template.php` (the build hashes its exact bytes).
- Deployment guide §9–§11 document the new headers, the CSP hash workflow and verification steps.
- New regression test `tests/security-headers.test.ts`.
- README gains **About / So what? / Methodology** sections, and a `SECURITY.md` security policy
  (supported versions, reporting channel, response targets, safe harbour, scope) is added.
- **Shared brand cover** (`pics-sources/BRIG2.jpg|png|webp`) used consistently everywhere: the README
  hero image, the landing-page hero figure, the social card (`og:image` / `twitter:image`, with the
  card upgraded to `summary_large_image`) and the GitHub social preview. The single web-ready asset
  is `public/img/brig-preview.jpg` (1600×1067 JPEG, ~162 KB, derived from `pics-sources/BRIG2.jpg`),
  served at `/img/brig-preview.jpg`.

## [1.1.0] — 2026-11-14

### Added

- **Cloudflare origin lock.** The web root `.htaccess` refuses (`403`) every request that does not
  carry the `X-Origin-Secret` header injected by Cloudflare, so the origin cannot be reached by
  bypassing the CDN. Fail-closed: the block is not wrapped in `<IfModule>`, so a host without
  `mod_rewrite` errors instead of silently serving the origin unprotected.
- **Build-time secret injection.** `.htaccess` is now a tracked template holding
  `__BRIG_CF_ORIGIN_SECRET__`; `npm run build` renders `dist/.htaccess` with the real value read from
  `private-config/cf-origin-secret.txt` (git-ignored) or `BRIG_CF_ORIGIN_SECRET`. The build fails when
  the secret is missing, malformed, or the placeholder survives.
- **`npm run secret:new`** — generates a compliant 32-byte base64url secret.
- **`npm run deploy:package`** — assembles `deploy/` (the exact upload set for cPanel) and prints a file
  manifest; refuses to package an incomplete build or an unrendered `.htaccess`.
- **Branded error pages** — `403.html`, `404.html`, `500.html`, self-contained and styled with the
  application's palette, typography, brand mark, header and footer; wired through `ErrorDocument` and
  exempt from the origin lock so they always render.
- **Licensing and attribution** — `NOTICE`, `THIRD-PARTY-NOTICES.md` (component inventory plus full
  MIT, ISC and Zlib texts), `"license": "Apache-2.0"` and `"author"` in `package.json`, and
  `scripts/copy-legal-notices.mjs`, which deploys `/LICENSE.txt` and `/THIRD-PARTY-NOTICES.txt` with
  every build.
- **Documentation** — deployment guide §15 (origin lock runbook: setup, deploy, verify, rotate) and
  §16 (licensing); README sections for both.

### Changed

- `.htaccess` in the repository is a **template**; the deployable file is the generated
  `dist/.htaccess`. Uploading the template is fail-closed and obviously wrong (403 site-wide).
- The footer links to `Third-party notices` and `License`.
- Deployment steps upload the packaged `deploy/` contents and note that dotfiles must be included.

### Security

- Direct-to-origin requests (IP, temporary URL, stale DNS) now return `403`.
- Dotfiles are refused at the web root, so the `.htaccess` holding the secret can never be served.
- `/.well-known/acme-challenge/` and `/.well-known/pki-validation/` stay exempt from the lock so
  cPanel AutoSSL / HTTP DCV renewal keeps working.

### Fixed

- Reloading or bookmarking `/about` no longer falls through to a 404: it is served from `index.html`.

### Notes

- `requirements/` remains local-only (git-ignored); the always-on requirements are captured there
  (CR1–CR14 for the origin lock and error pages, LR1–LR6 for licensing).
- Optional PEAR `File_PDF` is documented as a non-distributed server component.

## [1.0.0] — 2026-11-08

- Initial release: 120-metric knowledge base, deterministic CISO intelligence engine, board report with
  charts, PDF/PowerPoint/JSON export, optional token-gated AI wording layer, PHP API for cPanel.
