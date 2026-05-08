'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SM2State, ReviewQuality, getRetentionPercent,
  getDaysOverdue, updateSM2,
} from '@/lib/srs';

const C = {
  accent: 'var(--accent)',
  accentLight: 'var(--accent-light)',
  accentBorder: 'var(--accent-border)',
  easy: 'var(--easy)',
  easyLight: 'var(--easy-light)',
  easyBorder: 'var(--easy-border)',
  medium: 'var(--medium)',
  mediumLight: 'var(--medium-light)',
  mediumBorder: 'var(--medium-border)',
  hard: 'var(--hard)',
  hardLight: 'var(--hard-light)',
  hardBorder: 'var(--hard-border)',
  border: 'var(--border)',
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  surface3: 'var(--surface-3)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
};

const DIFF_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Easy:   { text: C.easy,   bg: C.easyLight,   border: C.easyBorder   },
  Medium: { text: C.medium, bg: C.mediumLight,  border: C.mediumBorder },
  Hard:   { text: C.hard,   bg: C.hardLight,    border: C.hardBorder   },
};

const RATINGS: { quality: ReviewQuality; label: string; desc: string; color: string; bg: string; border: string }[] = [
  { quality: 0, label: 'Blackout',  desc: 'Complete blank',         color: C.hard,   bg: C.hardLight,   border: C.hardBorder   },
  { quality: 1, label: 'Severe',    desc: 'Barely recalled',        color: C.hard, bg: C.hardLight, border: C.hardBorder },
  { quality: 2, label: 'Barely',    desc: 'Too much struggle',      color: C.medium, bg: C.mediumLight, border: C.mediumBorder },
  { quality: 3, label: 'Hard',      desc: 'Remembered with effort', color: C.medium, bg: C.mediumLight, border: C.mediumBorder },
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
  nowMs: number;
  state: SM2State;
  onRate: (slug: string, quality: ReviewQuality, updated: SM2State) => void;
  onSkip?: (slug: string) => void;
}

export default function ReviewCard({ nowMs, state, onRate, onSkip }: ReviewCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const retention = useMemo(() => getRetentionPercent(state, nowMs), [nowMs, state]);
  const daysOverdue = useMemo(() => getDaysOverdue(state, nowMs), [nowMs, state]);
  const diff = DIFF_COLOR[state.difficulty] ?? DIFF_COLOR['Medium'];

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (rateTimerRef.current) clearTimeout(rateTimerRef.current);
    };
  }, []);

  function handleReveal() {
    setFlipping(true);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => {
      setRevealed(true);
      setFlipping(false);
      revealTimerRef.current = null;
    }, 200);
  }

  function handleRate(quality: ReviewQuality) {
    const updated = updateSM2(state, quality, { nowMs: Date.now() });
    setRated(true);
    if (rateTimerRef.current) clearTimeout(rateTimerRef.current);
    rateTimerRef.current = setTimeout(() => {
      onRate(state.slug, quality, updated);
      rateTimerRef.current = null;
    }, 300);
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
      <style>{`
        .review-card-front {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .review-card-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .review-rating-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        @media (max-width: 720px) {
          .review-card-front {
            flex-direction: column;
          }
          .review-card-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
        @media (max-width: 520px) {
          .review-card-actions {
            justify-content: stretch;
          }
          .review-card-actions button {
            flex: 1;
          }
          .review-rating-grid button {
            min-width: calc(50% - 8px) !important;
            flex: 1 1 calc(50% - 8px) !important;
          }
        }
      `}</style>
      {/* Front */}
      <div style={{ padding: '18px 20px' }}>
        <div className="review-card-front">
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
            <div style={{ marginTop: '10px', fontSize: '11px', color: C.textMuted, lineHeight: 1.55 }}>
              Recall the approach first, then reveal and rate the quality of your memory.
            </div>
          </div>

          <div className="review-card-actions">
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
                  background: `linear-gradient(135deg, ${C.accent}, var(--accent-2))`,
                  border: 'none', borderRadius: '8px',
                  color: 'white', fontSize: '12px', fontFamily: 'DM Mono, monospace',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: 'var(--glow-accent)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--glow-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--glow-accent)'; }}
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
          <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '12px', lineHeight: 1.55 }}>
            Rate recall quality, not how hard the original problem felt.
          </div>
          <div className="review-rating-grid">
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
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--glow-accent)'; }}
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
