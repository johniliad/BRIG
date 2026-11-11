import type { ContradictionResult, MetricObservation, TrendResult } from '../types';

/**
 * Contradiction and nuance engine (spec §16). Deliberately searches for
 * situations where a simplistic conclusion would be misleading and surfaces
 * the tension. All checks are deterministic.
 */

export interface ContradictionRule {
  rule_key: string;
  title: string;
  metricKeys: string[];
  severity: 'info' | 'watch' | 'elevated';
  explanation: string;
  counterSignals: string[];
}

export const CONTRADICTION_RULES: ContradictionRule[] = [
  {
    rule_key: 'more_activity_less_material',
    title: 'Higher incident volume, but fewer material incidents',
    metricKeys: ['total_security_incidents', 'material_security_incidents'],
    severity: 'info',
    explanation:
      'Total incident volume increased while material incidents fell. This can reflect stronger detection or better containment rather than a worsening security position; it should not automatically be read as deterioration.',
    counterSignals: ['Cyber-related downtime rising', 'Material incidents rising in a later period'],
  },
  {
    rule_key: 'vulns_down_kev_up',
    title: 'Vulnerability count fell, but known-exploited vulnerabilities rose',
    metricKeys: ['total_open_vulnerabilities', 'kev_count'],
    severity: 'watch',
    explanation:
      'The total vulnerability count decreased while known-exploited vulnerabilities increased, indicating a possible concentration of higher-risk exposure despite a lower headline count.',
    counterSignals: ['Internet-facing critical vulnerabilities increasing'],
  },
  {
    rule_key: 'budget_up_outcome_flat',
    title: 'Investment increased without evident outcome movement',
    metricKeys: ['cyber_budget', 'control_testing_pass_rate'],
    severity: 'watch',
    explanation:
      'Security investment increased while control-testing outcomes did not improve. This raises an investment-effectiveness question; it is not proof of poor management and may reflect lead time.',
    counterSignals: ['Programme delivery slipping', 'Critical backlog increasing'],
  },
  {
    rule_key: 'risk_improves_appetite_breaches_up',
    title: 'Residual risk score improved, but risk-appetite breaches rose',
    metricKeys: ['residual_risk_score', 'risk_appetite_breaches'],
    severity: 'watch',
    explanation:
      'The residual risk score improved while risk-appetite breaches increased, suggesting a possible methodology or aggregation inconsistency that warrants review.',
    counterSignals: ['Residual risk metric definition changed', 'Appetite thresholds tightened'],
  },
  {
    rule_key: 'availability_up_recovery_down',
    title: 'Availability improved, but recovery assurance weakened',
    metricKeys: ['critical_service_availability', 'restore_test_success_rate'],
    severity: 'elevated',
    explanation:
      'Availability improved while restore-test success fell. Strong day-to-day performance may be masking a resilience evidence gap: recovery is not proven when it matters most.',
    counterSignals: ['DR exercise success also falling', 'Backup success rate falling'],
  },
  {
    rule_key: 'awareness_high_phishing_high',
    title: 'Awareness completion is high, but phishing failure remains high',
    metricKeys: ['awareness_completion', 'phishing_failure_rate'],
    severity: 'watch',
    explanation:
      'Awareness completion is high while phishing-simulation failure remains high, highlighting the distinction between compliance activity and behavioural effectiveness.',
    counterSignals: ['Repeat phishing-failure rate rising', 'High-risk user population growing'],
  },
  {
    rule_key: 'incidents_down_critical_up',
    title: 'Incident volume fell, but critical incidents rose',
    metricKeys: ['total_security_incidents', 'critical_security_incidents'],
    severity: 'elevated',
    explanation:
      'Overall incident volume fell while critical incidents rose, indicating hidden severity deterioration behind a quieter headline number.',
    counterSignals: ['Material incidents rising', 'Cyber-related downtime rising'],
  },
];

export function evaluateContradictions(
  trends: Map<string, TrendResult>,
  observations: Map<string, MetricObservation>,
): ContradictionResult[] {
  const out: ContradictionResult[] = [];
  const ruleOf = (key: string) => CONTRADICTION_RULES.find((r) => r.rule_key === key)!;
  const push = (key: string, triggered: boolean) => {
    if (!triggered) return;
    const r = ruleOf(key);
    out.push({
      rule_key: r.rule_key,
      title: r.title,
      metricKeys: r.metricKeys,
      triggered: true,
      explanation: r.explanation,
      severity: r.severity,
      counterSignals: r.counterSignals,
    });
  };

  const t = (key: string) => trends.get(key);
  const val = (key: string) => observations.get(key)?.current ?? null;
  const up = (x?: TrendResult) => Boolean(x?.hasComparison && x.direction === 'up');
  const down = (x?: TrendResult) => Boolean(x?.hasComparison && x.direction === 'down');
  const improving = (x?: TrendResult) => Boolean(x?.hasComparison && x.interpretation === 'improving');
  const deteriorating = (x?: TrendResult) => Boolean(x?.hasComparison && x.interpretation === 'deteriorating');
  const flat = (x?: TrendResult) => Boolean(x?.hasComparison && x.direction === 'flat');

  push('more_activity_less_material', up(t('total_security_incidents')) && down(t('material_security_incidents')));
  push('vulns_down_kev_up', down(t('total_open_vulnerabilities')) && up(t('kev_count')));
  push('budget_up_outcome_flat', up(t('cyber_budget')) && (flat(t('control_testing_pass_rate')) || deteriorating(t('control_testing_pass_rate'))));
  push('risk_improves_appetite_breaches_up', improving(t('residual_risk_score')) && up(t('risk_appetite_breaches')));
  push('availability_up_recovery_down', up(t('critical_service_availability')) && down(t('restore_test_success_rate')));

  const awareness = val('awareness_completion');
  const phishing = val('phishing_failure_rate');
  push(
    'awareness_high_phishing_high',
    awareness !== null && phishing !== null && awareness >= 95 && (phishing >= 8 || up(t('phishing_failure_rate'))),
  );
  push('incidents_down_critical_up', down(t('total_security_incidents')) && up(t('critical_security_incidents')));

  const order = { elevated: 0, watch: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

