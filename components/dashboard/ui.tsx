import { ExternalLink } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { C, getProblemUrl } from './theme';

export function Label({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '10px',
      color: C.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      fontFamily: 'DM Mono, monospace',
      marginBottom: '8px',
    }}>
      {text}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="dashboard-section-header">
      <div>
        <Label text={eyebrow} />
        <h2 style={{
          fontFamily: 'DM Serif Display, serif',
          fontSize: 'clamp(20px, 2.5vw, 26px)',
          color: C.textPrimary,
          marginBottom: description ? '6px' : 0,
          lineHeight: 1.08,
        }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.6, maxWidth: '620px' }}>
            {description}
          </p>
        )}
      </div>
      {aside}
    </div>
  );
}

export function Chip({
  text,
  tone = 'neutral',
}: {
  text: string;
  tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'info' | 'warning';
}) {
  const palette = {
    neutral: { bg: C.surface3, color: C.textSecondary, border: C.border },
    accent: { bg: C.accentLight, color: C.accent, border: C.accentBorder },
    success: { bg: C.easyLight, color: C.easy, border: C.easyBorder },
    danger: { bg: C.hardLight, color: C.hard, border: C.hardBorder },
    info: { bg: C.infoLight, color: C.info, border: C.infoBorder },
    warning: { bg: C.mediumLight, color: C.medium, border: C.mediumBorder },
  }[tone];

  return (
    <span style={{
      fontSize: '11px',
      padding: '3px 10px',
      background: palette.bg,
      color: palette.color,
      borderRadius: '999px',
      border: `1px solid ${palette.border}`,
      fontFamily: 'DM Mono, monospace',
      whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  );
}

export function Card({
  children,
  delay = 0,
  style = {},
  id,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`fu dashboard-card ${className}`.trim()}
      style={{
        animationDelay: `${delay}ms`,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function ScoreBar({
  label,
  score,
  max,
  note,
}: {
  label: string;
  score: number;
  max: number;
  note?: string;
}) {
  const pct = max > 0 ? Math.min((score / max) * 100, 100) : 0;
  const color = pct >= 70 ? C.easy : pct >= 40 ? C.accent : C.hard;

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: C.textSecondary }}>{label}</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color }}>{score}/{max}</span>
      </div>
      <div style={{ height: '4px', background: C.surface3, borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: '2px',
          transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: 'var(--glow-accent)',
        }} />
      </div>
      {note && <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace' }}>{note}</div>}
    </div>
  );
}

export function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-stat-block">
      <div style={{
        fontSize: '10px',
        color: C.textMuted,
        fontFamily: 'DM Mono, monospace',
        marginBottom: '6px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: C.textPrimary }}>{value}</div>
    </div>
  );
}

export function ProblemLink({
  slug,
  label = 'Open problem',
}: {
  slug: string;
  label?: string;
}) {
  return (
    <a
      href={getProblemUrl(slug)}
      target="_blank"
      rel="noopener noreferrer"
      className="dashboard-problem-link"
    >
      {label}
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}
