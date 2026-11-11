/**
 * Post-build HTML tweak for BRIG (runs automatically after `vite build` via
 * npm's postbuild lifecycle hook).
 *
 * Vite emits the hashed entry module script in <head>. For crawlability we
 * want the deployed index.html to carry the server-rendered fallback content
 * inside #root followed by the entry script at the end of <body>. Module
 * scripts are deferred, so the move does not change load behaviour.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const file = join(root, 'dist', 'index.html');

let html = readFileSync(file, 'utf8');

// Locate the hashed entry script Vite emits in <head>.
const script = html.match(/<script type="module"[^>]*src="\.\/assets\/index-[^"]+\.js"><\/script>/);
if (!script) {
  console.error('[postbuild-html] entry script tag not found in dist/index.html — nothing moved.');
  process.exit(1);
}

// Remove the script line from <head> together with its newline + indentation.
const idx = html.indexOf(script[0]);
html = html.slice(0, idx - 5) + html.slice(idx + script[0].length);

// Normalise the whitespace-only lines before </body>…
html = html.replace(/\n\s*\n\s*<\/body>/, '\n\n</body>');
// …and insert the entry script right before </body>.
html = html.replace(/<\/body>/, `    ${script[0]}\n  </body>`);

writeFileSync(file, html);
console.log('[postbuild-html] moved entry script into <body> of dist/index.html');
