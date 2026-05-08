'use client';

import type { Analytics } from '@/lib/analytics';
import { C } from './theme';
import { Card, Label } from './ui';

export default function MomentumSummary({ analytics }: { analytics: Analytics }) {
  return (
    <Card
      delay={690}
      className="dashboard-section"
      style={{
        padding: '22px 26px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: `linear-gradient(135deg, ${C.accentLight}, ${C.cyanLight})`,
        border: `1px solid ${C.accentBorder}`,
      }}
    >
      <div>
        <Label text="Volume target estimate" />
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: C.textPrimary }}>
          {(analytics.estimatedWeeksToVolumeTarget ?? 999) > 50
            ? '50+ weeks'
            : `~${analytics.estimatedWeeksToVolumeTarget} weeks`}
        </div>
        <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '4px' }}>
          Based on ~{analytics.weeklyAcceptedSubmissionsEstimate} accepted submissions/week toward the 400-solved benchmark.
        </div>
      </div>
      <div className="dashboard-footer-summary" style={{ textAlign: 'right' }}>
        <Label text="Topic Diversity" />
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: C.textPrimary }}>
          {analytics.topicDiversity}%
        </div>
        <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '4px' }}>of 30 key areas covered</div>
      </div>
    </Card>
  );
}
