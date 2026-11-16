/**
 * Post-build HTML tweaks for BRIG (runs automatically after `vite build` via
 * npm's postbuild lifecycle hook).
 *
 * 1. Entry-script placement. Vite emits the hashed entry module script in
 *    <head>. For crawlability we want the deployed index.html to carry the
 *    server-rendered fallback content inside #root followed by the entry
 *    script at the end of <body>. Module scripts are deferred, so the move
 *    does not change load behaviour.
 *
 * 2. Sub-resource integrity (ZAP: "Sub Resource Integrity Attribute
 *    Missing"). Every local asset tag emitted by Vite
 *    (./assets/*.js scripts, ./assets/*.css stylesheets) is stamped with
 *    integrity="sha384-…" computed over the exact bytes Vite wrote, so the
 *    browser refuses any modified/corrupted copy of the bundle.
 *
 *    NOTE: this only stays valid while nothing rewrites the assets in
 *    transit. On Cloudflare, keep Auto-Minify and Rocket Loader OFF for this
 *    zone — they alter the JavaScript body and would break the integrity
 *    check (and Rocket Loader is CSP-hostile anyway).
 *
 * Idempotent: re-running the build refreshes the integrity values, because
 * the asset file names are content-hashed and their bytes change per build.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const file = join(root, 'dist', 'index.html');

const TAG = '[postbuild-html]';

/** sha384 integrity value ("sha384-<base64>") for the given bytes. */
export function integrityFor(bytes) {
  return `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
}

/**
 * Resolve an asset URL from the built HTML to the file in dist/ and return
 * its bytes, or null when the URL is not a local build asset.
 */
export function resolveAssetBytes(distDir, url) {
  if (!/^(\.\/|\/)?assets\/[^/]+$/.test(url) || url.includes('//')) {
    return null; // not a local bundle asset (external URLs are never touched)
  }
  const path = join(distDir, url.replace(/^(\.\/|\/)/, ''));
  return existsSync(path) ? readFileSync(path) : null;
}

/**
 * Add (or refresh) the integrity attribute on one asset tag.
 * readAsset(url) → Buffer | null; tags whose asset cannot be read are left
 * untouched (fail-safe: no integrity is better than a wrong integrity).
 */
export function stampIntegrity(tag, url, readAsset) {
  const bytes = readAsset(url);
  if (!bytes) return tag;
  const integrity = integrityFor(bytes);
  if (/integrity=(["'])[\s\S]*?\1/i.test(tag)) {
    return tag.replace(/integrity=(["'])[\s\S]*?\1/i, `integrity="${integrity}"`);
  }
  // Insert before the closing bracket of the open tag.
  return tag.replace(/\s*>$/, ` integrity="${integrity}">`);
}

/**
 * Stamp integrity on every local script and stylesheet tag in the HTML.
 */
export function applySubresourceIntegrity(html, readAsset) {
  let stamped = 0;
  let out = html.replace(
    /<script\b[^>]*?\bsrc=(["'])([^"']+\.js)\1[^>]*>/gi,
    (tag, _quote, url) => {
      const next = stampIntegrity(tag, url, readAsset);
      if (next !== tag) stamped++;
      return next;
    },
  );
  out = out.replace(
    /<link\b[^>]*?>/gi,
    (tag) => {
      if (!/rel=(["'])stylesheet\1/i.test(tag)) return tag;
      const href = tag.match(/\bhref=(["'])([^"']+\.css)\1/i);
      if (!href) return tag;
      const next = stampIntegrity(tag, href[2], readAsset);
      if (next !== tag) stamped++;
      return next;
    },
  );
  return { html: out, stamped };
}

function moveEntryScript(html) {
  // Locate the hashed entry script Vite emits in <head>.
  const script = html.match(/<script type="module"[^>]*src="\.\/assets\/index-[^"]+\.js"><\/script>/);
  if (!script) {
    console.error(`${TAG} entry script tag not found in dist/index.html — nothing moved.`);
    process.exit(1);
  }

  // Remove the script line from <head> together with its newline + indentation.
  const idx = html.indexOf(script[0]);
  html = html.slice(0, idx - 5) + html.slice(idx + script[0].length);

  // Normalise the whitespace-only lines before </body>…
  html = html.replace(/\n\s*\n\s*<\/body>/, '\n\n</body>');
  // …and insert the entry script right before </body>.
  return html.replace(/<\/body>/, `    ${script[0]}\n  </body>`);
}

function main() {
  let html = readFileSync(file, 'utf8');

  html = moveEntryScript(html);
  console.log(`${TAG} moved entry script into <body> of dist/index.html`);

  const distDir = dirname(file);
  const result = applySubresourceIntegrity(html, (url) => resolveAssetBytes(distDir, url));
  html = result.html;
  console.log(`${TAG} stamped integrity="sha384-…" on ${result.stamped} asset tag(s)`);

  writeFileSync(file, html);
}

// Only run when executed directly, so tests can import the helpers above.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

