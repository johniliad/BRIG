/**
 * SEO helpers for BRIG.
 *
 * The app is a single-page application: every view (landing, wizard, about,
 * methodology, disclaimers, saved reports) lives at one real page — the site
 * root. The canonical URL is therefore constant and must stay in sync with:
 *  - <link rel="canonical" ...> in index.html (static, for non-JS crawlers)
 *  - the JSON-LD mainEntityOfPage.url in index.html
 */
export const CANONICAL_URL = 'https://brig.iliadis.net/';

/**
 * Ensures the canonical <link> in <head> points at the main page, even if the
 * SPA was served under another path (e.g. /about after a host rewrite or a
 * stale pushState entry). Runs once at startup.
 */
export function enforceCanonical(): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== CANONICAL_URL) {
    link.setAttribute('href', CANONICAL_URL);
  }
}
