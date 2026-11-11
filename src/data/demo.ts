import type { BoardProfile, MetricObservation } from '../types';

/**
 * Synthetic, FICTIONAL demo data (spec §49, §113). It must not reproduce any
 * real organisation, client, supplier or incident. The scenario intentionally
 * exercises nuance: higher threat activity with improving response; declining
 * KEV exposure; rising MFA; a residual third-party risk; and a strategic
 * initiative behind schedule — plus balancing contradictions for Challenge the
 * Story.
 */

export const BRAND_NAME = 'CISO Board Reporting Intelligence Generator';
/**
 * Public-facing hero title (SEO). Must stay in sync with the static fallback
 * <h1> inside #root in index.html — crawlers that do not run JavaScript read
 * that one, everyone else reads this one.
 */
export const HERO_TITLE = 'BRIG — Board Risk & Insights Generator';
export const DEMO_LABEL = 'Illustrative / fictional data — not a real organisation.';
/** Bump on deploy-relevant client changes so the footer shows the live build. */
export const APP_BUILD = '2026-11-08.10';

export const DEFAULT_PROFILE: BoardProfile = {
  organisationLabel: 'Northwind Federal Bank (illustrative)',
  reportingPeriod: 'Q3 2026',
  comparisonPeriod: 'Q2 2026',
  periodModel: 'quarterly',
  audience: 'general_board',
  industry: 'Financial services',
  sizeBand: 'Enterprise (5,000+)',
  objective: 'Quarterly Board cybersecurity update',
  currency: 'EUR',
  language: 'en',
  style: 'strategic',
};

export function emptyObservation(metric_key: string): MetricObservation {
  return {
    metric_key,
    applicable: true,
    current: null,
    previous: null,
    history: [],
    target: null,
    threshold: null,
    benchmark: null,
    note: '',
    dataQuality: 'medium',
  };
}

interface DemoRow {
  key: string;
  current: number;
  previous: number;
  history?: number[];
  target?: number;
  threshold?: number;
  note?: string;
  dataQuality?: 'high' | 'medium' | 'low';
}

const ROWS: DemoRow[] = [
  { key: 'total_security_incidents', current: 240, previous: 180, history: [150, 180], note: 'Detected volume rose as coverage expanded.', dataQuality: 'high' },
  { key: 'material_security_incidents', current: 4, previous: 6, history: [7, 6], target: 3, dataQuality: 'high' },
  { key: 'critical_security_incidents', current: 2, previous: 5, history: [6, 5], target: 2, dataQuality: 'high' },
  { key: 'high_severity_incidents', current: 18, previous: 24, history: [26, 24], dataQuality: 'high' },
  { key: 'phishing_incidents', current: 60, previous: 45, history: [40, 45], dataQuality: 'medium' },
  { key: 'ransomware_incidents', current: 0, previous: 1, dataQuality: 'high' },
  { key: 'third_party_security_incidents', current: 2, previous: 1, dataQuality: 'medium' },
  { key: 'mttd', current: 6, previous: 11, history: [14, 11], target: 8, dataQuality: 'high' },
  { key: 'mttr', current: 8, previous: 15, history: [18, 15], target: 10, dataQuality: 'high' },
  { key: 'detection_coverage', current: 92, previous: 85, history: [80, 85], target: 95, dataQuality: 'high' },
  { key: 'edr_coverage', current: 95, previous: 88, history: [82, 88], target: 98, dataQuality: 'high' },
  { key: 'automated_response_rate', current: 40, previous: 30, dataQuality: 'medium' },
  { key: 'critical_vulnerabilities', current: 40, previous: 70, history: [95, 70], target: 30, dataQuality: 'high' },
  { key: 'kev_count', current: 3, previous: 8, history: [11, 8], target: 2, dataQuality: 'high' },
  { key: 'internet_facing_critical_vulns', current: 2, previous: 4, history: [6, 4], target: 1, dataQuality: 'high' },
  { key: 'vulnerability_remediation_sla', current: 88, previous: 76, history: [70, 76], target: 90, dataQuality: 'high' },
  { key: 'critical_vuln_backlog', current: 12, previous: 20, history: [26, 20], dataQuality: 'medium' },
  { key: 'mean_time_to_remediate', current: 18, previous: 30, history: [34, 30], dataQuality: 'medium' },
  { key: 'critical_patch_compliance', current: 94, previous: 88, dataQuality: 'high' },
  { key: 'server_patch_compliance', current: 91, previous: 84, dataQuality: 'medium' },
  { key: 'mfa_coverage', current: 96, previous: 88, history: [80, 88], target: 100, dataQuality: 'high' },
  { key: 'privileged_mfa_coverage', current: 90, previous: 78, dataQuality: 'high' },
  { key: 'identity_incidents', current: 9, previous: 16, history: [18, 16], dataQuality: 'high' },
  { key: 'privileged_access_violations', current: 2, previous: 6, dataQuality: 'medium' },
  { key: 'excessive_privilege_findings', current: 14, previous: 22, dataQuality: 'medium' },
  { key: 'critical_service_availability', current: 99.95, previous: 99.9, history: [99.88, 99.9], target: 99.9, dataQuality: 'high' },
  { key: 'cyber_downtime', current: 3, previous: 5, history: [8, 5], target: 2, dataQuality: 'high' },
  { key: 'restore_test_success_rate', current: 82, previous: 90, history: [88, 90], target: 95, note: 'Two restore tests failed; recovery assurance is weaker than availability suggests.', dataQuality: 'high' },
  { key: 'dr_exercise_success_rate', current: 80, previous: 85, dataQuality: 'medium' },
  { key: 'immutable_backup_coverage', current: 85, previous: 70, dataQuality: 'high' },
  { key: 'backup_success_rate', current: 97, previous: 96, dataQuality: 'high' },
  { key: 'residual_risk_score', current: 42, previous: 50, history: [56, 50], target: 40, dataQuality: 'medium' },
  { key: 'risk_appetite_breaches', current: 2, previous: 1, history: [1, 1], note: 'Two appetite breaches recorded against tolerance.', dataQuality: 'high' },
  { key: 'control_testing_pass_rate', current: 88, previous: 84, history: [82, 84], target: 90, dataQuality: 'high' },
  { key: 'overdue_audit_findings', current: 3, previous: 3, dataQuality: 'high' },
  { key: 'supplier_assessment_coverage', current: 90, previous: 85, dataQuality: 'high' },
  { key: 'supplier_concentration_risk', current: 62, previous: 60, target: 50, note: 'Concentration in two critical suppliers remains high.', dataQuality: 'medium' },
  { key: 'supplier_high_risk_findings', current: 7, previous: 4, dataQuality: 'high' },
  { key: 'awareness_completion', current: 98, previous: 96, dataQuality: 'high' },
  { key: 'phishing_failure_rate', current: 12, previous: 9, history: [8, 9], target: 5, note: 'Behavioural failure rose despite near-universal training completion.', dataQuality: 'high' },
  { key: 'repeat_phishing_failure_rate', current: 5, previous: 3, dataQuality: 'medium' },
  { key: 'cyber_budget', current: 6_200_000, previous: 5_400_000, history: [5_000_000, 5_400_000], dataQuality: 'high' },
  { key: 'initiative_delivery_rate', current: 78, previous: 85, note: 'Zero-trust initiative behind schedule.', dataQuality: 'high' },
  { key: 'programme_completion_rate', current: 72, previous: 70, dataQuality: 'medium' },
];

export function demoObservations(): MetricObservation[] {
  return ROWS.map((r) => ({
    metric_key: r.key,
    applicable: true,
    current: r.current,
    previous: r.previous,
    history: r.history ?? [],
    target: r.target ?? null,
    threshold: r.threshold ?? null,
    benchmark: null,
    note: r.note ?? '',
    dataQuality: r.dataQuality ?? 'medium',
  }));
}

export const DEMO_METRIC_KEYS: string[] = ROWS.map((r) => r.key);

