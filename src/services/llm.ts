import type { ReportFacts } from '../types';

/**
 * Client for the optional Executive Writing Layer. It ONLY sends ReportFacts
 * (the analytical boundary) plus audience/style/language. It never sends the
 * full metric library. If the server is unavailable or AI is not configured,
 * callers fall back to the deterministic narrative (R11).
 */

export const AI_FALLBACK_MESSAGE =
  'AI enhancement is temporarily unavailable. Your deterministic Board report remains available.';

export interface ProviderInfo {
  provider_key: string;
  provider_name: string;
  model_label: string;
  privacy_class: string;
  privacy_summary: string;
  policy_url: string;
  has_key?: boolean;
  enabled: boolean;
  active_for_public_demo: boolean;
}

export interface AiDiagnostics {
  config_loaded: boolean;
  curl: boolean;
  allow_url_fopen: boolean;
}

export interface EnhancedNarrative {
  executive_headline: string;
  executive_summary: string;
  key_risks: string[];
  key_achievements: string[];
  strategic_priorities: string[];
  board_actions: string[];
}

export interface EnhanceOptions {
  audience: string;
  style: string;
  language: string;
  /** Which provider to use (server falls back to the first with a key if omitted). */
  provider?: string;
}

function apiBase(): string {
  // Same-origin by default; Vite dev server proxies /api to the PHP server.
  return '';
}

export async function fetchAiStatus(): Promise<{ providers: ProviderInfo[]; diagnostics: AiDiagnostics | null }> {
  const res = await fetch(`${apiBase()}/api/llm/providers.php`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Providers request failed (${res.status})`);
  const json = await res.json();
  const diagnostics =
    json && typeof json.diagnostics === 'object' && json.diagnostics !== null
      ? (json.diagnostics as AiDiagnostics)
      : null;
  return { providers: Array.isArray(json.providers) ? json.providers : [], diagnostics };
}

export interface UnlockResult {
  session: string;
  expires_at: string;
}

/** Redeem a one-time AI access token and obtain a short AI session. */
export async function unlockAi(token: string): Promise<UnlockResult> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/ai/unlock.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch {
    throw new Error(AI_FALLBACK_MESSAGE);
  }
  let json: { ok?: boolean; error?: string; session?: string; expires_at?: string };
  try {
    json = await res.json();
  } catch {
    throw new Error(AI_FALLBACK_MESSAGE);
  }
  if (!res.ok || !json.ok || !json.session) {
    throw new Error(json.error || 'Could not unlock AI. Check your access token.');
  }
  return { session: json.session, expires_at: json.expires_at ?? '' };
}

export async function enhanceNarrative(
  facts: ReportFacts,
  opts: EnhanceOptions,
  aiSession?: string,
): Promise<{ enhanced: EnhancedNarrative; validated: boolean; providerLabel: string; providerModel: string }> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/llm/generate.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(aiSession ? { 'X-BRIG-AI-Session': aiSession } : {}),
      },
      body: JSON.stringify({
        facts,
        audience: opts.audience,
        style: opts.style,
        language: opts.language,
        provider: opts.provider ?? '',
        ai_session: aiSession ?? '',
      }),
    });
  } catch {
    throw new Error(AI_FALLBACK_MESSAGE);
  }

  type GenResp = {
    ok?: boolean;
    error?: string;
    code?: string;
    detail?: string;
    reason?: string;
    provider_status?: number;
    validated?: boolean;
    provider?: string;
    model?: string;
    data?: EnhancedNarrative;
  };
  let json: GenResp | null = null;
  try {
    json = (await res.json()) as GenResp;
  } catch {
    json = null;
  }

  const describe = (base: string): string => {
    const extra: string[] = [];
    if (json?.code) extra.push(json.code);
    if (json?.reason) extra.push(`reason: ${json.reason}`);
    if (typeof json?.provider_status === 'number' && json.provider_status) extra.push(`HTTP ${json.provider_status}`);
    if (json?.detail) extra.push(String(json.detail).slice(0, 200));
    return extra.length ? `${base} [${extra.join(' · ')}]` : base;
  };

  if (!res.ok) {
    throw new Error(describe(json?.error || AI_FALLBACK_MESSAGE));
  }
  if (!json || !json.ok || !json.data) {
    throw new Error(describe(json?.error || AI_FALLBACK_MESSAGE));
  }

  const obj = json as { data: EnhancedNarrative; validated?: boolean; provider?: string; model?: string };
  return {
    enhanced: obj.data,
    validated: Boolean(obj.validated),
    providerLabel: obj.provider ?? 'AI provider',
    providerModel: obj.model ?? '',
  };
}
