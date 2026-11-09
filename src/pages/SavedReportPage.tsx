import { useState } from 'react';
import { useBrig } from '../state/BrigContext';
import type { AnalysisResult } from '../types';
import { getMetric } from '../data/library';
import { formatDelta, formatMetricValue } from '../engine/format';
import { getReport } from '../services/reports';
import { BRAND_NAME } from '../data/demo';
import { Button, Callout, ConfidencePill, SectionCard, StatusBadge } from '../ui/components';
import { ChartView } from '../charts/ChartView';

export function SavedReportPage() {
  const { dispatch } = useBrig();
  const [id, setId] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<AnalysisResult | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setModel(null);
    try {
      const res = await getReport(id.trim(), token.trim());
      if (!res.model) {
        setError('This saved report has no stored model (it may predate persistence). Ask for a fresh save.');
      } else {
        setModel(res.model);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the report.');
    } finally {
      setLoading(false);
    }
  };

  const kpis = model
    ? model.findings.slice(0, 4).map((f) => {
        const metric = getMetric(f.metric_key);
        const trend = model.trends.find((t) => t.metric_key === f.metric_key);
        return {
          key: f.metric_key,
          name: metric?.name ?? f.metric_key,
          current: trend ? formatMetricValue(trend.current, metric?.unit ?? 'count', model.profile.currency) : '—',
          delta: trend ? formatDelta(trend.absoluteDelta, metric?.unit ?? 'count', model.profile.currency) : '—',
          direction: trend?.direction ?? 'unknown',
        };
      })
    : [];

  return (
    <div className="page">
      <button className="link-btn no-print" onClick={() => dispatch({ type: 'SET_STEP', step: 'landing' })}>← Home</button>

      <SectionCard title="Open a saved report" subtitle="Enter the report id and the private access token you received when you saved it. Tokens are shown only once.">
        <div className="form-grid">
          <label className="field field-wide">
            <span className="field-label">Report id</span>
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. 3f2a…" />
          </label>
          <label className="field field-wide">
            <span className="field-label">Access token</span>
            <input className="input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="e.g. 9c1b…" />
          </label>
        </div>
        <div className="form-actions-left">
          <Button onClick={load} disabled={loading || !id || !token}>{loading ? 'Loading…' : 'Open report'}</Button>
        </div>
        {error && <Callout tone="warn" title="Could not open report">{error}</Callout>}
        <p className="muted small">Saving is optional and off by default. Saved reports are token-secured and expire automatically.</p>
      </SectionCard>

      {model && (
        <article className="board-report" id="board-report">
          <header className="report-header">
            <div className="report-brand">
              <span className="report-brand-name">{BRAND_NAME}</span>
              <span className="report-brand-sub">Executive cybersecurity summary</span>
            </div>
            <div className="report-period">
              <div className="report-org">{model.profile.organisationLabel || 'Organisation'}</div>
              <div className="report-dates">
                {model.profile.comparisonPeriod} → {model.profile.reportingPeriod} · {model.profile.audience.replace(/_/g, ' ')}
              </div>
            </div>
          </header>

          <div className="report-status-row">
            <StatusBadge status={model.executivePosition.status} />
            <ConfidencePill level={model.confidence.boardNarrativeConfidence} />
          </div>

          <h1 className="report-headline">{model.narrative.headline}</h1>
          <p className="report-message">{model.narrative.executiveMessage}</p>

          <section className="report-kpis" aria-label="Key metrics">
            {kpis.map((k) => (
              <div key={k.key} className="kpi-tile">
                <span className="kpi-name">{k.name}</span>
                <span className="kpi-value">{k.current}</span>
                <span className={`kpi-delta kpi-${k.direction}`}>{k.delta}</span>
              </div>
            ))}
          </section>

          <section className="report-charts">
            {model.charts.slice(0, 2).map((spec) => (
              <ChartView key={spec.id} spec={spec} />
            ))}
          </section>

          <section className="report-columns">
            <div className="report-col">
              <h3>Positive developments</h3>
              <ul>
                {model.narrative.positiveDevelopments.slice(0, 4).map((p, i) => <li key={i}>{p}</li>)}
                {model.narrative.positiveDevelopments.length === 0 && <li className="muted">None identified.</li>}
              </ul>
            </div>
            <div className="report-col">
              <h3>Areas of concern</h3>
              <ul>
                {model.narrative.keyRisks.slice(0, 4).map((p, i) => <li key={i}>{p}</li>)}
                {model.narrative.keyRisks.length === 0 && <li className="muted">None identified.</li>}
              </ul>
            </div>
            <div className="report-col">
              <h3>Strategic priorities</h3>
              <ul>{model.narrative.priorities.slice(0, 4).map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
          </section>

          <section className="report-actions">
            <h3>Board attention / decision</h3>
            <ul>
              {model.narrative.boardActions.map((a, i) => <li key={i}><strong>{a.title}</strong>{a.rationale ? ` — ${a.rationale}` : ''}</li>)}
            </ul>
          </section>

          <footer className="report-footer">
            <p className="report-note">{model.narrative.managementNote}</p>
            <p className="report-meta">
              Methodology {model.metadata.methodology_version} · Metric library {model.metadata.metric_library_version} · Rules {model.metadata.rule_version}
            </p>
            <p className="report-disclaimer">
              Independently developed analytical and executive communication aid. Not an audit, certification, legal or regulatory
              advice, or a substitute for professional judgement. Handle exported or shared files according to your organisation’s
              information-classification policy.
            </p>
          </footer>
        </article>
      )}
    </div>
  );
}

