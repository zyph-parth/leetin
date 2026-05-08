'use client';

import type { Analytics } from '@/lib/analytics';
import { C } from './theme';
import { Card, Chip, Label, SectionHeader } from './ui';

export default function CompanyReadinessSection({ analytics }: { analytics: Analytics }) {
  return (
    <Card delay={570} style={{ padding: '26px', marginBottom: '16px' }}>
      <SectionHeader
        eyebrow="Company Readiness"
        title="Company fit by topic coverage"
        description="Scores compare solved topic families against each company's common interview patterns."
      />

      <div className="dashboard-company-grid">
        {analytics.companyReadiness.map((company) => {
          const isBest = company.company === analytics.bestCompanyMatch;
          const missing = company.missingTopics ?? [];
          const prepSignals = company.prepSignals ?? [];
          const scoreColor = company.readinessScore >= 75 ? C.easy : company.readinessScore >= 50 ? C.accent : C.hard;

          return (
            <div
              key={company.company}
              title={company.scoreBasis}
              style={{
                background: C.surface2,
                border: `1px solid ${isBest ? C.accentBorder : C.border}`,
                borderRadius: '12px',
                padding: '18px',
                boxShadow: isBest ? 'var(--glow-accent)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '9px',
                  background: isBest ? C.accentLight : C.surface3,
                  border: `1px solid ${isBest ? C.accentBorder : C.border}`,
                  color: isBest ? C.accent : C.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '11px',
                }}>
                  {company.logo}
                </span>
                <span style={{ fontWeight: 600, fontSize: '14px', flex: 1, color: C.textPrimary }}>{company.company}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '14px', fontWeight: 700, color: scoreColor }}>
                  {company.readinessScore}%
                </span>
              </div>

              {isBest && (
                <div style={{ fontSize: '9px', color: C.accent, fontFamily: 'DM Mono, monospace', marginBottom: '8px', letterSpacing: '0.1em' }}>
                  BEST MATCH
                </div>
              )}

              <div style={{ height: '3px', background: C.surface3, borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(company.readinessScore, 100)}%`,
                  background: scoreColor,
                  borderRadius: '2px',
                  boxShadow: 'var(--glow-accent)',
                }} />
              </div>

              {company.topTopics.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <Label text="Covered" />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {company.topTopics.map((topic) => <Chip key={`${company.company}-${topic}`} text={topic} tone="success" />)}
                  </div>
                </div>
              )}

              {missing.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <Label text="Gaps" />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {missing.map((topic) => <Chip key={`${company.company}-${topic}`} text={topic} tone="danger" />)}
                  </div>
                </div>
              )}

              {prepSignals.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <Label text="Beyond LC" />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {prepSignals.slice(0, 2).map((signal) => (
                      <Chip key={`${company.company}-${signal.label}`} text={signal.label} tone="info" />
                    ))}
                  </div>
                </div>
              )}

              <p style={{ fontSize: '11px', color: C.textSecondary, lineHeight: 1.5 }}>{company.recommendation}</p>
              <p style={{ fontSize: '10px', color: C.textMuted, lineHeight: 1.45, marginTop: '8px' }}>{company.researchBasis}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
