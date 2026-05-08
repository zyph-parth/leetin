'use client';

import type { Analytics } from '@/lib/analytics';
import { C } from './theme';
import { Card, Chip, Label, ScoreBar } from './ui';

export default function ReadinessSection({ analytics }: { analytics: Analytics }) {
  return (
    <div id="readiness" className="dashboard-section dashboard-two-col-grid" style={{ marginBottom: '16px' }}>
      <Card delay={310} style={{ padding: '24px' }}>
        <Label text="Top Gaps" />
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', marginBottom: '18px', color: C.textPrimary }}>
          What still holds the profile back
        </h2>
        {analytics.gaps.length > 0 ? (
          analytics.gaps.map((gap) => (
            <div
              key={gap.label}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px 14px',
                background: gap.priority === 'critical' ? C.hardLight : gap.priority === 'high' ? C.accentLight : C.surface2,
                border: `1px solid ${gap.priority === 'critical' ? C.hardBorder : gap.priority === 'high' ? C.accentBorder : C.border}`,
                borderRadius: '10px',
                marginBottom: '8px',
              }}
            >
              <span style={{
                fontSize: '14px',
                color: gap.priority === 'critical' ? C.hard : gap.priority === 'high' ? C.accent : C.textSecondary,
                flexShrink: 0,
                fontFamily: 'DM Mono, monospace',
              }}>
                {gap.priority === 'critical' ? '!' : gap.priority === 'high' ? '>' : '-'}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: C.textPrimary, marginBottom: '3px' }}>{gap.label}</div>
                <div style={{ fontSize: '12px', color: C.textSecondary, lineHeight: 1.5 }}>{gap.detail}</div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: '14px', color: C.easy, fontFamily: 'DM Mono, monospace' }}>
            No critical gaps found in the current profile.
          </div>
        )}
      </Card>

      <Card delay={350} style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Label text="Readiness Score" />
          <Chip
            text={`${analytics.readinessConfidence} confidence`}
            tone={analytics.readinessConfidence === 'high' ? 'success' : analytics.readinessConfidence === 'medium' ? 'warning' : 'danger'}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '22px' }}>
          <div style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '52px',
            color: analytics.interviewReadiness >= 70 ? C.easy : analytics.interviewReadiness >= 40 ? C.accent : C.hard,
            lineHeight: 1,
          }}>
            {analytics.interviewReadiness}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '14px', color: C.textMuted }}>/100</div>
        </div>
        <p style={{ margin: '-12px 0 18px', fontSize: '12px', lineHeight: 1.5, color: C.textSecondary }}>
          {analytics.readinessConfidenceNote}
        </p>
        {analytics.readinessBreakdown.map((item) => (
          <ScoreBar key={item.label} label={item.label} score={item.score} max={item.max} note={item.note} />
        ))}
      </Card>
    </div>
  );
}
