import React from 'react';
import type { ConfidenceLevel, ReportStatus } from '../types';

export function StatusBadge({ status }: { status: ReportStatus }) {
  const cls = `status-badge status-${status.toLowerCase().replace(/[^a-z]/g, '')}`;
  return <span className={cls}>{status}</span>;
}

export function ConfidencePill({ level }: { level: ConfidenceLevel }) {
  const map: Record<ConfidenceLevel, string> = {
    High: 'conf-high',
    Medium: 'conf-medium',
    Low: 'conf-low',
    'Insufficient evidence': 'conf-insufficient',
  };
  return <span className={`confidence-pill ${map[level]}`}>Confidence: {level}</span>;
}

export function SectionCard({
  title,
  subtitle,
  children,
  className = '',
  id,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`card ${className}`} id={id}>
      {title && <h2 className="card-title">{title}</h2>}
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
      {children}
    </section>
  );
}

export function ScoreBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="scorebar" aria-label={label ?? `score ${value} of ${max}`}>
      <div className="scorebar-track">
        <div className="scorebar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="scorebar-value">{Math.round(value)}</span>
    </div>
  );
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'danger' | 'good' | 'neutral';
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`callout callout-${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      {title && <strong className="callout-title">{title}</strong>}
      <div className="callout-body">{children}</div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
}) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick} disabled={disabled} type={type} title={title}>
      {children}
    </button>
  );
}

const STEP_LABELS: Array<{ key: string; label: string }> = [
  { key: 'profile', label: 'Profile' },
  { key: 'select', label: 'Select metrics' },
  { key: 'entry', label: 'Enter data' },
  { key: 'review', label: 'Review' },
  { key: 'report', label: 'Report' },
];

export function Stepper({ current, onGo }: { current: string; onGo: (key: string) => void }) {
  const currentIndex = STEP_LABELS.findIndex((s) => s.key === current);
  return (
    <ol className="stepper" aria-label="Progress">
      {STEP_LABELS.map((s, i) => {
        const state = i === currentIndex ? 'active' : i < currentIndex ? 'done' : 'todo';
        return (
          <li key={s.key} className={`stepper-item stepper-${state}`}>
            <button className="stepper-btn" onClick={() => onGo(s.key)} aria-current={i === currentIndex ? 'step' : undefined}>
              <span className="stepper-num">{i + 1}</span>
              <span className="stepper-label">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="empty-note">{children}</p>;
}
