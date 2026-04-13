'use client';

import { useState, useMemo } from 'react';
import {
  SM2State, ReviewQuality, getRetentionPercent,
  getDaysOverdue, updateSM2,
} from '@/lib/srs';

const C = {
  accent: '#8B5CF6',
  accentLight: 'rgba(139,92,246,0.12)',
  accentBorder: 'rgba(139,92,246,0.25)',
  easy: '#10B981',
  easyLight: 'rgba(16,185,129,0.12)',
  easyBorder: 'rgba(16,185,129,0.25)',
  medium: '#F59E0B',
  mediumLight: 'rgba(245,158,11,0.12)',
  mediumBorder: 'rgba(245,158,11,0.25)',
  hard: '#F43F5E',
  hardLight: 'rgba(244,63,94,0.12)',
  hardBorder: 'rgba(244,63,94,0.25)',
  border: '#2A2A42',
  surface: '#0F0F1A',
  surface2: '#181826',
  surface3: '#222236',
  textPrimary: '#EAEAF4',
  textSecondary: '#8A8AAE',
  textMuted: '#4E4E72',
};

const DIFF_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Easy:   { text: C.easy,   bg: C.easyLight,   border: C.easyBorder   },
  Medium: { text: C.medium, bg: C.mediumLight,  border: C.mediumBorder },
  Hard:   { text: C.hard,   bg: C.hardLight,    border: C.hardBorder   },
};

const RATINGS: { quality: ReviewQuality; label: string; desc: string; color: string; bg: string; border: string }[] = [
  { quality: 0, label: 'Blackout',  desc: 'Complete blank',         color: C.hard,   bg: C.hardLight,   border: C.hardBorder   },
  { quality: 3, label: 'Hard',      desc: 'Remembered with effort', color: '#D97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)' },
  { quality: 4, label: 'Good',      desc: 'Minor hesitation',       color: C.accent, bg: C.accentLight, border: C.accentBorder },
  { quality: 5, label: 'Easy',      desc: 'Perfect recall',         color: C.easy,   bg: C.easyLight,   border: C.easyBorder   },
];

function RetentionArc({ retention }: { retention: number }) {
  const r = 22, cx = 28, cy = 28;
  const circumference = 2 * Math.PI * r;
  const strokeDash = (retention / 100) * circumference;
  const color = retention >= 60 ? C.easy : retention >= 30 ? C.accent : C.hard;

  return (
    <svg width="56" height="56" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.surface3} strokeWidth="4" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${strokeDash} ${circumference}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{
          transition: 'stroke-dasharray 0.6s ease',
          filter: `drop-shadow(0 0 4px ${color})`,
        }}
      />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', fontWeight: 600, fill: color }}>
        {retention}%
      </text>
    </svg>
  );
}

export interface ReviewCardProps {
  state: SM2State;
  onRate: (slug: string, quality: ReviewQuality, updated: SM2State) => void;
  onSkip?: (slug: string) => void;
}

export default function ReviewCard({ state, onRate, onSkip }: ReviewCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState(false);
  const [flipping, setFlipping] = useState(false);

  const retention = useMemo(() => getRetentionPercent(state), [state]);
  const daysOverdue = useMemo(() => getDaysOverdue(state), [state]);
  const diff = DIFF_COLOR[state.difficulty] ?? DIFF_COLOR['Medium'];

  function handleReveal() {
    setFlipping(true);
    setTimeout(() => { setRevealed(true); setFlipping(false); }, 200);
  }

  function handleRate(quality: ReviewQuality) {
    const updated = updateSM2(state, quality);
    setRated(true);
    setTimeout(() => onRate(state.slug, quality, updated), 300);
  }

  if (rated) {
    return (
      <div style={{
        padding: '16px 20px', background: C.easyLight,
        border: `1px solid ${C.easyBorder}`, borderRadius: '14px',
        display: 'flex', alignItems: 'center', gap: '12px',
        animation: 'fadeOut 0.3s ease forwards',
      }}>
        <span style={{ fontSize: '16px' }}>✓</span>
        <div style={{ fontSize: '13px', color: C.easy, fontFamily: 'DM Mono, monospace' }}>
          {state.title} — reviewed
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '14px',
        overflow: 'hidden',
        transform: flipping ? 'rotateX(90deg)' : 'rotateX(0deg)',
        transition: 'transform 0.2s ease',
        transformOrigin: 'center top',
      }}
    >
      {/* Front */}
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <RetentionArc retention={retention} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '17px', color: C.textPrimary }}>
                {state.title}
              </span>
              {daysOverdue > 0 && (
                <span style={{
                  fontSize: '10px', fontFamily: 'DM Mono, monospace',
                  color: C.hard, background: C.hardLight, border: `1px solid ${C.hardBorder}`,
                  borderRadius: '4px', padding: '2px 6px',
                }}>
                  {daysOverdue}d overdue
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px', fontFamily: 'DM Mono, monospace',
                color: diff.text, background: diff.bg, border: `1px solid ${diff.border}`,
                borderRadius: '999px', padding: '2px 8px',
              }}>
                {state.difficulty}
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: C.textMuted }}>
                /problems/{state.slug}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {onSkip && (
              <button
                onClick={() => onSkip(state.slug)}
                style={{
                  padding: '7px 12px', background: 'transparent',
                  border: `1px solid ${C.border}`, borderRadius: '8px',
                  color: C.textMuted, fontSize: '12px', fontFamily: 'DM Mono, monospace',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.textMuted; e.currentTarget.style.color = C.textSecondary; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
              >
                Skip
              </button>
            )}
            {!revealed && (
              <button
                onClick={handleReveal}
                style={{
                  padding: '7px 16px',
                  background: `linear-gradient(135deg, ${C.accent}, #7C3AED)`,
                  border: 'none', borderRadius: '8px',
                  color: 'white', fontSize: '12px', fontFamily: 'DM Mono, monospace',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: '0 0 12px rgba(139,92,246,0.3)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(139,92,246,0.5)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 12px rgba(139,92,246,0.3)'; }}
              >
                Review →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Back — rating buttons */}
      {revealed && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 20px', background: C.surface2 }}>
          <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: C.textMuted, letterSpacing: '0.1em', marginBottom: '10px' }}>
            HOW DID IT GO?
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {RATINGS.map((r) => (
              <button
                key={r.quality}
                onClick={() => handleRate(r.quality)}
                style={{
                  padding: '9px 16px', background: r.bg,
                  border: `1px solid ${r.border}`, borderRadius: '10px',
                  color: r.color, cursor: 'pointer',
                  transition: 'all 0.15s ease', flex: 1, minWidth: '80px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${r.color}33`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', fontWeight: 600 }}>{r.label}</div>
                <div style={{ fontSize: '10px', color: r.color, opacity: 0.75, marginTop: '2px' }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
