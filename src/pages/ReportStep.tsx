import { useEffect, useState } from 'react';
import { useBrig } from '../state/BrigContext';
import type { AiMeta, AnalysisResult } from '../types';
import { buildBoardReportModel } from '../engine/report';
import { aiMeta, withAiWording } from '../engine/ai-wording';
import { formatDelta, formatMetricValue } from '../engine/format';
import { DEMO_LABEL, BRAND_NAME } from '../data/demo';
import { exportPptx } from '../services/pptx';
import { saveReport, fetchServerPdf, type SavedRef } from '../services/reports';
import { AI_FALLBACK_MESSAGE, enhanceNarrative, fetchAiStatus, unlockAi, type ProviderInfo, type AiDiagnostics } from '../services/llm';
import { Button, Callout, ConfidencePill, SectionCard, StatusBadge } from '../ui/components';
import { ChartView } from '../charts/ChartView';

function downloadJson(analysis: AnalysisResult, privacyMode: string, ai?: AiMeta) {
  const model = buildBoardReportModel(analysis, privacyMode as never, ai);
  const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = (analysis.profile.organisationLabel || 'board').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  a.href = url;
  a.download = `ciso-board-report-${safe}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadAiSession(): { session: string; expires_at: string } | null {
  try {
    const raw = sessionStorage.getItem('brig_ai');
    if (!raw) return null;
    const d = JSON.parse(raw) as { session?: string; expires_at?: string };
    if (d && typeof d.session === 'string' && /^[0-9a-f]{64}$/i.test(d.session)) {
      return { session: d.session, expires_at: String(d.expires_at ?? '') };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function AiPanel() {
  const { state, dispatch, analysis } = useBrig();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');
  const initialSession = loadAiSession();
  const [session, setSession] = useState<string>(initialSession?.session ?? '');
  const [expiresAt, setExpiresAt] = useState<string>(initialSession?.expires_at ?? '');
  const [tokenInput, setTokenInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<AiDiagnostics | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const ai = state.ai;

  const persistSession = (s: string, exp: string) => {
    setSession(s);
    setExpiresAt(exp);
    try {
      sessionStorage.setItem('brig_ai', JSON.stringify({ session: s, expires_at: exp }));
    } catch {
      /* ignore */
    }
  };
  const lockAi = () => {
    setSession('');
    setExpiresAt('');
    try {
      sessionStorage.removeItem('brig_ai');
    } catch {
      /* ignore */
    }
    dispatch({ type: 'AI_CLEAR' });
  };
  const doUnlock = async () => {
    setUnlocking(true);
    setUnlockError(null);
    try {
      const r = await unlockAi(tokenInput.trim());
      persistSession(r.session, r.expires_at);
      setTokenInput('');
    } catch (e) {
      setUnlockError(e instanceof Error ? e.message : 'Could not unlock AI.');
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchAiStatus()
      .then(({ providers: list, diagnostics: diag }) => {
        if (cancelled) return;
        setProviders(list);
        setDiagnostics(diag);
        const firstEnabled = list.find((p) => p.enabled) ?? list[0];
        if (firstEnabled) setSelected(firstEnabled.provider_key);
      })
      .catch(() => {
        if (!cancelled) setProvidersError('The AI backend is not reachable on this deployment.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const provider = providers.find((p) => p.provider_key === selected);

  const run = async () => {
    if (!analysis) return;
    if (!session) {
      setUnlockError('Unlock AI with a one-time access token first.');
      return;
    }
    setAiNote(null);
    const label = provider?.provider_name ?? 'AI provider';
    const modelLabel = provider?.model_label ?? '';
    dispatch({ type: 'AI_START', providerLabel: label, providerModel: modelLabel });
    try {
      const result = await enhanceNarrative(
        analysis.facts,
        {
          audience: analysis.profile.audience,
          style: analysis.profile.style,
          language: analysis.profile.language,
          // Send the raw dropdown value so the server uses exactly what was picked.
          provider: selected,
        },
        session,
      );
      if (result.validated) {
        dispatch({
          type: 'AI_SUCCESS',
          enhanced: result.enhanced,
          validated: true,
          providerLabel: result.providerLabel,
          providerModel: result.providerModel,
        });
        // Detect a stale/unmatched build: we asked for X but the server ran Y.
        const sameText = (a?: string, b?: string) =>
          !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
        const identical =
          sameText(result.enhanced.executive_headline, analysis.narrative.headline) &&
          sameText(result.enhanced.executive_summary, analysis.narrative.executiveMessage);
        if (
          provider?.provider_name &&
          result.providerLabel &&
          result.providerLabel.trim().toLowerCase() !== provider.provider_name.trim().toLowerCase()
        ) {
          setAiNote(
            `Requested “${provider.provider_name}” but the server used “${result.providerLabel}”. ` +
              'This usually means the deployed frontend is an older/cached build — rebuild, upload the new dist/, and hard-refresh (Ctrl+F5).',
          );
        } else if (identical) {
          setAiNote(
            'The provider returned wording essentially identical to the deterministic text, so the report looks unchanged. ' +
              'Try another provider/model, or check that the configured model name is valid (e.g. gemini-2.0-flash or llama-3.1-8b-instant).',
          );
        }
      } else {
        dispatch({ type: 'AI_ERROR', message: 'AI output failed validation. ' + AI_FALLBACK_MESSAGE });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : AI_FALLBACK_MESSAGE;
      if (/unlock ai|access token|ai_locked|one-time/i.test(msg)) {
        lockAi();
        setUnlockError('Your AI session expired. Enter another one-time access token.');
      } else {
        let hint = '';
        if (/invalid api key|http 401|unauthori[sz]ed|invalid_api_key/i.test(msg)) {
          hint =
            ' The provider rejected the API key. Check it is correct, has no surrounding quotes or spaces, ' +
            'belongs to that provider (Groq keys start "gsk_", Gemini "AIza", OpenRouter "sk-or-"), and is set in the ' +
            'config file the app actually loads (see /api/health.php → config_source and providers[].key_shape_ok).';
        } else if (/invalid_output/i.test(msg)) {
          hint =
            ' The model replied but its wording was rejected by the schema/fact checks (e.g. a number that is not in ' +
            'the deterministic facts, or malformed JSON). It was retried automatically with a stricter instruction; ' +
            'if this persists, try a different provider/model.';
        } else if (/timed out|timeout/i.test(msg)) {
          hint = ' The provider did not respond in time. Try again, or raise that provider\'s "timeout" in the private config.';
        }
        dispatch({ type: 'AI_ERROR', message: msg + hint });
      }
    }
  };

  return (
    <SectionCard title="Optional: enhance executive wording with AI" className="ai-panel">
      <p className="muted">
        The deterministic report is complete and authoritative. AI is an optional <strong>Executive Writing Layer</strong> that
        may improve tone and concision only. It never changes numbers, and the report works fully without it.
      </p>

      {diagnostics && (
        <p className="muted small">
          AI backend: configuration {diagnostics.config_loaded ? 'loaded' : 'NOT loaded'}
          {' · '}
          {diagnostics.curl ? 'cURL available' : diagnostics.allow_url_fopen ? 'HTTP streams (no cURL)' : 'no HTTP transport'}
          {' · '}
          providers with keys: {providers.filter((p) => p.has_key ?? p.enabled).map((p) => p.provider_name).join(', ') || 'none'}
        </p>
      )}

      {!session ? (
        <div className="ai-unlock">
          <p className="muted small">
            AI generation is protected by a <strong>one-time access token</strong>. Enter a token to unlock this browser
            session (single use; typically valid for a few hours).
          </p>
          <div className="ai-unlock-row">
            <input
              className="input"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your 256-bit (64-hex) access token"
              aria-label="AI access token"
              autoComplete="off"
              spellCheck={false}
            />
            <Button onClick={doUnlock} disabled={unlocking || tokenInput.trim().length !== 64}>
              {unlocking ? 'Unlocking…' : 'Unlock AI'}
            </Button>
          </div>
          {unlockError && <Callout tone="warn" title="AI is locked">{unlockError}</Callout>}
        </div>
      ) : (
        <>
          <Callout tone="good" title="AI unlocked">
            <p className="small">
              This browser session can use the AI writing layer
              {expiresAt ? ` until ${new Date(expiresAt).toLocaleString()}` : ''}. The one-time token has been consumed.{' '}
              <button className="link-btn" onClick={lockAi}>Lock again</button>
            </p>
          </Callout>

          {providersError && <Callout tone="neutral">{providersError} The deterministic report remains available.</Callout>}

          {providers.length > 0 && (
            <div className="ai-controls">
              <label className="field">
                <span className="field-label">Provider</span>
                <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  {providers.map((pp) => (
                    <option key={pp.provider_key} value={pp.provider_key} disabled={!pp.enabled}>
                      {pp.provider_name} {pp.model_label ? `· ${pp.model_label}` : ''} {pp.enabled ? '' : '(unconfigured)'}
                    </option>
                  ))}
                </select>
              </label>
              {provider && (
                <Callout tone="warn" title="External AI processing">
                  <p>
                    Selected report information will be sent to a third-party AI provider (
                    <strong>{provider.provider_name}</strong>). Privacy classification: <em>{provider.privacy_class}</em>. {provider.privacy_summary}
                  </p>
                  <p>
                    Do not enter confidential, regulated, personal, customer, supplier or commercially sensitive information unless your
                    organisation permits this processing. Free-tier provider terms may permit submitted content to be used for service improvement.{' '}
                    <a href={provider.policy_url} target="_blank" rel="noopener noreferrer">Current provider policy</a>.
                  </p>
                </Callout>
              )}
              <div className="form-actions-left">
                <Button onClick={run} disabled={ai.status === 'loading' || !provider?.enabled}>
                  {ai.status === 'loading' ? 'Enhancing…' : 'Enhance executive wording with AI'}
                </Button>
              </div>
            </div>
          )}

          {aiNote && <Callout tone="warn" title="Provider mismatch">{aiNote}</Callout>}

          {ai.status === 'error' && <Callout tone="danger" title="AI unavailable">{ai.message}</Callout>}

          {ai.status === 'done' && ai.enhanced && (
            <div className="ai-result">
              <p className="muted small">
                <strong>AI wording applied</strong> — enhanced by {ai.providerLabel} {ai.providerModel} (validated{' '}
                {ai.validated ? 'yes' : 'no'}). The report's headline, summary and narrative sections now use the AI wording
                above. All figures, findings, relationships and calculations are unchanged — the deterministic engine remains
                authoritative.
              </p>
              <Button variant="ghost" onClick={() => dispatch({ type: 'AI_CLEAR' })}>Use deterministic wording instead</Button>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

function SavePanel() {
  const { analysis } = useBrig();
  const [retention, setRetention] = useState(30);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedRef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const save = async () => {
    if (!analysis) return;
    setSaving(true);
    setError(null);
    try {
      setSaved(await saveReport(analysis, { retentionDays: retention }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the report.');
    } finally {
      setSaving(false);
    }
  };

  const copy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(label);
        setTimeout(() => setCopied(null), 1500);
      },
      () => undefined,
    );
  };

  return (
    <SectionCard title="Optional: save this report to the server" className="save-panel">
      <p className="muted">
        Off by default. Saving is <strong>opt-in</strong>: it sends this report&apos;s model to the server so it can be
        reopened later with a private link. It is <strong>token-secured</strong> and automatically expires. Leave this
        unused to keep everything in your browser.
      </p>
      {!saved && (
        <div className="save-controls">
          <label className="field">
            <span className="field-label">Retention</span>
            <select className="input" value={retention} onChange={(e) => setRetention(Number(e.target.value))}>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
          <div className="form-actions-left">
            <Button onClick={save} disabled={saving || !analysis}>{saving ? 'Saving…' : 'Save report to server'}</Button>
          </div>
          {error && <Callout tone="warn" title="Not saved">{error}</Callout>}
        </div>
      )}
      {saved && (
        <div className="save-result">
          <Callout tone="good" title="Report saved">
            <p>Expires {new Date(saved.expires_at).toLocaleString()}. {saved.note}</p>
          </Callout>
          <div className="save-credentials">
            <div className="cred">
              <span className="field-label">Report id</span>
              <code>{saved.id}</code>
              <Button variant="ghost" onClick={() => copy('id', saved.id)}>{copied === 'id' ? 'Copied' : 'Copy'}</Button>
            </div>
            <div className="cred">
              <span className="field-label">Access token (shown once)</span>
              <code>{saved.token}</code>
              <Button variant="ghost" onClick={() => copy('token', saved.token)}>{copied === 'token' ? 'Copied' : 'Copy'}</Button>
            </div>
          </div>
          <p className="muted small">To reopen: use “Open saved report” and enter both the id and the token.</p>
        </div>
      )}
    </SectionCard>
  );
}

export function ReportStep() {
  const { analysis, dispatch, state, library } = useBrig();
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState<{ headline: string; message: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setEditing(false);
    setEdited(null);
  }, [analysis?.metadata.generated_at]);

  if (!analysis) {
    return (
      <div className="page">
        <SectionCard title="No report yet">
          <p>Run the analysis first. Add metrics or load the demo to generate a Board report.</p>
          <Button onClick={() => dispatch({ type: 'APPLY_DEMO' })}>Load the demo</Button>
        </SectionCard>
      </div>
    );
  }

  const { narrative, ai } = { narrative: analysis.narrative, ai: state.ai };
  const aiView = ai.status === 'done' && ai.enhanced ? ai.enhanced : null;

  // Exports carry the AI-enhanced wording when available (figures unchanged).
  const exportModel = aiView
    ? withAiWording(analysis, aiView, ai.providerLabel ?? 'AI', ai.providerModel ?? '')
    : analysis;
  const exportAi: AiMeta | undefined = aiView
    ? aiMeta(ai.providerLabel ?? 'AI', ai.providerModel ?? '')
    : undefined;

  const headline = edited?.headline ?? aiView?.executive_headline ?? narrative.headline;
  const message = edited?.message ?? aiView?.executive_summary ?? narrative.executiveMessage;

  const kpis = analysis.findings.slice(0, 4).map((f) => {
    const metric = library.find((m) => m.metric_key === f.metric_key);
    const trend = analysis.trends.find((t) => t.metric_key === f.metric_key);
    return {
      key: f.metric_key,
      name: metric?.name ?? f.metric_key,
      current: trend ? formatMetricValue(trend.current, metric?.unit ?? 'count', analysis.profile.currency) : '—',
      delta: trend ? formatDelta(trend.absoluteDelta, metric?.unit ?? 'count', analysis.profile.currency) : '—',
      direction: trend?.direction ?? 'unknown',
    };
  });

  const beginEdit = () => {
    setEdited({ headline, message });
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setEdited(null);
  };

  const doPptx = async () => {
    setExporting(true);
    try {
      await exportPptx(exportModel, exportModel.profile.organisationLabel || 'Organisation', exportAi, kpis);
    } finally {
      setExporting(false);
    }
  };

  const doServerPdf = async () => {
    setExporting(true);
    try {
      const res = await fetchServerPdf(exportModel, exportAi);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/pdf')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safe = (analysis.profile.organisationLabel || 'board').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        a.href = url;
        a.download = `ciso-board-report-${safe}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (res.ok) {
        // File_PDF not available → printable HTML fallback in a new window.
        const html = await res.text();
        const w = window.open('', '_blank');
        if (w) {
          w.document.open();
          w.document.write(html);
          w.document.close();
        } else {
          window.print();
        }
      } else {
        window.print();
      }
    } catch {
      window.print();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page report-page">
      {state.demoActive && <Callout tone="neutral" title="Demo mode">{DEMO_LABEL}</Callout>}

      <div className="report-toolbar no-print">
        <Button variant="ghost" onClick={() => dispatch({ type: 'SET_STEP', step: 'review' })}>← Back to review</Button>
        <div className="toolbar-actions">
          <Button variant="secondary" onClick={editing ? cancelEdit : beginEdit}>{editing ? 'Done editing' : 'Edit narrative'}</Button>
          <Button variant="secondary" onClick={() => window.print()}>Print / Save as PDF</Button>
          <Button variant="secondary" onClick={doServerPdf} disabled={exporting}>Server PDF (File_PDF)</Button>
          <Button variant="secondary" onClick={doPptx} disabled={exporting}>{exporting ? 'Building…' : 'Download PPTX'}</Button>
          <Button variant="secondary" onClick={() => downloadJson(exportModel, state.privacyMode, exportAi)}>Download JSON</Button>
        </div>
      </div>

      <article className="board-report" id="board-report">
        <header className="report-header">
          <div className="report-brand">
            <span className="report-brand-name">{BRAND_NAME}</span>
            <span className="report-brand-sub">Executive cybersecurity summary</span>
          </div>
          <div className="report-period">
            <div className="report-org">{analysis.profile.organisationLabel || 'Organisation'}</div>
            <div className="report-dates">
              {analysis.profile.comparisonPeriod} → {analysis.profile.reportingPeriod} · {analysis.profile.audience.replace(/_/g, ' ')}
            </div>
          </div>
        </header>

        <div className="report-status-row">
          <StatusBadge status={analysis.executivePosition.status} />
          <ConfidencePill level={analysis.confidence.boardNarrativeConfidence} />
          {aiView && (
            <span className="ai-badge" title="Executive wording enhanced by AI; figures and findings are unchanged.">
              AI-enhanced wording
            </span>
          )}
        </div>

        {editing ? (
          <div className="report-edit no-print">
            <label className="field">
              <span className="field-label">Headline</span>
              <textarea className="input" rows={2} value={edited?.headline ?? ''} onChange={(e) => setEdited({ headline: e.target.value, message: edited?.message ?? '' })} />
            </label>
            <label className="field">
              <span className="field-label">Executive message</span>
              <textarea className="input" rows={5} value={edited?.message ?? ''} onChange={(e) => setEdited({ headline: edited?.headline ?? '', message: e.target.value })} />
            </label>
          </div>
        ) : (
          <>
            <h1 className="report-headline">{headline}</h1>
            <p className="report-message">{message}</p>
            {aiView && (
              <p className="report-ai-note">
                Executive wording enhanced by {ai.providerLabel} {ai.providerModel}. Figures, findings and calculations are
                unchanged.
              </p>
            )}
          </>
        )}

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
          {analysis.charts.slice(0, 2).map((spec) => (
            <ChartView key={spec.id} spec={spec} />
          ))}
        </section>

        <section className="report-columns">
          <div className="report-col">
            <h3>Positive developments</h3>
            <ul>
              {(aiView?.key_achievements ?? narrative.positiveDevelopments).slice(0, 4).map((p, i) => <li key={i}>{p}</li>)}
              {(aiView?.key_achievements ?? narrative.positiveDevelopments).length === 0 && <li className="muted">None identified.</li>}
            </ul>
          </div>
          <div className="report-col">
            <h3>Areas of concern</h3>
            <ul>
              {(aiView?.key_risks ?? narrative.keyRisks).slice(0, 4).map((p, i) => <li key={i}>{p}</li>)}
              {(aiView?.key_risks ?? narrative.keyRisks).length === 0 && <li className="muted">None identified.</li>}
            </ul>
          </div>
          <div className="report-col">
            <h3>Strategic priorities</h3>
            <ul>
              {(aiView?.strategic_priorities ?? narrative.priorities).slice(0, 4).map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </section>

        <section className="report-actions">
          <h3>Board attention / decision</h3>
          <ul>
            {(aiView?.board_actions ? aiView.board_actions.map((t) => ({ title: t, rationale: '' })) : narrative.boardActions).map((a, i) => (
              <li key={i}><strong>{a.title}</strong>{a.rationale ? ` — ${a.rationale}` : ''}</li>
            ))}
          </ul>
        </section>

        <footer className="report-footer">
          <p className="report-note">{narrative.managementNote}</p>
          <p className="report-meta">
            Methodology {analysis.metadata.methodology_version} · Metric library {analysis.metadata.metric_library_version} · Rules{' '}
            {analysis.metadata.rule_version} · Generated {new Date(analysis.metadata.generated_at).toLocaleString()}
          </p>
          <p className="report-disclaimer">
            {BRAND_NAME} is an independently developed analytical and executive communication aid. It is not a cybersecurity audit,
            certification, legal or regulatory advice, or a substitute for professional judgement. Results depend on the quality of
            user-supplied data. Inferred relationships are analytical signals, not proof of causality. Handle exported files according
            to your organisation’s information-classification policy.
          </p>
        </footer>
      </article>

      <div className="no-print">
        <SavePanel />
      </div>

      {state.privacyMode !== 'deterministic' ? (
        <div className="no-print">
          <AiPanel />
        </div>
      ) : (
        <Callout tone="neutral" title="Private / Deterministic mode">
          <p className="no-print">
            AI wording enhancement is disabled in Private mode. Switch to <strong>AI-Assisted</strong> mode in the top bar to
            optionally enhance wording — the deterministic report above remains complete and authoritative.
          </p>
        </Callout>
      )}
    </div>
  );
}


