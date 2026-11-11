import raw from './metric-library.json';
import type { MetricCategory, MetricCategoryKey, MetricDefinition } from '../types';

interface LibraryFile {
  library_version: string;
  metrics: MetricDefinition[];
  generated_at: string;
}

const file = raw as unknown as LibraryFile;

/** The canonical, versioned metric knowledge base (>=120 metrics). */
export const METRICS: MetricDefinition[] = file.metrics;
export const LIBRARY_VERSION: string = file.library_version;

const byKey = new Map<string, MetricDefinition>(METRICS.map((m) => [m.metric_key, m]));

export function getMetric(key: string): MetricDefinition | undefined {
  return byKey.get(key);
}

export function getMetricName(key: string): string {
  return byKey.get(key)?.name ?? key;
}

export const CATEGORIES: MetricCategory[] = [
  { key: 'incidents_threat', letter: 'A', label: 'Security incidents and threat activity' },
  { key: 'detection_response', letter: 'B', label: 'Detection, SOC and response' },
  { key: 'vulnerability_exposure', letter: 'C', label: 'Vulnerability and exposure management' },
  { key: 'patch_configuration', letter: 'D', label: 'Patch and configuration management' },
  { key: 'identity_access', letter: 'E', label: 'Identity and access security' },
  { key: 'endpoint_network_cloud', letter: 'F', label: 'Endpoint, network and cloud security' },
  { key: 'data_privacy', letter: 'G', label: 'Data security and privacy' },
  { key: 'resilience_recovery', letter: 'H', label: 'Resilience, recovery and availability' },
  { key: 'human_risk', letter: 'I', label: 'Human risk and security culture' },
  { key: 'governance_risk_assurance', letter: 'J', label: 'Governance, risk, compliance and assurance' },
  { key: 'third_party', letter: 'K', label: 'Third-party, supply-chain and ecosystem risk' },
  { key: 'strategy_investment', letter: 'L', label: 'Strategy, investment, people and executive outcomes' },
];

export function categoryLabel(key: MetricCategoryKey): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/** The editable "Board Essentials" preset (~12–20 metrics spanning key domains). */
export const BOARD_ESSENTIAL_KEYS: string[] = [
  'material_security_incidents',
  'critical_security_incidents',
  'mttd',
  'mttr',
  'critical_vulnerabilities',
  'kev_count',
  'mfa_coverage',
  'edr_coverage',
  'critical_service_availability',
  'restore_test_success_rate',
  'residual_risk_score',
  'risk_appetite_breaches',
  'supplier_high_risk_findings',
  'cyber_budget',
  'initiative_delivery_rate',
  'phishing_failure_rate',
];

export function boardEssentials(): MetricDefinition[] {
  return BOARD_ESSENTIAL_KEYS.map((k) => byKey.get(k)).filter((m): m is MetricDefinition => Boolean(m));
}

export function metricsByCategory(): Array<{ category: MetricCategory; metrics: MetricDefinition[] }> {
  return CATEGORIES.map((category) => ({
    category,
    metrics: METRICS.filter((m) => m.category === category.key),
  }));
}
