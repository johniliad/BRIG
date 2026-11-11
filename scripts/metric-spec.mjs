// Generates src/data/metric-library.json (the canonical 120-metric knowledge
// base) from a compact, reviewable specification. Run: npm run build:library
//
// Rationale: the specification requires 120 fully-described metrics with
// consistent metadata. Authoring them by hand invites drift and typos, so we
// define one compact row per metric and derive the repetitive metadata
// (recommended visualisations, standard caveats) deterministically. The
// generated JSON is the single source of truth consumed by both the React app
// and the PHP API / MySQL seed.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const LIBRARY_VERSION = '1.0.0';

const CATEGORIES = {
  incidents_threat: { label: 'Security incidents and threat activity', letter: 'A' },
  detection_response: { label: 'Detection, SOC and response', letter: 'B' },
  vulnerability_exposure: { label: 'Vulnerability and exposure management', letter: 'C' },
  patch_configuration: { label: 'Patch and configuration management', letter: 'D' },
  identity_access: { label: 'Identity and access security', letter: 'E' },
  endpoint_network_cloud: { label: 'Endpoint, network and cloud security', letter: 'F' },
  data_privacy: { label: 'Data security and privacy', letter: 'G' },
  resilience_recovery: { label: 'Resilience, recovery and availability', letter: 'H' },
  human_risk: { label: 'Human risk and security culture', letter: 'I' },
  governance_risk_assurance: { label: 'Governance, risk, compliance and assurance', letter: 'J' },
  third_party: { label: 'Third-party, supply-chain and ecosystem risk', letter: 'K' },
  strategy_investment: { label: 'Strategy, investment, people and executive outcomes', letter: 'L' },
};

// Derived visualisations by data type (metadata hints only; the chart engine
// performs the real, rules-based selection).
function visualsFor(dt) {
  switch (dt) {
    case 'percentage':
    case 'percentage_point':
      return ['kpi', 'line', 'bar'];
    case 'duration':
      return ['kpi', 'line', 'bar'];
    case 'currency':
      return ['kpi', 'bar', 'waterfall'];
    case 'score':
    case 'maturity':
      return ['kpi', 'radar', 'line'];
    case 'ratio':
      return ['kpi', 'line'];
    case 'decimal':
      return ['kpi', 'line', 'bar'];
    default: // integer / count
      return ['kpi', 'bar', 'line'];
  }
}

const BASE_CAVEATS = {
  percentage: 'Percentage figures depend on a consistent measurement universe and methodology.',
  percentage_point: 'Movement is expressed in percentage points; do not confuse this with a relative percentage change.',
  duration: 'Durations depend on consistent start/stop definitions across the periods being compared.',
  currency: 'Values depend on budget scope, currency and accounting treatment; compare like-for-like.',
  score: 'Scores are only meaningful against their own defined scale and methodology.',
  maturity: 'Maturity scores are methodology-dependent and not directly comparable across frameworks.',
  ratio: 'Ratios require a consistent denominator across periods.',
  count: 'Absolute counts are influenced by detection, reporting maturity and the size of the environment.',
  integer: 'Absolute counts are influenced by detection, reporting maturity and the size of the environment.',
  decimal: 'Values require consistent units and definitions across periods.',
};

function directionCaveat(dir) {
  if (dir === 'context_dependent' || dir === 'not_directional')
    return 'Interpretation is context-dependent; a change is not automatically good or bad.';
  if (dir === 'target_range') return 'Performance should be judged against the agreed target range.';
  return null;
}

// Compact rows: [key, name, category, unit, dataType, directionality,
//   boardRelevance, trendRelevance, riskRelevance, definition, executiveMeaning,
//   relatedMetrics[], storyTags[], boardEssential?, extraCaveats[]?]
const ROWS = [];
const add = (...row) => ROWS.push(row);

export { CATEGORIES, LIBRARY_VERSION, visualsFor, BASE_CAVEATS, directionCaveat, ROWS, add };

// A. Security incidents and threat activity
add('total_security_incidents', 'Total security incidents', 'incidents_threat', 'count', 'count', 'context_dependent', 4, 4, 3,
  'Total number of confirmed security incidents recorded in the reporting period.',
  'Indicates overall threat pressure and reporting maturity; raw volume alone does not measure security posture.',
  ['material_security_incidents', 'critical_security_incidents', 'mttd'], ['threat_pressure', 'incidents'], false);
add('material_security_incidents', 'Material security incidents', 'incidents_threat', 'count', 'count', 'lower_is_better', 5, 4, 5,
  'Incidents that met the organisation\'s materiality criteria (financial, operational or regulatory impact).',
  'The clearest Board-relevant measure of realised business impact from security events.',
  ['total_security_incidents', 'records_affected', 'cyber_downtime'], ['business_impact', 'incidents'], true,
  ['Materiality criteria differ by organisation; state the definition used.']);
add('critical_security_incidents', 'Critical security incidents', 'incidents_threat', 'count', 'count', 'lower_is_better', 5, 4, 5,
  'Incidents classified as critical under the organisation\'s severity methodology.',
  'Signals severity concentration and the potential for significant disruption or loss.',
  ['material_security_incidents', 'mttr', 'critical_service_availability'], ['severity', 'incidents'], true);
add('high_severity_incidents', 'High-severity security incidents', 'incidents_threat', 'count', 'count', 'lower_is_better', 4, 4, 4,
  'Incidents classified as high severity under the organisation\'s severity methodology.',
  'Indicates the volume of serious events short of the critical threshold.',
  ['critical_security_incidents', 'high_severity_alert_volume'], ['severity', 'incidents']);
add('ransomware_incidents', 'Ransomware incidents', 'incidents_threat', 'count', 'count', 'lower_is_better', 5, 3, 5,
  'Number of confirmed ransomware-related incidents in the period.',
  'Board-critical due to potential for severe operational, financial and reputational harm.',
  ['immutable_backup_coverage', 'restore_test_success_rate', 'material_security_incidents'], ['ransomware', 'threat_pressure']);
add('phishing_incidents', 'Phishing incidents', 'incidents_threat', 'count', 'count', 'lower_is_better', 3, 3, 3,
  'Number of confirmed phishing incidents affecting users or systems.',
  'Reflects the effectiveness of email controls and human-risk mitigation.',
  ['phishing_failure_rate', 'awareness_completion', 'account_compromise_incidents'], ['phishing', 'human_risk']);
add('bec_incidents', 'Business email compromise incidents', 'incidents_threat', 'count', 'count', 'lower_is_better', 4, 3, 4,
  'Number of confirmed business email compromise incidents.',
  'Indicates exposure to financially motivated impersonation and payment fraud.',
  ['account_compromise_incidents', 'mfa_coverage', 'material_security_incidents'], ['fraud', 'identity']);
add('account_compromise_incidents', 'Account compromise incidents', 'incidents_threat', 'count', 'count', 'lower_is_better', 4, 3, 4,
  'Number of confirmed incidents where a user or service account was compromised.',
  'Signals the effectiveness of identity and access controls.',
  ['mfa_coverage', 'identity_incidents', 'privileged_access_violations'], ['identity', 'incidents']);
add('insider_incidents', 'Insider-related security incidents', 'incidents_threat', 'count', 'count', 'lower_is_better', 4, 3, 4,
  'Confirmed incidents involving malicious or negligent insider activity.',
  'Indicates insider-risk exposure and the effectiveness of data and access monitoring.',
  ['data_access_anomalies', 'excessive_data_access_privileges', 'dlp_incidents'], ['insider_risk', 'data']);
add('third_party_security_incidents', 'Third-party security incidents', 'incidents_threat', 'count', 'count', 'lower_is_better', 5, 3, 5,
  'Security incidents originating from, or involving, third-party suppliers or partners.',
  'Highlights supply-chain and ecosystem risk exposure outside direct operational control.',
  ['supplier_concentration_risk', 'supplier_high_risk_findings', 'thirdparty_access_accounts'], ['third_party', 'supply_chain'], true);

// B. Detection, SOC and response
add('mttd', 'Mean Time to Detect (MTTD)', 'detection_response', 'hours', 'duration', 'lower_is_better', 5, 5, 4,
  'Average elapsed time between the start of a detectable security event and its detection.',
  'Indicates detection effectiveness and operational responsiveness.',
  ['mttr', 'detection_coverage', 'total_security_incidents'], ['detection', 'resilience', 'security_operations'], true);
add('mttr', 'Mean Time to Respond (MTTR)', 'detection_response', 'hours', 'duration', 'lower_is_better', 5, 5, 4,
  'Average elapsed time from detection to an effective response starting.',
  'Indicates containment responsiveness and the maturity of incident handling.',
  ['mttd', 'mttc', 'critical_security_incidents'], ['response', 'resilience', 'security_operations'], true);
add('mttc', 'Mean Time to Contain', 'detection_response', 'hours', 'duration', 'lower_is_better', 4, 4, 4,
  'Average elapsed time to contain an incident after detection.',
  'Reflects the ability to limit blast radius once an incident is identified.',
  ['mttr', 'mtte', 'material_security_incidents'], ['response', 'containment']);
add('mtte', 'Mean Time to Eradicate', 'detection_response', 'hours', 'duration', 'lower_is_better', 3, 4, 3,
  'Average elapsed time to eradicate the threat from affected systems.',
  'Indicates how quickly environments are returned to a trusted state.',
  ['mttc', 'mean_time_to_remediate'], ['response', 'remediation']);
add('mttrecover', 'Mean Time to Recover', 'detection_response', 'hours', 'duration', 'lower_is_better', 4, 4, 4,
  'Average elapsed time to restore normal service after an incident.',
  'Links security response to business recovery and availability.',
  ['critical_service_availability', 'cyber_downtime', 'rto_compliance'], ['recovery', 'resilience']);
add('high_severity_alert_volume', 'High-severity alert volume', 'detection_response', 'count', 'count', 'context_dependent', 3, 4, 3,
  'Number of high-severity alerts generated in the period.',
  'Indicates detection coverage and SOC load; not directly a measure of security posture.',
  ['alert_to_incident_rate', 'high_severity_incidents', 'automated_response_rate'], ['detection', 'security_operations']);
add('alert_to_incident_rate', 'Alert-to-incident conversion rate', 'detection_response', 'percent', 'percentage', 'context_dependent', 3, 3, 3,
  'Proportion of alerts that convert into confirmed incidents.',
  'Helps assess alert quality and triage effectiveness.',
  ['high_severity_alert_volume', 'automated_response_rate'], ['detection', 'triage']);
add('automated_response_rate', 'Automated response rate', 'detection_response', 'percent', 'percentage', 'higher_is_better', 3, 3, 3,
  'Proportion of qualifying alerts handled by automated response playbooks.',
  'Indicates operational efficiency and the balance between automation and human analysis.',
  ['alert_to_incident_rate', 'mttr', 'detection_coverage'], ['automation', 'response']);
add('detection_coverage', 'Detection coverage', 'detection_response', 'percent', 'percentage', 'higher_is_better', 5, 4, 4,
  'Estimated proportion of the estate covered by active detection controls.',
  'Indicates visibility and the breadth of monitoring across the environment.',
  ['edr_coverage', 'mttd', 'high_severity_alert_volume'], ['detection', 'coverage'], true);
add('incident_recurrence_rate', 'Incident recurrence rate', 'detection_response', 'percent', 'percentage', 'lower_is_better', 3, 3, 4,
  'Proportion of incidents that recur from a previously unresolved root cause.',
  'Signals whether root causes are genuinely remediated or merely suppressed.',
  ['mtte', 'mean_time_to_remediate', 'control_testing_pass_rate'], ['remediation', 'quality']);

// C. Vulnerability and exposure management
add('total_open_vulnerabilities', 'Total open vulnerabilities', 'vulnerability_exposure', 'count', 'count', 'lower_is_better', 3, 4, 3,
  'Total number of open vulnerabilities across the estate.',
  'Indicates the overall size of the technical exposure backlog.',
  ['critical_vulnerabilities', 'vuln_backlog_ageing', 'mean_time_to_remediate'], ['exposure', 'vulnerability']);
add('critical_vulnerabilities', 'Critical vulnerabilities', 'vulnerability_exposure', 'count', 'count', 'lower_is_better', 5, 4, 5,
  'Number of open vulnerabilities classified as critical under the chosen severity methodology.',
  'Indicates the volume of high-severity technical exposure requiring prioritised treatment.',
  ['kev_count', 'internet_facing_critical_vulns', 'vulnerability_remediation_sla'], ['exposure', 'vulnerability', 'risk'], true);
add('high_severity_vulnerabilities', 'High-severity vulnerabilities', 'vulnerability_exposure', 'count', 'count', 'lower_is_better', 4, 4, 4,
  'Number of open vulnerabilities classified as high severity.',
  'Indicates the volume of serious, though non-critical, exposure.',
  ['critical_vulnerabilities', 'vulnerability_remediation_sla'], ['exposure', 'vulnerability']);
add('kev_count', 'Known Exploited Vulnerabilities (KEV)', 'vulnerability_exposure', 'count', 'count', 'lower_is_better', 5, 4, 5,
  'Number of open vulnerabilities known to be actively exploited in the wild.',
  'A sharper signal of real-world exploitation risk than raw severity counts.',
  ['critical_vulnerabilities', 'vulnerability_remediation_sla', 'internet_facing_critical_vulns'], ['exposure', 'exploitation'], true);
add('internet_facing_critical_vulns', 'Internet-facing critical vulnerabilities', 'vulnerability_exposure', 'count', 'count', 'lower_is_better', 5, 4, 5,
  'Critical vulnerabilities present on assets directly reachable from the internet.',
  'Combines severity with external exposure, raising the likelihood of exploitation.',
  ['critical_vulnerabilities', 'kev_count', 'internet_facing_asset_count'], ['exposure', 'attack_surface'], true);
add('vulnerability_remediation_sla', 'Vulnerability remediation SLA compliance', 'vulnerability_exposure', 'percent', 'percentage', 'higher_is_better', 4, 4, 4,
  'Proportion of vulnerabilities remediated within the agreed SLA.',
  'Indicates whether exposure is being closed at the pace the organisation has committed to.',
  ['critical_vulnerabilities', 'mean_time_to_remediate', 'critical_vuln_backlog'], ['remediation', 'discipline'], true);
add('mean_time_to_remediate', 'Mean time to remediate', 'vulnerability_exposure', 'days', 'duration', 'lower_is_better', 4, 4, 4,
  'Average elapsed time to remediate a vulnerability from detection.',
  'Reflects remediation throughput and the ability to reduce exposure over time.',
  ['vulnerability_remediation_sla', 'vuln_backlog_ageing'], ['remediation', 'throughput']);
add('critical_vuln_backlog', 'Critical vulnerability remediation backlog', 'vulnerability_exposure', 'count', 'count', 'lower_is_better', 4, 4, 4,
  'Number of critical vulnerabilities past their remediation due date.',
  'Indicates unresolved high-severity exposure that has breached committed timelines.',
  ['vulnerability_remediation_sla', 'security_headcount', 'mean_time_to_remediate'], ['backlog', 'remediation']);
add('vuln_backlog_ageing', 'Vulnerability backlog ageing', 'vulnerability_exposure', 'days', 'duration', 'lower_is_better', 3, 4, 4,
  'Average age of open vulnerabilities in the backlog.',
  'Indicates whether exposure is accumulating or being actively worked down.',
  ['mean_time_to_remediate', 'critical_vuln_backlog'], ['backlog', 'ageing']);
add('attack_surface_exposure_score', 'External attack-surface exposure score', 'vulnerability_exposure', 'score', 'score', 'lower_is_better', 4, 3, 4,
  'Composite score representing external attack-surface exposure.',
  'Summarises how much externally reachable, potentially exploitable surface exists.',
  ['internet_facing_asset_count', 'internet_facing_critical_vulns'], ['attack_surface', 'exposure'],
  false, ['Scores are methodology-dependent; compare against your own baseline only.']);

// D. Patch and configuration management
add('critical_patch_compliance', 'Critical patch compliance', 'patch_configuration', 'percent', 'percentage', 'higher_is_better', 4, 4, 4,
  'Proportion of assets patched for critical vulnerabilities within policy windows.',
  'Indicates hygiene discipline against the highest-risk software flaws.',
  ['endpoint_patch_compliance', 'server_patch_compliance', 'critical_vulnerabilities'], ['patching', 'hygiene']);
add('high_risk_patch_compliance', 'High-risk patch compliance', 'patch_configuration', 'percent', 'percentage', 'higher_is_better', 4, 4, 4,
  'Proportion of assets patched for high-risk vulnerabilities within policy windows.',
  'Indicates breadth of patch discipline beyond the most critical flaws.',
  ['critical_patch_compliance', 'secure_config_compliance'], ['patching', 'hygiene']);
add('endpoint_patch_compliance', 'Endpoint patch compliance', 'patch_configuration', 'percent', 'percentage', 'higher_is_better', 3, 4, 3,
  'Proportion of endpoints meeting patch policy.',
  'Indicates endpoint hygiene and the effectiveness of patch management.',
  ['edr_coverage', 'critical_patch_compliance'], ['patching', 'endpoint']);
add('server_patch_compliance', 'Server patch compliance', 'patch_configuration', 'percent', 'percentage', 'higher_is_better', 4, 4, 4,
  'Proportion of servers meeting patch policy.',
  'Indicates server estate hygiene, where exploitation can be highly impactful.',
  ['critical_patch_compliance', 'eol_asset_count'], ['patching', 'server']);
add('network_patch_compliance', 'Network-device patch compliance', 'patch_configuration', 'percent', 'percentage', 'higher_is_better', 3, 4, 3,
  'Proportion of network devices meeting patch policy.',
  'Indicates perimeter and network-device hygiene.',
  ['network_segmentation_coverage', 'critical_patch_compliance'], ['patching', 'network']);
add('secure_config_compliance', 'Secure-configuration compliance', 'patch_configuration', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of assets meeting the agreed secure configuration baseline.',
  'Indicates resilience against misconfiguration-driven exposure.',
  ['cis_benchmark_compliance', 'config_drift_rate'], ['configuration', 'hygiene']);
add('cis_benchmark_compliance', 'CIS benchmark compliance', 'patch_configuration', 'percent', 'percentage', 'higher_is_better', 3, 3, 3,
  'Proportion of assets compliant with the applicable CIS benchmark.',
  'Provides a comparable configuration-hygiene signal against a recognised baseline.',
  ['secure_config_compliance', 'config_drift_rate'], ['configuration', 'benchmark'],
  false, ['A CIS benchmark is a configuration baseline, not a certification of security.']);
add('eol_asset_count', 'Unsupported / end-of-life asset count', 'patch_configuration', 'count', 'count', 'lower_is_better', 4, 3, 4,
  'Number of assets running unsupported or end-of-life software.',
  'Indicates structural exposure that cannot be fully patched.',
  ['server_patch_compliance', 'critical_vulnerabilities'], ['exposure', 'obsolescence']);
add('config_drift_rate', 'Configuration drift rate', 'patch_configuration', 'percent', 'percentage', 'lower_is_better', 3, 4, 3,
  'Proportion of assets that have drifted from the approved baseline.',
  'Signals the durability of configuration controls over time.',
  ['secure_config_compliance', 'cis_benchmark_compliance'], ['configuration', 'drift']);
add('unauthorised_software_rate', 'Unauthorised software rate', 'patch_configuration', 'percent', 'percentage', 'lower_is_better', 3, 3, 3,
  'Proportion of assets running unauthorised software.',
  'Indicates control over the software supply within the estate.',
  ['secure_config_compliance', 'endpoint_policy_compliance'], ['configuration', 'software']);

// E. Identity and access security
add('mfa_coverage', 'MFA coverage', 'identity_access', 'percent', 'percentage', 'higher_is_better', 5, 4, 5,
  'Proportion of relevant accounts protected by multi-factor authentication.',
  'Indicates the breadth of a foundational control that blunts credential-based attacks.',
  ['privileged_mfa_coverage', 'identity_incidents', 'account_compromise_incidents'], ['identity', 'authentication'], true);
add('privileged_mfa_coverage', 'Privileged-account MFA coverage', 'identity_access', 'percent', 'percentage', 'higher_is_better', 5, 4, 5,
  'Proportion of privileged accounts protected by multi-factor authentication.',
  'Signals protection of the accounts that could cause the greatest harm if compromised.',
  ['mfa_coverage', 'privileged_access_violations', 'excessive_privilege_findings'], ['identity', 'privileged_access']);
add('passwordless_coverage', 'Passwordless authentication coverage', 'identity_access', 'percent', 'percentage', 'higher_is_better', 3, 3, 3,
  'Proportion of authentication enabled through passwordless methods.',
  'Indicates modernisation of identity assurance and reduction of credential risk.',
  ['mfa_coverage', 'account_compromise_incidents'], ['identity', 'modernisation']);
add('privileged_account_count', 'Privileged account count', 'identity_access', 'count', 'count', 'lower_is_better', 3, 3, 4,
  'Number of privileged accounts in the environment.',
  'Indicates the size of the high-impact attack surface through privileged access.',
  ['excessive_privilege_findings', 'privileged_access_review_completion'], ['identity', 'privileged_access']);
add('dormant_account_count', 'Dormant-account count', 'identity_access', 'count', 'count', 'lower_is_better', 3, 3, 3,
  'Number of active accounts with no recent legitimate use.',
  'Signals latent access that could be abused with reduced detection.',
  ['jml_sla_compliance', 'privileged_account_count'], ['identity', 'hygiene']);
add('excessive_privilege_findings', 'Excessive-privilege findings', 'identity_access', 'count', 'count', 'lower_is_better', 4, 3, 4,
  'Number of findings where accounts hold more access than required.',
  'Indicates least-privilege discipline and potential blast radius.',
  ['privileged_access_review_completion', 'privileged_account_count'], ['identity', 'privileged_access']);
add('privileged_access_review_completion', 'Privileged-access review completion', 'identity_access', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of scheduled privileged-access reviews completed on time.',
  'Indicates governance rigour over the most sensitive access.',
  ['excessive_privilege_findings', 'privileged_account_count'], ['identity', 'governance']);
add('jml_sla_compliance', 'Joiner-mover-leaver SLA compliance', 'identity_access', 'percent', 'percentage', 'higher_is_better', 3, 3, 3,
  'Proportion of joiner/mover/leaver access changes completed within SLA.',
  'Indicates control over access lifecycle and reduction of orphaned access.',
  ['dormant_account_count', 'excessive_privilege_findings'], ['identity', 'lifecycle']);
add('identity_incidents', 'Identity-related incidents', 'identity_access', 'count', 'count', 'lower_is_better', 4, 3, 4,
  'Confirmed incidents attributable to identity or access weaknesses.',
  'Reflects the real-world effectiveness of identity controls.',
  ['mfa_coverage', 'account_compromise_incidents', 'privileged_access_violations'], ['identity', 'incidents']);
add('privileged_access_violations', 'Privileged-access violations', 'identity_access', 'count', 'count', 'lower_is_better', 4, 3, 4,
  'Number of confirmed violations of privileged-access policy.',
  'Signals governance gaps and misuse risk in high-impact access.',
  ['privileged_mfa_coverage', 'excessive_privilege_findings'], ['identity', 'privileged_access']);

// F. Endpoint, network and cloud security
add('edr_coverage', 'EDR coverage', 'endpoint_network_cloud', 'percent', 'percentage', 'higher_is_better', 5, 4, 5,
  'Proportion of endpoints covered by active endpoint detection and response.',
  'Indicates the breadth of endpoint visibility and response capability.',
  ['detection_coverage', 'endpoint_policy_compliance', 'mttd'], ['endpoint', 'coverage'], true);
add('endpoint_policy_compliance', 'Endpoint security-policy compliance', 'endpoint_network_cloud', 'percent', 'percentage', 'higher_is_better', 3, 3, 3,
  'Proportion of endpoints compliant with the endpoint security policy.',
  'Indicates endpoint configuration discipline.',
  ['edr_coverage', 'endpoint_encryption_coverage'], ['endpoint', 'hygiene']);
add('endpoint_encryption_coverage', 'Endpoint encryption coverage', 'endpoint_network_cloud', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of endpoints with full-disk encryption enabled.',
  'Reduces data-loss impact from lost or stolen devices.',
  ['endpoint_policy_compliance', 'sensitive_data_encryption_coverage'], ['endpoint', 'data_protection']);
add('mdm_coverage', 'Mobile-device management coverage', 'endpoint_network_cloud', 'percent', 'percentage', 'higher_is_better', 3, 3, 3,
  'Proportion of mobile devices under management.',
  'Indicates control over mobile endpoints and their data.',
  ['endpoint_policy_compliance', 'endpoint_encryption_coverage'], ['endpoint', 'mobile']);
add('network_segmentation_coverage', 'Network segmentation coverage', 'endpoint_network_cloud', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of the environment subject to effective network segmentation.',
  'Indicates containment potential and limits lateral movement.',
  ['zero_trust_coverage', 'ransomware_incidents'], ['network', 'containment']);
add('zero_trust_coverage', 'Zero-trust control coverage', 'endpoint_network_cloud', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of the environment covered by zero-trust access controls.',
  'Indicates architectural maturity in limiting implicit trust.',
  ['network_segmentation_coverage', 'mfa_coverage'], ['architecture', 'modernisation']);
add('secure_web_gateway_coverage', 'Secure web-gateway coverage', 'endpoint_network_cloud', 'percent', 'percentage', 'higher_is_better', 3, 3, 3,
  'Proportion of users or traffic protected by a secure web gateway.',
  'Indicates control over web-borne threats.',
  ['endpoint_policy_compliance', 'phishing_incidents'], ['network', 'web']);
add('cloud_workload_security_coverage', 'Cloud workload security coverage', 'endpoint_network_cloud', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of cloud workloads covered by security controls.',
  'Indicates visibility and protection across cloud environments.',
  ['cloud_config_compliance', 'detection_coverage'], ['cloud', 'coverage']);
add('cloud_config_compliance', 'Cloud configuration compliance', 'endpoint_network_cloud', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of cloud resources compliant with the secure baseline.',
  'Indicates resilience against cloud misconfiguration exposure.',
  ['cloud_workload_security_coverage', 'secure_config_compliance'], ['cloud', 'configuration']);
add('internet_facing_asset_count', 'Internet-facing asset count', 'endpoint_network_cloud', 'count', 'count', 'context_dependent', 3, 3, 4,
  'Number of assets directly reachable from the internet.',
  'Indicates the size of the externally exposed attack surface.',
  ['internet_facing_critical_vulns', 'attack_surface_exposure_score'], ['attack_surface', 'exposure']);

// G. Data security and privacy
add('sensitive_data_discovery_coverage', 'Sensitive-data discovery coverage', 'data_privacy', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of the data estate scanned for sensitive-data discovery.',
  'Indicates whether the organisation knows where its sensitive data resides.',
  ['sensitive_data_encryption_coverage', 'dlp_coverage'], ['data', 'discovery']);
add('sensitive_data_encryption_coverage', 'Sensitive-data encryption coverage', 'data_privacy', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of sensitive data stores with encryption at rest applied.',
  'Reduces impact from data exposure and unauthorised access.',
  ['sensitive_data_discovery_coverage', 'endpoint_encryption_coverage'], ['data', 'data_protection']);
add('dlp_coverage', 'Data-loss-prevention coverage', 'data_privacy', 'percent', 'percentage', 'higher_is_better', 3, 3, 3,
  'Proportion of relevant channels covered by data-loss-prevention controls.',
  'Indicates control over data egress across key channels.',
  ['dlp_incidents', 'sensitive_data_discovery_coverage'], ['data', 'dlp']);
add('dlp_incidents', 'Data-loss-prevention incidents', 'data_privacy', 'count', 'count', 'lower_is_better', 3, 3, 3,
  'Number of data-loss-prevention incidents recorded.',
  'Indicates the volume of policy-relevant data movement attempts.',
  ['dlp_coverage', 'data_breach_incidents'], ['data', 'dlp']);
add('data_access_anomalies', 'Data-access anomalies', 'data_privacy', 'count', 'count', 'lower_is_better', 3, 3, 4,
  'Number of anomalous data-access events detected.',
  'Signals potential insider-risk or compromised-account behaviour.',
  ['excessive_data_access_privileges', 'insider_incidents'], ['data', 'anomaly']);
add('excessive_data_access_privileges', 'Excessive data-access privileges', 'data_privacy', 'count', 'count', 'lower_is_better', 3, 3, 4,
  'Number of findings where data access exceeds business need.',
  'Indicates least-privilege discipline over sensitive data.',
  ['data_access_anomalies', 'excessive_privilege_findings'], ['data', 'privileged_access']);
add('data_breach_incidents', 'Data-breach incidents', 'data_privacy', 'count', 'count', 'lower_is_better', 5, 3, 5,
  'Number of confirmed data-breach incidents involving personal or sensitive data.',
  'Board-critical due to regulatory, financial and reputational consequences.',
  ['records_affected', 'material_security_incidents', 'dlp_incidents'], ['data', 'breach'], true);
add('records_affected', 'Records affected by security incidents', 'data_privacy', 'count', 'count', 'lower_is_better', 4, 3, 5,
  'Number of data records affected by security incidents in the period.',
  'Quantifies the scale of data impact behind incident counts.',
  ['data_breach_incidents', 'material_security_incidents'], ['data', 'impact']);
add('backup_coverage_critical_data', 'Backup coverage for critical data', 'data_privacy', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of critical data covered by the backup regime.',
  'Indicates the recoverability of the organisation\'s most important data.',
  ['recovery_test_success_critical_data', 'backup_success_rate'], ['data', 'resilience']);
add('recovery_test_success_critical_data', 'Recovery-test success rate for critical data', 'data_privacy', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of critical-data recovery tests that succeeded.',
  'Provides evidence that critical data can actually be recovered, not just backed up.',
  ['backup_coverage_critical_data', 'restore_test_success_rate'], ['data', 'assurance']);

// H. Resilience, recovery and availability
add('critical_service_availability', 'Critical-service availability', 'resilience_recovery', 'percent', 'percentage', 'higher_is_better', 5, 4, 4,
  'Availability of defined critical services over the period.',
  'Relates security and resilience directly to business operations.',
  ['cyber_downtime', 'dr_readiness', 'mttrecover'], ['resilience', 'availability'], true);
add('cyber_downtime', 'Cyber-related service downtime', 'resilience_recovery', 'hours', 'duration', 'lower_is_better', 5, 4, 5,
  'Total downtime of services attributable to cyber events.',
  'Quantifies realised operational impact from security incidents.',
  ['critical_service_availability', 'material_security_incidents', 'ransomware_incidents'], ['resilience', 'business_impact'], true);
add('rto_compliance', 'Recovery Time Objective (RTO) compliance', 'resilience_recovery', 'percent', 'percentage', 'higher_is_better', 4, 4, 4,
  'Proportion of critical systems recovered within their Recovery Time Objective.',
  'Indicates whether recovery capability matches business expectations.',
  ['rpo_compliance', 'restore_test_success_rate', 'dr_exercise_success_rate'], ['resilience', 'recovery']);
add('rpo_compliance', 'Recovery Point Objective (RPO) compliance', 'resilience_recovery', 'percent', 'percentage', 'higher_is_better', 4, 4, 4,
  'Proportion of critical systems meeting their Recovery Point Objective.',
  'Indicates acceptable data-loss tolerance in recovery.',
  ['rto_compliance', 'backup_success_rate'], ['resilience', 'recovery']);
add('dr_readiness', 'Disaster-recovery readiness', 'resilience_recovery', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Assessed readiness of disaster-recovery capability.',
  'Indicates preparedness before a major disruption occurs.',
  ['dr_exercise_success_rate', 'critical_service_availability'], ['resilience', 'preparedness']);
add('dr_exercise_success_rate', 'Disaster-recovery exercise success rate', 'resilience_recovery', 'percent', 'percentage', 'higher_is_better', 4, 4, 4,
  'Proportion of disaster-recovery exercises that met their objectives.',
  'Provides evidence that recovery plans work in practice.',
  ['dr_readiness', 'restore_test_success_rate', 'rto_compliance'], ['resilience', 'assurance']);
add('backup_success_rate', 'Backup success rate', 'resilience_recovery', 'percent', 'percentage', 'higher_is_better', 4, 4, 4,
  'Proportion of scheduled backups that completed successfully.',
  'Indicates the reliability of the recovery foundation.',
  ['restore_test_success_rate', 'immutable_backup_coverage'], ['resilience', 'backup']);
add('immutable_backup_coverage', 'Immutable backup coverage', 'resilience_recovery', 'percent', 'percentage', 'higher_is_better', 4, 3, 5,
  'Proportion of backups stored in immutable form.',
  'Indicates ransomware resilience of the backup estate.',
  ['ransomware_incidents', 'backup_success_rate', 'restore_test_success_rate'], ['resilience', 'ransomware']);
add('restore_test_success_rate', 'Restore-test success rate', 'resilience_recovery', 'percent', 'percentage', 'higher_is_better', 5, 4, 4,
  'Proportion of restore tests that successfully recovered data or systems.',
  'Demonstrates that recovery is proven, not merely planned.',
  ['backup_success_rate', 'dr_exercise_success_rate', 'rto_compliance'], ['resilience', 'assurance'], true);
add('bcp_exercise_completion', 'Business-continuity exercise completion', 'resilience_recovery', 'percent', 'percentage', 'higher_is_better', 3, 3, 3,
  'Proportion of planned business-continuity exercises completed.',
  'Indicates operational discipline in validating continuity arrangements.',
  ['dr_exercise_success_rate', 'critical_service_availability'], ['resilience', 'assurance']);

// I. Human risk and security culture
add('awareness_completion', 'Security-awareness completion rate', 'human_risk', 'percent', 'percentage', 'higher_is_better', 3, 3, 3,
  'Proportion of staff who completed required security-awareness training.',
  'Indicates training compliance; not, by itself, behavioural effectiveness.',
  ['phishing_failure_rate', 'training_exception_rate', 'policy_acknowledgement_rate'], ['human_risk', 'training'], true);
add('phishing_failure_rate', 'Phishing-simulation failure rate', 'human_risk', 'percent', 'percentage', 'lower_is_better', 4, 4, 3,
  'Proportion of recipients who fail phishing simulations.',
  'A behavioural signal of human-risk exposure, distinct from training completion.',
  ['awareness_completion', 'repeat_phishing_failure_rate', 'phishing_incidents'], ['human_risk', 'phishing'], true);
add('repeat_phishing_failure_rate', 'Repeat phishing-failure rate', 'human_risk', 'percent', 'percentage', 'lower_is_better', 3, 3, 3,
  'Proportion of users who repeatedly fail phishing simulations.',
  'Indicates concentrated, persistent human-risk exposure.',
  ['phishing_failure_rate', 'high_risk_user_population'], ['human_risk', 'phishing']);
add('training_hours_per_employee', 'Security-training hours per employee', 'human_risk', 'per_employee', 'duration', 'higher_is_better', 2, 3, 2,
  'Average security-training hours delivered per employee.',
  'Indicates investment in security awareness, not directly its effectiveness.',
  ['awareness_completion', 'security_culture_score'], ['human_risk', 'training']);
add('policy_acknowledgement_rate', 'Security-policy acknowledgement rate', 'human_risk', 'percent', 'percentage', 'higher_is_better', 3, 2, 3,
  'Proportion of staff who have acknowledged current security policies.',
  'Indicates policy adoption and basic governance coverage.',
  ['awareness_completion', 'policy_exceptions'], ['human_risk', 'governance']);
add('security_reporting_rate', 'Security-reporting rate by employees', 'human_risk', 'percent', 'percentage', 'higher_is_better', 4, 3, 3,
  'Rate at which employees report suspected security events.',
  'A positive engagement signal; higher reporting can improve detection.',
  ['awareness_completion', 'phishing_incidents', 'mttd'], ['human_risk', 'culture']);
add('human_incidents', 'Human-related security incidents', 'human_risk', 'count', 'count', 'lower_is_better', 3, 3, 3,
  'Confirmed incidents with a significant human-factor contributor.',
  'Indicates realised human-risk impact.',
  ['phishing_failure_rate', 'awareness_completion'], ['human_risk', 'incidents']);
add('high_risk_user_population', 'High-risk user population', 'human_risk', 'count', 'count', 'lower_is_better', 3, 3, 3,
  'Number of users identified as high-risk based on behaviour or role.',
  'Indicates the size of the population most exposed to social engineering.',
  ['repeat_phishing_failure_rate', 'phishing_failure_rate'], ['human_risk', 'population']);
add('security_culture_score', 'Security-culture survey score', 'human_risk', 'score', 'score', 'higher_is_better', 3, 3, 3,
  'Composite score from security-culture surveys.',
  'Indicates staff attitudes and engagement with security beyond compliance.',
  ['awareness_completion', 'security_reporting_rate'], ['human_risk', 'culture'],
  false, ['Survey scores depend on instrument design and are not directly comparable across organisations.']);
add('training_exception_rate', 'Security-training exception rate', 'human_risk', 'percent', 'percentage', 'lower_is_better', 2, 3, 2,
  'Proportion of staff with unapproved exceptions to required training.',
  'Indicates gaps in baseline security awareness coverage.',
  ['awareness_completion', 'policy_exceptions'], ['human_risk', 'training']);

// J. Governance, risk, compliance and assurance
add('residual_risk_score', 'Residual cyber-risk score', 'governance_risk_assurance', 'score', 'score', 'lower_is_better', 5, 4, 5,
  'Aggregate residual cyber-risk score after controls.',
  'Provides a consolidated view of risk remaining after mitigation, against the organisation\'s own methodology.',
  ['inherent_risk_score', 'risk_appetite_breaches', 'control_testing_pass_rate'], ['risk', 'governance'], true,
  ['Risk scores are methodology-dependent; compare only against your own baseline and scale.']);
add('inherent_risk_score', 'Inherent cyber-risk score', 'governance_risk_assurance', 'score', 'score', 'lower_is_better', 4, 3, 4,
  'Aggregate inherent cyber-risk score before controls.',
  'Indicates the underlying risk profile independent of control effectiveness.',
  ['residual_risk_score', 'risk_appetite_breaches'], ['risk', 'governance'],
  false, ['Risk scores are methodology-dependent; compare only against your own baseline and scale.']);
add('risk_appetite_breaches', 'Risk-appetite breach count', 'governance_risk_assurance', 'count', 'count', 'lower_is_better', 4, 3, 4,
  'Number of breaches of the Board-approved risk appetite.',
  'A direct governance signal that tolerance thresholds have been exceeded.',
  ['residual_risk_score', 'open_high_risk_findings'], ['risk', 'appetite'], true);
add('open_high_risk_findings', 'Open high-risk findings', 'governance_risk_assurance', 'count', 'count', 'lower_is_better', 4, 4, 4,
  'Number of open findings rated high risk.',
  'Indicates unresolved material control weaknesses.',
  ['overdue_audit_findings', 'control_testing_pass_rate', 'risk_appetite_breaches'], ['findings', 'risk']);
add('overdue_audit_findings', 'Overdue audit findings', 'governance_risk_assurance', 'count', 'count', 'lower_is_better', 4, 4, 4,
  'Number of audit findings past their agreed remediation date.',
  'Signals the pace at which assurance issues are being closed.',
  ['open_high_risk_findings', 'regulatory_findings'], ['audit', 'assurance']);
add('regulatory_findings', 'Regulatory findings', 'governance_risk_assurance', 'count', 'count', 'lower_is_better', 5, 3, 5,
  'Number of findings raised by regulators or supervisory authorities.',
  'Indicates external compliance and supervisory exposure.',
  ['overdue_audit_findings', 'assurance_coverage'], ['regulatory', 'compliance']);
add('policy_exceptions', 'Security-policy exception count', 'governance_risk_assurance', 'count', 'count', 'lower_is_better', 3, 3, 3,
  'Number of approved exceptions to security policy.',
  'Indicates the volume of accepted deviations from the control baseline.',
  ['risk_acceptance_count', 'open_high_risk_findings'], ['governance', 'exceptions']);
add('risk_acceptance_count', 'Risk-acceptance count', 'governance_risk_assurance', 'count', 'count', 'lower_is_better', 3, 3, 3,
  'Number of formal risk acceptances recorded.',
  'Indicates the volume of risks consciously retained rather than treated.',
  ['policy_exceptions', 'residual_risk_score'], ['governance', 'risk']);
add('control_testing_pass_rate', 'Control-testing pass rate', 'governance_risk_assurance', 'percent', 'percentage', 'higher_is_better', 5, 4, 4,
  'Proportion of tested controls that passed.',
  'A core assurance signal of whether controls are operating effectively.',
  ['audit_findings', 'assurance_coverage', 'residual_risk_score'], ['assurance', 'controls'], true);
add('assurance_coverage', 'Security-assurance coverage', 'governance_risk_assurance', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of the control environment covered by independent assurance.',
  'Indicates how much of the control environment has been independently validated.',
  ['control_testing_pass_rate', 'regulatory_findings'], ['assurance', 'coverage']);

// K. Third-party, supply-chain and ecosystem risk
add('critical_suppliers_assessed', 'Critical suppliers assessed', 'third_party', 'count', 'count', 'higher_is_better', 3, 3, 3,
  'Number of critical suppliers that have undergone security assessment.',
  'Indicates the volume of supply-chain due diligence completed.',
  ['supplier_assessment_coverage', 'supplier_high_risk_findings'], ['third_party', 'assessment']);
add('supplier_assessment_coverage', 'Critical supplier assessment coverage', 'third_party', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of critical suppliers with a current security assessment.',
  'Indicates breadth of visibility into supply-chain risk.',
  ['critical_suppliers_assessed', 'thirdparty_security_incidents'], ['third_party', 'assessment'], true);
add('supplier_high_risk_findings', 'Critical supplier high-risk findings', 'third_party', 'count', 'count', 'lower_is_better', 5, 3, 5,
  'Number of high-risk findings raised against critical suppliers.',
  'Indicates concentrated, material risk embedded in the supply chain.',
  ['supplier_concentration_risk', 'supplier_remediation_sla', 'thirdparty_security_incidents'], ['third_party', 'risk'], true);
add('thirdparty_security_incidents', 'Third-party security incidents', 'third_party', 'count', 'count', 'lower_is_better', 5, 3, 5,
  'Security incidents originating from, or involving, third-party suppliers or partners.',
  'Highlights supply-chain risk exposure outside direct operational control.',
  ['supplier_concentration_risk', 'supplier_high_risk_findings', 'thirdparty_access_accounts'], ['third_party', 'supply_chain'], true);
add('supplier_remediation_sla', 'Supplier remediation SLA compliance', 'third_party', 'percent', 'percentage', 'higher_is_better', 4, 3, 4,
  'Proportion of supplier findings remediated within the agreed SLA.',
  'Indicates whether supply-chain risk is actually being reduced.',
  ['supplier_high_risk_findings', 'thirdparty_security_incidents'], ['third_party', 'remediation']);
add('suppliers_with_cyber_clauses', 'Suppliers with contractual cyber requirements', 'third_party', 'count', 'count', 'higher_is_better', 3, 2, 3,
  'Number of suppliers bound by contractual security requirements.',
  'Indicates the contractual foundation for supply-chain assurance.',
  ['supplier_assessment_coverage', 'thirdparty_access_accounts'], ['third_party', 'contract']);
add('supplier_concentration_risk', 'Concentration risk in critical suppliers', 'third_party', 'score', 'score', 'lower_is_better', 5, 3, 5,
  'Score representing dependence on a small number of critical suppliers.',
  'Indicates systemic exposure if a key supplier fails or is compromised.',
  ['supplier_high_risk_findings', 'thirdparty_security_incidents'], ['third_party', 'concentration'], true,
  ['Concentration scores are methodology-dependent; compare against your own baseline only.']);
add('fourth_party_visibility', 'Fourth-party / dependency visibility', 'third_party', 'percent', 'percentage', 'higher_is_better', 3, 2, 3,
  'Proportion of critical supplier dependencies that are known and assessed.',
  'Indicates visibility into sub-supplier and dependency risk.',
  ['supplier_assessment_coverage'], ['third_party', 'dependency']);
add('thirdparty_access_accounts', 'Third-party access accounts', 'third_party', 'count', 'count', 'context_dependent', 3, 2, 4,
  'Number of accounts granted to third parties for access.',
  'Indicates external access surface that must be governed.',
  ['suppliers_with_cyber_clauses', 'privileged_account_count'], ['third_party', 'access']);
add('supplier_bcp_test_coverage', 'Supplier business-continuity test coverage', 'third_party', 'percent', 'percentage', 'higher_is_better', 3, 2, 3,
  'Proportion of critical suppliers that have demonstrated business-continuity testing.',
  'Indicates confidence in supplier resilience.',
  ['supplier_assessment_coverage', 'dr_exercise_success_rate'], ['third_party', 'resilience']);

// L. Strategy, investment, people and executive outcomes
add('cyber_budget', 'Cybersecurity budget', 'strategy_investment', 'currency', 'currency', 'context_dependent', 4, 3, 3,
  'Total cybersecurity budget for the period.',
  'Context for interpreting investment against outcomes; not intrinsically good or bad.',
  ['budget_variance', 'security_spend_pct_it', 'programme_completion_rate'], ['investment', 'strategy'], true,
  ['Interpret against outcomes, risk and strategy; a larger budget is not automatically better.']);
add('budget_variance', 'Cybersecurity budget variance', 'strategy_investment', 'percent', 'percentage', 'context_dependent', 3, 3, 3,
  'Variance between planned and actual cybersecurity spend.',
  'Indicates financial execution and predictability of the programme.',
  ['cyber_budget', 'programme_completion_rate'], ['investment', 'finance']);
add('security_spend_pct_it', 'Security spend as percentage of IT spend', 'strategy_investment', 'percent', 'percentage', 'context_dependent', 3, 2, 2,
  'Cybersecurity spend expressed as a percentage of total IT spend.',
  'A structural investment indicator, not a target in itself.',
  ['cyber_budget', 'security_spend_per_employee'], ['investment', 'finance']);
add('security_spend_per_employee', 'Security spend per employee', 'strategy_investment', 'per_employee', 'currency', 'context_dependent', 2, 2, 2,
  'Cybersecurity spend normalised per employee.',
  'Allows size-normalised comparison of security investment.',
  ['security_spend_pct_it', 'cyber_budget'], ['investment', 'finance']);
add('programme_completion_rate', 'Cybersecurity programme completion rate', 'strategy_investment', 'percent', 'percentage', 'higher_is_better', 4, 4, 3,
  'Proportion of the cybersecurity programme delivered against plan.',
  'Indicates execution momentum of the security strategy.',
  ['initiative_delivery_rate', 'cyber_budget'], ['strategy', 'execution'], true);
add('initiative_delivery_rate', 'Strategic security initiative delivery rate', 'strategy_investment', 'percent', 'percentage', 'higher_is_better', 4, 4, 3,
  'Proportion of strategic security initiatives delivered on schedule.',
  'Indicates whether strategic change is keeping pace with intent.',
  ['programme_completion_rate', 'cyber_budget'], ['strategy', 'execution'], true,
  ['Track delivery against an agreed baseline; a single late initiative may be material by itself.']);
add('security_headcount', 'Cybersecurity staff headcount', 'strategy_investment', 'count', 'count', 'context_dependent', 3, 2, 3,
  'Number of staff dedicated to cybersecurity.',
  'Context for capacity to execute the security programme.',
  ['security_vacancies', 'critical_vuln_backlog', 'security_staff_turnover'], ['people', 'capacity']);
add('security_vacancies', 'Cybersecurity vacancies', 'strategy_investment', 'count', 'count', 'lower_is_better', 3, 3, 3,
  'Number of open cybersecurity positions.',
  'Indicates capacity risk and potential execution constraints.',
  ['security_headcount', 'security_staff_turnover'], ['people', 'capacity']);
add('security_staff_turnover', 'Cybersecurity staff turnover', 'strategy_investment', 'percent', 'percentage', 'lower_is_better', 3, 3, 3,
  'Annualised turnover of cybersecurity staff.',
  'Indicates retention risk and continuity of security capability.',
  ['security_headcount', 'security_vacancies'], ['people', 'retention']);
add('cyber_maturity_score', 'Cybersecurity capability / maturity score', 'strategy_investment', 'score', 'maturity', 'higher_is_better', 4, 4, 4,
  'Composite maturity score for cybersecurity capability against the organisation\'s chosen model.',
  'Indicates the overall maturity trajectory of the security programme.',
  ['programme_completion_rate', 'control_testing_pass_rate'], ['maturity', 'strategy'],
  false, ['Maturity scores are model-dependent and not directly comparable across frameworks or organisations.']);

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------
function buildDefinition(row) {
  const [key, name, category, unit, dataType, directionality, boardRelevance, trendRelevance, riskRelevance, definition, executiveMeaning, relatedMetrics, storyTags, boardEssential, extraCaveats] = row;
  const caveats = [];
  const base = BASE_CAVEATS[dataType];
  if (base) caveats.push(base);
  const dirCav = directionCaveat(directionality);
  if (dirCav) caveats.push(dirCav);
  if (Array.isArray(extraCaveats)) caveats.push(...extraCaveats);
  return {
    metric_key: key,
    name,
    category,
    definition,
    executive_meaning: executiveMeaning,
    unit,
    data_type: dataType,
    directionality,
    board_relevance: boardRelevance,
    trend_relevance: trendRelevance,
    risk_relevance: riskRelevance,
    recommended_visualizations: visualsFor(dataType),
    related_metrics: relatedMetrics,
    story_tags: storyTags,
    caveats,
    board_essential: Boolean(boardEssential),
    version: LIBRARY_VERSION,
    active: true,
  };
}

const seen = new Set();
const metrics = ROWS.map(buildDefinition);
for (const m of metrics) {
  if (seen.has(m.metric_key)) throw new Error(`Duplicate metric_key: ${m.metric_key}`);
  seen.add(m.metric_key);
}

const out = {
  library_version: LIBRARY_VERSION,
  metrics,
  generated_at: new Date('2026-11-07T00:00:00Z').toISOString(),
};

const target = resolve(ROOT, 'src', 'data', 'metric-library.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`Wrote ${metrics.length} metrics to ${target}`);
if (metrics.length < 120) {
  console.error(`ERROR: only ${metrics.length} metrics; at least 120 required.`);
  process.exit(1);
}












