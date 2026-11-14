/**
 * Print a fresh Cloudflare origin-lock secret for BRIG.
 *
 * Usage: npm run secret:new
 *
 * 32 random bytes encoded as base64url (43 characters from [A-Za-z0-9_-]),
 * which is safe both in an Apache RewriteCond regex and as a literal value in
 * the Cloudflare dashboard. Paste the same value in:
 *   1. Cloudflare -> Rules -> Transform Rules -> Modify request header
 *      (Set static: X-Origin-Secret), and
 *   2. private-config/cf-origin-secret.txt (git-ignored, one line, no quotes).
 */
import { randomBytes } from 'node:crypto';

console.log(randomBytes(32).toString('base64url'));
