import type {
  BoardAction,
  BoardActionCategory,
  BoardProfile,
  ChallengeResult,
  ConfidenceResult,
  ContradictionResult,
  ExecutivePosition,
  Finding,
  MetricDefinition,
  NarrativeModel,
  StorylineResult,
} from '../types';

interface ActionTemplate {
  title: string;
  rationale: string;
}

const ACTION_LIBRARY: Record<BoardActionCategory, ActionTemplate> = {
  maintain_course: {
    title: 'Maintain course and monitor',
    rationale: 'The evidence supports continuing the current direction while monitoring the identified signals.',
  },
  redirect_investment: {
    title: 'Redirect or rebalance investment',
    rationale: 'Review whether current investment is achieving intended outcomes and rebalance toward evidence-backed priorities.',
  },
  accelerate_remediation: {
    title: 'Accelerate remediation',
    rationale: 'Prioritise closing the highest-risk exposure faster than the current trajectory allows.',
  },
  increase_assurance: {
    title: 'Increase assurance',
    rationale: 'Strengthen independent evidence that controls and recovery are effective, not merely documented.',
  },
  reduce_exposure: {
    title: 'Reduce exposure',
    rationale: 'Target the specific exposure areas indicated by the analysis to lower the likelihood of material impact.',
  },
  investigate_data_quality: {
    title: 'Investigate data quality',
    rationale: 'Improve the completeness and consistency of the underlying data before drawing strong conclusions.',
  },
  review_risk_appetite: {
    title: 'Review risk appetite',
    rationale: 'Revisit whether the agreed risk appetite and tolerances remain appropriate given the current position.',
  },
  request_management_action: {
    title: 'Request management action',
    rationale: 'Ask management for a time-bound plan to address the concern and report back to the Board.',
  },
  monitor: {
    title: 'Monitor',
    rationale: 'No immediate decision is required; retain oversight and watch for a change in trajectory.',
  },
};

export function boardActionFor(
  category: BoardActionCategory,
  relatedMetrics: string[],
  priority: 'primary' | 'supporting',
): BoardAction {
  const t = ACTION_LIBRARY[category];
  return { category, title: t.title, rationale: t.rationale, priority, relatedMetrics };
}

function audienceIntro(profile: BoardProfile): string {
  switch (profile.audience) {
    case 'audit_committee':
      return 'For the Audit Committee, the emphasis is on control effectiveness, findings and assurance.';
    case 'risk_committee':
      return 'For the Risk Committee, the emphasis is on material risk, residual exposure and appetite.';
    case 'cfo':
      return 'For the CFO, the emphasis is on investment, loss exposure and financial implications.';
    case 'ceo_exec':
      return 'For the Executive Committee, the emphasis is on trajectory, decisions and accountability.';
    case 'technology_committee':
      return 'For the Technology Committee, the emphasis is on resilience, architecture and availability.';
    default:
      return 'For the Board, the emphasis is on the few things that matter most this period.';
  }
}

export interface NarrativeInput {
  profile: BoardProfile;
  position: ExecutivePosition;
  primary: StorylineResult;
  findings: Finding[];
  contradictions: ContradictionResult[];
  confidence: ConfidenceResult;
  challenge: ChallengeResult;
  library: Map<string, MetricDefinition>;
  comparability: number;
  metricCount: number;
}

function metricName(library: Map<string, MetricDefinition>, key: string): string {
  return library.get(key)?.name ?? key;
}

export function generateNarrative(input: NarrativeInput): NarrativeModel {
  const { profile, position, primary, findings, contradictions, confidence, challenge, library, comparability, metricCount } = input;

  const positives = findings.filter((f) => f.kind === 'positive').slice(0, 3);
  const concerns = findings.filter((f) => f.kind === 'concern').slice(0, 3);

  const headline = primary.title;

  const execParts: string[] = [];
  execParts.push(audienceIntro(profile));
  execParts.push(`Overall executive position: ${position.status}.`);
  execParts.push(primary.executiveExplanation);
  if (concerns.length > 0)
    execParts.push(`The most material concerns relate to ${concerns.map((c) => metricName(library, c.metric_key)).join(', ')}.`);
  if (challenge.softened) execParts.push('Balancing evidence exists and is reflected in the priorities below.');
  const executiveMessage = execParts.join(' ');

  const positiveDevelopments = positives.map((f) => f.headline);

  const keyRisks = [...concerns.map((f) => f.headline), ...contradictions.map((c) => c.title)].slice(0, 5);

  const priorities: string[] = [];
  if (position.status === 'Insufficient evidence')
    priorities.push('Improve data completeness and add a comparison period so the Board can rely on trend conclusions.');
  if (concerns.length > 0)
    priorities.push(`Address the material concerns above, starting with ${metricName(library, concerns[0].metric_key)}.`);
  if (contradictions.some((c) => c.rule_key === 'availability_up_recovery_down'))
    priorities.push('Close the resilience evidence gap: prove recovery through restore and DR testing.');
  if (contradictions.some((c) => c.rule_key === 'awareness_high_phishing_high'))
    priorities.push('Shift human-risk effort from training completion toward behavioural effectiveness.');
  if (primary.recommendedAction !== 'monitor') priorities.push(`${ACTION_LIBRARY[primary.recommendedAction].title}.`);
  if (priorities.length === 0) priorities.push('Maintain the current programme and continue to monitor the selected signals.');

  const boardActions: BoardAction[] = [boardActionFor(primary.recommendedAction, primary.supportingMetrics, 'primary')];
  if (position.status === 'Insufficient evidence')
    boardActions.push(boardActionFor('investigate_data_quality', primary.supportingMetrics, 'supporting'));
  if (contradictions.some((c) => c.rule_key === 'budget_up_outcome_flat'))
    boardActions.push(boardActionFor('redirect_investment', ['cyber_budget', 'control_testing_pass_rate'], 'supporting'));

  const managementNote = `${confidence.note} Board Narrative Confidence is ${confidence.boardNarrativeConfidence}. Based on ${metricCount} selected metric(s), ${comparability} with comparison data. This report is an analytical and executive communication aid, not an audit, certification or substitute for professional judgement.`;

  const sections = [
    { key: 'position', heading: 'Overall executive position', body: `${position.status}. ${position.summary}` },
    {
      key: 'what_changed',
      heading: 'What changed',
      body:
        positives.length || concerns.length
          ? [...positives, ...concerns].map((f) => f.headline).join(' ')
          : 'No material change was detected on the selected comparative metrics.',
    },
    { key: 'why_it_matters', heading: 'Why it matters', body: primary.boardImplication },
    { key: 'recommendation', heading: 'Recommendation', body: boardActions.map((a) => a.title).join('; ') + '.' },
  ];

  return {
    headline,
    executiveMessage,
    positiveDevelopments,
    keyRisks,
    priorities,
    boardActions,
    managementNote,
    sections,
  };
}

