'use client';

import type { Analytics } from '@/lib/analytics';
import type { LeetCodeProfile } from '@/lib/leetcode';
import { C, VERDICT_CONFIG } from './theme';
import { Card, Chip, Label, ScoreBar, StatBlock } from './ui';

export default function OverviewSection({
  profile,
  analytics,
}: {
  profile: LeetCodeProfile;
  analytics: Analytics;
}) {
  const verdictStyle = VERDICT_CONFIG[analytics.verdictLabel] ?? VERDICT_CONFIG['Keep Building'];
  const confidenceTone =
    analytics.readinessConfidence === 'high'
      ? 'success'
      : analytics.readinessConfidence === 'medium'
        ? 'warning'
        : 'danger';

  return (
    <Card delay={70} className="dashboard-section" style={{ padding: '28px', marginBottom: '16px' }}>
      <div className="dashboard-verdict-banner">
        <div>
          <Label text="Interview Readiness" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 'clamp(56px, 9vw, 82px)',
              lineHeight: 0.9,
              color: verdictStyle.color,
              textShadow: verdictStyle.glow,
            }}>
              {analytics.interviewReadiness}
            </div>
            <div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Chip text={analytics.verdictLabel} tone={analytics.interviewReadiness >= 70 ? 'success' : analytics.interviewReadiness >= 40 ? 'accent' : 'danger'} />
                <Chip text={`${analytics.readinessConfidence} confidence`} tone={confidenceTone} />
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', color: C.textMuted, fontSize: '11px', marginTop: '7px' }}>
                score out of 100
              </div>
            </div>
          </div>
          <p style={{ color: C.textSecondary, fontSize: '14px', lineHeight: 1.7, maxWidth: '620px' }}>
            {analytics.verdictStory}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
        }}>
          <StatBlock label="Best match" value={`${analytics.bestCompanyMatch} ${analytics.bestCompanyScore}%`} />
          <StatBlock label="Acceptance" value={`${profile.acceptanceRate}%`} />
          <StatBlock label="Hard share" value={`${analytics.hardAttemptRate}%`} />
          <StatBlock label="Recent acceptance" value={`${analytics.recentAcceptanceRate}%`} />
        </div>
      </div>

      <div style={{
        marginTop: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
      }}>
        {analytics.readinessBreakdown.slice(0, 3).map((item) => (
          <div key={item.label} style={{ padding: '16px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px' }}>
            <ScoreBar label={item.label} score={item.score} max={item.max} note={item.note} />
          </div>
        ))}
      </div>
    </Card>
  );
}
