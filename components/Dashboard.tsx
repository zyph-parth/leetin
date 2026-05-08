'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Analytics } from '@/lib/analytics';
import { computeAnalytics } from '@/lib/analytics';
import type { LeetCodeProfile } from '@/lib/leetcode';
import type { SM2State } from '@/lib/srs';
import { loadSRSData, mergeFreshProblems, saveSingleState } from '@/lib/srs-store';
import CompanyReadinessSection from './dashboard/CompanyReadinessSection';
import ConsistencySection from './dashboard/ConsistencySection';
import DashboardStyles from './dashboard/DashboardStyles';
import HeatmapSection from './dashboard/HeatmapSection';
import MomentumSummary from './dashboard/MomentumSummary';
import OverviewSection from './dashboard/OverviewSection';
import ProfileHeader from './dashboard/ProfileHeader';
import ReadinessSection from './dashboard/ReadinessSection';
import RecommendationsSection from './dashboard/RecommendationsSection';
import SkillTrendsSection from './dashboard/SkillTrendsSection';
import TopicDeepDiveSection from './dashboard/TopicDeepDiveSection';
import WorkspaceNav, { type WorkspaceViewId } from './dashboard/WorkspaceNav';
import MockInterviewPanel from './MockInterviewPanel';
import SRSPanel from './SRSPanel';

interface Props {
  profile: LeetCodeProfile;
}

export default function Dashboard({ profile }: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [srsReady, setSrsReady] = useState(false);
  const [srsStates, setSrsStates] = useState<Record<string, SM2State>>({});
  const [targetCompany, setTargetCompany] = useState('Google');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [activeView, setActiveView] = useState<WorkspaceViewId>('command');

  useEffect(() => {
    const syncNow = () => setNowMs(Date.now());
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncNow();
    };

    const intervalId = window.setInterval(syncNow, 60_000);
    window.addEventListener('focus', syncNow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncNow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    setSrsReady(false);
    const stored = loadSRSData(profile.username);
    const merged = mergeFreshProblems(profile.username, stored, profile);
    setSrsStates(merged);
    setSrsReady(true);
  }, [profile]);

  const handleSrsStateChange = useCallback((updated: SM2State) => {
    setSrsStates((prev) => saveSingleState(profile.username, updated, prev));
  }, [profile.username]);

  const analytics: Analytics = useMemo(
    () => computeAnalytics(profile, { nowMs, srsStates, targetCompany }),
    [nowMs, profile, srsStates, targetCompany],
  );

  useEffect(() => {
    if (!analytics.availableCompanies.includes(targetCompany)) {
      setTargetCompany(analytics.selectedCompany);
    }
  }, [analytics.availableCompanies, analytics.selectedCompany, targetCompany]);

  useEffect(() => {
    if (!analytics.deepDiveTopics.some((topic) => topic.topic === selectedTopic)) {
      setSelectedTopic(analytics.deepDiveTopics[0]?.topic ?? '');
    }
  }, [analytics.deepDiveTopics, selectedTopic]);

  return (
    <div className="dashboard-root">
      <DashboardStyles />
      <div className="dashboard-shell">
        <WorkspaceNav activeView={activeView} analytics={analytics} onChange={setActiveView} />

        <div className="dashboard-workspace-panel">
          <div className="dashboard-view" data-active={activeView === 'command'} hidden={activeView !== 'command'}>
            <ProfileHeader profile={profile} analytics={analytics} />
            <OverviewSection profile={profile} analytics={analytics} />
            <ReadinessSection analytics={analytics} />
          </div>

          <div className="dashboard-view" data-active={activeView === 'plan'} hidden={activeView !== 'plan'}>
            <RecommendationsSection
              analytics={analytics}
              targetCompany={targetCompany}
              onTargetCompanyChange={setTargetCompany}
            />
            <TopicDeepDiveSection
              analytics={analytics}
              selectedTopic={selectedTopic}
              onSelectedTopicChange={setSelectedTopic}
            />
          </div>

          <div className="dashboard-view" data-active={activeView === 'companies'} hidden={activeView !== 'companies'}>
            <CompanyReadinessSection analytics={analytics} />
          </div>

          <div className="dashboard-view" data-active={activeView === 'mock'} hidden={activeView !== 'mock'}>
            <div id="mock-interview" className="fu dashboard-section" style={{ animationDelay: '80ms', marginBottom: '16px' }}>
              <MockInterviewPanel
                analytics={analytics}
                srsStates={srsStates}
                username={profile.username}
                targetCompany={targetCompany}
              />
            </div>
          </div>

          <div className="dashboard-view" data-active={activeView === 'memory'} hidden={activeView !== 'memory'}>
            <div id="memory-srs" className="fu dashboard-section" style={{ animationDelay: '80ms', marginBottom: '16px' }}>
              <SRSPanel
                profile={profile}
                states={srsStates}
                nowMs={nowMs}
                ready={srsReady}
                onStateChange={handleSrsStateChange}
              />
            </div>
          </div>

          <div className="dashboard-view" data-active={activeView === 'progress'} hidden={activeView !== 'progress'}>
            <SkillTrendsSection analytics={analytics} />
            <ConsistencySection analytics={analytics} />
            <HeatmapSection profile={profile} />
            <MomentumSummary analytics={analytics} />
          </div>
        </div>
      </div>
    </div>
  );
}
