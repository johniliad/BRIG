import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { analyze } from '../src/engine/analyze';
import { DEFAULT_PROFILE, emptyObservation } from '../src/data/demo';
import { METRICS } from '../src/data/library';
import { completenessSummary } from '../src/services/validation';
import { formatTimestamp } from '../src/services/formatters';
import { BrigProvider } from '../src/state/BrigContext';
import App from '../src/App';

describe('metric-selection regression', () => {
  it('formats draft timestamps without invalid Intl option combinations', () => {
    const formatted = formatTimestamp('2026-11-21T10:00:00.000Z', 'en-US');
    expect(formatted).toContain('2026');
    expect(formatted).not.toContain('Invalid');
  });

  it('does not throw when a selected metric has not been configured yet', () => {
    const metric = METRICS[0];
    const observation = emptyObservation(metric.metric_key);

    expect(() => analyze({
      profile: DEFAULT_PROFILE,
      observations: [observation],
      library: METRICS,
    })).not.toThrow();

    expect(() => completenessSummary(
      [metric.metric_key],
      { [metric.metric_key]: observation },
      [metric],
    )).not.toThrow();
  });

  it('renders the selection view with one untouched selected metric', () => {
    const metric = METRICS[0];
    const observation = emptyObservation(metric.metric_key);
    const storage = new Map<string, string>();
    storage.set('brig_draft_v3', JSON.stringify({
      schemaVersion: 3,
      savedAt: new Date().toISOString(),
      profile: DEFAULT_PROFILE,
      selectedKeys: [metric.metric_key],
      observations: { [metric.metric_key]: observation },
      privacyMode: 'deterministic',
      demoActive: false,
    }));
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: { hash: '#/report/new/metrics', pathname: '/', search: '' },
      },
    });

    try {
      expect(() => renderToString(createElement(BrigProvider, null, createElement(App)))).not.toThrow();
    } finally {
      Reflect.deleteProperty(globalThis, 'window');
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});