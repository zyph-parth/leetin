'use client';

import type { Analytics, TopicDeepDive } from '@/lib/analytics';
import { C } from './theme';
import { Card, Chip, Label, ProblemLink, SectionHeader, StatBlock } from './ui';

function DeepDivePanel({ deepDive }: { deepDive: TopicDeepDive }) {
  return (
    <div className="dashboard-deep-dive-grid">
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' }}>
        <Label text="Readiness Snapshot" />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '44px',
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
            {deepDive.weakSubpatterns.map((subpattern) => (
              <Chip key={`${deepDive.topic}-weak-${subpattern}`} text={subpattern} tone="danger" />
            ))}
          </div>
        </div>

        <div>
          <Label text="Strong Signals" />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {deepDive.strongSignals.map((signal) => (
              <Chip key={`${deepDive.topic}-signal-${signal}`} text={signal} tone="success" />
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' }}>
        <Label text="Recommended Next Problems" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {deepDive.recommendedProblems.map((problem) => (
            <div key={problem.slug} style={{ padding: '14px', background: C.surface2, borderRadius: '12px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '16px', color: C.textPrimary }}>
                    {problem.title}
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: C.textMuted }}>
                    /problems/{problem.slug}
                  </div>
                </div>
                <Chip
                  text={problem.difficulty}
                  tone={problem.difficulty === 'Hard' ? 'danger' : problem.difficulty === 'Medium' ? 'warning' : 'success'}
                />
              </div>
              <p style={{ fontSize: '12px', color: C.textSecondary, lineHeight: 1.55, marginBottom: '8px' }}>
                {problem.reason || `It reinforces ${problem.primaryTopic}.`}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {problem.subpatterns.map((subpattern) => (
                  <Chip key={`${problem.slug}-${subpattern}`} text={subpattern} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                <span style={{ fontSize: '10px', color: C.textMuted, fontFamily: 'DM Mono, monospace' }}>
                  Match score {problem.matchScore}
                </span>
                <ProblemLink slug={problem.slug} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TopicDeepDiveSection({
  analytics,
  selectedTopic,
  onSelectedTopicChange,
}: {
  analytics: Analytics;
  selectedTopic: string;
  onSelectedTopicChange: (topic: string) => void;
}) {
  const selectedDeepDive = analytics.deepDiveTopics.find((topic) => topic.topic === selectedTopic)
    ?? analytics.deepDiveTopics[0];

  return (
    <Card id="topic-deep-dive" delay={250} className="dashboard-section" style={{ padding: '26px', marginBottom: '16px' }}>
      <SectionHeader
        eyebrow="Topic Deep Dive"
        title="Pattern-level decisions, not generic practice"
        description="Each topic combines readiness, weak subpatterns, memory health, and follow-up problems."
        aside={selectedDeepDive && (
          <div style={{ background: C.accentLight, border: `1px solid ${C.accentBorder}`, borderRadius: '12px', padding: '14px 18px' }}>
            <Label text="Current Topic" />
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: C.accent }}>
              {selectedDeepDive.topic}
            </div>
            <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '3px' }}>
              {selectedDeepDive.solvedCount} solved
            </div>
          </div>
        )}
      />

      {analytics.deepDiveTopics.length > 0 ? (
        <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {analytics.deepDiveTopics.map((topic) => {
              const active = topic.topic === selectedDeepDive?.topic;
              return (
                <button
                  key={topic.topic}
                  onClick={() => onSelectedTopicChange(topic.topic)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '999px',
                    border: `1px solid ${active ? C.accentBorder : C.border}`,
                    background: active ? C.accentLight : 'transparent',
                    color: active ? C.accent : C.textSecondary,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontFamily: 'DM Mono, monospace',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {topic.topic}
                </button>
              );
            })}
          </div>
          {selectedDeepDive && <DeepDivePanel deepDive={selectedDeepDive} />}
        </>
      ) : (
        <div style={{ padding: '22px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', color: C.textSecondary }}>
          Solve data is too sparse for a topic breakdown yet.
        </div>
      )}
    </Card>
  );
}
