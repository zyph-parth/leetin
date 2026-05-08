'use client';

import type { Analytics } from '@/lib/analytics';
import { C } from './theme';
import { Card, Label, ScoreBar } from './ui';

export default function ConsistencySection({ analytics }: { analytics: Analytics }) {
  return (
    <Card delay={610} style={{ padding: '26px', marginBottom: '16px' }}>
      <Label text="Consistency Score - Last 90 Days" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '22px' }}>
            <div style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: '52px',
              lineHeight: 1,
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
            { label: 'Peak Day', val: analytics.peakDay ?? 'N/A' },
            { label: 'Weekly Avg (90d)', val: `${analytics.weeklySubmissionsAvg} submissions` },
            { label: 'Daily (active days)', val: `${analytics.dailySubmissionsAvgOnActiveDays} submissions` },
          ].map(({ label, val }) => (
            <div key={label} style={{ marginBottom: '16px' }}>
              <Label text={label} />
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: C.textPrimary }}>{val}</div>
            </div>
          ))}
          <div style={{
            padding: '12px 14px',
            background: C.surface2,
            borderRadius: '8px',
            border: `1px solid ${C.border}`,
            fontSize: '13px',
            color: C.textSecondary,
            lineHeight: 1.5,
          }}>
            {analytics.progressionNote}
          </div>
        </div>
      </div>
    </Card>
  );
}
