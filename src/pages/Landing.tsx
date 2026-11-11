import { useBrig } from '../state/BrigContext';
import { DEMO_LABEL, HERO_TITLE } from '../data/demo';
import { METRICS } from '../data/library';
import { Button, Callout } from '../ui/components';

export function Landing() {
  const { dispatch } = useBrig();

  const start = () => dispatch({ type: 'SET_STEP', step: 'profile' });
  const demo = () => {
    dispatch({ type: 'APPLY_DEMO' });
    dispatch({ type: 'SET_STEP', step: 'review' });
  };

  return (
    <div className="page landing">
      <section className="hero">
        <p className="eyebrow">Iliadis Tools4U · Communicate · Decide · Report</p>
        <h1 className="hero-title">{HERO_TITLE}</h1>
        <p className="hero-lead">
          Turn cybersecurity metrics into a board-ready story. Select the measures you have, enter current and
          comparison-period data, and generate a concise, defensible Board cybersecurity summary with supporting
          graphics and presentation-ready slides.
        </p>
        <div className="hero-cta">
          <Button onClick={start} variant="primary">Create Board Report</Button>
          <Button onClick={demo} variant="secondary">See Example Report (demo)</Button>
        </div>
        <p className="hero-meta">
          {METRICS.length} metrics · deterministic CISO reasoning · optional AI wording · PDF &amp; PowerPoint output
        </p>
      </section>

      <div className="landing-grid">
        <div className="card">
          <h2 className="card-title">What this tool does</h2>
          <ul className="tick-list">
            <li>Separates operational measurement from Board-level information.</li>
            <li>Understands metric directionality and context — not a blanket “up is bad”.</li>
            <li>Recognises relationships and contradictions across metrics.</li>
            <li>Translates security performance into business implications.</li>
            <li>Prioritises the few things the Board should care about.</li>
            <li>Presents the same analysis as a web report, PDF and deck.</li>
          </ul>
        </div>
        <div className="card">
          <h2 className="card-title">How the analysis works</h2>
          <p>
            A <strong>deterministic CISO Intelligence Engine</strong> validates data, computes trends and
            directionality, evaluates cross-metric relationships and contradictions, scores materiality and
            confidence, and selects a storyline. Charts and slides are generated deterministically from that model.
          </p>
          <p>
            An optional <strong>Executive Writing Layer</strong> can improve wording only — it never becomes the source
            of truth for numbers, and the full report works without it.
          </p>
        </div>
      </div>

      <Callout tone="good" title="Privacy by default">
        <p>
          In <strong>Private / Deterministic</strong> mode everything is computed in your browser. No metric values are
          stored or sent anywhere. External AI is used only if you explicitly opt in, and only a minimal{' '}
          <em>ReportFacts</em> summary is sent to the selected provider.
        </p>
      </Callout>

      <div className="card">
        <h2 className="card-title">Try a realistic demo</h2>
        <p>
          The demo uses <strong>fictional data</strong> crafted to exercise the full intelligence pipeline — an
          improvement storyline, a deterioration, a contradiction and a Board action — so you can explore the tool
          without entering any real information.
        </p>
        <p className="demo-label">{DEMO_LABEL}</p>
        <Button onClick={demo} variant="primary">Try the realistic demo</Button>
      </div>

      <p className="landing-links">
        <button className="link-btn" onClick={() => dispatch({ type: 'SET_STEP', step: 'methodology' })}>
          Read the methodology
        </button>{' '}
        ·{' '}
        <button className="link-btn" onClick={() => dispatch({ type: 'SET_STEP', step: 'disclaimer' })}>
          Disclaimers
        </button>{' '}
        ·{' '}
        <button className="link-btn" onClick={() => dispatch({ type: 'SET_STEP', step: 'saved' })}>
          Open a saved report
        </button>
      </p>
    </div>
  );
}
