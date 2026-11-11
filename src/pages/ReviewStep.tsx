import { useBrig } from '../state/BrigContext';
import type { AnalysisResult, Finding } from '../types';
import { formatMetricValue, formatDelta } from '../engine/format';
import { DEMO_LABEL } from '../data/demo';
import { Button, Callout, ConfidencePill, ScoreBar, SectionCard, StatusBadge } from '../ui/components';

function WhyPanel({ analysis, finding }: { analysis: AnalysisResult; finding: Finding }) {
  const { library } = useBrig();
  const key = finding.metric_key;
  const metric = library.find((m) => m.metric_key === key);
  const trend = analysis.trends.find((t) => t.metric_key === key);
  const mat = analysis.materiality.find((m) => m.metric_key === key);
  const currency = analysis.profile.currency;

  if (!metric || !trend) return null;
  return (
    <details className="why-panel">
      <summary>Why did the generator say this?</summary>
      <div className="why-body">
        <p><strong>Directionality:</strong> {metric.directionality.replace(/_/g, ' ')} — interpreted as <em>{trend.interpretation}</em>.</p>
        {trend.hasComparison && (
          <p>
            <strong>Change:</strong> {formatMetricValue(trend.previous, metric.unit, currency)} →{' '}
            {formatMetricValue(trend.current, metric.unit, currency)} ({formatDelta(trend.absoluteDelta, metric.unit, currency)}), magnitude {trend.band}.
          </p>
        )}
        {trend.thresholdBreached && <p className="text-warn"><strong>Threshold breached.</strong></p>}
        {mat && (
          <div className="why-materiality">
            <p><strong>Materiality:</strong> {mat.score}/100 ({mat.band})</p>
            <ul className="contribution-list">
              {mat.contributions.map((c) => (
                <li key={c.factor}>
                  <span>{c.factor.replace(/_/g, ' ')}</span>
                  <span className="muted">w{c.weight.toFixed(2)} × {c.value.toFixed(2)} = {c.weighted.toFixed(3)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {metric.caveats.length > 0 && <p className="caveat"><strong>Caveats:</strong> {metric.caveats.join(' ')}</p>}
      </div>
    </details>
  );
}

function FindingCard({ analysis, finding }: { analysis: AnalysisResult; finding: Finding }) {
  const { library } = useBrig();
  const metric = library.find((m) => m.metric_key === finding.metric_key);
  const tone = finding.kind === 'positive' ? 'good' : finding.kind === 'concern' ? 'danger' : 'neutral';
  return (
    <div className={`signal-card signal-${tone}`}>
      <div className="signal-head">
        <span className="signal-kind">{finding.kind === 'positive' ? '▲ Positive' : finding.kind === 'concern' ? '▼ Concern' : '• Neutral'}</span>
        <span className="signal-unit">{metric?.unit ?? ''} · materiality {Math.round(finding.materiality)}</span>
      </div>
      <p className="signal-headline">{finding.headline}</p>
      <p className="signal-evidence">{finding.evidence}</p>
      <WhyPanel analysis={analysis} finding={finding} />
    </div>
  );
}

export function ReviewStep() {
  const { analysis, dispatch, state, library } = useBrig();

  if (!analysis) {
    return (
      <div className="page">
        <SectionCard title="Nothing to review yet">
          <p>Add at least one current metric value to run the analysis.</p>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => dispatch({ type: 'SET_STEP', step: 'entry' })}>← Enter data</Button>
            <Button onClick={() => dispatch({ type: 'APPLY_DEMO' })}>Load the demo instead</Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  const { executivePosition, findings, positives, concerns, primaryStoryline, confidence, challenge, contradictions } = analysis;

  return (
    <div className="page">
      {state.demoActive && <Callout tone="neutral" title="Demo mode">{DEMO_LABEL}</Callout>}

      <SectionCard title="Executive position" className="position-card">
        <div className="position-row">
          <StatusBadge status={executivePosition.status} />
          <ConfidencePill level={confidence.boardNarrativeConfidence} />
          <div className="position-score">
            <span className="muted">Application-derived indicator</span>
            <ScoreBar value={executivePosition.score} label={`position indicator ${executivePosition.score}`} />
          </div>
        </div>
        <p className="position-summary">{executivePosition.summary}</p>
        <p className="muted small">{confidence.drivers.join(' · ')}</p>
      </SectionCard>

      <SectionCard title="Top signals this period" subtitle="Material changes, ranked by materiality. Expand any item to see the evidence.">
        <div className="signal-list">
          {findings.slice(0, 6).map((f) => (
            <FindingCard key={f.metric_key} analysis={analysis} finding={f} />
          ))}
          {findings.length === 0 && <p className="empty-note">No material changes were detected on the selected comparative metrics.</p>}
        </div>
      </SectionCard>

      <div className="two-col">
        <SectionCard title="Positive developments">
          {positives.length > 0 ? (
            <ul className="tick-list">
              {positives.slice(0, 5).map((f) => <li key={f.metric_key}>{f.headline}</li>)}
            </ul>
          ) : (
            <p className="empty-note">None identified from the supplied data.</p>
          )}
        </SectionCard>
        <SectionCard title="Areas of concern">
          {concerns.length > 0 ? (
            <ul className="warn-list">
              {concerns.slice(0, 5).map((f) => <li key={f.metric_key}>{f.headline}</li>)}
            </ul>
          ) : (
            <p className="empty-note">None identified from the supplied data.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Emerging theme" subtitle="The dominant storyline selected by the deterministic engine.">
        <h3 className="storyline-title">{primaryStoryline.title}</h3>
        <p>{primaryStoryline.executiveExplanation}</p>
        <p><strong>Board implication:</strong> {primaryStoryline.boardImplication}</p>
        <p className="muted small">
          Supporting metrics:{' '}
          {primaryStoryline.supportingMetrics
            .map((k) => library.find((m) => m.metric_key === k)?.name ?? k)
            .join(', ') || '—'}
        </p>
      </SectionCard>

      <SectionCard
        title="Challenge the Story"
        subtitle="A deterministic counter-analysis that searches for balancing evidence before the conclusion is finalised."
      >
        <p className="challenge-primary"><strong>Primary conclusion:</strong> {challenge.primaryConclusion}</p>
        {challenge.counterSignals.length > 0 ? (
          <ul className="warn-list">
            {challenge.counterSignals.map((c) => (
              <li key={c.rule_key}>
                {c.signal}
                {c.supportingMetrics.length > 0 && <span className="muted small"> ({c.supportingMetrics.join(', ')})</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-note">No material counter-signals were found.</p>
        )}
        <Callout tone={challenge.softened ? 'warn' : 'good'}>{challenge.recommendation}</Callout>
        {contradictions.length > 0 && (
          <div className="contradiction-list">
            <h4 className="small-heading">Detected contradictions</h4>
            {contradictions.map((c) => (
              <div key={c.rule_key} className={`contradiction severity-${c.severity}`}>
                <strong>{c.title}</strong>
                <p>{c.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="form-actions">
        <Button variant="ghost" onClick={() => dispatch({ type: 'SET_STEP', step: 'entry' })}>← Edit data</Button>
        <Button onClick={() => dispatch({ type: 'SET_STEP', step: 'report' })}>View Board report →</Button>
      </div>
    </div>
  );
}


