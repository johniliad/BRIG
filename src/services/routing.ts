import type { WizardStep } from '../state/BrigContext';

const routes: Record<WizardStep, string> = {
  landing: '/',
  profile: '/report/new/profile',
  select: '/report/new/metrics',
  entry: '/report/new/data',
  review: '/report/new/review',
  report: '/report/new/result',
  saved: '/reports/open',
  about: '/about',
  methodology: '/methodology',
  disclaimer: '/disclaimers',
};

const steps = new Map(Object.entries(routes).map(([step, route]) => [route, step as WizardStep]));

export function routeForStep(step: WizardStep): string {
  return `#${routes[step]}`;
}

export function stepFromLocation(): WizardStep {
  const hash = window.location.hash.replace(/^#/, '').replace(/\/$/, '') || '/';
  return steps.get(hash) ?? 'landing';
}

export function navigateToStep(step: WizardStep, replace = false): void {
  const target = routeForStep(step);
  if (window.location.hash === target) return;
  if (replace) window.history.replaceState({ step }, '', target);
  else window.history.pushState({ step }, '', target);
}