'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LeetCodeProfile } from '@/lib/leetcode';
import {
  SM2State, getDueProblems, getUpcomingProblems, getQueueStats,
  computeMemoryHealth, getTopicRetentionBreakdown,
  getRetentionPercent, getDaysOverdue,
} from '@/lib/srs';
import ReviewCard from './ReviewCard';
import { ForgetCurve, TopicRetentionBars } from './ForgetCurve';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  accent: '#8B5CF6',
  accentLight: 'rgba(139,92,246,0.12)',
  accentBorder: 'rgba(139,92,246,0.25)',
  easy: '#10B981',
  easyLight: 'rgba(16,185,129,0.12)',
  easyBorder: 'rgba(16,185,129,0.25)',
  hard: '#F43F5E',
  hardLight: 'rgba(244,63,94,0.12)',
  hardBorder: 'rgba(244,63,94,0.25)',
  cyan: '#06B6D4',
  cyanLight: 'rgba(6,182,212,0.12)',
  border: '#2A2A42',
  surface: '#0F0F1A',
  surface2: '#181826',
  surface3: '#222236',
  bg: '#07070C',
  textPrimary: '#EAEAF4',
  textSecondary: '#8A8AAE',
  textMuted: '#4E4E72',
};

/* ─── Memory Health Ring ─────────────────────────────────────── */
function MemoryHealthScore({ score }: { score: number }) {
  const color = score >= 70 ? C.easy : score >= 40 ? C.accent : C.hard;
  const label =
    score >= 80 ? 'Strong memory'  :
    score >= 60 ? 'Holding well'   :
    score >= 40 ? 'Fading — review':
    score >= 20 ? 'Weak — urgent'  :
    'Critical decay';

  const r = 44, cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;
  const strokeDash = (score / 100) * circumference;

  return (
    <div className="srs-memory-health" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <svg width="120" height="120" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.surface3} strokeWidth="7" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{
            transition: 'stroke-dasharray 1s ease',
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fill: color }}>
          {score}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', fill: C.textMuted }}>
          /100
        </text>
      </svg>
      <div>
        <div style={{
          fontSize: '10px', color: C.textMuted, textTransform: 'uppercase',
          letterSpacing: '0.12em', fontFamily: 'DM Mono, monospace', marginBottom: '6px',
        }}>
          Memory Health
        </div>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color }}>
          {label}
        </div>
        <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '8px', lineHeight: 1.6 }}>
          Weighted average retention across all tracked problems.
          {score < 60 && ' Review your due cards to bring this score up.'}
          {score >= 80 && ' Keep up this excellent review habit.'}
        </div>
      </div>
    </div>
  );
}

/* ─── Upcoming Strip ─────────────────────────────────────────── */
function UpcomingStrip({ nowMs, states }: { nowMs: number; states: Record<string, SM2State> }) {
  const upcoming = getUpcomingProblems(states, nowMs, 4);
  if (upcoming.length === 0) return null;

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{
        fontSize: '10px', color: C.textMuted, textTransform: 'uppercase',
        letterSpacing: '0.12em', fontFamily: 'DM Mono, monospace', marginBottom: '10px',
      }}>
        Coming up next
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {upcoming.map(s => {
          const daysUntil = Math.abs(getDaysOverdue(s, nowMs));
          const dueLabel = daysUntil === 0 ? 'due today' : `in ${daysUntil}d`;
          return (
            <div key={s.slug} style={{
              padding: '10px 14px',
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
              <span style={{ fontSize: '12px', color: C.textPrimary, fontWeight: 500 }}>
                {s.title.length > 22 ? s.title.slice(0, 22) + '\u2026' : s.title}
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: C.textMuted }}>
                {dueLabel} \xB7 {getRetentionPercent(s, nowMs)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Tab button ─────────────────────────────────────────────── */
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 18px',
        background: active ? C.accentLight : 'transparent',
        border: `1px solid ${active ? C.accentBorder : C.border}`,
        borderRadius: '8px',
        color: active ? C.accent : C.textSecondary,
        fontSize: '12px', fontFamily: 'DM Mono, monospace',
        cursor: 'pointer', transition: 'all 0.15s ease',
        letterSpacing: '0.04em',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = C.accentBorder;
          e.currentTarget.style.color = C.textPrimary;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.color = C.textSecondary;
        }
      }}
    >
      {children}
    </button>
  );
}

/* ─── Main Panel ─────────────────────────────────────────────── */
type ActiveTab = 'queue' | 'curves' | 'memory';

interface SRSPanelProps {
  profile: LeetCodeProfile;
  states: Record<string, SM2State>;
  nowMs: number;
  ready: boolean;
  onStateChange: (updated: SM2State) => void;
}

export default function SRSPanel({ profile, states, nowMs, ready, onStateChange }: SRSPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('queue');
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const dueProblems = useMemo(() => {
    if (!ready) return [];
    return getDueProblems(states, nowMs).filter(s => !skipped.has(s.slug));
  }, [nowMs, ready, states, skipped]);

  const stats = useMemo(() => getQueueStats(states, nowMs), [nowMs, states]);
  const memoryHealth = useMemo(() => computeMemoryHealth(states, nowMs), [nowMs, states]);
  const topicBreakdown = useMemo(() => getTopicRetentionBreakdown(states, nowMs), [nowMs, states]);

  const trackedSlugs = useMemo(() => Object.keys(states), [states]);
  const selectedState = states[selectedSlug] ?? states[trackedSlugs[0]];

  useEffect(() => {
    if (!selectedSlug && trackedSlugs.length > 0) {
      setSelectedSlug(trackedSlugs[0]);
    }
  }, [trackedSlugs, selectedSlug]);

  useEffect(() => {
    setSkipped(new Set());
    setSelectedSlug('');
  }, [profile.username]);

  const handleRate = useCallback((_slug: string, _quality: number, updated: SM2State) => {
    onStateChange(updated);
  }, [onStateChange]);

  const handleSkip = useCallback((slug: string) => {
    setSkipped(prev => new Set([...prev, slug]));
  }, []);

  if (!ready) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
        <div style={{
          height: '18px', width: '200px', marginBottom: '16px', borderRadius: '6px',
          background: `linear-gradient(90deg, ${C.surface2} 25%, ${C.surface3} 50%, ${C.surface2} 75%)`,
          backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite',
        }} />
        <div style={{
          height: '120px', borderRadius: '10px',
          background: `linear-gradient(90deg, ${C.surface2} 25%, ${C.surface3} 50%, ${C.surface2} 75%)`,
          backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <style>{`
        .srs-memory-health {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .srs-tab-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        @media (max-width: 680px) {
          .srs-header {
            padding: 18px !important;
          }
          .srs-body {
            padding: 20px 18px !important;
          }
          .srs-memory-health {
            flex-direction: column;
            align-items: flex-start;
          }
          .srs-select {
            width: 100% !important;
            min-width: 0 !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="srs-header" style={{
        padding: '20px 26px',
        borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(135deg, ${C.accentLight}, transparent)`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', marginBottom: '6px' }}>
            SPACED REPETITION SYSTEM
          </div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: C.textPrimary, marginBottom: '4px' }}>
            Memory Practice Queue
          </h2>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: C.textSecondary }}>
            <span style={{ color: dueProblems.length > 0 ? C.hard : C.easy }}>{stats.dueNow}</span>
            {' due now \xB7 '}
            <span style={{ color: C.accent }}>{stats.dueWeek}</span>
            {' this week \xB7 '}
            <span style={{ color: C.textMuted }}>{stats.total}</span>
            {' total tracked'}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="srs-tab-list">
          <Tab active={activeTab === 'queue'}  onClick={() => setActiveTab('queue')}>Queue</Tab>
          <Tab active={activeTab === 'curves'} onClick={() => setActiveTab('curves')}>Curves</Tab>
          <Tab active={activeTab === 'memory'} onClick={() => setActiveTab('memory')}>Memory</Tab>
        </div>
      </div>

      {/* Body */}
      <div className="srs-body" style={{ padding: '24px 26px' }}>

        {/* ── QUEUE TAB ──────────────────────────────────────── */}
        {activeTab === 'queue' && (
          <>
            {dueProblems.length === 0 ? (
              <div style={{
                padding: '40px', textAlign: 'center',
                background: C.easyLight, border: `1px solid ${C.easyBorder}`,
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>✓</div>
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: C.easy, marginBottom: '6px' }}>
                  Queue clear!
                </div>
                <div style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.6 }}>
                  All caught up for now.
                  {stats.dueWeek > 0 && ` ${stats.dueWeek} cards coming up this week.`}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dueProblems.slice(0, 5).map(s => (
                  <ReviewCard
                    key={s.slug}
                    nowMs={nowMs}
                    state={s}
                    onRate={handleRate}
                    onSkip={handleSkip}
                  />
                ))}
                {dueProblems.length > 5 && (
                  <div style={{
                    padding: '12px 16px', textAlign: 'center',
                    background: C.surface2, border: `1px solid ${C.border}`,
                    borderRadius: '10px', fontSize: '12px', color: C.textMuted,
                    fontFamily: 'DM Mono, monospace',
                  }}>
                    +{dueProblems.length - 5} more due
                  </div>
                )}
              </div>
            )}
            <UpcomingStrip nowMs={nowMs} states={states} />
          </>
        )}

        {/* ── CURVES TAB ─────────────────────────────────────── */}
        {activeTab === 'curves' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '10px', color: C.textMuted, textTransform: 'uppercase',
                letterSpacing: '0.12em', fontFamily: 'DM Mono, monospace', marginBottom: '8px',
              }}>
                Select Problem
              </div>
              <select
                className="srs-select"
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                style={{
                  padding: '10px 12px', background: C.surface2,
                  border: `1px solid ${C.border}`, borderRadius: '10px',
                  color: C.textPrimary, fontFamily: 'DM Mono, monospace',
                  fontSize: '13px', minWidth: '280px', cursor: 'pointer',
                }}
              >
                {trackedSlugs.map(slug => (
                  <option key={slug} value={slug}>{states[slug]?.title ?? slug}</option>
                ))}
              </select>
            </div>

            {selectedState && (
              <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px' }}>
                <ForgetCurve nowMs={nowMs} state={selectedState} />
              </div>
            )}
          </>
        )}

        {/* ── MEMORY TAB ─────────────────────────────────────── */}
        {activeTab === 'memory' && (
          <>
            <div style={{
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '20px', marginBottom: '20px',
            }}>
              <MemoryHealthScore score={memoryHealth} />
            </div>

            {topicBreakdown.length > 0 && (
              <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{
                  fontSize: '10px', color: C.textMuted, textTransform: 'uppercase',
                  letterSpacing: '0.12em', fontFamily: 'DM Mono, monospace', marginBottom: '16px',
                }}>
                  Retention by Topic
                </div>
                <TopicRetentionBars breakdown={topicBreakdown} />
              </div>
            )}

            {/* Most forgotten */}
            {topicBreakdown.filter(t => t.avgRetention < 50).length > 0 && (
              <div style={{
                background: C.hardLight, border: `1px solid ${C.hardBorder}`,
                borderRadius: '12px', padding: '16px 20px',
              }}>
                <div style={{
                  fontSize: '10px', color: C.hard, textTransform: 'uppercase',
                  letterSpacing: '0.12em', fontFamily: 'DM Mono, monospace', marginBottom: '10px',
                }}>
                  Most Forgotten
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {topicBreakdown
                    .filter(t => t.avgRetention < 50)
                    .slice(0, 3)
                    .map(t => (
                      <div key={t.topic} style={{
                        padding: '8px 14px', background: C.surface,
                        border: `1px solid ${C.hardBorder}`, borderRadius: '10px',
                      }}>
                        <div style={{ fontSize: '12px', color: C.textPrimary, marginBottom: '2px' }}>{t.topic}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: C.hard }}>{t.avgRetention}% retention</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
