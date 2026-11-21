import React from 'react';
import { APP_BUILD } from '../data/demo';
import { Button, Callout } from './components';

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error): void {
    console.error(`[BRIG ${APP_BUILD}] render failure`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="site-main page" id="main">
        <Callout tone="danger" title="The application could not render this view">
          <p>Your locally saved draft should still be available. Reload the application or return to the home screen.</p>
          <p className="muted small">Build {APP_BUILD}</p>
          <div className="form-actions-left">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button variant="secondary" onClick={() => { window.location.hash = '#/'; window.location.reload(); }}>Home</Button>
          </div>
        </Callout>
      </main>
    );
  }
}