export default function DashboardStyles() {
  return (
    <style>{`
      @keyframes dashboardFadeUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .dashboard-root {
        position: relative;
        min-height: calc(100vh - 58px);
        overflow: visible;
        isolation: isolate;
      }

      .dashboard-root::before,
      .dashboard-root::after {
        content: '';
        position: absolute;
        inset: -36px 0 0;
        pointer-events: none;
        z-index: 0;
      }

      .dashboard-root::before {
        background:
          radial-gradient(ellipse 65% 38% at 50% 0%, var(--hero-orb-1) 0%, transparent 62%),
          radial-gradient(ellipse 42% 30% at 94% 26%, var(--hero-orb-2) 0%, transparent 58%),
          radial-gradient(ellipse 36% 32% at 8% 58%, var(--hero-orb-3) 0%, transparent 62%);
      }

      .dashboard-root::after {
        background-image:
          linear-gradient(var(--border) 1px, transparent 1px),
          linear-gradient(90deg, var(--border) 1px, transparent 1px);
        background-size: 60px 60px;
        opacity: var(--hero-grid-opacity);
        mask-image: linear-gradient(to bottom, transparent 0, black 90px, black 88%, transparent 100%);
        -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 90px, black 88%, transparent 100%);
      }

      .dashboard-shell {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: none;
        margin: 0 auto;
        padding: 12px clamp(16px, 3vw, 48px) 48px;
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }

      .dashboard-workspace-panel {
        min-width: 0;
      }

      .dashboard-view {
        min-width: 0;
      }

      .dashboard-view[hidden] {
        display: none;
      }

      .dashboard-view[data-active='true'] {
        animation: dashboardFadeUp 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .dashboard-sidebar {
        position: sticky;
        top: 64px;
        z-index: 20;
        min-width: 0;
        margin-top: -10px;
      }

      .dashboard-sidebar-card {
        max-height: calc(100vh - 72px);
        overflow: auto;
        padding: 16px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: var(--card-shadow);
      }

      .dashboard-sidebar-kicker {
        margin-bottom: 6px;
        color: var(--text-muted);
        font-family: 'DM Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .dashboard-sidebar-title {
        color: var(--text-primary);
        font-family: 'DM Serif Display', serif;
        font-size: 25px;
        line-height: 1;
      }

      .dashboard-sidebar-copy {
        margin: 8px 0 16px;
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 1.55;
      }

      .dashboard-sidebar-nav {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .dashboard-workspace-tab {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 11px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 13px;
        color: var(--text-secondary);
        cursor: pointer;
        text-align: left;
        transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
      }

      .dashboard-workspace-tab:hover,
      .dashboard-workspace-tab[data-active='true'] {
        background: var(--accent-light);
        border-color: var(--accent-border);
        color: var(--text-primary);
        transform: translateY(-1px);
      }

      .dashboard-workspace-tab svg {
        flex: 0 0 auto;
        color: var(--accent);
      }

      .dashboard-workspace-tab span {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .dashboard-workspace-tab strong {
        color: inherit;
        font-size: 13px;
        font-weight: 700;
      }

      .dashboard-workspace-tab small {
        overflow: hidden;
        color: var(--text-muted);
        font-size: 11px;
        line-height: 1.35;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .dashboard-sidebar-snapshot {
        display: grid;
        gap: 8px;
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid var(--border);
      }

      .dashboard-sidebar-snapshot div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
      }

      .dashboard-sidebar-snapshot span {
        color: var(--text-muted);
        font-family: 'DM Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .dashboard-sidebar-snapshot strong {
        overflow: hidden;
        color: var(--text-primary);
        font-size: 12px;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .dashboard-mobile-tabs {
        display: none;
      }

      .dashboard-mobile-tabs-scroll {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding: 8px;
        scrollbar-width: none;
      }

      .dashboard-mobile-tabs-scroll::-webkit-scrollbar {
        display: none;
      }

      .dashboard-mobile-tab {
        flex: 0 0 auto;
        min-width: 98px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 10px 12px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 12px;
        color: var(--text-secondary);
        cursor: pointer;
        font-family: 'DM Mono', monospace;
        font-size: 11px;
        transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
      }

      .dashboard-mobile-tab[data-active='true'] {
        background: var(--accent-light);
        border-color: var(--accent-border);
        color: var(--text-primary);
      }

      .dashboard-mobile-tab svg {
        color: var(--accent);
      }

      .dashboard-mobile-snapshot {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 0 12px 10px;
        color: var(--text-muted);
        font-family: 'DM Mono', monospace;
        font-size: 10px;
      }

      .dashboard-mobile-snapshot span {
        min-width: 0;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .fu {
        animation: dashboardFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        opacity: 0;
      }

      .dashboard-card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: var(--card-shadow);
        overflow: hidden;
      }

      .dashboard-section {
        scroll-margin-top: 88px;
      }

      .dashboard-section-header {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-start;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }

      .dashboard-profile-card {
        display: flex;
        align-items: center;
        gap: 18px;
      }

      .dashboard-profile-stats {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: flex-end;
        flex-shrink: 0;
      }

      .dashboard-verdict-banner {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) minmax(260px, 0.9fr);
        gap: 32px;
        align-items: center;
      }

      .dashboard-recommendation-grid,
      .dashboard-company-grid,
      .dashboard-two-col-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }

      .dashboard-plan-card {
        position: relative;
      }

      .dashboard-plan-selector {
        min-width: 250px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 14px;
      }

      .dashboard-plan-selector-icon,
      .dashboard-plan-focus-icon {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--accent);
        background: var(--accent-light);
        border: 1px solid var(--accent-border);
      }

      .dashboard-plan-selector-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
      }

      .dashboard-plan-selector-field {
        flex: 1;
        min-width: 0;
      }

      .dashboard-plan-selector label {
        display: block;
        margin-bottom: 4px;
        color: var(--text-muted);
        font-family: 'DM Mono', monospace;
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .dashboard-plan-selector select {
        width: 100%;
        min-width: 0;
        padding: 0;
        border: 0;
        border-radius: 0;
        background-color: transparent;
        color: var(--text-primary);
        font-family: 'DM Mono', monospace;
        font-size: 13px;
        cursor: pointer;
      }

      .dashboard-plan-focus {
        position: relative;
        display: grid;
        grid-template-columns: minmax(260px, 1fr) minmax(360px, 0.8fr);
        gap: 18px;
        align-items: stretch;
        padding: 18px;
        margin-bottom: 16px;
        overflow: hidden;
        background:
          linear-gradient(135deg, var(--accent-light), var(--accent-2-light)),
          var(--surface-2);
        border: 1px solid var(--accent-border);
        border-radius: 14px;
      }

      .dashboard-plan-focus::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(var(--border) 1px, transparent 1px),
          linear-gradient(90deg, var(--border) 1px, transparent 1px);
        background-size: 34px 34px;
        opacity: 0.16;
        mask-image: linear-gradient(90deg, transparent 0, black 24%, black 100%);
        -webkit-mask-image: linear-gradient(90deg, transparent 0, black 24%, black 100%);
      }

      .dashboard-plan-focus-main,
      .dashboard-plan-metrics,
      .dashboard-plan-reason {
        position: relative;
        z-index: 1;
      }

      .dashboard-plan-focus-main {
        display: flex;
        gap: 14px;
        align-items: flex-start;
        min-width: 0;
      }

      .dashboard-plan-focus-icon {
        width: 42px;
        height: 42px;
        border-radius: 13px;
        margin-top: 2px;
      }

      .dashboard-plan-focus-label {
        margin-bottom: 4px;
        color: var(--accent);
        font-family: 'DM Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .dashboard-plan-focus-title {
        margin-bottom: 7px;
        color: var(--text-primary);
        font-family: 'DM Serif Display', serif;
        font-size: clamp(20px, 2vw, 24px);
        line-height: 1.08;
      }

      .dashboard-plan-focus-copy {
        max-width: 760px;
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 1.6;
      }

      .dashboard-plan-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .dashboard-plan-metric {
        min-width: 0;
        padding: 12px;
        background: color-mix(in srgb, var(--surface) 72%, transparent);
        border: 1px solid var(--border);
        border-radius: 12px;
      }

      .dashboard-plan-metric svg {
        color: var(--text-muted);
        margin-bottom: 8px;
      }

      .dashboard-plan-metric span,
      .dashboard-match-meter-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: var(--text-muted);
        font-family: 'DM Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .dashboard-plan-metric strong {
        display: block;
        overflow: hidden;
        color: var(--text-primary);
        font-family: 'DM Sans', sans-serif;
        font-size: 13px;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .dashboard-plan-reason {
        grid-column: 1 / -1;
        display: flex;
        justify-content: flex-start;
        max-width: 100%;
      }

      .dashboard-plan-reason span {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dashboard-recommendation-grid {
        grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
        align-items: stretch;
      }

      .dashboard-recommendation-card {
        position: relative;
        min-height: 276px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 18px;
        overflow: hidden;
        background:
          linear-gradient(180deg, color-mix(in srgb, var(--surface-2) 92%, var(--accent-light)), var(--surface-2));
        border: 1px solid var(--border);
        border-radius: 14px;
        transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
      }

      .dashboard-recommendation-card::before {
        content: '';
        position: absolute;
        inset: 0 0 auto;
        height: 3px;
        background: linear-gradient(90deg, var(--accent), var(--accent-2));
        opacity: 0;
        transition: opacity 0.16s ease;
      }

      .dashboard-recommendation-card:hover {
        border-color: var(--accent-border);
        box-shadow: var(--card-shadow);
        transform: translateY(-2px);
      }

      .dashboard-recommendation-card:hover::before {
        opacity: 1;
      }

      .dashboard-recommendation-topline,
      .dashboard-recommendation-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .dashboard-recommendation-topline {
        margin-bottom: 12px;
      }

      .dashboard-recommendation-index {
        color: var(--text-muted);
        font-family: 'DM Mono', monospace;
        font-size: 11px;
      }

      .dashboard-recommendation-title {
        color: var(--text-primary);
        font-family: 'DM Serif Display', serif;
        font-size: 19px;
        line-height: 1.08;
      }

      .dashboard-recommendation-slug {
        margin-top: 4px;
        color: var(--text-muted);
        font-family: 'DM Mono', monospace;
        font-size: 10px;
        overflow-wrap: anywhere;
      }

      .dashboard-recommendation-reason {
        min-height: 58px;
        margin: 14px 0 12px;
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 1.55;
      }

      .dashboard-recommendation-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 14px;
      }

      .dashboard-recommendation-footer {
        margin-top: auto;
        flex-wrap: wrap;
      }

      .dashboard-match-meter {
        min-width: 142px;
        flex: 1;
      }

      .dashboard-match-meter-label {
        margin-bottom: 6px;
      }

      .dashboard-match-meter-label strong {
        color: var(--text-primary);
      }

      .dashboard-match-meter-track {
        height: 4px;
        overflow: hidden;
        background: var(--surface-3);
        border-radius: 999px;
      }

      .dashboard-match-meter-track span {
        display: block;
        height: 100%;
        border-radius: inherit;
        transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
      }

      .dashboard-deep-dive-grid {
        display: grid;
        grid-template-columns: minmax(280px, 1.1fr) minmax(280px, 1fr);
        gap: 16px;
      }

      .dashboard-stat-block {
        padding: 14px;
        background: var(--surface-2);
        border-radius: 10px;
        border: 1px solid var(--border);
      }

      .dashboard-problem-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 9px;
        color: var(--text-primary);
        font-family: 'DM Mono', monospace;
        font-size: 11px;
        text-decoration: none;
        white-space: nowrap;
        transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
      }

      .dashboard-problem-link:hover {
        border-color: var(--accent-border);
        background: var(--accent-light);
        transform: translateY(-1px);
      }

      @media (prefers-reduced-motion: reduce) {
        .fu {
          animation: none !important;
          opacity: 1 !important;
        }

        .dashboard-workspace-tab,
        .dashboard-mobile-tab,
        .dashboard-problem-link,
        .dashboard-recommendation-card,
        .dashboard-recommendation-card::before,
        .dashboard-match-meter-track span {
          transition: none !important;
        }
      }

      @media (max-width: 1100px) {
        .dashboard-shell {
          grid-template-columns: 1fr;
          padding-top: 12px;
        }

        .dashboard-sidebar {
          display: none;
        }

        .dashboard-mobile-tabs {
          position: sticky;
          top: 58px;
          z-index: 80;
          display: block;
          margin-bottom: 14px;
          background: var(--workspace-nav-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--card-shadow);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
      }

      @media (max-width: 900px) {
        .dashboard-profile-card {
          flex-direction: column;
          align-items: flex-start;
        }

        .dashboard-profile-stats {
          width: 100%;
          justify-content: space-between;
        }

        .dashboard-verdict-banner,
        .dashboard-deep-dive-grid,
        .dashboard-plan-focus {
          grid-template-columns: 1fr;
        }

        .dashboard-plan-metrics {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 720px) {
        .dashboard-shell {
          padding: 10px 14px 34px !important;
        }

        .dashboard-company-control {
          width: 100%;
          min-width: 0 !important;
        }

        .dashboard-plan-card {
          padding: 20px !important;
        }

        .dashboard-plan-focus {
          padding: 14px;
        }

        .dashboard-plan-focus-main {
          flex-direction: column;
        }

        .dashboard-plan-metrics {
          grid-template-columns: 1fr;
        }

        .dashboard-recommendation-grid {
          grid-template-columns: 1fr;
        }

        .dashboard-footer-summary {
          text-align: left !important;
        }
      }
    `}</style>
  );
}
