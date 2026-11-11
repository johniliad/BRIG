import { describe, it, expect } from 'vitest';
import { analyze } from '../src/engine/analyze';
import { METRICS } from '../src/data/library';
import { DEFAULT_PROFILE, demoObservations } from '../src/data/demo';
import type { MetricObservation } from '../src/types';

function O(key: string, current: number | null, previous: number | null = null, extra: Partial<MetricObservation> = {}): MetricObservation {
  return {
    metric_key: key,
    applicable: true,
    current,
    previous,
    history: [],
    target: null,
    threshold: null,
    benchmark: null,
    note: '',
    dataQuality: 'high',
    ...extra,
  };
}

const run = (observations: MetricObservation[]) =>
  analyze({ profile: DEFAULT_PROFILE, observations, library: METRICS });

describe('metric knowledge base', () => {
  it('contains at least 120 metrics with full metadata', () => {
    expect(METRICS.length).toBeGreaterThanOrEqual(120);
    for (const m of METRICS) {
      expect(m.metric_key).toBeTruthy();
      expect(m.definition).toBeTruthy();
      expect(m.executive_meaning).toBeTruthy();
      expect(m.directionality).toBeTruthy();
      expect(m.caveats.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('golden scenario A — more activity, better resilience', () => {
  it('produces a nuanced improving-resilience narrative, not "deteriorated"', () => {
    const res = run([
      O('total_security_incidents', 200, 150),
      O('critical_security_incidents', 2, 5),
      O('mttd', 6, 11),
      O('mttr', 8, 15),
      O('mfa_coverage', 95, 88),
    ]);
    expect(res.primaryStoryline.storyline_key).toBe('operational_resilience_despite_threat_pressure');
    expect(res.executivePosition.status).not.toBe('Critical');
    expect(res.narrative.executiveMessage.toLowerCase()).not.toContain('security deteriorated');
  });
});

describe('golden scenario B — quiet but deteriorating', () => {
  it('warns of hidden deterioration', () => {
    const res = run([
      O('total_security_incidents', 180, 180),
      O('mttd', 12, 8),
      O('mttr', 16, 10),
      O('critical_security_incidents', 6, 3),
    ]);
    expect(res.primaryStoryline.storyline_key).toBe('hidden_deterioration');
    expect(['Watch', 'Elevated']).toContain(res.executivePosition.status);
  });
});

describe('golden scenario C — exposure concentration', () => {
  it('flags concentration / quality-of-exposure concern', () => {
    const res = run([
      O('total_open_vulnerabilities', 100, 120),
      O('kev_count', 10, 6),
      O('internet_facing_critical_vulns', 5, 3),
    ]);
    const hasConcern =
      res.primaryStoryline.storyline_key === 'exposure_concentration' ||
      res.contradictions.some((c) => c.rule_key === 'vulns_down_kev_up');
    expect(hasConcern).toBe(true);
  });
});

describe('golden scenario D — investment outcome', () => {
  it('shows investment coinciding with improved capability', () => {
    const res = run([
      O('cyber_budget', 6_000_000, 5_000_000),
      O('edr_coverage', 95, 85),
      O('mfa_coverage', 95, 88),
      O('mttr', 8, 15),
      O('critical_vulnerabilities', 40, 70),
    ]);
    const ok =
      res.storylines.some((s) => s.storyline_key === 'investment_translating_to_outcomes') ||
      res.relationships.some((r) => r.triggered && r.rule_key.startsWith('budget_'));
    expect(ok).toBe(true);
  });
});

describe('golden scenario E — investment without clear outcome', () => {
  it('raises an investment-effectiveness question, not a verdict', () => {
    const res = run([
      O('cyber_budget', 6_000_000, 5_000_000),
      O('edr_coverage', 90, 90),
      O('material_security_incidents', 6, 6),
      O('critical_vuln_backlog', 20, 12),
    ]);
    const flagged =
      res.contradictions.some((c) => c.rule_key === 'budget_up_outcome_flat') ||
      res.storylines.some((s) => s.storyline_key === 'investment_without_outcome');
    expect(flagged).toBe(true);
  });
});

describe('golden scenario F — human risk', () => {
  it('distinguishes completion from behavioural effectiveness', () => {
    const res = run([
      O('awareness_completion', 99, 98),
      O('phishing_failure_rate', 15, 10),
      O('repeat_phishing_failure_rate', 10, 6),
    ]);
    const flagged =
      res.contradictions.some((c) => c.rule_key === 'awareness_high_phishing_high') ||
      res.storylines.some((s) => s.storyline_key === 'human_risk_compliance_gap');
    expect(flagged).toBe(true);
  });
});

describe('golden scenario G — resilience assurance gap', () => {
  it('flags operational performance masking weak assurance', () => {
    const res = run([
      O('critical_service_availability', 99.95, 99.9),
      O('dr_readiness', 95, 92),
      O('restore_test_success_rate', 60, 80),
    ]);
    const flagged =
      res.storylines.some((s) => s.storyline_key === 'resilience_concern') ||
      res.contradictions.some((c) => c.rule_key === 'availability_up_recovery_down');
    expect(flagged).toBe(true);
  });
});

describe('golden scenario H — supplier concentration', () => {
  it('surfaces a supply-chain concentration theme', () => {
    const res = run([
      O('supplier_assessment_coverage', 90, 85),
      O('supplier_concentration_risk', 70, 65),
      O('supplier_high_risk_findings', 8, 5),
    ]);
    const flagged =
      res.storylines.some((s) => s.storyline_key === 'third_party_risk_concentration') ||
      res.relationships.some((r) => r.triggered && r.rule_key === 'supplier_conc_findings');
    expect(flagged).toBe(true);
  });
});

describe('golden scenario I — insufficient evidence', () => {
  it('produces a limited-confidence current-position report without fabricated trends', () => {
    const res = run([
      O('mfa_coverage', 92),
      O('mttr', 10),
      O('critical_vulnerabilities', 30),
      O('cyber_budget', 4_000_000),
    ]);
    expect(res.executivePosition.status).toBe('Insufficient evidence');
    expect(res.confidence.comparablePeriods).toBeLessThanOrEqual(1);
    expect(res.trends.every((t) => !t.hasComparison)).toBe(true);
  });
});

describe('golden scenario J — 100+ selected metrics', () => {
  it('stays concise (no KPI dump) and does not throw', () => {
    const subset = METRICS.slice(0, 100);
    const observations = subset.map((m, i) =>
      O(
        m.metric_key,
        m.data_type === 'percentage' ? 60 + (i % 30) : 100 + i,
        m.data_type === 'percentage' ? 55 + (i % 30) : 110 + i,
      ),
    );
    const res = run(observations);
    expect(res.narrative.headline.length).toBeLessThan(220);
    expect(res.narrative.keyRisks.length).toBeLessThanOrEqual(5);
    expect(res.narrative.priorities.length).toBeLessThanOrEqual(5);
    expect(res.concerns.length).toBeLessThan(observations.length);
  });
});

describe('determinism', () => {
  it('produces identical facts for identical input', () => {
    const observations = [
      O('total_security_incidents', 200, 150),
      O('critical_security_incidents', 2, 5),
      O('mttd', 6, 11),
    ];
    const a = run(observations);
    const b = run(observations);
    expect(JSON.stringify(a.facts)).toEqual(JSON.stringify(b.facts));
  });
});

describe('shipped demo dataset (recruiter Example Report)', () => {
  it('tells the intended nuanced story with counter-signals and charts', () => {
    const res = analyze({ profile: DEFAULT_PROFILE, observations: demoObservations(), library: METRICS });
    expect(res.primaryStoryline.storyline_key).toBe('operational_resilience_despite_threat_pressure');
    expect(res.executivePosition.status).toBe('Improving');
    expect(res.challenge.counterSignals.length).toBeGreaterThan(0);
    expect(res.charts.length).toBeGreaterThanOrEqual(2);
    expect(res.narrative.headline.length).toBeGreaterThan(0);
    expect(res.facts.approved_metric_keys.length).toBeGreaterThan(20);
  });
});


