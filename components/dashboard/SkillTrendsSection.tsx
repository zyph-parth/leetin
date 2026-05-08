'use client';

import type { Analytics } from '@/lib/analytics';
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { C, tooltipStyle } from './theme';
import { Card, Chip, Label } from './ui';

export default function SkillTrendsSection({ analytics }: { analytics: Analytics }) {
  const radarData = analytics.deepDiveTopics.slice(0, 6).map((topic) => ({
    topic: topic.topic.length > 12 ? `${topic.topic.slice(0, 12)}...` : topic.topic,
    value: topic.solvedCount,
  }));

  const velocityColor =
    analytics.solveVelocityTrend === 'increasing' ? C.easy :
    analytics.solveVelocityTrend === 'decreasing' ? C.hard : C.accent;
  const velocityIcon =
    analytics.solveVelocityTrend === 'increasing' ? 'up' :
    analytics.solveVelocityTrend === 'decreasing' ? 'down' : 'steady';

  return (
    <>
      <div className="dashboard-two-col-grid" style={{ marginBottom: '16px' }}>
        {radarData.length > 0 && (
          <Card delay={400} style={{ padding: '24px' }}>
            <Label text="Topic Radar" />
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', marginBottom: '4px', color: C.textPrimary }}>
              Core focus areas
            </h2>
            <p style={{ fontSize: '12px', color: C.textMuted, marginBottom: '14px' }}>
              Problems solved in the current deep-dive topics
            </p>
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
              {analytics.strengthTopics.slice(0, 6).map((topic) => (
                <Chip key={topic.name} text={`${topic.name} x${topic.count}`} tone="success" />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: C.hard, fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', marginBottom: '8px' }}>
              FOCUS AREAS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {analytics.weakTopics.length > 0
                ? analytics.weakTopics.map((topic) => <Chip key={topic.name} text={topic.name} tone="danger" />)
                : <span style={{ fontSize: '12px', color: C.textMuted }}>Great coverage across major topics.</span>
              }
            </div>
          </div>
          <div style={{
            marginTop: '20px',
            padding: '10px 14px',
            background: C.surface2,
            borderRadius: '8px',
            border: `1px solid ${C.border}`,
            fontFamily: 'DM Mono, monospace',
            fontSize: '12px',
            color: C.textSecondary,
          }}>
            Topic diversity: {analytics.topicDiversity}% | {analytics.difficultyRatio}
          </div>
        </Card>
      </div>

      <div className="dashboard-two-col-grid" style={{ marginBottom: '16px' }}>
        <Card delay={490} style={{ padding: '24px' }}>
          <Label text="Burnout Risk" />
          <div style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '34px',
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
              <Label text="Submission Velocity" />
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: C.textPrimary }}>
                12-week trend
              </h2>
            </div>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: velocityColor }}>
              {velocityIcon} / {analytics.solveVelocityTrend}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: C.textMuted, marginBottom: '18px' }}>
            {analytics.weeklySubmissionsAvg} submissions per week on average
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
    </>
  );
}
