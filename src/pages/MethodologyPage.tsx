import { useBrig } from '../state/BrigContext';
import { BRAND_NAME } from '../data/demo';
import { METRICS, LIBRARY_VERSION } from '../data/library';
import { MATERIALITY_WEIGHTS, MATERIALITY_VERSION } from '../engine/materiality';
import { RELATIONSHIP_RULES } from '../data/relationships';
import { STORY_RULES } from '../engine/storyline';
import { Button, SectionCard } from '../ui/components';

export function MethodologyPage() {
  const { dispatch } = useBrig();
  return (
    <div className="page prose-page">
      <button className="link-btn no-print" onClick={() => dispatch({ type: 'SET_STEP', step: 'landing' })}>← Home</button>
      <h1>Methodology</h1>
      <p className="lead">
        The {BRAND_NAME} is a demonstration of a structured, evidence-based method for turning a set of
        cybersecurity and business-risk metrics into a concise Board narrative. It is deterministic-first:
        every figure, chart and sentence is produced by a transparent, repeatable calculation pipeline that
        can be audited and reproduced. External artificial intelligence is strictly optional and can never
        change a number.
      </p>

      <SectionCard title="1. Purpose and scope">
        <p>
          The tool answers one question: given the measures a Board has chosen to track, what can be said —
          and, just as importantly, what cannot be said — about the organisation's cybersecurity posture this
          period. It deliberately avoids inventing benchmarks, causal claims, compliance declarations or
          ratings that the data cannot support.
        </p>
        <p>
          The output is a working demonstration of automated Board storytelling, not an assessment by a
          qualified professional. The method is documented here so its conclusions can be checked rather than
          taken on trust.
        </p>
      </SectionCard>

      <SectionCard title="2. Input data model">
        <p>
          The operator selects metrics from a library of {METRICS.length} definitions (version{' '}
          {LIBRARY_VERSION}) and, for each, may enter a <em>current</em> value, a <em>comparison</em>{' '}
          (previous) value, an optional <em>target</em> and <em>threshold</em>, a data-quality flag, and
          free-text context. The comparison and reporting periods are captured once on the Board profile and
          apply uniformly to every metric, so trends are always computed between like-for-like periods.
        </p>
        <p>
          Each library entry records its unit, data type, and directionality — whether higher is better, lower
          is better, a target range applies, or the interpretation is context-dependent. This metadata is what
          prevents the common error of treating every increase as an improvement.
        </p>
      </SectionCard>

      <SectionCard title="3. Trend and directionality">
        <p>
          For every metric with both a current and comparison value, the engine computes the absolute change,
          the relative percentage change, and — for percentage metrics — the percentage-point change. Each
          movement is classified into a magnitude band (negligible to material) and its persistence (how many
          consecutive periods moved in the same direction) is recorded. A target breach or threshold breach is
          reported separately.
        </p>
        <p>
          Directionality is always respected: a rising incident count and a rising pass rate are interpreted
          differently, and context-dependent metrics are reported as movements without a blanket “better” or
          “worse” judgement. Where only one period is available, no trend is fabricated — the report describes
          the current position only.
        </p>
      </SectionCard>

      <SectionCard title="4. Materiality">
        <p>
          Materiality (methodology {MATERIALITY_VERSION}) is a weighted, versioned score in the range 0–100
          that ranks which findings deserve Board attention. The weights are explicit: board relevance{' '}
          {MATERIALITY_WEIGHTS.board_relevance}, severity {MATERIALITY_WEIGHTS.severity}, magnitude{' '}
          {MATERIALITY_WEIGHTS.magnitude}, target breach {MATERIALITY_WEIGHTS.target_breach}, persistence{' '}
          {MATERIALITY_WEIGHTS.persistence}, relationship strength {MATERIALITY_WEIGHTS.relationship_strength},
          business impact {MATERIALITY_WEIGHTS.business_impact} and regulatory relevance{' '}
          {MATERIALITY_WEIGHTS.regulatory_relevance}. Because the weights and formula version are recorded in
          the report, materiality judgements remain reproducible and open to review.
        </p>
      </SectionCard>

      <SectionCard title="5. Relationships">
        <p>
          {RELATIONSHIP_RULES.length} configured relationship heuristics examine pairs and groups of metrics
          (for example, rising budget alongside flat outcomes). A triggered relationship is an{' '}
          <em>analytical signal</em> — a hypothesis worth exploring — never proof of causality. Each signal is
          reported with its supporting metrics and a strength indicator so the Board can see why it was raised.
        </p>
      </SectionCard>

      <SectionCard title="6. Contradictions">
        <p>
          A dedicated contradiction pass looks for tensions in the evidence — for instance, spending rising
          while outcomes are static, or an improving headline metric sitting beside a deteriorating underlying
          indicator. Contradictions are surfaced explicitly, with severity, rather than smoothed away, because
          surfacing uncertainty is more useful to a Board than hiding it.
        </p>
      </SectionCard>

      <SectionCard title="7. Board Narrative Confidence">
        <p>
          Confidence is derived from the quality of the evidence, not from any model's probability: data
          completeness, the share of metrics with a comparison period, relationship support and the number of
          unresolved contradictions. It is reported together with its drivers (for example, “two comparable
          periods and no external benchmark”) so the Board can judge whether the evidence is sufficient for the
          decision at hand.
        </p>
      </SectionCard>

      <SectionCard title="8. Storylines and narrative">
        <p>
          {STORY_RULES.length} story rules map the computed evidence to storyline classes such as improving
          resilience, hidden deterioration, exposure concentration, investment outcomes and human-risk gaps. A
          primary storyline is selected and used to structure a plain-language narrative: headline, executive
          message, positive developments, areas of concern, strategic priorities and Board actions, together
          with a management note.
        </p>
      </SectionCard>

      <SectionCard title="9. Challenge the Story">
        <p>
          Before a conclusion is presented, the engine runs a deliberate counter-check: it lists the strongest
          counter-signals, flags conclusions that are only weakly supported, and softens language where the
          evidence is thin. The aim is to prevent overconfidence and to give the Board a balanced view of what
          the data does and does not show.
        </p>
      </SectionCard>

      <SectionCard title="10. Chart selection">
        <p>
          Visualisations are chosen from each metric's recommended chart types and ranked by relevance and
          evidence. The charts shown are therefore derived from the same data as the narrative — never
          decorative additions — and each carries an accessible text alternative so the information is not lost
          when a chart is unavailable.
        </p>
      </SectionCard>

      <SectionCard title="11. Determinism and reproducibility">
        <p>
          The entire analytical path — validation, trends, materiality, relationships, contradictions,
          confidence, storylines, narrative, challenge and charts — is pure, deterministic computation. The same
          inputs always produce the same report, and every generated report records the methodology,
          metric-library and rule versions that produced it. This makes the result auditable and testable,
          unlike an opaque black box.
        </p>
      </SectionCard>

      <SectionCard title="12. Optional AI writing layer">
        <p>
          AI is an optional <em>Executive Writing Layer</em>. It receives only a minimal, pre-approved
          ReportFacts summary — never the full metric library — and may only improve wording, tone and
          concision. Its output is schema-validated and fact-checked against the approved numbers, and any
          failure causes an automatic fallback to the deterministic text. The underlying figures, charts and
          findings are never changed by AI.
        </p>
      </SectionCard>

      <SectionCard title="13. Privacy and persistence">
        <p>
          In Private / Deterministic mode all processing happens in the browser and no metric values are stored
          or transmitted. External AI is used only with explicit opt-in, after a provider-specific privacy
          notice, and only the minimal ReportFacts payload is sent. Saving a report to the server is opt-in and
          token-secured; the deterministic report never requires it.
        </p>
      </SectionCard>

      <SectionCard title="14. Limitations">
        <ul className="tick-list">
          <li>Results depend entirely on the quality and completeness of user-supplied data.</li>
          <li>Relationships and storylines are analytical heuristics, not causal proof.</li>
          <li>No industry benchmarks are invented; comparisons are only against data you supply or configure.</li>
          <li>The tool does not assert compliance, certification or that an organisation is “secure”.</li>
          <li>Framework references (e.g. NIST, ISO, CIS) are not claims of certification or endorsement.</li>
          <li>This is a demonstration of automated Board reporting, not a substitute for the judgement of qualified security, legal and risk professionals.</li>
        </ul>
      </SectionCard>

      <p className="muted small">
        Methodology versioning is recorded in each report (methodology, metric library and rule versions).
      </p>
      <Button onClick={() => dispatch({ type: 'SET_STEP', step: 'landing' })}>Start a Board report</Button>
    </div>
  );
}
