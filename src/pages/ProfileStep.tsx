import { useBrig } from '../state/BrigContext';
import type { AudienceLens, ReportStyle, ReportingPeriodModel } from '../types';
import { Button, SectionCard } from '../ui/components';

const AUDIENCES: Array<{ value: AudienceLens; label: string }> = [
  { value: 'general_board', label: 'General Board' },
  { value: 'audit_committee', label: 'Audit Committee' },
  { value: 'risk_committee', label: 'Risk Committee' },
  { value: 'ceo_exec', label: 'CEO / Executive Committee' },
  { value: 'cfo', label: 'CFO / Finance-oriented' },
  { value: 'technology_committee', label: 'Technology Committee' },
];

const PERIODS: Array<{ value: ReportingPeriodModel; label: string }> = [
  { value: 'point_in_time', label: 'Point-in-time snapshot' },
  { value: 'monthly', label: 'Monthly comparison' },
  { value: 'quarterly', label: 'Quarterly comparison' },
  { value: 'half_year', label: 'Half-year comparison' },
  { value: 'year_on_year', label: 'Year-on-year comparison' },
  { value: 'custom', label: 'Custom period' },
];

const STYLES: Array<{ value: ReportStyle; label: string }> = [
  { value: 'strategic', label: 'Strategic' },
  { value: 'concise', label: 'Concise' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'candid', label: 'Candid' },
  { value: 'reassuring', label: 'Reassuring' },
];

export function ProfileStep() {
  const { state, dispatch } = useBrig();
  const p = state.profile;

  const set = (patch: Partial<typeof p>) => dispatch({ type: 'SET_PROFILE', patch });
  const evidenceWindowComplete = Boolean(p.reportingPeriod.trim());

  return (
    <div className="page">
      <SectionCard
        title="Board profile"
        subtitle="Reporting period fields identify the evidence window. Other fields are labelled as narrative, formatting or report metadata and do not change analytical findings. Nothing is sent anywhere in Private mode."
      >
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Organisation label <span className="field-purpose">(report metadata only)</span></span>
            <input
              className="input"
              value={p.organisationLabel}
              onChange={(e) => set({ organisationLabel: e.target.value })}
              placeholder="e.g. Northwind Bank (illustrative)"
            />
          </label>
          <label className="field">
            <span className="field-label">Reporting period <span className="field-purpose">(required evidence label)</span></span>
            <input className="input" required value={p.reportingPeriod} onChange={(e) => set({ reportingPeriod: e.target.value })} placeholder="e.g. Q3 2026" />
          </label>
          <label className="field">
            <span className="field-label">Comparison period <span className="field-purpose">(required only if comparison values are entered)</span></span>
            <input className="input" value={p.comparisonPeriod} onChange={(e) => set({ comparisonPeriod: e.target.value })} placeholder="e.g. Q2 2026" />
          </label>
          <label className="field">
            <span className="field-label">Reporting period model <span className="field-purpose">(report metadata only)</span></span>
            <select className="input" value={p.periodModel} onChange={(e) => set({ periodModel: e.target.value as ReportingPeriodModel })}>
              {PERIODS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Board audience <span className="field-purpose">(affects narrative framing, not findings)</span></span>
            <select className="input" value={p.audience} onChange={(e) => set({ audience: e.target.value as AudienceLens })}>
              {AUDIENCES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Industry / sector <span className="field-purpose">(report metadata only)</span></span>
            <input className="input" value={p.industry} onChange={(e) => set({ industry: e.target.value })} placeholder="e.g. Financial services" />
          </label>
          <label className="field">
            <span className="field-label">Organisation size band <span className="field-purpose">(report metadata only)</span></span>
            <input className="input" value={p.sizeBand} onChange={(e) => set({ sizeBand: e.target.value })} placeholder="e.g. Enterprise (5,000+)" />
          </label>
          <label className="field">
            <span className="field-label">Reporting objective <span className="field-purpose">(report metadata only)</span></span>
            <input className="input" value={p.objective} onChange={(e) => set({ objective: e.target.value })} placeholder="e.g. Quarterly Board update" />
          </label>
          <label className="field">
            <span className="field-label">Preferred currency <span className="field-purpose">(formatting only)</span></span>
            <select className="input" value={p.currency} onChange={(e) => set({ currency: e.target.value })}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CHF">CHF</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Report style <span className="field-purpose">(AI/presentation tone only; never findings)</span></span>
            <select className="input" value={p.style} onChange={(e) => set({ style: e.target.value as ReportStyle })}>
              {STYLES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => dispatch({ type: 'SET_STEP', step: 'landing' })}>← Back</Button>
          <Button disabled={!evidenceWindowComplete} onClick={() => dispatch({ type: 'SET_STEP', step: 'select' })}>Continue to metric selection →</Button>
        </div>
      </SectionCard>
    </div>
  );
}
