import type { BoardProfile, MetricObservation, PrivacyMode } from '../types';
import { emptyObservation } from '../data/demo';
import { METRICS } from '../data/library';

export const DRAFT_STORAGE_KEY = 'brig_draft_v3';
export const DRAFT_SCHEMA_VERSION = 3;

export interface StoredDraft {
  schemaVersion: number;
  savedAt: string;
  profile: BoardProfile;
  selectedKeys: string[];
  observations: Record<string, MetricObservation>;
  privacyMode: PrivacyMode;
  demoActive: boolean;
}

export function loadDraft(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY) ?? localStorage.getItem('brig_draft_v2');
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<StoredDraft>;
    if (
      !draft.profile ||
      !Array.isArray(draft.selectedKeys) ||
      !draft.observations ||
      typeof draft.observations !== 'object'
    ) {
      return null;
    }
    const validKeys = new Set(METRICS.map((metric) => metric.metric_key));
    const selectedKeys = [...new Set(draft.selectedKeys.filter((key): key is string => typeof key === 'string' && validKeys.has(key)))];
    const observations: Record<string, MetricObservation> = {};
    for (const key of selectedKeys) {
      const rawObservation = (draft.observations as Record<string, Partial<MetricObservation>>)[key] ?? {};
      const fallback = emptyObservation(key);
      const dataStatus = rawObservation.dataStatus ?? (rawObservation.applicable === false ? 'not_applicable' : rawObservation.current !== null && rawObservation.current !== undefined ? 'available' : 'not_set');
      observations[key] = {
        ...fallback,
        ...rawObservation,
        metric_key: key,
        dataStatus,
        applicable: dataStatus !== 'not_applicable',
        history: Array.isArray(rawObservation.history) ? rawObservation.history.filter((value): value is number => Number.isFinite(value)) : [],
        lowerThreshold: Number.isFinite(rawObservation.lowerThreshold) ? rawObservation.lowerThreshold as number : null,
        upperThreshold: Number.isFinite(rawObservation.upperThreshold) ? rawObservation.upperThreshold as number : null,
        comparisonMissingReason: typeof rawObservation.comparisonMissingReason === 'string' ? rawObservation.comparisonMissingReason : '',
      };
    }
    return { ...(draft as StoredDraft), schemaVersion: DRAFT_SCHEMA_VERSION, selectedKeys, observations };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<StoredDraft, 'schemaVersion' | 'savedAt'>): string | null {
  try {
    const savedAt = new Date().toISOString();
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ ...draft, schemaVersion: DRAFT_SCHEMA_VERSION, savedAt } satisfies StoredDraft),
    );
    return savedAt;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* storage is optional */
  }
}