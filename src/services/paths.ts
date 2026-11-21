function baseUrl(): URL {
  const base = typeof document !== 'undefined' ? document.baseURI : 'http://localhost/';
  return new URL(import.meta.env.BASE_URL || './', base);
}

export function appUrl(path: string): string {
  return new URL(path.replace(/^\//, ''), baseUrl()).toString();
}

export function apiUrl(path: string): string {
  return appUrl(`api/${path.replace(/^\/?api\//, '').replace(/^\//, '')}`);
}

export function assetUrl(path: string): string {
  return appUrl(path);
}