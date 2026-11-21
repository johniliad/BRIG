import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrigProvider } from './state/BrigContext';
import { enforceCanonical } from './services/seo';
import './styles.css';
import { ErrorBoundary } from './ui/ErrorBoundary';

// Keep the canonical URL pinned to the main page no matter which path the SPA
// is served under (see src/services/seo.ts).
enforceCanonical();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrigProvider>
        <App />
      </BrigProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

