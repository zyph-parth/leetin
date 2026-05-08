'use client';

import { Building2, ListChecks, Target, TrendingUp } from 'lucide-react';
import type { Analytics } from '@/lib/analytics';
import { C } from './theme';
import { Card, Chip, ProblemLink, SectionHeader } from './ui';

export default function RecommendationsSection({
  analytics,
  targetCompany,
  onTargetCompanyChange,
}: {
  analytics: Analytics;
  targetCompany: string;
  onTargetCompanyChange: (company: string) => void;
}) {
  const topScore = analytics.recommendedProblems[0]?.matchScore ?? 0;

  return (
    <Card id="recommendations" delay={130} className="dashboard-section dashboard-plan-card" style={{ padding: '26px', marginBottom: '16px' }}>
      <SectionHeader
        eyebrow="Adaptive Plan"
        title="Next problems, ranked for leverage"
        description="The queue uses weak tags, memory decay, difficulty balance, and the target company mix."
        aside={(
          <div className="dashboard-company-control dashboard-plan-selector">
            <div className="dashboard-plan-selector-icon">
              <Building2 size={16} aria-hidden="true" />
            </div>
            <div className="dashboard-plan-selector-field">
              <label htmlFor="target-company">Target Company</label>
              <select
                id="target-company"
                value={targetCompany}
                onChange={(e) => onTargetCompanyChange(e.target.value)}
              >
                {analytics.availableCompanies.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      />

      <div className="dashboard-plan-focus">
        <div className="dashboard-plan-focus-main">
          <div className="dashboard-plan-focus-icon">
            <Target size={18} aria-hidden="true" />
          </div>
          <div>
            <div className="dashboard-plan-focus-label">
              Current focus
            </div>
            <div className="dashboard-plan-focus-title">
              {analytics.nextProblemSuggestion.difficulty} focus: {analytics.nextProblemSuggestion.topics.join(', ')}
            </div>
            <p className="dashboard-plan-focus-copy">
              {analytics.nextProblemSuggestion.explanation}
            </p>
          </div>
        </div>
        <div className="dashboard-plan-metrics">
          <div className="dashboard-plan-metric">
            <TrendingUp size={15} aria-hidden="true" />
            <span>Top score</span>
            <strong>{topScore}</strong>
          </div>
          <div className="dashboard-plan-metric">
            <Building2 size={15} aria-hidden="true" />
            <span>Target</span>
            <strong>{targetCompany}</strong>
          </div>
          <div className="dashboard-plan-metric">
            <ListChecks size={15} aria-hidden="true" />
            <span>Queue</span>
            <strong>{analytics.recommendedProblems.length}</strong>
          </div>
        </div>
        <div className="dashboard-plan-reason">
          <Chip text={analytics.nextProblemSuggestion.reason} tone="info" />
        </div>
      </div>

      <div className="dashboard-recommendation-grid">
        {analytics.recommendedProblems.map((problem, index) => {
          const matchPct = Math.min(Math.max(problem.matchScore, 0), 100);
          const difficultyTone = problem.difficulty === 'Hard' ? 'danger' : problem.difficulty === 'Medium' ? 'warning' : 'success';

          return (
            <div key={problem.slug} className="dashboard-recommendation-card">
              <div>
                <div className="dashboard-recommendation-topline">
                  <span className="dashboard-recommendation-index">{String(index + 1).padStart(2, '0')}</span>
                  <Chip text={problem.difficulty} tone={difficultyTone} />
                </div>

                <div className="dashboard-recommendation-title">
                  {problem.title}
                </div>
                <div className="dashboard-recommendation-slug">
                  /problems/{problem.slug}
                </div>

                <p className="dashboard-recommendation-reason">
                  {problem.reason || `It reinforces ${problem.primaryTopic}.`}
                </p>

                <div className="dashboard-recommendation-tags">
                  <Chip text={problem.primaryTopic} tone="accent" />
                  {problem.subpatterns.slice(0, 2).map((subpattern) => (
                    <Chip key={`${problem.slug}-${subpattern}`} text={subpattern} />
                  ))}
                </div>
              </div>

              <div className="dashboard-recommendation-footer">
                <div className="dashboard-match-meter">
                  <div className="dashboard-match-meter-label">
                    <span>Match</span>
                    <strong>{problem.matchScore}</strong>
                  </div>
                  <div className="dashboard-match-meter-track">
                    <span style={{
                      width: `${matchPct}%`,
                      background: problem.matchScore >= 70 ? C.easy : problem.matchScore >= 45 ? C.accent : C.medium,
                    }} />
                  </div>
                </div>
                <ProblemLink slug={problem.slug} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
