import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyPlaceholders,
  computeCspStyleHashes,
  extractStyleBlocks,
  sha256Base64,
} from '../scripts/render-htaccess.mjs';
import { applySubresourceIntegrity, integrityFor } from '../scripts/postbuild-html.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const template = readFileSync(join(root, '.htaccess'), 'utf8');

describe('security headers — .htaccess template (ZAP remediations)', () => {
  it('sets the full header set with `Header always set` (covers error docs too)', () => {
    for (const directive of [
      'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
      'Header always set X-Content-Type-Options "nosniff"',
      'Header always set X-Frame-Options "DENY"',
      'Header always set Cross-Origin-Opener-Policy "same-origin"',
      'Header always set Cross-Origin-Resource-Policy "same-origin"',
      'Header always set Permissions-Policy',
    ]) {
      expect(template).toContain(directive);
    }
  });

  it('ships one strict CSP: fallbacks everywhere, no unsafe-inline/eval', () => {
    const csp = template.match(/Header always set Content-Security-Policy "([^"]+)"/);
    expect(csp).not.toBeNull();
    const policy = csp![1];
    expect(policy).toContain("default-src 'self'"); // fallback for every fetch directive
    expect(policy).toContain("style-src 'self'__BRIG_CSP_STYLE_HASHES__"); // hashes, not unsafe-inline
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("img-src 'self' data:");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-src 'self'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain('unsafe-inline');
    expect(policy).not.toContain('unsafe-eval');
  });

  it('hardens every Set-Cookie with HttpOnly / Secure / SameSite', () => {
    expect((template.match(/Header always edit Set-Cookie/g) ?? []).length).toBe(3);
    expect(template).toContain('"$1; HttpOnly"');
    expect(template).toContain('"$1; Secure"');
    expect(template).toContain('"$1; SameSite=Strict"');
  });

  it('keeps the redirect surface minimal (DirectorySlash Off; origin lock first)', () => {
    expect(template).toContain('DirectorySlash Off');
    const lockIdx = template.indexOf('Deny every request that does not carry the exact secret');
    const httpsIdx = template.indexOf('Force HTTPS');
    expect(lockIdx).toBeGreaterThan(-1);
    expect(httpsIdx).toBeGreaterThan(lockIdx); // CR1: lock precedes every redirect
  });
});

describe('CSP style hashes (build-time, render-htaccess)', () => {
  it('hashes the exact bytes of every static <style> block and print.css', () => {
    const hashes = computeCspStyleHashes(root);
    expect(hashes.length).toBe(4); // 403, 404, 500 + print.css

    // Recompute the 403 hash independently from the raw bytes between the tags.
    const html = readFileSync(join(root, 'public', '403.html'), 'utf8');
    const block = html.match(/<style>([\s\S]*?)<\/style>/)![1];
    expect(hashes[0]).toBe(`'sha256-${createHash('sha256').update(block, 'utf8').digest('base64')}'`);

    const css = readFileSync(join(root, 'api', 'lib', 'print.css'), 'utf8');
    expect(hashes[3]).toBe(`'sha256-${sha256Base64(css)}'`);

    for (const h of hashes) {
      expect(h).toMatch(/^'sha256-[A-Za-z0-9+/]{43}='$/); // sha256 → 32B → 44 chars b64
    }
  });

  it('renders the placeholders into a usable CSP style-src list', () => {
    const rendered = applyPlaceholders(template, {
      secret: 'A'.repeat(43),
      hashes: ["'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='"],
    });
    expect(rendered).not.toContain('__BRIG_CSP_STYLE_HASHES__');
    expect(rendered).toMatch(/style-src 'self' 'sha256-/);
    expect(rendered).not.toContain('__BRIG_CF_ORIGIN_SECRET__');
    expect(rendered).toContain('X-Origin-Secret');
  });

  it('extracts style blocks raw — CSP hashes are whitespace-sensitive', () => {
    expect(extractStyleBlocks('<style>a{}</style>x<style>\n  b{}  </style>')).toEqual(['a{}', '\n  b{}  ']);
  });
});

describe('sub-resource integrity (postbuild-html)', () => {
  const bytes = (s: string) => Buffer.from(s, 'utf8');
  const readAsset = (url: string) =>
    url.endsWith('a.js') ? bytes('console.log(1)') : url.endsWith('b.css') ? bytes('body{}') : null;

  it('stamps integrity on local script/stylesheet tags only', () => {
    const html = [
      '<script type="module" crossorigin src="./assets/index-a.js"></script>',
      '<link rel="stylesheet" crossorigin href="./assets/b.css">',
      '<script src="https://cdn.example.com/x.js"></script>',
      '<link rel="author" href="https://www.iliadis.net/">',
    ].join('\n');
    const { html: out, stamped } = applySubresourceIntegrity(html, readAsset);
    expect(stamped).toBe(2);
    expect(out).toContain(
      `<script type="module" crossorigin src="./assets/index-a.js" integrity="${integrityFor(bytes('console.log(1)'))}"></script>`,
    );
    expect(out).toContain(
      `<link rel="stylesheet" crossorigin href="./assets/b.css" integrity="${integrityFor(bytes('body{}'))}">`,
    );
    expect(out).toContain('<script src="https://cdn.example.com/x.js"></script>');
  });

  it('is idempotent and refreshes stale integrity values', () => {
    const tag = '<script type="module" crossorigin src="./assets/index-a.js" integrity="sha384-stale"></script>';
    const once = applySubresourceIntegrity(tag, readAsset).html;
    expect(once).not.toContain('stale');
    expect((once.match(/integrity=/g) ?? []).length).toBe(1);
    expect(applySubresourceIntegrity(once, readAsset).html).toBe(once);
  });

  it('leaves tags alone when the asset cannot be read (fail-safe)', () => {
    const tag = '<script type="module" src="./assets/missing.js"></script>';
    expect(applySubresourceIntegrity(tag, readAsset)).toEqual({ html: tag, stamped: 0 });
  });
});

