import type { BoardProfile } from '../types';

export function formatTimestamp(value: string, locale?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    // Formatting must never be able to take down the report or draft UI.
    return date.toISOString();
  }
}

export function safeFilenamePart(value: string, fallback = 'board'): string {
  const safe = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return safe || fallback;
}

export function reportFilename(profile: BoardProfile, extension: string): string {
  const period = safeFilenamePart(profile.reportingPeriod, 'report');
  return `CISO_Board_Report_${period}.${extension.replace(/^\./, '')}`;
}

export function reportingWindow(profile: Pick<BoardProfile, 'reportingPeriod' | 'comparisonPeriod'>): string {
  const current = profile.reportingPeriod.trim() || 'Current period';
  const comparison = profile.comparisonPeriod.trim();
  return comparison ? `${comparison} → ${current}` : current;
}