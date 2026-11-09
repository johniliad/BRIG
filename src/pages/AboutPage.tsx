import { useBrig } from '../state/BrigContext';
import { BRAND_NAME, DEMO_LABEL } from '../data/demo';
import { Button, SectionCard } from '../ui/components';

export function AboutPage() {
  const { dispatch } = useBrig();
  const goHome = () => dispatch({ type: 'SET_STEP', step: 'landing' });

  return (
    <div className="page prose-page about-page">
      <button className="link-btn no-print" onClick={goHome}>← Back to the app</button>

      <h1>About {BRAND_NAME}</h1>
      <p className="lead">
        {BRAND_NAME} (BRIG) turns a selected set of cybersecurity, technology-risk, resilience,
        governance, investment and business-impact metrics into a concise, defensible, board-ready
        cybersecurity narrative — with supporting graphics and presentation-ready output.
      </p>
      <p className="muted">
        BRIG is a product from the{' '}
        <a href="https://www.iliadis.net" target="_blank" rel="noopener noreferrer external">
          iliadis.net<span className="visually-hidden"> (opens in a new tab)</span>
        </a>{' '}
        ecosystem. It is a Cybersecurity Intelligence Engine that validates data, computes trends and
        directionality, evaluates cross-metric relationships and contradictions, scores materiality and
        confidence, and selects a storyline.
      </p>

      <SectionCard title="What this product is — and is not">
        <p>
          BRIG is an executive reporting and decision-support application. It is <strong>not</strong> a generic
          KPI dashboard, a report template, an audit platform, a compliance certification system, a benchmark
          database, a legal or regulatory advice service, or a generic AI chatbot. It does not assert that an
          organisation “is secure” or “is compliant”.
        </p>
        <p>
          Its defining purpose is to convert cybersecurity evidence into an executive story <em>and a decision</em>,
          while remaining explainable, deterministic-first, privacy-conscious and honest about uncertainty.
        </p>
      </SectionCard>

      <SectionCard title="How the analysis works — the deterministic pipeline">
        <p>
          A deterministic CISO Intelligence Engine performs every analytical step. None of it requires an
          external AI service. In order:
        </p>
        <ol className="tick-list">
          <li><strong>Data validation</strong> — types, ranges and units are checked against metric metadata.</li>
          <li><strong>Trends</strong> — absolute change, relative percentage change, and percentage-point change for percentage metrics, with magnitude bands and persistence across periods.</li>
          <li><strong>Directionality</strong> — each metric declares <em>higher-is-better</em>, <em>lower-is-better</em>, <em>target</em>, or <em>context-dependent</em>. The engine never applies a blanket “up is bad” rule.</li>
          <li><strong>Target / threshold comparison</strong> — against any targets or thresholds you supply.</li>
          <li><strong>Relationships</strong> — configured heuristics across metrics (e.g. MFA coverage vs identity incidents). These are analytical signals, not proof of causality.</li>
          <li><strong>Contradictions &amp; nuance</strong> — the engine deliberately looks for patterns where a simplistic conclusion would mislead (e.g. availability up while restore-testing down).</li>
          <li><strong>Materiality</strong> — a versioned weighted score combining board relevance, severity, magnitude, target breach, persistence, relationship strength, business impact and regulatory relevance.</li>
          <li><strong>Confidence</strong> — “Board Narrative Confidence” reflects evidence quality (data completeness, comparability, relationships, contradictions), not model probability.</li>
          <li><strong>Storyline selection</strong> — a library of story rules (conditions, priority, confidence requirements, counter-signals) selects the dominant storyline.</li>
        </ol>
      </SectionCard>

      <SectionCard title="How a report is constructed — and which information is used">
        <p>
          You choose the metrics you actually measure and enter a current value, an optional comparison value,
          optional targets/thresholds and a data-quality note. From that evidence the engine decides the report
          as follows:
        </p>
        <ul className="tick-list">
          <li><strong>Findings</strong> are produced only where a change is material (magnitude, threshold breach or materiality), then ranked by materiality.</li>
          <li><strong>The dominant storyline</strong> is the highest-priority story rule whose conditions are satisfied (ties broken by how many conditions are supported). If no rule dominates, BRIG returns a “broadly stable” or “insufficient evidence” position rather than inventing a trend.</li>
          <li><strong>The narrative</strong> presents the overall executive position, a headline, the few highest-materiality signals, positive developments, key risks/tensions, strategic priorities, board actions and a short methodology/confidence note.</li>
          <li><strong>Conciseness by design</strong> — lists are capped (e.g. top signals, at most five risks/priorities) so the report never becomes a KPI dump, even with 100+ metrics selected.</li>
          <li><strong>Audience lens</strong> — the chosen Board audience (General Board, Audit/Risk Committee, CFO, Executive, Technology) influences ordering and vocabulary; it never changes the underlying facts.</li>
          <li><strong>Charts</strong> are selected deterministically from metric type, periods available, unit compatibility and the storyline’s preferred visuals; units are kept consistent within a chart to avoid misleading comparison.</li>
          <li><strong>Challenge the Story</strong> then searches for balancing counter-signals and indicates whether the conclusion should be softened or segmented.</li>
        </ul>
      </SectionCard>

      <SectionCard title="When — and whether — your data is stored">
        <p>
          <strong>By default nothing is stored and nothing is transmitted.</strong> In Private / Deterministic mode the
          entire analysis runs in your browser. There is no account, no analytics that capture metric values, and no
          automatic persistence to local storage.
        </p>
        <ul className="tick-list">
          <li><strong>Optional save (opt-in).</strong> If you explicitly choose “Save report to server”, the report model is sent to this server and stored in MySQL. A random access token is shown <em>once</em>; only its SHA-256 hash is stored, and the record expires automatically (7, 30 or 90 days). It can be reopened only with both the report id and the token, and there is a per-IP save limit.</li>
          <li><strong>Exports.</strong> PDF, PowerPoint and JSON files are generated on your device and saved wherever you choose. Handle them according to your organisation’s information-classification policy.</li>
          <li><strong>Demo data</strong> is entirely fictional and clearly labelled ({DEMO_LABEL}).</li>
        </ul>
      </SectionCard>

      <SectionCard title="What happens if you engage AI">
        <p>
          AI is an entirely optional <strong>Executive Writing Layer</strong> and is off by default. The complete report
          works without it. When you opt in to AI-Assisted mode:
        </p>
        <ul className="tick-list">
          <li><strong>Access is token-gated:</strong> AI generation requires a single-use 256-bit access token. You enter a token once to unlock a short browser session; the token is then consumed and cannot be reused.</li>
          <li>You must explicitly activate the AI action, and a provider-specific privacy notice is shown <em>before</em> any transmission.</li>
          <li>Only a minimal <strong>ReportFacts</strong> summary is sent (approved numbers, findings, relationships, contradictions, materiality, confidence, priorities, board actions). The full 120-metric library and unrelated data are <strong>never</strong> sent.</li>
          <li>The model may only improve wording. It must not change numbers, invent facts, benchmarks, incidents, compliance claims or causality. Its output is schema-validated and every significant number must match an approved number; banned claims are rejected.</li>
          <li>If the provider fails, rate-limits, returns invalid output, or fails validation, the <strong>deterministic wording is used</strong> and the report remains fully available.</li>
          <li>Provider credentials stay server-side; the browser never holds an API key. A public usage governor limits requests. Provider terms and limits change over time, so BRIG links to current policy pages rather than assuming them.</li>
          <li>Free-text notes are treated as untrusted data, never as instructions to the model.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Privacy modes">
        <ul className="tick-list">
          <li><strong>Private / Deterministic</strong> — all processing in the browser; nothing transmitted or stored.</li>
          <li><strong>AI-Assisted</strong> — optional external AI wording, explicit opt-in, provider privacy notice, ReportFacts-only.</li>
          <li><strong>Demo / Synthetic</strong> — clearly labelled fictional data for exploring the workflow.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Determinism, versioning and reproducibility">
        <p>
          Given the same inputs and the same methodology versions, BRIG produces identical analytical facts. Each report
          records its methodology version, metric-library version and rule version, so a result can be traced to the
          exact logic used. Methodology weights are versioned data, not values buried in the interface.
        </p>
      </SectionCard>

      <SectionCard title="Data quality, benchmarks and provenance">
        <p>
          Results depend on the quality and completeness of the data you supply. BRIG does not invent industry
          benchmarks: if you have not supplied or configured a benchmark, it says so. It keeps unit integrity
          (percent vs percentage points, hours vs days) and surfaces each metric’s caveats.
        </p>
      </SectionCard>

      <SectionCard title="Limitations and disclaimer">
        <p>
          BRIG is independently developed. It is an analytical and executive communication aid — not a cybersecurity
          audit, certification, legal or regulatory advice, or a substitute for professional judgement. Relationships and
          storylines are analytical heuristics, not proof of causality. You remain responsible for validating material
          decisions.
        </p>
      </SectionCard>

      <p className="about-links">
        <a href="https://www.iliadis.net" target="_blank" rel="noopener noreferrer external">
          iliadis.net<span className="visually-hidden"> (opens in a new tab)</span>
        </a>{' '}
        ·{' '}
        <button className="link-btn" onClick={() => dispatch({ type: 'SET_STEP', step: 'methodology' })}>Methodology</button>{' '}
        ·{' '}
        <button className="link-btn" onClick={() => dispatch({ type: 'SET_STEP', step: 'disclaimer' })}>Disclaimers</button>
      </p>
      <Button onClick={goHome}>← Back to the app</Button>
    </div>
  );
}


