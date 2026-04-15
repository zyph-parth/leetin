'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LeetCodeProfile } from '@/lib/leetcode';
import { computeAnalytics } from '@/lib/analytics';
import type { Analytics, TopicDeepDive } from '@/lib/analytics';
import { loadSRSData, mergeFreshProblems, saveSingleState } from '@/lib/srs-store';
import type { SM2State } from '@/lib/srs';
import {
  Area, AreaChart, CartesianGrid, PolarAngleAxis, PolarGrid,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import Heatmap from './Heatmap';
import SRSPanel from './SRSPanel';
import MockInterviewPanel from './MockInterviewPanel';

interface Props { profile: LeetCodeProfile; }

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  accent: '#8B5CF6',
  accentLight: 'rgba(139,92,246,0.12)',
  accentBorder: 'rgba(139,92,246,0.25)',
  cyan: '#06B6D4',
  cyanLight: 'rgba(6,182,212,0.12)',
  easy: '#10B981',
  easyLight: 'rgba(16,185,129,0.12)',
  easyBorder: 'rgba(16,185,129,0.25)',
  medium: '#F59E0B',
  mediumLight: 'rgba(245,158,11,0.12)',
  hard: '#F43F5E',
  hardLight: 'rgba(244,63,94,0.12)',
  hardBorder: 'rgba(244,63,94,0.25)',
  info: '#38BDF8',
  infoLight: 'rgba(56,189,248,0.12)',
  border: '#2A2A42',
  borderHover: '#3E3E5E',
  surface: '#0F0F1A',
  surface2: '#181826',
  surface3: '#222236',
  bg: '#07070C',
  textPrimary: '#EAEAF4',
  textSecondary: '#8A8AAE',
  textMuted: '#4E4E72',
};

const VERDICT_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  'Interview Ready': { color: C.easy,   bg: C.easyLight,   border: C.easyBorder,   glow: `0 0 40px rgba(16,185,129,0.2)` },
  'Almost There':   { color: C.accent,  bg: C.accentLight, border: C.accentBorder,  glow: `0 0 40px rgba(139,92,246,0.2)` },
  'On Track':       { color: C.info,    bg: C.infoLight,   border: 'rgba(56,189,248,0.25)', glow: `0 0 40px rgba(56,189,248,0.2)` },
  'Keep Building':  { color: C.textSecondary, bg: C.surface2, border: C.border,   glow: 'none' },
};

function getProblemUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

/* ─── Small shared components ───────────────────────────────── */
function Label({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '10px', color: C.textMuted, textTransform: 'uppercase',
      letterSpacing: '0.14em', fontFamily: 'DM Mono, monospace', marginBottom: '8px',
    }}>
      {text}
    </div>
  );
}

function Chip({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'info' }) {
  const palette = {
    neutral: { bg: C.surface3,    color: C.textSecondary, border: C.border },
    accent:  { bg: C.accentLight, color: C.accent,        border: C.accentBorder },
    success: { bg: C.easyLight,   color: C.easy,          border: C.easyBorder },
    danger:  { bg: C.hardLight,   color: C.hard,          border: C.hardBorder },
    info:    { bg: C.infoLight,   color: C.info,          border: 'rgba(56,189,248,0.25)' },
  }[tone];
  return (
    <span style={{
      fontSize: '11px', padding: '3px 10px',
      background: palette.bg, color: palette.color,
      borderRadius: '999px', border: `1px solid ${palette.border}`,
      fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  );
}

function ProblemLink({
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '9px',
        color: C.textPrimary,
        fontFamily: 'DM Mono, monospace',
        fontSize: '11px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function QuickJumpLink({
  href,
  label,
  meta,
}: {
  href: string;
  label: string;
  meta: string;
}) {
  return (
    <a href={href} className="dashboard-quick-link">
      <span className="dashboard-quick-label">{label}</span>
      <span className="dashboard-quick-meta">{meta}</span>
    </a>
  );
}

function Card({
  children,
  delay = 0,
  style = {},
  id,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  id?: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={`fu ${className}`.trim()}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        animationDelay: `${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ScoreBar({ label, score, max, note }: { label: string; score: number; max: number; note?: string }) {
  const pct = max > 0 ? Math.min((score / max) * 100, 100) : 0;
  const color = pct >= 70 ? C.easy : pct >= 40 ? C.accent : C.hard;
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: C.textSecondary }}>{label}</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color }}>{score}/{max}</span>
      </div>
      <div style={{ height: '4px', background: C.surface3, borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}99)`,
          borderRadius: '2px', transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>
      {note && <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace' }}>{note}</div>}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '14px', background: C.surface2, borderRadius: '10px', border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace', marginBottom: '6px', letterSpacing: '0.1em' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: C.textPrimary }}>{value}</div>
    </div>
  );
}

function DeepDivePanel({ deepDive }: { deepDive: TopicDeepDive }) {
  return (
    <div className="dashboard-deep-dive-grid">
      {/* Left */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' }}>
        <Label text="Readiness Snapshot" />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{
            fontFamily: 'DM Serif Display, serif', fontSize: '44px',
            color: deepDive.readinessScore >= 70 ? C.easy : deepDive.readinessScore >= 45 ? C.accent : C.hard,
            lineHeight: 1,
          }}>
            {deepDive.readinessScore}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: C.textMuted }}>topic readiness</div>
          <Chip text={deepDive.level} />
        </div>
        <p style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.65, marginBottom: '16px' }}>
          {deepDive.summary}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <StatBlock label="Solved" value={String(deepDive.solvedCount)} />
          <StatBlock label="Retention" value={deepDive.retentionScore !== null ? `${deepDive.retentionScore}%` : 'N/A'} />
          <StatBlock label="Due now" value={String(deepDive.dueCount)} />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <Label text="Weak Subpatterns" />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {deepDive.weakSubpatterns.map((s) => <Chip key={`${deepDive.topic}-w-${s}`} text={s} tone="danger" />)}
          </div>
        </div>
        <div>
          <Label text="Strong Signals" />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {deepDive.strongSignals.map((s) => <Chip key={`${deepDive.topic}-s-${s}`} text={s} tone="success" />)}
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' }}>
        <Label text="Recommended Next Problems" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {deepDive.recommendedProblems.map((p) => (
            <div key={p.slug} style={{ padding: '14px', background: C.surface2, borderRadius: '12px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '16px', color: C.textPrimary }}>{p.title}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: C.textMuted }}>/problems/{p.slug}</div>
                </div>
                <Chip text={p.difficulty} tone={p.difficulty === 'Hard' ? 'danger' : p.difficulty === 'Medium' ? 'accent' : 'success'} />
              </div>
              <p style={{ fontSize: '12px', color: C.textSecondary, lineHeight: 1.55, marginBottom: '8px' }}>{p.reason}</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {p.subpatterns.map((sp) => <Chip key={`${p.slug}-${sp}`} text={sp} />)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                <span style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace' }}>
                  Match score {p.matchScore}%
                </span>
                <ProblemLink slug={p.slug} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: '#181826',
  border: '1px solid #2A2A42',
  borderRadius: '8px',
  fontSize: '11px',
  fontFamily: 'DM Mono, monospace',
  color: '#EAEAF4',
};

/* ─── Main Dashboard ────────────────────────────────────────── */
export default function Dashboard({ profile }: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [srsReady, setSrsReady] = useState(false);
  const [srsStates, setSrsStates] = useState<Record<string, SM2State>>({});
  const [targetCompany, setTargetCompany] = useState('Google');
  const [selectedTopic, setSelectedTopic] = useState('');

  useEffect(() => {
    const syncNow = () => setNowMs(Date.now());
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncNow();
    };

    const intervalId = window.setInterval(syncNow, 60_000);
    window.addEventListener('focus', syncNow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncNow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    setSrsReady(false);
    const stored = loadSRSData(profile.username);
    const merged = mergeFreshProblems(profile.username, stored, profile);
    setSrsStates(merged);
    setSrsReady(true);
  }, [profile]);

  const handleSrsStateChange = useCallback((updated: SM2State) => {
    setSrsStates((prev) => saveSingleState(profile.username, updated, prev));
  }, [profile.username]);

  const analytics: Analytics = useMemo(
    () => computeAnalytics(profile, { nowMs, srsStates, targetCompany }),
    [nowMs, profile, srsStates, targetCompany],
  );

  useEffect(() => {
    if (!analytics.availableCompanies.includes(targetCompany)) {
      setTargetCompany(analytics.selectedCompany);
    }
  }, [analytics.availableCompanies, analytics.selectedCompany, targetCompany]);

  useEffect(() => {
    if (!analytics.deepDiveTopics.some((t) => t.topic === selectedTopic)) {
      setSelectedTopic(analytics.deepDiveTopics[0]?.topic ?? '');
    }
  }, [analytics.deepDiveTopics, selectedTopic]);

  const selectedDeepDive = analytics.deepDiveTopics.find((t) => t.topic === selectedTopic) ?? analytics.deepDiveTopics[0];
  const verdictStyle = VERDICT_CONFIG[analytics.verdictLabel] ?? VERDICT_CONFIG['Keep Building'];

  const radarData = analytics.deepDiveTopics.slice(0, 6).map((t) => ({
    topic: t.topic.length > 12 ? `${t.topic.slice(0, 12)}…` : t.topic,
    value: t.solvedCount,
  }));

  const velocityColor =
    analytics.solveVelocityTrend === 'increasing' ? C.easy :
    analytics.solveVelocityTrend === 'decreasing' ? C.hard : C.accent;

  const velocityIcon =
    analytics.solveVelocityTrend === 'increasing' ? '↑' :
    analytics.solveVelocityTrend === 'decreasing' ? '↓' : '→';

  return (
    <div className="dashboard-shell" style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 28px 80px' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fu {
          animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
          opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .fu { animation: none !important; opacity: 1 !important; }
        }
        .dashboard-section {
          scroll-margin-top: 88px;
        }
        .dashboard-profile-card {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .dashboard-verdict-banner {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 32px;
          align-items: center;
        }
        .dashboard-quick-nav {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
          gap: 10px;
        }
        .dashboard-quick-link {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 14px 16px;
          background: ${C.surface2};
          border: 1px solid ${C.border};
          border-radius: 12px;
          text-decoration: none;
          transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
        }
        .dashboard-quick-link:hover {
          border-color: ${C.accentBorder};
          background: ${C.accentLight};
          transform: translateY(-1px);
        }
        .dashboard-quick-label {
          font-family: 'DM Serif Display', serif;
          font-size: 17px;
          color: ${C.textPrimary};
        }
        .dashboard-quick-meta {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: ${C.textMuted};
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .dashboard-deep-dive-grid {
          display: grid;
          grid-template-columns: minmax(280px, 1.1fr) minmax(280px, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) {
          .dashboard-profile-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .dashboard-profile-stats {
            width: 100%;
            justify-content: space-between;
          }
          .dashboard-deep-dive-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 720px) {
          .dashboard-shell {
            padding: 0 18px 72px !important;
          }
          .dashboard-verdict-banner {
            gap: 22px;
          }
          .dashboard-company-control {
            width: 100%;
            min-width: 0 !important;
          }
          .dashboard-footer-summary {
            text-align: left !important;
          }
        }
        @media (max-width: 560px) {
          .dashboard-quick-nav {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ── Profile header ───────────────────────────────────── */}
      <Card
        delay={0}
        className="dashboard-profile-card dashboard-section"
        style={{
          marginBottom: '20px', padding: '22px 26px',
        }}
      >
        {profile.avatar ? (
          <Image
            src={profile.avatar} alt={profile.username} width={56} height={56}
            style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: `2px solid ${C.border}`, flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: '56px', height: '56px', borderRadius: '12px',
            background: C.accentLight, border: `1px solid ${C.accentBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', color: C.accent, flexShrink: 0,
          }}>
            {(profile.realName || profile.username)[0]?.toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: C.textPrimary }}>
              {profile.realName || profile.username}
            </span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: C.textMuted }}>
              @{profile.username}
            </span>
            <Chip text={`${analytics.personalityEmoji} ${analytics.solverPersonality}`} tone="accent" />
          </div>
          <p style={{ color: C.textSecondary, fontSize: '13px', lineHeight: 1.5 }}>
            {analytics.personalityDesc}
          </p>
        </div>

        {/* Stat pills */}
        <div className="dashboard-profile-stats" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
          {[
            { label: 'Rank', val: `#${profile.ranking?.toLocaleString() ?? '—'}` },
            { label: 'Solved', val: String(profile.totalSolved ?? 0) },
            { label: 'Streak', val: `${profile.maxStreak ?? 0}d` },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: C.textMuted, letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: C.textPrimary }}>{val}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Verdict banner ───────────────────────────────────── */}
      <div
        className="fu dashboard-verdict-banner"
        style={{
          background: verdictStyle.bg,
          border: `1px solid ${verdictStyle.border}`,
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '16px',
          animationDelay: '70ms',
          boxShadow: verdictStyle.glow,
        }}
      >
        <div>
          <Label text="Interview Verdict" />
          <div style={{
            fontFamily: 'DM Serif Display, serif', fontSize: '44px',
            color: verdictStyle.color, lineHeight: 1, marginBottom: '14px',
          }}>
            {analytics.verdictLabel}
          </div>
          <p style={{ fontSize: '15px', color: C.textSecondary, lineHeight: 1.7, maxWidth: '540px' }}>
            {analytics.verdictStory}
          </p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {analytics.personalityTraits.map((t) => <Chip key={t} text={t} />)}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          {/* Big score ring */}
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: '12px' }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="58" fill="none" stroke={C.surface3} strokeWidth="8" />
              <circle
                cx="70" cy="70" r="58"
                fill="none"
                stroke={verdictStyle.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(analytics.interviewReadiness / 100) * 364.4} 364.4`}
                transform="rotate(-90 70 70)"
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${verdictStyle.color})` }}
              />
              <text x="70" y="64" textAnchor="middle" dominantBaseline="middle"
                style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', fill: verdictStyle.color }}>
                {analytics.interviewReadiness}
              </text>
              <text x="70" y="86" textAnchor="middle" dominantBaseline="middle"
                style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fill: C.textMuted }}>
                / 100
              </text>
            </svg>
          </div>
          <div style={{ fontSize: '12px', color: C.textSecondary }}>
            Closest match:{' '}
            <span style={{ fontWeight: 600, color: C.textPrimary }}>{analytics.bestCompanyMatch}</span>{' '}
            <span style={{ color: analytics.bestCompanyScore >= 75 ? C.easy : analytics.bestCompanyScore >= 50 ? C.accent : C.hard }}>
              {analytics.bestCompanyScore}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Recommendations ──────────────────────────────────── */}
      <Card delay={100} className="dashboard-section" style={{ padding: '18px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div>
            <Label text="Quick Navigation" />
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: C.textPrimary, marginBottom: '4px' }}>
              Jump straight to the part that matters
            </div>
            <p style={{ fontSize: '12px', color: C.textSecondary, lineHeight: 1.6 }}>
              This dashboard is dense by design. These shortcuts make it easier to move between recommendations, practice, and progress views.
            </p>
          </div>
        </div>
        <div className="dashboard-quick-nav">
          {[
            { href: '#recommendations', label: 'Recommendations', meta: `${analytics.recommendedProblems.length} picks` },
            { href: '#mock-interview', label: 'Mock Interview', meta: targetCompany },
            { href: '#memory-srs', label: 'Memory SRS', meta: `${Object.keys(srsStates).length} tracked` },
            { href: '#topic-deep-dive', label: 'Deep Dive', meta: `${analytics.deepDiveTopics.length} topics` },
            { href: '#readiness', label: 'Readiness', meta: `${analytics.interviewReadiness}/100` },
            { href: '#heatmap', label: 'Heatmap', meta: `${profile.totalActiveDays} active days` },
          ].map((item) => (
            <QuickJumpLink key={item.href} href={item.href} label={item.label} meta={item.meta} />
          ))}
        </div>
      </Card>

      <Card id="recommendations" delay={130} className="dashboard-section" style={{ padding: '26px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div>
            <Label text="Recommendation Engine" />
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: C.textPrimary, marginBottom: '6px' }}>
              Exact next problems to solve
            </h2>
            <p style={{ fontSize: '13px', color: C.textSecondary, maxWidth: '560px', lineHeight: 1.6 }}>
              Ranked from your weak tags, memory decay, and the company you want to optimize for.
            </p>
          </div>
          <div className="dashboard-company-control" style={{ minWidth: '200px' }}>
            <Label text="Target Company" />
            <select
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px',
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: '10px', color: C.textPrimary,
                fontFamily: 'DM Mono, monospace', fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {analytics.availableCompanies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '8px', lineHeight: 1.5 }}>
              The stack re-ranks instantly for the company you are targeting.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {analytics.recommendedProblems.map((p, i) => (
            <div
              key={p.slug}
              style={{
                background: i === 0 ? C.accentLight : C.surface2,
                border: `1px solid ${i === 0 ? C.accentBorder : C.border}`,
                borderRadius: '14px', padding: '18px',
                boxShadow: i === 0 ? `0 0 20px rgba(139,92,246,0.1)` : 'none',
              }}
            >
              {i === 0 && (
                <div style={{ fontSize: '9px', fontFamily: 'DM Mono, monospace', color: C.accent, letterSpacing: '0.12em', marginBottom: '8px' }}>
                  ★ TOP PICK
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '17px', color: C.textPrimary }}>{p.title}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: C.textMuted }}>/problems/{p.slug}</div>
                </div>
                <Chip text={p.difficulty} tone={p.difficulty === 'Hard' ? 'danger' : p.difficulty === 'Medium' ? 'accent' : 'success'} />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <Chip text={p.primaryTopic} tone="accent" />
                {p.companies.slice(0, 2).map((co) => <Chip key={`${p.slug}-${co}`} text={co} />)}
              </div>
              <p style={{ fontSize: '12px', color: C.textSecondary, lineHeight: 1.55, marginBottom: '8px' }}>{p.reason}</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {p.subpatterns.map((sp) => <Chip key={`${p.slug}-${sp}`} text={sp} />)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                <span style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace' }}>
                  Match score {p.matchScore}%
                </span>
                <ProblemLink slug={p.slug} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Mock Interview ───────────────────────────────────── */}
      <div id="mock-interview" className="fu dashboard-section" style={{ animationDelay: '160ms', marginBottom: '16px' }}>
        <MockInterviewPanel
          analytics={analytics}
          srsStates={srsStates}
          username={profile.username}
          targetCompany={targetCompany}
        />
      </div>

      {/* ── SRS Panel ────────────────────────────────────────── */}
      <div id="memory-srs" className="fu dashboard-section" style={{ animationDelay: '190ms', marginBottom: '16px' }}>
        <SRSPanel
          profile={profile}
          states={srsStates}
          nowMs={nowMs}
          ready={srsReady}
          onStateChange={handleSrsStateChange}
        />
      </div>

      {/* ── Topic Deep Dive ──────────────────────────────────── */}
      <Card id="topic-deep-dive" delay={250} className="dashboard-section" style={{ padding: '26px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div>
            <Label text="Topic Deep Dive" />
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: C.textPrimary, marginBottom: '6px' }}>
              Separate views for your most important patterns
            </h2>
            <p style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.6 }}>
              Each topic combines readiness, weak subpatterns, memory health, and exact follow-up problems.
            </p>
          </div>
          {selectedDeepDive && (
            <div style={{ background: C.accentLight, border: `1px solid ${C.accentBorder}`, borderRadius: '12px', padding: '14px 18px' }}>
              <Label text="Current Topic" />
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: C.accent }}>{selectedDeepDive.topic}</div>
              <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '3px' }}>{selectedDeepDive.solvedCount} solved</div>
            </div>
          )}
        </div>

        {/* Topic tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {analytics.deepDiveTopics.map((t) => {
            const active = t.topic === selectedDeepDive?.topic;
            return (
              <button
                key={t.topic}
                onClick={() => setSelectedTopic(t.topic)}
                style={{
                  padding: '7px 14px', borderRadius: '999px',
                  border: `1px solid ${active ? C.accentBorder : C.border}`,
                  background: active ? C.accentLight : 'transparent',
                  color: active ? C.accent : C.textSecondary,
                  cursor: 'pointer', fontSize: '12px',
                  fontFamily: 'DM Mono, monospace',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.topic}
              </button>
            );
          })}
        </div>

        {selectedDeepDive && <DeepDivePanel deepDive={selectedDeepDive} />}
      </Card>

      {/* ── Gaps + Readiness ─────────────────────────────────── */}
      <div id="readiness" className="dashboard-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <Card delay={310} style={{ padding: '24px' }}>
          <Label text="Top Gaps" />
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', marginBottom: '18px', color: C.textPrimary }}>
            What is still holding you back
          </h2>
          {analytics.gaps.length > 0 ? (
            analytics.gaps.map((gap) => (
              <div
                key={gap.label}
                style={{
                  display: 'flex', gap: '12px', padding: '12px 14px',
                  background: gap.priority === 'critical' ? C.hardLight : gap.priority === 'high' ? C.accentLight : C.surface2,
                  border: `1px solid ${gap.priority === 'critical' ? C.hardBorder : gap.priority === 'high' ? C.accentBorder : C.border}`,
                  borderRadius: '10px', marginBottom: '8px',
                }}
              >
                <span style={{ fontSize: '14px', color: gap.priority === 'critical' ? C.hard : gap.priority === 'high' ? C.accent : C.textSecondary, flexShrink: 0 }}>
                  {gap.priority === 'critical' ? '⚠' : gap.priority === 'high' ? '◆' : '◇'}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: C.textPrimary, marginBottom: '3px' }}>{gap.label}</div>
                  <div style={{ fontSize: '12px', color: C.textSecondary, lineHeight: 1.5 }}>{gap.detail}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '14px', color: C.easy, fontFamily: 'DM Mono, monospace' }}>
              ✓ No critical gaps — strong profile.
            </div>
          )}
        </Card>

        <Card delay={350} style={{ padding: '24px' }}>
          <Label text="Readiness Score" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '22px' }}>
            <div style={{
              fontFamily: 'DM Serif Display, serif', fontSize: '52px',
              color: analytics.interviewReadiness >= 70 ? C.easy : analytics.interviewReadiness >= 40 ? C.accent : C.hard,
              lineHeight: 1,
            }}>
              {analytics.interviewReadiness}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '14px', color: C.textMuted }}>/100</div>
          </div>
          {analytics.readinessBreakdown.map((item) => (
            <ScoreBar key={item.label} label={item.label} score={item.score} max={item.max} note={item.note} />
          ))}
        </Card>
      </div>

      {/* ── Radar + Skills ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {radarData.length > 0 && (
          <Card delay={400} style={{ padding: '24px' }}>
            <Label text="Topic Radar" />
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', marginBottom: '4px', color: C.textPrimary }}>Core focus areas</h2>
            <p style={{ fontSize: '12px', color: C.textMuted, marginBottom: '14px' }}>Problems solved in your current deep-dive topics</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fill: C.textSecondary, fontFamily: 'DM Mono' }} />
                <Radar dataKey="value" stroke={C.accent} fill={C.accent} fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Card delay={440} style={{ padding: '24px' }}>
          <Label text="Skills Profile" />
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', marginBottom: '20px', color: C.textPrimary }}>
            Strengths versus focus
          </h2>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', color: C.easy, fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', marginBottom: '8px' }}>
              STRENGTHS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {analytics.strengthTopics.slice(0, 6).map((t) => (
                <Chip key={t.name} text={`${t.name} ×${t.count}`} tone="success" />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: C.hard, fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', marginBottom: '8px' }}>
              FOCUS AREAS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {analytics.weakTopics.length > 0
                ? analytics.weakTopics.map((t) => <Chip key={t.name} text={t.name} tone="danger" />)
                : <span style={{ fontSize: '12px', color: C.textMuted }}>Great coverage across all major topics.</span>
              }
            </div>
          </div>
          <div style={{
            marginTop: '20px', padding: '10px 14px',
            background: C.surface2, borderRadius: '8px', border: `1px solid ${C.border}`,
            fontFamily: 'DM Mono, monospace', fontSize: '12px', color: C.textSecondary,
          }}>
            Topic diversity: {analytics.topicDiversity}% | {analytics.difficultyRatio}
          </div>
        </Card>
      </div>

      {/* ── Burnout + Velocity ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <Card delay={490} style={{ padding: '24px' }}>
          <Label text="Burnout Risk" />
          <div style={{
            fontFamily: 'DM Serif Display, serif', fontSize: '34px',
            color: analytics.burnoutRisk === 'low' ? C.easy : analytics.burnoutRisk === 'medium' ? C.medium : C.hard,
            marginBottom: '10px',
          }}>
            {analytics.burnoutRisk.toUpperCase()}
          </div>
          <p style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.65 }}>{analytics.burnoutNote}</p>
        </Card>

        <Card delay={530} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4px' }}>
            <div>
              <Label text="Solve Velocity" />
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: C.textPrimary }}>12-week trend</h2>
            </div>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px', color: velocityColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '16px' }}>{velocityIcon}</span>
              {analytics.solveVelocityTrend}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: C.textMuted, marginBottom: '18px' }}>
            {analytics.weeklyAvg} problems per week on average
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={analytics.weeklyData}>
              <defs>
                <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: C.textMuted, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: C.textMuted, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={22} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: C.border }} />
              <Area type="monotone" dataKey="count" stroke={C.accent} fill="url(#velGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Company Readiness ────────────────────────────────── */}
      <Card delay={570} style={{ padding: '26px', marginBottom: '16px' }}>
        <div style={{ marginBottom: '18px' }}>
          <Label text="Company Readiness" />
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: C.textPrimary }}>
            How ready are you for target companies?
          </h2>
          <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>
            Based on your solved topics versus each company&apos;s common interview patterns
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {analytics.companyReadiness.map((co) => {
            const isBest = co.company === analytics.bestCompanyMatch;
            const missing = co.missingTopics ?? [];
            const scoreColor = co.readinessScore >= 75 ? C.easy : co.readinessScore >= 50 ? C.accent : C.hard;
            return (
              <div
                key={co.company}
                style={{
                  background: C.surface2,
                  border: `1px solid ${isBest ? C.accentBorder : C.border}`,
                  borderRadius: '12px', padding: '18px',
                  boxShadow: isBest ? `0 0 20px rgba(139,92,246,0.15)` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{co.logo}</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', flex: 1, color: C.textPrimary }}>{co.company}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '14px', fontWeight: 700, color: scoreColor }}>
                    {co.readinessScore}%
                  </span>
                </div>
                {isBest && (
                  <div style={{ fontSize: '9px', color: C.accent, fontFamily: 'DM Mono, monospace', marginBottom: '8px', letterSpacing: '0.1em' }}>
                    ★ BEST MATCH
                  </div>
                )}
                <div style={{ height: '3px', background: C.surface3, borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(co.readinessScore, 100)}%`,
                    background: scoreColor, borderRadius: '2px',
                    boxShadow: `0 0 6px ${scoreColor}66`,
                  }} />
                </div>
                {missing.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '9px', color: C.textMuted, fontFamily: 'DM Mono, monospace', marginBottom: '4px', letterSpacing: '0.1em' }}>GAPS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {missing.map((t) => <Chip key={`${co.company}-${t}`} text={t} tone="danger" />)}
                    </div>
                  </div>
                )}
                <p style={{ fontSize: '11px', color: C.textSecondary, lineHeight: 1.5 }}>{co.recommendation}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Consistency ──────────────────────────────────────── */}
      <Card delay={610} style={{ padding: '26px', marginBottom: '16px' }}>
        <Label text="Consistency Score — Last 90 Days" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '22px' }}>
              <div style={{
                fontFamily: 'DM Serif Display, serif', fontSize: '52px', lineHeight: 1,
                color: analytics.consistencyScore >= 60 ? C.easy : analytics.consistencyScore >= 30 ? C.accent : C.hard,
              }}>
                {analytics.consistencyScore}
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '14px', color: C.textMuted }}>/100</div>
            </div>
            {analytics.consistencyBreakdown.map((item) => (
              <ScoreBar key={item.label} label={item.label} score={item.score} max={item.max} />
            ))}
          </div>
          <div>
            {[
              { label: 'Peak Day', val: analytics.peakDay ?? '—' },
              { label: 'Weekly Avg (90d)', val: `${analytics.weeklyAvg} problems` },
              { label: 'Daily (active days)', val: `${analytics.dailyAvgOnActiveDays} problems` },
            ].map(({ label, val }) => (
              <div key={label} style={{ marginBottom: '16px' }}>
                <Label text={label} />
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: C.textPrimary }}>{val}</div>
              </div>
            ))}
            <div style={{ padding: '12px 14px', background: C.surface2, borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '13px', color: C.textSecondary, lineHeight: 1.5 }}>
              {analytics.progressionNote}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Heatmap ──────────────────────────────────────────── */}
      <Card id="heatmap" delay={650} className="dashboard-section" style={{ padding: '26px', marginBottom: '16px' }}>
        <Label text="Activity Heatmap" />
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', marginBottom: '4px', color: C.textPrimary }}>
          Year in practice
        </h2>
        <p style={{ fontSize: '12px', color: C.textMuted, marginBottom: '18px' }}>
          {profile.totalActiveDays} total active days | Max streak {profile.maxStreak}d
        </p>
        <Heatmap data={profile.submissionCalendar ?? {}} />
      </Card>

      {/* ── Footer stats ─────────────────────────────────────── */}
      <Card
        delay={690}
        className="dashboard-section"
        style={{
          padding: '22px 26px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
          background: `linear-gradient(135deg, ${C.accentLight}, ${C.cyanLight})`,
          border: `1px solid ${C.accentBorder}`,
        }}
      >
        <div>
          <Label text="Estimated time to interview ready" />
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: C.textPrimary }}>
            {(analytics.estimatedWeeksToReady ?? 999) > 50 ? '50+ weeks' : `~${analytics.estimatedWeeksToReady} weeks`}
          </div>
          <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '4px' }}>
            At {analytics.weeklyAvg} problems/week toward a 400-problem benchmark
          </div>
        </div>
        <div className="dashboard-footer-summary" style={{ textAlign: 'right' }}>
          <Label text="Topic Diversity" />
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: C.textPrimary }}>{analytics.topicDiversity}%</div>
          <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '4px' }}>of 30 key areas covered</div>
        </div>
      </Card>
    </div>
  );
}
