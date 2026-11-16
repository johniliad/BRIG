# Security Policy

BRIG — CISO Board Reporting Intelligence Generator
Owner: Dr. John ILIADIS · <https://www.iliadis.net/>

## Supported versions

Only the latest minor release line receives security fixes.

| Version | Supported |
|---------|-----------|
| 1.1.x   | ✅ |
| 1.0.x   | ❌ — please upgrade |
| older   | ❌ |

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

Preferred channel: **GitHub private vulnerability reporting** — on the repository page open
**Security → Report a vulnerability**. This keeps the report, the discussion and the fix coordinated
without exposing details publicly. If you cannot use GitHub, use the contact options published on
<https://www.iliadis.net/>.

When reporting, please include:

- a short description of the issue and its impact;
- the affected component or endpoint (e.g. `api/llm/generate.php`, the SPA, the `.htaccess` rules);
- steps to reproduce, or a minimal proof of concept;
- the deployment context where relevant (Apache/cPanel, behind Cloudflare, PHP version).

## What to expect

- **Acknowledgement:** within 2 business days.
- **Updates:** at least weekly while a fix is being prepared.
- **Fix and disclosure:** coordinated disclosure — the reporter is informed before and during the
  fix, and credited in the `CHANGELOG.md` on request. Target timelines: 30 days for critical issues,
  90 days for everything else.

## Safe harbour

Good-faith security research is welcome, provided you:

- only test systems you own or are explicitly authorised to test;
- do not degrade availability (no denial-of-service, no aggressive automated scanning);
- do not access, modify or exfiltrate data that is not yours;
- stop and report as soon as you can demonstrate the impact;
- keep details confidential until a fix is released and announced.

## Scope

**In scope**

- The single-page application (`src/`) and its build/deployment artifacts (`dist/`, `.htaccess`).
- The PHP API (`api/`) — endpoints, configuration handling, the AI proxy, persistence, rate limiting.
- The documented deployment guidance (`docs/deployment.md`), including the Cloudflare origin lock.
- Supply chain: dependencies declared in `package.json` and `api/composer.json`.

**Out of scope**

- Abuse of third-party services (Cloudflare, the hosting provider, LLM providers) or violations of
  their terms.
- Social engineering, physical attacks, spam or phishing of the maintainer or users.
- Automated scanner output without a demonstrated, exploitable impact.
- Missing hardening on self-hosted deployments that did not follow `docs/deployment.md`.

## Built-in security posture

What the application already enforces (full detail: `docs/deployment.md` §11 and the `CHANGELOG.md`
1.1.1 "Security" entries):

- **Secrets stay server-side**, outside the web root (`~/brig_private-config/brig.php` or
  `BRIG_CONFIG_PATH`); nothing sensitive is committed or bundled into `dist/`.
- **Deterministic-first design.** The report works with no AI at all; the optional LLM layer is
  one-time-token gated, receives only a minimal `ReportFacts` evidence boundary, treats user free
  text as untrusted data, and its output is schema- and fact-validated with a deterministic fallback.
- **Opt-in persistence only.** Saving a report is token-secured with expiry and off unless a database
  is configured; the default workflow persists nothing.
- **Hardened responses.** Strict-Transport-Security, a strict Content-Security-Policy without
  `style-src 'unsafe-inline'` (inline styles allowed only by build-time sha256 hashes),
  X-Frame-Options / `frame-ancestors 'none'`, X-Content-Type-Options, COOP/CORP, Permissions-Policy,
  Referrer-Policy, cookie hardening and sub-resource integrity on the bundle.
- **Origin control.** The web root `.htaccess` refuses requests that bypass the Cloudflare edge
  (shared-secret header, fail-closed), forces HTTPS with a loop-safe minimal-body redirect, and
  blocks private folders and dotfiles.
- **Abuse controls.** Per-IP / per-hour / per-session / global rate limits on the public AI surface
  with `429` + `Retry-After`, and branded error pages that leak nothing.
