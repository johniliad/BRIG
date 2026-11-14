/**
 * Render the deployable .htaccess for BRIG (runs automatically after
 * `vite build` via npm's postbuild lifecycle hook).
 *
 * The repository only ever stores the .htaccess *template*, with the literal
 * placeholder __BRIG_CF_ORIGIN_SECRET__ for the Cloudflare origin-lock header
 * value. Apache cannot include another file from .htaccess, so the deployed
 * file must contain the secret; this script injects it at build time from a
 * location that is never committed:
 *
 *   1. env var BRIG_CF_ORIGIN_SECRET (CI / another machine), or else
 *   2. private-config/cf-origin-secret.txt (git-ignored, one line)
 *
 * Output: dist/.htaccess (git-ignored via dist/). The build FAILS if the
 * secret is missing, malformed, or if the placeholder survives rendering, so
 * an unprotected bundle can never be produced by accident.
 *
 * The value itself is never logged.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PLACEHOLDER = '__BRIG_CF_ORIGIN_SECRET__';
const SECRET_RELPATH = join('private-config', 'cf-origin-secret.txt');
// base64url / hex friendly alphabet: no PCRE metacharacters, no quoting issues
// in Apache or in the Cloudflare dashboard.
const SECRET_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const templatePath = join(root, '.htaccess');
const outDir = join(root, 'dist');
const outPath = join(outDir, '.htaccess');

const TAG = '[render-htaccess]';

function fail(message, hint) {
  console.error(`${TAG} ${message}`);
  if (hint) console.error(`${TAG} ${hint}`);
  process.exit(1);
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

const rendered = template.split(PLACEHOLDER).join(secret.value);
if (rendered.includes(PLACEHOLDER)) {
  fail('the origin secret was not fully substituted — refusing to ship a locked-out .htaccess.');
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, rendered);

console.log(
  `${TAG} dist/.htaccess written — origin lock enabled ` +
    `(secret from ${secret.source}, ${secret.value.length} chars, value not logged)`,
);
