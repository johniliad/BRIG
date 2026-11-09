import type { TrendResult } from '../types';

/**
 * Metric relationship rules (spec §101). These are configured analytical
 * HEURISTICS — signals and interpreted relationships — NOT universal causal
 * laws and NOT scientific proof of causality.
 */
export type RelationshipType =
  | 'reinforcing'
  | 'inverse'
  | 'contextual'
  | 'leading'
  | 'lagging'
  | 'contradiction'
  | 'investment_outcome'
  | 'risk_control'
  | 'threat_response'
  | 'resilience_impact';

export type RelationshipPattern =
  | 'BOTH_IMPROVE'
  | 'BOTH_DETERIORATE'
  | 'A_IMP_B_DET'
  | 'A_DET_B_IMP'
  | 'A_UP_B_UP'
  | 'A_UP_B_DOWN'
  | 'A_DOWN_B_UP'
  | 'A_DOWN_B_DOWN'
  | 'EITHER_DET';

export interface RelationshipRule {
  rule_key: string;
  name: string;
  type: RelationshipType;
  /** Base heuristic strength 0–1 (not a probability). */
  strength: number;
  metricA: string;
  metricB: string;
  pattern: RelationshipPattern;
  interpretation: string;
  confidence: 'High' | 'Medium' | 'Low';
}

const R = (
  rule_key: string,
  name: string,
  type: RelationshipType,
  strength: number,
  metricA: string,
  metricB: string,
  pattern: RelationshipPattern,
  interpretation: string,
  confidence: 'High' | 'Medium' | 'Low' = 'Medium',
): RelationshipRule => ({ rule_key, name, type, strength, metricA, metricB, pattern, interpretation, confidence });

export function matchesPattern(pattern: RelationshipPattern, a: TrendResult, b: TrendResult): boolean {
  if (!a.hasComparison || !b.hasComparison) return false;
  const ai = a.interpretation;
  const bi = b.interpretation;
  switch (pattern) {
    case 'BOTH_IMPROVE':
      return ai === 'improving' && bi === 'improving';
    case 'BOTH_DETERIORATE':
      return ai === 'deteriorating' && bi === 'deteriorating';
    case 'A_IMP_B_DET':
      return ai === 'improving' && bi === 'deteriorating';
    case 'A_DET_B_IMP':
      return ai === 'deteriorating' && bi === 'improving';
    case 'A_UP_B_UP':
      return a.direction === 'up' && b.direction === 'up';
    case 'A_UP_B_DOWN':
      return a.direction === 'up' && b.direction === 'down';
    case 'A_DOWN_B_UP':
      return a.direction === 'down' && b.direction === 'up';
    case 'A_DOWN_B_DOWN':
      return a.direction === 'down' && b.direction === 'down';
    case 'EITHER_DET':
      return ai === 'deteriorating' || bi === 'deteriorating';
    default:
      return false;
  }
}

export const RELATIONSHIP_RULES: RelationshipRule[] = [
  // Detection / response & incidents
  R('det_to_severity', 'Faster detection with fewer critical incidents', 'threat_response', 0.7, 'mttd', 'critical_security_incidents', 'BOTH_IMPROVE',
    'Faster detection coincides with fewer critical incidents, a consistent threat-response signal.'),
  R('resp_to_critical', 'Faster response with fewer critical incidents', 'threat_response', 0.7, 'mttr', 'critical_security_incidents', 'BOTH_IMPROVE',
    'Faster response coincides with fewer critical incidents, consistent with improving containment.'),
  R('mfa_identity_inc', 'MFA coverage and identity incidents', 'risk_control', 0.75, 'mfa_coverage', 'identity_incidents', 'BOTH_IMPROVE',
    'Rising MFA coverage coinciding with fewer identity incidents is a consistent identity-control improvement signal.'),
  R('mfa_priv_viol', 'MFA coverage and privileged violations', 'risk_control', 0.7, 'mfa_coverage', 'privileged_access_violations', 'BOTH_IMPROVE',
    'Higher MFA coverage with fewer privileged-access violations suggests stronger privileged-access protection.'),
  R('mfa_account_comp', 'MFA coverage and account compromise', 'risk_control', 0.72, 'mfa_coverage', 'account_compromise_incidents', 'BOTH_IMPROVE',
    'Higher MFA coverage with fewer account compromises is consistent with credential-attack resistance.'),
  R('edr_mttr', 'EDR coverage and response time', 'leading', 0.65, 'edr_coverage', 'mttr', 'BOTH_IMPROVE',
    'Broader EDR coverage with faster response is consistent with improved endpoint visibility and containment.'),
  R('detection_mttd', 'Detection coverage and detection time', 'leading', 0.66, 'detection_coverage', 'mttd', 'BOTH_IMPROVE',
    'Broader detection coverage coinciding with faster detection is consistent with improved visibility.'),
  R('edr_mttd', 'EDR coverage and detection time', 'leading', 0.6, 'edr_coverage', 'mttd', 'BOTH_IMPROVE',
    'Broader EDR coverage coinciding with faster detection is consistent with improved endpoint visibility.'),
  R('auto_mttr', 'Automation and response time', 'reinforcing', 0.55, 'automated_response_rate', 'mttr', 'BOTH_IMPROVE',
    'Higher automated-response rate with faster response is consistent with automation reducing handling time.'),
  R('mttd_sev_inc', 'Detection time and high-severity incidents', 'threat_response', 0.55, 'mttd', 'high_severity_incidents', 'BOTH_IMPROVE',
    'Faster detection coinciding with fewer high-severity incidents is a consistent positive signal.'),

  // Vulnerability / exposure
  R('kev_sla', 'KEV exposure and remediation SLA', 'risk_control', 0.72, 'kev_count', 'vulnerability_remediation_sla', 'BOTH_IMPROVE',
    'Fewer known-exploited vulnerabilities with improving remediation SLA is consistent with tightening exposure control.'),
  R('backlog_staffing', 'Critical backlog and staffing', 'contextual', 0.55, 'critical_vuln_backlog', 'security_headcount', 'A_DOWN_B_DOWN',
    'A shrinking critical backlog alongside reduced headcount may reflect efficiency gains or reduced capacity; interpret with care.'),
  R('patch_critvuln', 'Patch compliance and critical vulnerabilities', 'risk_control', 0.68, 'critical_patch_compliance', 'critical_vulnerabilities', 'BOTH_IMPROVE',
    'Improving critical-patch compliance with fewer critical vulnerabilities is consistent with effective patch discipline.'),
  R('patch_eol', 'Patch compliance and end-of-life assets', 'contextual', 0.5, 'critical_patch_compliance', 'eol_asset_count', 'BOTH_IMPROVE',
    'Improving patch compliance with fewer end-of-life assets is consistent with reducing structural exposure.'),
  R('config_drift', 'Secure config and configuration drift', 'inverse', 0.6, 'secure_config_compliance', 'config_drift_rate', 'BOTH_IMPROVE',
    'Rising secure-configuration compliance with falling drift is a consistent configuration-hygiene signal.'),
  R('attack_surface_crit', 'Exposure score and internet-facing criticals', 'reinforcing', 0.62, 'attack_surface_exposure_score', 'internet_facing_critical_vulns', 'BOTH_IMPROVE',
    'A falling exposure score with fewer internet-facing criticals is consistent with reduced external risk.'),

  // Resilience / recovery
  R('rto_restore', 'RTO compliance and restore testing', 'resilience_impact', 0.65, 'rto_compliance', 'restore_test_success_rate', 'BOTH_IMPROVE',
    'Improving RTO compliance with successful restore tests strengthens recovery assurance.'),
  R('rpo_backup', 'RPO compliance and backup success', 'resilience_impact', 0.6, 'rpo_compliance', 'backup_success_rate', 'BOTH_IMPROVE',
    'Improving RPO compliance with reliable backups strengthens recovery-point assurance.'),
  R('avail_dr', 'Availability and DR exercise success', 'resilience_impact', 0.6, 'critical_service_availability', 'dr_exercise_success_rate', 'BOTH_IMPROVE',
    'Strong availability with successful DR exercises is consistent with credible resilience.'),
  R('downtime_avail', 'Cyber downtime and availability', 'inverse', 0.7, 'cyber_downtime', 'critical_service_availability', 'BOTH_IMPROVE',
    'Falling cyber downtime with rising availability is a consistent operational-resilience signal.'),
  R('downtime_material', 'Cyber downtime and material incidents', 'resilience_impact', 0.62, 'cyber_downtime', 'material_security_incidents', 'BOTH_IMPROVE',
    'Falling downtime with fewer material incidents is consistent with reduced business impact.'),
  R('immutable_ransom', 'Immutable backups and ransomware', 'resilience_impact', 0.6, 'immutable_backup_coverage', 'ransomware_incidents', 'BOTH_IMPROVE',
    'Rising immutable-backup coverage with fewer ransomware incidents is consistent with improved ransomware resilience.'),
  R('restore_ransom', 'Restore testing and ransomware', 'resilience_impact', 0.58, 'restore_test_success_rate', 'ransomware_incidents', 'BOTH_IMPROVE',
    'Improving restore success with fewer ransomware incidents is consistent with credible recovery capability.'),

  // Identity
  R('jml_dormant', 'Access lifecycle and dormant accounts', 'risk_control', 0.55, 'jml_sla_compliance', 'dormant_account_count', 'BOTH_IMPROVE',
    'Improving joiner-mover-leaver SLA with fewer dormant accounts is consistent with tighter access lifecycle control.'),
  R('priv_review_excess', 'Privileged reviews and excessive privilege', 'risk_control', 0.6, 'privileged_access_review_completion', 'excessive_privilege_findings', 'BOTH_IMPROVE',
    'More complete privileged reviews with fewer excessive-privilege findings is a consistent least-privilege signal.'),
  R('zt_account_comp', 'Zero-trust coverage and account compromise', 'risk_control', 0.55, 'zero_trust_coverage', 'account_compromise_incidents', 'BOTH_IMPROVE',
    'Broader zero-trust coverage with fewer account compromises is consistent with reduced implicit trust.'),

  // Governance / assurance
  R('appetite_residual', 'Risk-appetite breaches and residual risk', 'risk_control', 0.65, 'risk_appetite_breaches', 'residual_risk_score', 'BOTH_IMPROVE',
    'Falling risk-appetite breaches with lower residual risk is a consistent governance-improvement signal.'),
  R('audit_control', 'Audit findings and control pass rate', 'risk_control', 0.6, 'overdue_audit_findings', 'control_testing_pass_rate', 'BOTH_IMPROVE',
    'Fewer overdue audit findings with a higher control pass rate is consistent with strengthening assurance.'),
  R('regulatory_assurance', 'Regulatory findings and assurance coverage', 'risk_control', 0.58, 'regulatory_findings', 'assurance_coverage', 'BOTH_IMPROVE',
    'Fewer regulatory findings with broader assurance coverage is consistent with a stronger control environment.'),
  R('control_residual', 'Control testing and residual risk', 'risk_control', 0.62, 'control_testing_pass_rate', 'residual_risk_score', 'BOTH_IMPROVE',
    'A higher control pass rate with lower residual risk is consistent with effective controls.'),
  R('appetite_openfindings', 'Risk-appetite breaches and open high-risk findings', 'risk_control', 0.6, 'risk_appetite_breaches', 'open_high_risk_findings', 'BOTH_IMPROVE',
    'Falling appetite breaches with fewer open high-risk findings is a consistent governance signal.'),

  // Third-party / supply chain
  R('supplier_assess_incidents', 'Supplier assessment and supplier incidents', 'leading', 0.6, 'supplier_assessment_coverage', 'thirdparty_security_incidents', 'BOTH_IMPROVE',
    'Broader supplier assessment with fewer third-party incidents is consistent with improved supply-chain visibility.'),
  R('supplier_conc_findings', 'Supplier concentration and high-risk findings', 'contradiction', 0.55, 'supplier_concentration_risk', 'supplier_high_risk_findings', 'BOTH_DETERIORATE',
    'Rising supplier concentration together with rising high-risk supplier findings is a compounding supply-chain risk signal.'),
  R('supplier_remediation_incidents', 'Supplier remediation and supplier incidents', 'risk_control', 0.55, 'supplier_remediation_sla', 'thirdparty_security_incidents', 'BOTH_IMPROVE',
    'Improving supplier remediation with fewer third-party incidents is consistent with effective supply-chain control.'),
  R('thirdparty_access_incidents', 'Third-party access and third-party incidents', 'inverse', 0.5, 'thirdparty_access_accounts', 'thirdparty_security_incidents', 'A_DOWN_B_DOWN',
    'Fewer third-party access accounts alongside fewer third-party incidents is consistent with reduced external access exposure.'),

  // Human risk
  R('aware_phishing', 'Awareness completion and phishing failure', 'contextual', 0.6, 'awareness_completion', 'phishing_failure_rate', 'A_IMP_B_DET',
    'Rising awareness completion while phishing failure rises suggests a gap between compliance activity and behavioural effectiveness.'),
  R('culture_reporting', 'Security culture and reporting rate', 'reinforcing', 0.45, 'security_culture_score', 'security_reporting_rate', 'BOTH_IMPROVE',
    'Improving security culture with higher reporting is consistent with stronger human-layer detection.'),

  // Data / cloud / endpoint
  R('dlp_coverage_incidents', 'DLP coverage and DLP incidents', 'risk_control', 0.5, 'dlp_coverage', 'dlp_incidents', 'A_DOWN_B_DOWN',
    'Irrespective of direction, DLP coverage and incident volume should be read together rather than in isolation.'),
  R('cloud_cov_config', 'Cloud workload coverage and config compliance', 'reinforcing', 0.55, 'cloud_workload_security_coverage', 'cloud_config_compliance', 'BOTH_IMPROVE',
    'Broader cloud coverage with higher config compliance is consistent with maturing cloud security.'),
  R('endpoint_patch_policy', 'Endpoint patch and policy compliance', 'reinforcing', 0.5, 'endpoint_patch_compliance', 'endpoint_policy_compliance', 'BOTH_IMPROVE',
    'Improving endpoint patch and policy compliance together is consistent with stronger endpoint hygiene.'),

  // Investment -> outcome (direction-based; budget is not intrinsically good/bad)
  R('budget_mfa', 'Investment and MFA coverage', 'investment_outcome', 0.5, 'cyber_budget', 'mfa_coverage', 'A_UP_B_UP',
    'Increased security investment coinciding with broader MFA coverage is consistent with investment translating into control coverage.'),
  R('budget_edr', 'Investment and EDR coverage', 'investment_outcome', 0.5, 'cyber_budget', 'edr_coverage', 'A_UP_B_UP',
    'Increased security investment coinciding with broader EDR coverage is consistent with investment translating into visibility.'),
  R('budget_mttr', 'Investment and response time', 'investment_outcome', 0.5, 'cyber_budget', 'mttr', 'A_UP_B_DOWN',
    'Increased security investment coinciding with faster response is consistent with investment improving capability.'),
  R('budget_backlog', 'Investment and critical backlog', 'investment_outcome', 0.5, 'cyber_budget', 'critical_vuln_backlog', 'A_UP_B_DOWN',
    'Increased security investment coinciding with a shrinking critical backlog is consistent with investment reducing exposure.'),
  R('investment_no_outcome', 'Investment without evident outcome', 'investment_outcome', 0.45, 'cyber_budget', 'critical_security_incidents', 'A_UP_B_UP',
    'Increased security investment alongside rising critical incidents raises an investment-effectiveness question, not proof of poor management.'),
  R('spend_control', 'Security spend and control pass rate', 'investment_outcome', 0.45, 'security_spend_pct_it', 'control_testing_pass_rate', 'A_UP_B_UP',
    'Higher relative security spend with a higher control pass rate is consistent with effective allocation of investment.'),
  R('programme_maturity', 'Programme completion and maturity', 'investment_outcome', 0.55, 'programme_completion_rate', 'cyber_maturity_score', 'BOTH_IMPROVE',
    'Higher programme completion with rising maturity is consistent with a programme translating into capability.'),
  R('initiative_programme', 'Initiative delivery and programme completion', 'reinforcing', 0.55, 'initiative_delivery_rate', 'programme_completion_rate', 'BOTH_IMPROVE',
    'Improved initiative delivery with higher programme completion is consistent with execution momentum.'),

  // Cross-domain
  R('maturity_control', 'Maturity and control pass rate', 'reinforcing', 0.5, 'cyber_maturity_score', 'control_testing_pass_rate', 'BOTH_IMPROVE',
    'Rising maturity with a higher control pass rate is consistent with durable control improvement.'),
  R('avail_mttr', 'Availability and response time', 'resilience_impact', 0.45, 'critical_service_availability', 'mttr', 'BOTH_IMPROVE',
    'Improving availability with faster response is consistent with a resilient operating posture.'),
  R('detection_alert', 'Detection coverage and alert volume', 'contextual', 0.4, 'detection_coverage', 'high_severity_alert_volume', 'A_UP_B_UP',
    'Broader detection coverage with higher alert volume may reflect improved visibility rather than a worsening threat; interpret with care.'),
  R('discovery_encryption', 'Sensitive-data discovery and encryption', 'reinforcing', 0.5, 'sensitive_data_discovery_coverage', 'sensitive_data_encryption_coverage', 'BOTH_IMPROVE',
    'Broader sensitive-data discovery with higher encryption coverage is consistent with maturing data protection.'),
  R('segmentation_ransom', 'Segmentation and ransomware', 'resilience_impact', 0.5, 'network_segmentation_coverage', 'ransomware_incidents', 'BOTH_IMPROVE',
    'Broader segmentation with fewer ransomware incidents is consistent with improved containment.'),
];



