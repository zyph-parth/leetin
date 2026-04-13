'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Analytics } from '@/lib/analytics';
import type { SM2State } from '@/lib/srs';
import {
  MockInterview, InterviewDuration,
  generateMockInterview, loadSession, saveSession, clearSession,
  getElapsedMs, getRemainingMs, formatTime,
} from '@/lib/mock-interview';

/* ─── Design tokens ──────────────────────────────────────────── */
const C = {
  accent: '#8B5CF6',
  accentLight: 'rgba(139,92,246,0.12)',
  accentBorder: 'rgba(139,92,246,0.25)',
  cyan: '#06B6D4',
  cyanLight: 'rgba(6,182,212,0.1)',
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

const DIFF: Record<string, { color: string; bg: string; border: string; label: string }> = {
  Easy:   { color: C.easy,   bg: C.easyLight,   border: C.easyBorder,   label: 'Easy'   },
  Medium: { color: C.medium, bg: C.mediumLight,  border: C.mediumBorder, label: 'Medium' },
  Hard:   { color: C.hard,   bg: C.hardLight,    border: C.hardBorder,   label: 'Hard'   },
};

const DURATIONS: { value: InterviewDuration; label: string; desc: string }[] = [
  { value: 45, label: '45 min', desc: 'Fast track' },
  { value: 60, label: '60 min', desc: 'Standard'  },
  { value: 90, label: '90 min', desc: 'Full loop'  },
];

/* ─── Timer ring ─────────────────────────────────────────────── */
function TimerRing({
  remainingMs, totalMs, status,
}: { remainingMs: number; totalMs: number; status: MockInterview['status'] }) {
  const pct = totalMs > 0 ? remainingMs / totalMs : 1;
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const dash = pct * circumference;

  const urgentColor = remainingMs < 5 * 60 * 1000 ? C.hard :
                      remainingMs < 15 * 60 * 1000 ? C.medium : C.accent;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {/* Track */}
      <circle cx="70" cy="70" r={r} fill="none" stroke={C.surface3} strokeWidth="6" />
      {/* Progress */}
      <circle
        cx="70" cy="70" r={r} fill="none"
        stroke={urgentColor} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 70 70)"
        style={{
          transition: status === 'running' ? 'stroke-dasharray 1s linear, stroke 0.3s' : 'stroke 0.3s',
          filter: `drop-shadow(0 0 6px ${urgentColor}99)`,
        }}
      />
      {/* Time text */}
      <text x="70" y="64" textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'DM Mono, monospace', fontSize: '24px', fill: urgentColor, fontWeight: 600 }}>
        {formatTime(remainingMs)}
      </text>
      <text x="70" y="84" textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', fill: C.textMuted, letterSpacing: '0.08em' }}>
        {status === 'paused' ? 'PAUSED' : status === 'finished' ? 'DONE' : 'REMAINING'}
      </text>
    </svg>
  );
}

/* ─── Problem row ────────────────────────────────────────────── */
function ProblemRow({
  problem, index, sessionStatus, onToggle,
}: {
  problem: MockInterview['problems'][number];
  index: number;
  sessionStatus: MockInterview['status'];
  onToggle: (index: number) => void;
}) {
  const d = DIFF[problem.difficulty] ?? DIFF['Medium'];
  const canInteract = sessionStatus === 'running' || sessionStatus === 'paused';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '14px',
      padding: '16px 18px',
      background: problem.completed ? C.easyLight : C.surface2,
      border: `1px solid ${problem.completed ? C.easyBorder : C.border}`,
      borderRadius: '12px',
      transition: 'all 0.2s ease',
      opacity: sessionStatus === 'idle' ? 0.6 : 1,
    }}>
      {/* Checkbox */}
      <button
        onClick={() => canInteract && onToggle(index)}
        disabled={!canInteract}
        style={{
          width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
          border: `1.5px solid ${problem.completed ? C.easy : C.border}`,
          background: problem.completed ? C.easy : 'transparent',
          cursor: canInteract ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s ease', marginTop: '1px',
        }}
      >
        {problem.completed && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: C.textMuted, letterSpacing: '0.1em' }}>
            Q{index + 1}
          </span>
          <span style={{
            fontFamily: 'DM Serif Display, serif', fontSize: '16px',
            color: problem.completed ? C.easy : C.textPrimary,
            textDecoration: problem.completed ? 'line-through' : 'none',
            transition: 'color 0.2s',
          }}>
            {problem.title}
          </span>
          <span style={{
            fontSize: '10px', fontFamily: 'DM Mono, monospace',
            color: d.color, background: d.bg, border: `1px solid ${d.border}`,
            borderRadius: '999px', padding: '2px 8px',
          }}>
            {d.label}
          </span>
          <span style={{
            fontSize: '10px', fontFamily: 'DM Mono, monospace',
            color: C.textMuted, background: C.surface3, border: `1px solid ${C.border}`,
            borderRadius: '999px', padding: '2px 8px',
          }}>
            {problem.topic}
          </span>
        </div>
        <p style={{ fontSize: '12px', color: C.textSecondary, lineHeight: 1.55, marginBottom: '8px' }}>
          {problem.reason}
        </p>
        {/* Open link — only when session is running/paused */}
        {canInteract && (
          <a
            href={problem.leetcodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '11px', fontFamily: 'DM Mono, monospace',
              color: C.accent, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '4px',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
          >
            Open on LeetCode ↗
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
interface MockInterviewPanelProps {
  analytics: Analytics;
  srsStates: Record<string, SM2State>;
  targetCompany: string;
}

export default function MockInterviewPanel({ analytics, srsStates, targetCompany }: MockInterviewPanelProps) {
  const [session, setSession] = useState<MockInterview | null>(null);
  const [duration, setDuration] = useState<InterviewDuration>(60);
  const [nowMs, setNowMs] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted session on mount
  useEffect(() => {
    const saved = loadSession();
    if (saved && saved.status !== 'finished') setSession(saved);
    setMounted(true);
  }, []);

  // Ticker — only runs when session is active
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (session?.status === 'running') {
      tickRef.current = setInterval(() => {
        const now = Date.now();
        setNowMs(now);
        // Auto-finish when time is up
        setSession(prev => {
          if (!prev || prev.status !== 'running') return prev;
          if (getRemainingMs(prev, now) <= 0) {
            const finished: MockInterview = { ...prev, status: 'finished', accumulatedMs: prev.durationMs };
            saveSession(finished);
            return finished;
          }
          return prev;
        });
      }, 1000);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [session?.status]);

  const updateSession = useCallback((updater: (prev: MockInterview) => MockInterview) => {
    setSession(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      saveSession(next);
      return next;
    });
  }, []);

  function handleGenerate() {
    const s = generateMockInterview(analytics, srsStates, targetCompany, duration);
    saveSession(s);
    setSession(s);
  }

  function handleStart() {
    updateSession(prev => ({ ...prev, status: 'running', startedAt: Date.now() }));
  }

  function handlePause() {
    updateSession(prev => ({
      ...prev,
      status: 'paused',
      accumulatedMs: getElapsedMs(prev),
      startedAt: null,
    }));
  }

  function handleResume() {
    updateSession(prev => ({ ...prev, status: 'running', startedAt: Date.now() }));
  }

  function handleFinish() {
    updateSession(prev => ({
      ...prev,
      status: 'finished',
      accumulatedMs: getElapsedMs(prev),
      startedAt: null,
    }));
  }

  function handleReset() {
    clearSession();
    setSession(null);
  }

  function handleToggleProblem(index: number) {
    updateSession(prev => {
      const problems = prev.problems.map((p, i) =>
        i === index
          ? { ...p, completed: !p.completed, timeSpentMs: !p.completed ? getElapsedMs(prev) : null }
          : p
      );
      return { ...prev, problems };
    });
  }

  if (!mounted) return null;

  const remaining = session ? getRemainingMs(session, nowMs) : 0;
  const completedCount = session?.problems.filter(p => p.completed).length ?? 0;
  const allDone = session ? completedCount === session.problems.length : false;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        padding: '20px 26px',
        borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.04))`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', marginBottom: '6px' }}>
            VIRTUAL MOCK INTERVIEW
          </div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: C.textPrimary, marginBottom: '4px' }}>
            Simulate a real assessment
          </h2>
          <p style={{ fontSize: '13px', color: C.textSecondary }}>
            3 problems · personalised to your weaknesses · timed
          </p>
        </div>

        {session && session.status !== 'idle' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Progress pills */}
            <span style={{
              fontSize: '11px', fontFamily: 'DM Mono, monospace',
              color: C.textMuted, background: C.surface2,
              border: `1px solid ${C.border}`, borderRadius: '999px', padding: '4px 12px',
            }}>
              {completedCount}/{session.problems.length} done
            </span>
            {/* Company pill */}
            <span style={{
              fontSize: '11px', fontFamily: 'DM Mono, monospace',
              color: C.accent, background: C.accentLight,
              border: `1px solid ${C.accentBorder}`, borderRadius: '999px', padding: '4px 12px',
            }}>
              {session.targetCompany}
            </span>
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div style={{ padding: '26px' }}>

        {/* ── Config / Generate screen ─────────────────────── */}
        {!session && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Duration picker */}
            <div>
              <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', marginBottom: '12px' }}>
                DURATION
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {DURATIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    style={{
                      flex: 1, padding: '12px 8px', borderRadius: '10px',
                      border: `1px solid ${duration === d.value ? C.accentBorder : C.border}`,
                      background: duration === d.value ? C.accentLight : C.surface2,
                      color: duration === d.value ? C.accent : C.textSecondary,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '15px', fontWeight: 600, marginBottom: '3px' }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: '10px', color: duration === d.value ? C.accent : C.textMuted, letterSpacing: '0.06em' }}>
                      {d.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* What you'll get preview */}
            <div style={{
              padding: '16px 18px', background: C.surface2,
              border: `1px solid ${C.border}`, borderRadius: '12px',
            }}>
              <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', marginBottom: '12px' }}>
                YOUR SESSION WILL INCLUDE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { diff: 'Easy',   desc: `Warm-up · ${analytics.weakTopics[0]?.name ?? 'weak topic'} or lowest-retention due problem` },
                  { diff: 'Medium', desc: `Core · ${analytics.weakTopics[0]?.name ?? 'weak topic'} mapped to ${targetCompany} patterns` },
                  { diff: 'Hard',   desc: `Stretch · highest-priority gap in your profile` },
                ].map(({ diff, desc }) => {
                  const d = DIFF[diff];
                  return (
                    <div key={diff} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '10px', fontFamily: 'DM Mono, monospace',
                        color: d.color, background: d.bg, border: `1px solid ${d.border}`,
                        borderRadius: '999px', padding: '2px 10px', flexShrink: 0,
                      }}>
                        {diff}
                      </span>
                      <span style={{ fontSize: '12px', color: C.textSecondary }}>{desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              style={{
                width: '100%', padding: '15px',
                background: `linear-gradient(135deg, ${C.accent}, #7C3AED)`,
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '14px', fontFamily: 'DM Mono, monospace', fontWeight: 500,
                cursor: 'pointer', letterSpacing: '0.04em',
                boxShadow: '0 0 24px rgba(139,92,246,0.35)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(139,92,246,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 24px rgba(139,92,246,0.35)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Generate Mock Assessment →
            </button>
          </div>
        )}

        {/* ── Active / Idle session ─────────────────────────── */}
        {session && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Timer + controls row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap',
              padding: '20px 24px', background: C.surface2,
              border: `1px solid ${C.border}`, borderRadius: '14px',
            }}>
              <TimerRing remainingMs={remaining} totalMs={session.durationMs} status={session.status} />

              <div style={{ flex: 1, minWidth: '180px' }}>
                {/* Progress bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: 'DM Mono, monospace' }}>
                      Progress
                    </span>
                    <span style={{ fontSize: '11px', color: C.accent, fontFamily: 'DM Mono, monospace' }}>
                      {completedCount} / {session.problems.length}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: C.surface3, borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(completedCount / session.problems.length) * 100}%`,
                      background: `linear-gradient(90deg, ${C.accent}, ${C.cyan})`,
                      borderRadius: '2px', transition: 'width 0.4s ease',
                      boxShadow: `0 0 8px ${C.accent}66`,
                    }} />
                  </div>
                </div>

                {/* Control buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {session.status === 'idle' && (
                    <button onClick={handleStart} style={primaryBtn}>
                      ▶ Start Timer
                    </button>
                  )}
                  {session.status === 'running' && (
                    <button onClick={handlePause} style={secondaryBtn}>
                      ⏸ Pause
                    </button>
                  )}
                  {session.status === 'paused' && (
                    <button onClick={handleResume} style={primaryBtn}>
                      ▶ Resume
                    </button>
                  )}
                  {(session.status === 'running' || session.status === 'paused') && (
                    <button onClick={handleFinish} style={secondaryBtn}>
                      ✓ Finish Early
                    </button>
                  )}
                  {session.status === 'finished' && (
                    <button onClick={handleReset} style={primaryBtn}>
                      ↺ New Session
                    </button>
                  )}
                  {session.status !== 'running' && session.status !== 'finished' && (
                    <button onClick={handleReset} style={ghostBtn}>
                      Regenerate
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Finished summary */}
            {session.status === 'finished' && (
              <div style={{
                padding: '18px 20px',
                background: allDone ? C.easyLight : C.accentLight,
                border: `1px solid ${allDone ? C.easyBorder : C.accentBorder}`,
                borderRadius: '12px',
              }}>
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: allDone ? C.easy : C.accent, marginBottom: '6px' }}>
                  {allDone ? '🎉 All problems completed!' : `${completedCount}/${session.problems.length} problems completed`}
                </div>
                <div style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.6 }}>
                  {allDone
                    ? `Excellent work. You finished all 3 problems for ${session.targetCompany} in ${formatTime(getElapsedMs(session))}.`
                    : `Time's up. ${3 - completedCount} problem${3 - completedCount !== 1 ? 's' : ''} left — review them and note the patterns you struggled with.`
                  }
                </div>
              </div>
            )}

            {/* Problem list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', marginBottom: '4px' }}>
                PROBLEMS
              </div>
              {session.problems.map((p, i) => (
                <ProblemRow
                  key={p.slug}
                  problem={p}
                  index={i}
                  sessionStatus={session.status}
                  onToggle={handleToggleProblem}
                />
              ))}
            </div>

            {/* Hint when idle */}
            {session.status === 'idle' && (
              <div style={{
                padding: '12px 16px', background: C.surface2,
                border: `1px solid ${C.border}`, borderRadius: '10px',
                fontSize: '12px', color: C.textMuted, fontFamily: 'DM Mono, monospace',
                textAlign: 'center',
              }}>
                Start the timer when you are ready to open the first problem
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Button style helpers ───────────────────────────────────── */
const primaryBtn: React.CSSProperties = {
  padding: '8px 18px',
  background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  color: 'white', border: 'none', borderRadius: '8px',
  fontSize: '12px', fontFamily: 'DM Mono, monospace',
  cursor: 'pointer', transition: 'all 0.15s ease',
  boxShadow: '0 0 12px rgba(139,92,246,0.3)',
};

const secondaryBtn: React.CSSProperties = {
  padding: '8px 18px',
  background: 'transparent',
  color: '#8A8AAE', border: '1px solid #2A2A42', borderRadius: '8px',
  fontSize: '12px', fontFamily: 'DM Mono, monospace',
  cursor: 'pointer', transition: 'all 0.15s ease',
};

const ghostBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: 'transparent',
  color: '#4E4E72', border: '1px solid #2A2A42', borderRadius: '8px',
  fontSize: '11px', fontFamily: 'DM Mono, monospace',
  cursor: 'pointer', transition: 'all 0.15s ease',
};