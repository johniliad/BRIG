/**
 * Render the deployable .htaccess for BRIG (runs automatically after
 * `vite build` via npm's postbuild lifecycle hook).
 *
 * The repository only ever stores the .htaccess *template*, with literals for
 * the two values Apache cannot obtain at runtime:
 *
 *   __BRIG_CF_ORIGIN_SECRET__ — the Cloudflare origin-lock header value.
 *     Apache cannot include another file from .htaccess, so the deployed
 *     file must contain the secret; it is injected at build time from a
 *     location that is never committed:
 *       1. env var BRIG_CF_ORIGIN_SECRET (CI / another machine), or else
 *       2. private-config/cf-origin-secret.txt (git-ignored, one line)
 *
 *   __BRIG_CSP_STYLE_HASHES__ — sha256 hashes (CSP style-src sources) of the
 *     site's only inline styles: the static <style> block of each branded
 *     error page (public/403.html, 404.html, 500.html) and the print
 *     stylesheet api/lib/print.css (embedded by the printable-PDF fallback
 *     in api/lib/pdf_template.php). Hashing them at build time lets the CSP
 *     ship WITHOUT 'unsafe-inline' while those documents stay styled. The
 *     printable HTML is written into a new window with document.write, so it
 *     inherits the SPA's policy and needs its hash in the site-wide CSP.
 *
 * Output: dist/.htaccess (git-ignored via dist/). The build FAILS if a secret
 * or hash is missing, malformed, or if a placeholder survives rendering, so
 * an unprotected or CSP-broken bundle can never be produced by accident.
 *
 * The secret itself is never logged.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const PLACEHOLDER = '__BRIG_CF_ORIGIN_SECRET__';
const HASHES_PLACEHOLDER = '__BRIG_CSP_STYLE_HASHES__';
const SECRET_RELPATH = join('private-config', 'cf-origin-secret.txt');
// base64url / hex friendly alphabet: no PCRE metacharacters, no quoting issues
// in Apache or in the Cloudflare dashboard.
const SECRET_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

// The exact inline-style sources hashed into the CSP style-src, in order.
const CSP_STYLE_SOURCES = [
  join('public', '403.html'),
  join('public', '404.html'),
  join('public', '500.html'),
  join('api', 'lib', 'print.css'),
];

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const templatePath = join(root, '.htaccess');
const outDir = join(root, 'dist');
const outPath = join(outDir, '.htaccess');

const TAG = '[render-htaccess]';

export function fail(message, hint) {
  console.error(`${TAG} ${message}`);
  if (hint) console.error(`${TAG} ${hint}`);
  process.exit(1);
}

/** sha256 of a UTF-8 string, base64-encoded (the CSP `sha256-…` payload). */
export function sha256Base64(content) {
  return createHash('sha256').update(content, 'utf8').digest('base64');
}

/**
 * Exact raw text of every <style>…</style> block in an HTML document.
 * CSP hashes are computed over the exact bytes between the tags — no
 * trimming, or the browser would compute a different hash and block the
 * styles the hash was meant to allow.
 */
export function extractStyleBlocks(html) {
  const blocks = [];
  const re = /<style>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

/**
 * The CSP style-src hash sources for every static inline style. HTML sources
 * contribute one hash per <style> block (exactly one is expected); CSS files
 * contribute their whole content.
 */
export function computeCspStyleHashes(baseDir = root) {
  const hashes = [];
  for (const relpath of CSP_STYLE_SOURCES) {
    const path = join(baseDir, relpath);
    if (!existsSync(path)) {
      fail(`CSP style source not found: ${relpath}`,
        'Restore the file before building — the CSP style-src list is generated from it.');
    }
    const content = readFileSync(path, 'utf8');
    if (relpath.endsWith('.html')) {
      const blocks = extractStyleBlocks(content);
      if (blocks.length !== 1) {
        fail(`${relpath} must contain exactly one <style> block (found ${blocks.length}).`,
          'The CSP style-src hash list is generated from it.');
      }
      hashes.push(`'sha256-${sha256Base64(blocks[0])}'`);
    } else {
      hashes.push(`'sha256-${sha256Base64(content)}'`);
    }
  }
  return hashes;
}

/**
 * Substitute both placeholders and refuse to render a broken deployment.
 */
export function applyPlaceholders(template, { secret, hashes }) {
  let rendered = template.split(PLACEHOLDER).join(secret);
  rendered = rendered.split(HASHES_PLACEHOLDER).join(hashes.length > 0 ? ` ${hashes.join(' ')}` : '');
  if (rendered.includes(PLACEHOLDER)) {
    fail('the origin secret was not fully substituted — refusing to ship a locked-out .htaccess.');
  }
  if (rendered.includes(HASHES_PLACEHOLDER)) {
    fail('the CSP style hashes were not fully substituted — refusing to ship an unrenderable CSP.');
  }
  return rendered;
}

function readSecret() {
  const fromEnv = (process.env.BRIG_CF_ORIGIN_SECRET || '').trim();
  if (fromEnv) return { value: fromEnv, source: 'BRIG_CF_ORIGIN_SECRET' };

  const file = join(root, SECRET_RELPATH);
  if (!existsSync(file)) return null;

  // Tolerate CRLF from Windows editors and a single pair of quotes.
  const raw = readFileSync(file, 'utf8').trim().replace(/^["']|["']$/g, '');
  if (!raw) fail(`${SECRET_RELPATH} exists but is empty.`);
  return { value: raw, source: SECRET_RELPATH };
}

function main() {
  if (!existsSync(templatePath)) {
    fail('template .htaccess not found in the project root.');
  }

  const secret = readSecret();
  if (!secret) {
    fail(
      'Cloudflare origin secret is not configured — refusing to build an unprotected deployment.',
      `Create ${SECRET_RELPATH} containing the secret on a single line (or set BRIG_CF_ORIGIN_SECRET). ` +
        'Generate one with: npm run secret:new',
    );
  }
  if (!SECRET_PATTERN.test(secret.value)) {
    fail(
      'Cloudflare origin secret has an unsupported format.',
      `Expected 32-128 characters from [A-Za-z0-9_-] in ${secret.source}. Generate one with: npm run secret:new`,
    );
  }

  const template = readFileSync(templatePath, 'utf8');
  if (!template.includes(PLACEHOLDER)) {
    fail(
      `the .htaccess template no longer contains ${PLACEHOLDER}.`,
      'Restore the Cloudflare origin-lock block (requirement CR1) before building.',
    );
  }

  const hashes = computeCspStyleHashes(root);
  const rendered = applyPlaceholders(template, { secret: secret.value, hashes });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, rendered);

  console.log(
    `${TAG} dist/.htaccess written — origin lock enabled, ${hashes.length} CSP style hash(es) embedded ` +
      `(secret from ${secret.source}, ${secret.value.length} chars, value not logged)`,
  );
}

// Only run when executed directly, so tests can import the helpers above.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
