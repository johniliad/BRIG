import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type {
  AnalysisResult,
  BoardProfile,
  MetricDefinition,
  MetricObservation,
  PrivacyMode,
} from '../types';
import { METRICS } from '../data/library';
import { DEFAULT_PROFILE, demoObservations, emptyObservation } from '../data/demo';
import { analyze } from '../engine/analyze';

export type WizardStep =
  | 'landing'
  | 'profile'
  | 'select'
  | 'entry'
  | 'review'
  | 'report'
  | 'saved'
  | 'about'
  | 'methodology'
  | 'disclaimer';

export interface AiUiState {
  status: 'idle' | 'loading' | 'done' | 'error';
  message?: string;
  providerLabel?: string;
  providerModel?: string;
  validated?: boolean;
  enhanced?: {
    executive_headline: string;
    executive_summary: string;
    key_risks: string[];
    key_achievements: string[];
    strategic_priorities: string[];
    board_actions: string[];
  };
}

interface BrigState {
  step: WizardStep;
  profile: BoardProfile;
  selectedKeys: string[];
  observations: Record<string, MetricObservation>;
  privacyMode: PrivacyMode;
  demoActive: boolean;
  ai: AiUiState;
}

type Action =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_PROFILE'; patch: Partial<BoardProfile> }
  | { type: 'TOGGLE_METRIC'; key: string }
  | { type: 'SET_SELECTED'; keys: string[] }
  | { type: 'PATCH_OBSERVATION'; key: string; patch: Partial<MetricObservation> }
  | { type: 'APPLY_DEMO' }
  | { type: 'RESET' }
  | { type: 'SET_PRIVACY'; mode: PrivacyMode }
  | { type: 'AI_START'; providerLabel: string; providerModel: string }
  | { type: 'AI_SUCCESS'; enhanced: AiUiState['enhanced']; validated: boolean; providerLabel: string; providerModel: string }
  | { type: 'AI_ERROR'; message: string }
  | { type: 'AI_CLEAR' };

const initialState: BrigState = {
  step: 'landing',
  profile: DEFAULT_PROFILE,
  selectedKeys: [],
  observations: {},
  privacyMode: 'deterministic',
  demoActive: false,
  ai: { status: 'idle' },
};

function ensureObs(state: BrigState, key: string): Record<string, MetricObservation> {
  if (state.observations[key]) return state.observations;
  return { ...state.observations, [key]: emptyObservation(key) };
}

function reducer(state: BrigState, action: Action): BrigState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case 'TOGGLE_METRIC': {
      const has = state.selectedKeys.includes(action.key);
      const selectedKeys = has ? state.selectedKeys.filter((k) => k !== action.key) : [...state.selectedKeys, action.key];
      const observations = ensureObs(state, action.key);
      return { ...state, selectedKeys, observations };
    }
    case 'SET_SELECTED': {
      const observations = { ...state.observations };
      for (const k of action.keys) if (!observations[k]) observations[k] = emptyObservation(k);
      return { ...state, selectedKeys: action.keys, observations };
    }
    case 'PATCH_OBSERVATION': {
      const existing = state.observations[action.key] ?? emptyObservation(action.key);
      return {
        ...state,
        observations: { ...state.observations, [action.key]: { ...existing, ...action.patch } },
      };
    }
    case 'APPLY_DEMO': {
      const demo = demoObservations();
      const observations: Record<string, MetricObservation> = {};
      for (const o of demo) observations[o.metric_key] = o;
      return {
        ...state,
        profile: DEFAULT_PROFILE,
        selectedKeys: demo.map((o) => o.metric_key),
        observations,
        demoActive: true,
        privacyMode: 'demo',
        ai: { status: 'idle' },
      };
    }
    case 'RESET':
      return { ...initialState, step: 'landing' };
    case 'SET_PRIVACY':
      return { ...state, privacyMode: action.mode };
    case 'AI_START':
      return { ...state, ai: { status: 'loading', providerLabel: action.providerLabel, providerModel: action.providerModel } };
    case 'AI_SUCCESS':
      return {
        ...state,
        ai: {
          status: 'done',
          enhanced: action.enhanced,
          validated: action.validated,
          providerLabel: action.providerLabel,
          providerModel: action.providerModel,
        },
      };
    case 'AI_ERROR':
      return { ...state, ai: { status: 'error', message: action.message } };
    case 'AI_CLEAR':
      return { ...state, ai: { status: 'idle' } };
    default:
      return state;
  }
}

interface BrigContextValue {
  state: BrigState;
  dispatch: React.Dispatch<Action>;
  library: MetricDefinition[];
  selectedMetrics: MetricDefinition[];
  analysis: AnalysisResult | null;
  selectedCount: number;
  enteredCount: number;
}

const BrigContext = createContext<BrigContextValue | null>(null);

export function BrigProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const library = METRICS;
  const selectedMetrics = useMemo(
    () =>
      state.selectedKeys
        .map((k) => METRICS.find((m) => m.metric_key === k))
        .filter((m): m is MetricDefinition => Boolean(m)),
    [state.selectedKeys],
  );

  const analysis = useMemo(() => {
    const observations = state.selectedKeys
      .map((k) => state.observations[k])
      .filter((o): o is MetricObservation => Boolean(o));
    if (observations.length === 0) return null;
    return analyze({ profile: state.profile, observations, library: METRICS });
  }, [state.profile, state.selectedKeys, state.observations]);

  const enteredCount = state.selectedKeys.filter((k) => {
    const o = state.observations[k];
    return o && o.current !== null;
  }).length;

  const value: BrigContextValue = {
    state,
    dispatch,
    library,
    selectedMetrics,
    analysis,
    selectedCount: state.selectedKeys.length,
    enteredCount,
  };

  return <BrigContext.Provider value={value}>{children}</BrigContext.Provider>;
}

export function useBrig(): BrigContextValue {
  const ctx = useContext(BrigContext);
  if (!ctx) throw new Error('useBrig must be used within BrigProvider');
  return ctx;
}

