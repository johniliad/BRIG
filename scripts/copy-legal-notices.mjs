/**
 * Ship the legal notices with every build (runs after `vite build`, chained from
 * the npm `postbuild` hook).
 *
 * Conveying the built app triggers attribution obligations: the MIT/ISC/Zlib
 * components bundled into dist/assets/*.js need their copyright and permission
 * notices reproduced, and Apache-2.0 recipients need a copy of the licence.
 *
 *   LICENSE               -> dist/LICENSE.txt                 (/LICENSE.txt)
 *   THIRD-PARTY-NOTICES.md -> dist/THIRD-PARTY-NOTICES.txt    (/THIRD-PARTY-NOTICES.txt)
 *
 * Both are plain text so browsers display them instead of downloading them, and
 * both are linked from the site footer and the branded error pages.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const TAG = '[copy-legal-notices]';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'dist');

const files = [
  { from: join(root, 'LICENSE'), to: join(outDir, 'LICENSE.txt') },
  { from: join(root, 'THIRD-PARTY-NOTICES.md'), to: join(outDir, 'THIRD-PARTY-NOTICES.txt') },
];

for (const { from } of files) {
  if (!existsSync(from)) {
    console.error(`${TAG} missing source file: ${from.replace(root, '.')} — refusing to ship a build without its licences.`);
    process.exit(1);
  }
}

mkdirSync(outDir, { recursive: true });
for (const { from, to } of files) copyFileSync(from, to);

console.log(`${TAG} dist/LICENSE.txt and dist/THIRD-PARTY-NOTICES.txt written`);
