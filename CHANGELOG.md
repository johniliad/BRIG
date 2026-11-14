# Changelog

All notable changes to BRIG — CISO Board Reporting Intelligence Generator.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
