'use client';

import Image from 'next/image';
import type { Analytics } from '@/lib/analytics';
import type { LeetCodeProfile } from '@/lib/leetcode';
import { C } from './theme';
import { Card, Chip } from './ui';

export default function ProfileHeader({
  profile,
  analytics,
}: {
  profile: LeetCodeProfile;
  analytics: Analytics;
}) {
  const displayName = profile.realName || profile.username;

  return (
    <Card
      id="overview"
      delay={0}
      className="dashboard-profile-card dashboard-section"
      style={{ marginBottom: '16px', padding: '22px 26px' }}
    >
      {profile.avatar ? (
        <Image
          src={profile.avatar}
          alt={profile.username}
          width={58}
          height={58}
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '14px',
            objectFit: 'cover',
            border: `2px solid ${C.border}`,
            flexShrink: 0,
          }}
        />
      ) : (
        <div style={{
          width: '58px',
          height: '58px',
          borderRadius: '14px',
          background: C.accentLight,
          border: `1px solid ${C.accentBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: C.accent,
          flexShrink: 0,
        }}>
          {displayName[0]?.toUpperCase()}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '25px', color: C.textPrimary }}>
            {displayName}
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

      <div className="dashboard-profile-stats">
        {[
          { label: 'Rank', val: `#${profile.ranking?.toLocaleString() ?? 'N/A'}` },
          { label: 'Solved', val: String(profile.totalSolved ?? 0) },
          { label: 'Max streak', val: `${profile.maxStreak ?? 0}d` },
        ].map(({ label, val }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: '74px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: C.textMuted, marginBottom: '4px', letterSpacing: '0.08em' }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '21px', color: C.textPrimary }}>
              {val}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
