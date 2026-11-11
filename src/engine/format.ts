import type { MetricUnit } from '../types';

/**
 * Formatting helpers. Numerical-integrity rules (spec §53–54):
 *  - never round internally; round only for display;
 *  - keep units distinct (percent vs percentage points, hours vs days, etc.);
 *  - only abbreviate large numbers when clearly labelled.
 */

export function roundForDisplay(value: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * f) / f;
}

function withThousands(n: string): string {
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatNumber(value: number | null, decimals = 0): string {
  if (value === null || Number.isNaN(value)) return '—';
  const rounded = roundForDisplay(value, decimals);
  const [intPart, decPart] = Math.abs(rounded).toString().split('.');
  const sign = rounded < 0 ? '-' : '';
  const intFmt = withThousands(intPart);
  return decPart ? `${sign}${intFmt}.${decPart}` : `${sign}${intFmt}`;
}

export function formatCurrency(value: number | null, currency = 'EUR'): string {
  if (value === null || Number.isNaN(value)) return '—';
  const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF ' };
  const sym = symbols[currency] ?? `${currency} `;
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${value < 0 ? '-' : ''}${sym}${roundForDisplay(abs / 1_000_000_000, 2)}B`;
  if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}${sym}${roundForDisplay(abs / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `${value < 0 ? '-' : ''}${sym}${roundForDisplay(abs / 1_000, 1)}k`;
  return `${value < 0 ? '-' : ''}${sym}${formatNumber(abs, 0)}`;
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || Number.isNaN(value)) return '—';
  return `${formatNumber(value, decimals)}%`;
}

export function formatPercentagePoints(value: number | null, decimals = 1): string {
  if (value === null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${roundForDisplay(value, decimals)} pp`;
}

/** Format a metric value according to its declared unit. */
export function formatMetricValue(value: number | null, unit: MetricUnit, currency = 'EUR'): string {
  if (value === null || Number.isNaN(value)) return '—';
  switch (unit) {
    case 'percent':
      return formatPercent(value, 1);
    case 'percentage_points':
      return formatPercentagePoints(value, 1);
    case 'currency':
      return formatCurrency(value, currency);
    case 'hours':
      return `${formatNumber(value, 1)} hrs`;
    case 'days':
      return `${formatNumber(value, 1)} days`;
    case 'per_employee':
      return formatNumber(value, 0);
    case 'score':
    case 'index':
      return formatNumber(value, 1);
    case 'ratio':
      return formatNumber(value, 2);
    case 'count':
    default:
      return formatNumber(value, 0);
  }
}

/** Unit label suitable for chart axis / KPI subtitle. */
export function unitLabel(unit: MetricUnit): string {
  switch (unit) {
    case 'percent':
      return '%';
    case 'percentage_points':
      return 'pp';
    case 'currency':
      return 'currency';
    case 'hours':
      return 'hours';
    case 'days':
      return 'days';
    case 'per_employee':
      return 'per employee';
    case 'score':
    case 'index':
      return 'score';
    case 'ratio':
      return 'ratio';
    default:
      return 'count';
  }
}

/** Signed change label, used in evidence text. */
export function formatDelta(value: number | null, unit: MetricUnit, currency = 'EUR'): string {
  if (value === null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  const abs = Math.abs(value);
  if (unit === 'percent') return `${sign}${formatNumber(abs, 1)} pp`;
  if (unit === 'currency') return `${sign}${formatCurrency(abs, currency)}`;
  if (unit === 'hours') return `${sign}${formatNumber(abs, 1)} hrs`;
  if (unit === 'days') return `${sign}${formatNumber(abs, 1)} days`;
  if (unit === 'score' || unit === 'index') return `${sign}${formatNumber(abs, 1)}`;
  if (unit === 'ratio') return `${sign}${formatNumber(abs, 2)}`;
  return `${sign}${formatNumber(abs, 0)}`;
}
