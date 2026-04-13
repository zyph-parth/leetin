'use client';

import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { SM2State } from '@/lib/srs';
import { getRetentionPercent } from '@/lib/srs';

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
  border: '#2A2A42',
  surface: '#0F0F1A',
  surface2: '#181826',
  surface3: '#222236',
  textPrimary: '#EAEAF4',
  textSecondary: '#8A8AAE',
  textMuted: '#4E4E72',
};

function ebbinghausRetention(daysSinceReview: number, stability: number): number {
  if (daysSinceReview <= 0) return 100;
  return Math.round(100 * Math.exp(-daysSinceReview / stability));
}

interface ForgetCurveProps {
  state: SM2State;
}

export function ForgetCurve({ state }: ForgetCurveProps) {
  const stability = state.interval > 0 ? state.interval : 1;
  const horizon = Math.max(stability * 2.5, 30);
  const points = Math.min(Math.ceil(horizon), 90);

  const data = Array.from({ length: points + 1 }, (_, i) => ({
    day: i,
    retention: Math.max(0, ebbinghausRetention(i, stability)),
    threshold: 60,
  }));

  const currentRetention = getRetentionPercent(state);
  const retentionColor = currentRetention >= 60 ? C.easy : currentRetention >= 30 ? C.accent : C.hard;

  const tooltipStyle = {
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    fontSize: '11px',
    fontFamily: 'DM Mono, monospace',
    color: C.textPrimary,
  };

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: retentionColor, lineHeight: 1 }}>
            {currentRetention}%
          </span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: C.textMuted }}>
            current retention
          </span>
        </div>
        <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '4px' }}>
          Next review in {state.interval}d · stability {stability.toFixed(1)}d
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
              <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: C.textMuted, fontFamily: 'DM Mono' }}
            axisLine={false} tickLine={false}
            label={{ value: 'Days', position: 'insideBottom', offset: -2, fontSize: 9, fill: C.textMuted, fontFamily: 'DM Mono' }}
          />
          <YAxis
            tick={{ fontSize: 9, fill: C.textMuted, fontFamily: 'DM Mono' }}
            axisLine={false} tickLine={false}
            domain={[0, 100]} width={28}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(val: number) => [`${val}%`, 'Retention']}
            labelFormatter={(day: number) => `Day ${day}`}
            cursor={{ stroke: C.border }}
          />
          <Area
            type="monotone" dataKey="retention"
            stroke={C.accent} fill="url(#curveGrad)"
            strokeWidth={2} dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TopicRetentionBarsProps {
  breakdown: { topic: string; avgRetention: number; count: number }[];
}

export function TopicRetentionBars({ breakdown }: TopicRetentionBarsProps) {
  if (!breakdown.length) return null;

  return (
    <div>
      {breakdown.map(({ topic, avgRetention, count }) => {
        const color = avgRetention >= 70 ? C.easy : avgRetention >= 40 ? C.accent : C.hard;
        return (
          <div key={topic} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '12px', color: C.textSecondary }}>{topic}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: C.textMuted }}>{count} tracked</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color, minWidth: '36px', textAlign: 'right' }}>{avgRetention}%</span>
              </div>
            </div>
            <div style={{ height: '4px', background: C.surface3, borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${avgRetention}%`,
                background: `linear-gradient(90deg, ${color}, ${color}99)`,
                borderRadius: '2px', transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                boxShadow: `0 0 6px ${color}66`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
