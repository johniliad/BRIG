import type { AiMeta, AnalysisResult } from '../types';

/**
 * Client for the OPTIONAL server features:
 *  - token-secured, opt-in report persistence (MySQL)
 *  - server-side PDF rendering (File_PDF when installed)
 *
 * Nothing here runs unless the user explicitly chooses to save, or requests a
 * server PDF. The deterministic report is always available without these.
 */

const BASE = '';

export interface SaveMeta {
  retentionDays?: number;
}

export interface SavedRef {
  id: string;
  token: string;
  expires_at: string;
  note?: string;
}

async function parseError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    if (json && typeof json.error === 'string') return json.error;
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status}).`;
}

export async function saveReport(model: AnalysisResult, meta: SaveMeta = {}): Promise<SavedRef> {
  const res = await fetch(`${BASE}/api/reports/save.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ model, meta }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Could not save the report.');
  return { id: json.id, token: json.token, expires_at: json.expires_at, note: json.note };
}

export interface LoadedReport {
  model: AnalysisResult | null;
  facts: unknown;
  narrative: unknown;
  created_at?: string;
  expires_at?: string;
}

export async function getReport(id: string, token: string): Promise<LoadedReport> {
  const url = `${BASE}/api/reports/get.php?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(await parseError(res));
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Could not load the report.');
  return { model: json.model ?? null, facts: json.facts, narrative: json.narrative, created_at: json.created_at, expires_at: json.expires_at };
}

/**
 * Request a server-rendered PDF. Returns the Response so the caller can decide:
 *  - content-type application/pdf → download the blob;
 *  - content-type text/html → open the printable HTML (File_PDF not installed);
 *  - non-ok → the caller falls back to the browser print dialog.
 */
export async function fetchServerPdf(model: AnalysisResult, ai?: AiMeta): Promise<Response> {
  const payload = ai ? { ...model, ai } : model;
  return fetch(`${BASE}/api/reports/pdf.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: payload }),
  });
}
