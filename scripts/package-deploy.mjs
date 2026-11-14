/**
 * Assemble the exact upload set for the cPanel/Apache host.
 *
 * Usage:  npm run build            (renders dist/.htaccess with the real secret)
 *         npm run deploy:package   (assembles ./deploy)
 *
 * Output: ./deploy/  — upload its CONTENTS into the app web root, e.g.
 *         public_html/brig/ (or public_html/ when the app is the domain root).
 *         File Manager: Settings -> Show Hidden Files, so deploy/.htaccess goes up.
 *
 * The script refuses to package when the build is incomplete or when
 * dist/.htaccess still holds the placeholder (which would 403 the whole site).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const TAG = '[package-deploy]';
const PLACEHOLDER = '__BRIG_CF_ORIGIN_SECRET__';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const out = join(root, 'deploy');

// Everything the web root must contain.
const REQUIRED_IN_DIST = [
  'index.html',
  '403.html',
  '404.html',
  '500.html',
  'LICENSE.txt',
  'THIRD-PARTY-NOTICES.txt',
  '.htaccess',
];
const ROOT_FILES = ['robots.txt', 'sitemap.xml', 'llms.txt'];
const DIRS = [
  { from: join(root, 'api'), to: join(out, 'api') },
  { from: join(root, 'data'), to: join(out, 'data') },
];

function fail(message) {
  console.error(`${TAG} ${message}`);
  process.exit(1);
}

if (!existsSync(dist)) fail('dist/ is missing — run: npm run build');

const missing = REQUIRED_IN_DIST.filter((f) => !existsSync(join(dist, f)));
if (missing.length) {
  fail(
    `the build is incomplete (missing: ${missing.join(', ')}). ` +
      'dist/.htaccess is produced by the postbuild step, which needs the Cloudflare origin secret.',
  );
}

const htaccess = readFileSync(join(dist, '.htaccess'), 'utf8');
if (htaccess.includes(PLACEHOLDER)) fail('dist/.htaccess still contains the placeholder — rebuild with the real secret.');
if (!htaccess.includes('X-Origin-Secret')) fail('dist/.htaccess has no origin lock — refusing to package.');

// Never ship the template or any secret material.
if (existsSync(join(out))) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

cpSync(dist, out, { recursive: true });
for (const f of ROOT_FILES) {
  if (!existsSync(join(root, f))) fail(`${f} is missing from the project root.`);
  cpSync(join(root, f), join(out, f));
}
for (const { from, to } of DIRS) {
  if (!existsSync(from)) fail(`missing folder: ${relative(root, from)}`);
  cpSync(from, to, {
    recursive: true,
    filter: (src) => !src.includes(`${join('api', 'storage')}`) || src.endsWith('.gitkeep'),
  });
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const files = walk(out)
  .map((p) => ({ path: relative(out, p).replace(/\\/g, '/'), size: statSync(p).size }))
  .sort((a, b) => a.path.localeCompare(b.path));

const total = files.reduce((n, f) => n + f.size, 0);
console.log(`${TAG} deploy/ assembled — ${files.length} files, ${(total / 1024).toFixed(0)} KiB\n`);
for (const f of files) console.log(`  ${f.path.padEnd(58)} ${String(f.size).padStart(9)}`);
console.log(
  `\n${TAG} upload the CONTENTS of deploy/ into the web root (include .htaccess — enable "Show Hidden Files").`,
);
console.log(`${TAG} do NOT upload: .htaccess (repo root template), brig.php, database/, scripts/, tests/, src/, node_modules/`);
