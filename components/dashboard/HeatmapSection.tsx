'use client';

import type { LeetCodeProfile } from '@/lib/leetcode';
import Heatmap from '../Heatmap';
import { C } from './theme';
import { Card, Label } from './ui';

export default function HeatmapSection({ profile }: { profile: LeetCodeProfile }) {
  return (
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
  );
}
