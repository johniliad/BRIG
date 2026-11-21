import { useEffect, useRef } from 'react';
import { useBrig } from './state/BrigContext';
import type { WizardStep } from './state/BrigContext';
import { BRAND_NAME, APP_BUILD } from './data/demo';
import { Stepper } from './ui/components';
import { Landing } from './pages/Landing';
import { ProfileStep } from './pages/ProfileStep';
import { SelectStep } from './pages/SelectStep';
import { EntryStep } from './pages/EntryStep';
import { ReviewStep } from './pages/ReviewStep';
import { ReportStep } from './pages/ReportStep';
import { MethodologyPage } from './pages/MethodologyPage';
import { DisclaimerPage } from './pages/DisclaimerPage';
import { SavedReportPage } from './pages/SavedReportPage';
import { AboutPage } from './pages/AboutPage';
import { assetUrl } from './services/paths';
import { navigateToStep, stepFromLocation } from './services/routing';
import { formatTimestamp } from './services/formatters';

const WIZARD: WizardStep[] = ['profile', 'select', 'entry', 'review', 'report'];

export default function App() {
  const { state, dispatch, draftSavedAt, clearLocalDraft } = useBrig();
  const { step, privacyMode } = state;
  const inWizard = WIZARD.includes(step);

  const pageHeadingRef = useRef<HTMLDivElement>(null);

  // Hash routing works at domain roots and subfolders without extra rewrites.
  useEffect(() => {
    const sync = () => dispatch({ type: 'SET_STEP', step: stepFromLocation() });
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [dispatch]);

  useEffect(() => {
    navigateToStep(step, true);
  }, [step]);

  useEffect(() => {
    const heading = pageHeadingRef.current?.querySelector<HTMLElement>('h1, h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }, [step]);

  const go = (s: WizardStep) => {
    dispatch({ type: 'SET_STEP', step: s });
    navigateToStep(s);
  };
  const goAbout = () => {
    go('about');
  };

  const reset = () => {
    const hasWork = state.selectedKeys.length > 0;
    if (hasWork && !window.confirm('Start over and discard the current local draft?')) return;
    clearLocalDraft();
    dispatch({ type: 'RESET' });
    navigateToStep('landing');
  };

  const setMode = (mode: 'deterministic' | 'ai_assisted' | 'demo') => {
    if (mode === 'demo') {
      dispatch({ type: 'APPLY_DEMO' });
      return;
    }
    dispatch({ type: 'SET_PRIVACY', mode });
  };

  return (
    <div className="app-root">
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="site-header">
        <div className="site-header-inner">
          <button className="brand" onClick={() => go('landing')} aria-label={`${BRAND_NAME} home`}>
            <span className="brand-mark">BRIG</span>
            <span className="brand-text">
              <span className="brand-title">{BRAND_NAME}</span>
              <span className="brand-sub">Executive cybersecurity reporting</span>
            </span>
          </button>
          <nav className="site-nav" aria-label="Primary">
            <button className="nav-link" onClick={() => go('landing')}>Home</button>
            <button className="nav-link" onClick={() => go('methodology')}>Methodology</button>
            <button className="nav-link" onClick={() => go('disclaimer')}>Disclaimers</button>
            <button className="nav-link" onClick={() => go('saved')}>Open saved</button>
            <a className="nav-link" href="https://www.iliadis.net" target="_blank" rel="noopener noreferrer external">
              iliadis.net<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            <button className="nav-cta" onClick={() => go('profile')}>Create Board Report</button>
          </nav>
        </div>
      </header>

      <div className="mode-bar" role="group" aria-label="Processing mode">
        <div className="mode-bar-inner">
          <span className="mode-label">Mode:</span>
          <button
            className={`mode-pill ${privacyMode === 'deterministic' ? 'active' : ''}`}
            onClick={() => setMode('deterministic')}
            aria-pressed={privacyMode === 'deterministic'}
          >
            Private / Deterministic
          </button>
          <button
            className={`mode-pill ${privacyMode === 'ai_assisted' ? 'active' : ''}`}
            onClick={() => setMode('ai_assisted')}
            aria-pressed={privacyMode === 'ai_assisted'}
          >
            AI-Assisted
          </button>
          <button
            className={`mode-pill ${privacyMode === 'demo' ? 'active' : ''}`}
            onClick={() => setMode('demo')}
            aria-pressed={privacyMode === 'demo'}
          >
            Demo / Synthetic data
          </button>
          <span className="mode-hint">
            {privacyMode === 'deterministic' && 'All processing in your browser · nothing transmitted'}
            {privacyMode === 'ai_assisted' && 'Optional external AI wording (explicit opt-in required)'}
            {privacyMode === 'demo' && 'Fictional data — clearly labelled as illustrative'}
          </span>
        </div>
      </div>

      {inWizard && (
        <div className="stepper-wrap">
          <Stepper current={step} onGo={(k) => go(k as WizardStep)} />
        </div>
      )}

      {draftSavedAt && state.selectedKeys.length > 0 && (
        <div className="draft-status" role="status">
          Draft saved locally {formatTimestamp(draftSavedAt)} ·{' '}
          <button className="link-btn" onClick={clearLocalDraft}>Remove saved draft</button>
        </div>
      )}

      <main id="main" className="site-main" ref={pageHeadingRef}>
        {step === 'landing' && <Landing />}
        {step === 'profile' && <ProfileStep />}
        {step === 'select' && <SelectStep />}
        {step === 'entry' && <EntryStep />}
        {step === 'review' && <ReviewStep />}
        {step === 'report' && <ReportStep />}
        {step === 'saved' && <SavedReportPage />}
        {step === 'about' && <AboutPage />}
        {step === 'methodology' && <MethodologyPage />}
        {step === 'disclaimer' && <DisclaimerPage />}
      </main>

      <footer className="site-footer no-print">
        <div className="site-footer-inner">
          <div className="footer-product">
            <p className="footer-brand">{BRAND_NAME} (BRIG)</p>
            <p className="footer-desc">
              BRIG is a product from the{' '}
              <a href="https://www.iliadis.net" target="_blank" rel="noopener noreferrer external">
                iliadis.net<span className="visually-hidden"> (opens in a new tab)</span>
              </a>{' '}
              ecosystem. It is a Cybersecurity Intelligence Engine that validates data, computes trends and
              directionality, evaluates cross-metric relationships and contradictions, and separates inherent importance,
              observed signal strength and evidence confidence,
              and selects a storyline.
            </p>
            <p className="footer-note">
              Independently developed analytical and executive communication aid. Not an audit, certification, legal or
              regulatory advice, or a substitute for professional judgement.
            </p>
            <p className="footer-links">
              <button className="link-btn" onClick={() => go('methodology')}>Methodology</button>
              {' · '}
              <button className="link-btn" onClick={() => go('disclaimer')}>Disclaimers</button>
              {' · '}
              <button className="link-btn" onClick={goAbout}>About</button>
              {' · '}
              <button className="link-btn" onClick={reset}>Start over</button>
              {' · '}
              <a className="link-btn" href={assetUrl('THIRD-PARTY-NOTICES.txt')}>Third-party notices</a>
              {' · '}
              <a className="link-btn" href={assetUrl('LICENSE.txt')}>License</a>
            </p>
          </div>

          <div className="footer-author">
            <p className="footer-credit">
              Built by{' '}
              <a
                href="https://www.iliadis.net/#john-iliadis"
                target="_blank"
                rel="author external noopener noreferrer"
              >
                Dr. John ILIADIS<span className="visually-hidden"> (opens in a new tab)</span>
              </a>{' '}
              · Executive Cybersecurity Reporting · <button className="link-btn" onClick={goAbout}>About this product</button>{' '}
              · <span className="footer-build">build {APP_BUILD}</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

