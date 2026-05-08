'use client';

import {
  Activity,
  BarChart3,
  Brain,
  Building2,
  Compass,
  ListChecks,
  Target,
  TimerReset,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Analytics } from '@/lib/analytics';

export type WorkspaceViewId = 'command' | 'plan' | 'companies' | 'mock' | 'memory' | 'progress';

export interface WorkspaceView {
  id: WorkspaceViewId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const WORKSPACE_VIEWS: WorkspaceView[] = [
  {
    id: 'command',
    label: 'Command',
    description: 'Score, blockers, and next signal',
    icon: Compass,
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'Next problems and topic drills',
    icon: Target,
  },
  {
    id: 'companies',
    label: 'Companies',
    description: 'Target fit and off-platform prep',
    icon: Building2,
  },
  {
    id: 'mock',
    label: 'Mock',
    description: 'Timed interview session',
    icon: TimerReset,
  },
  {
    id: 'memory',
    label: 'Memory',
    description: 'SRS queue and retention',
    icon: Brain,
  },
  {
    id: 'progress',
    label: 'Progress',
    description: 'Velocity, heatmap, and consistency',
    icon: Activity,
  },
];

interface WorkspaceNavProps {
  activeView: WorkspaceViewId;
  analytics: Analytics;
  onChange: (view: WorkspaceViewId) => void;
}

function WorkspaceTabButton({
  view,
  active,
  onClick,
}: {
  view: WorkspaceView;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = view.icon;

  return (
    <button
      type="button"
      className="dashboard-workspace-tab"
      data-active={active}
      onClick={onClick}
      aria-selected={active}
      role="tab"
    >
      <Icon size={17} aria-hidden="true" />
      <span>
        <strong>{view.label}</strong>
        <small>{view.description}</small>
      </span>
    </button>
  );
}

export default function WorkspaceNav({ activeView, analytics, onChange }: WorkspaceNavProps) {
  return (
    <>
      <aside className="dashboard-sidebar" aria-label="Dashboard workspace">
        <div className="dashboard-sidebar-card">
          <div className="dashboard-sidebar-kicker">Workspace</div>
          <div className="dashboard-sidebar-title">LeetInsight</div>
          <div className="dashboard-sidebar-copy">
            Jump straight to the mode you need. No long-scroll tour required.
          </div>

          <nav className="dashboard-sidebar-nav" role="tablist">
            {WORKSPACE_VIEWS.map((view) => (
              <WorkspaceTabButton
                key={view.id}
                view={view}
                active={activeView === view.id}
                onClick={() => onChange(view.id)}
              />
            ))}
          </nav>

          <div className="dashboard-sidebar-snapshot">
            <div>
              <span>Readiness</span>
              <strong>{analytics.interviewReadiness}/100</strong>
            </div>
            <div>
              <span>Best fit</span>
              <strong>{analytics.bestCompanyMatch}</strong>
            </div>
            <div>
              <span>Open gaps</span>
              <strong>{analytics.gaps.length}</strong>
            </div>
          </div>
        </div>
      </aside>

      <div className="dashboard-mobile-tabs" aria-label="Dashboard workspace">
        <div className="dashboard-mobile-tabs-scroll" role="tablist">
          {WORKSPACE_VIEWS.map((view) => {
            const Icon = view.icon;
            const active = activeView === view.id;

            return (
              <button
                key={view.id}
                type="button"
                className="dashboard-mobile-tab"
                data-active={active}
                onClick={() => onChange(view.id)}
                aria-selected={active}
                role="tab"
              >
                <Icon size={16} aria-hidden="true" />
                <span>{view.label}</span>
              </button>
            );
          })}
        </div>
        <div className="dashboard-mobile-snapshot">
          <span><ListChecks size={13} aria-hidden="true" /> {analytics.gaps[0]?.label ?? 'No critical gap'}</span>
          <span><BarChart3 size={13} aria-hidden="true" /> {analytics.interviewReadiness}/100</span>
        </div>
      </div>
    </>
  );
}
