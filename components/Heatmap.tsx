'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface HeatmapProps {
  data: Record<string, number>;
}

const CELL             = 14;   // px — cell size
const GAP              = 3;    // px — gap between cells
const STEP             = CELL + GAP;
const DOW_W            = 28;   // width reserved for Mon/Wed/Fri labels
const MONTH_H          = 18;   // height reserved for month labels on top
const ROW_COUNT        = 7;
const TOOLTIP_DELAY_MS = 60;   // debounce to prevent gap-crossing flicker

// Approximate rendered size of the tooltip bubble.
const TOOLTIP_H      = 34;
const TOOLTIP_OFFSET = 8;   // gap between cell edge and bubble
const TOOLTIP_W      = 220; // estimated max width (used for X clamping)

const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_LABELS = [
  { di: 1, label: 'Mon' },
  { di: 3, label: 'Wed' },
  { di: 5, label: 'Fri' },
];

// Log scale — preserves granularity across high-activity users.
function intensity(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(Math.log(count + 1) / Math.log(max + 1), 1);
}

function cellColor(count: number, max: number): string {
  if (count <= 0) return '#181826';
  const t = intensity(count, max);
  if (t < 0.25) return '#3B2A6B';
  if (t < 0.50) return '#5B3E9F';
  if (t < 0.75) return '#7C4FD4';
  return '#8B5CF6';
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

interface TooltipState {
  /** Viewport-relative X centre of the hovered cell. */
  x: number;
  /** Viewport-relative Y of the cell's TOP edge. */
  cellTop: number;
  /** Viewport-relative Y of the cell's BOTTOM edge. */
  cellBottom: number;
  date: Date;
  count: number;
}

/**
 * Compute final tooltip position:
 * - Prefers ABOVE the cell; flips BELOW when the cell is too close to the
 *   top of the viewport.
 * - Clamps X so the bubble never clips the left / right viewport edge.
 * - Clamps Y as a final safety net against bottom / top overflow.
 *
 * Root cause of the original bug: `position: fixed` elements are silently
 * re-parented by any ancestor with `transform`, `will-change`, `filter`, or
 * `perspective` — common in Next.js layouts.  We fix this by rendering the
 * tooltip via ReactDOM.createPortal into <body>, which escapes every stacking
 * context, combined with smart flip + clamping below.
 */
function resolveTooltipPos(
  rawX: number,
  cellTop: number,
  cellBottom: number,
): { x: number; top: number; showAbove: boolean } {
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  // X: keep the bubble fully inside the viewport.
  const halfW  = TOOLTIP_W / 2;
  const margin = 8;
  const x = Math.min(Math.max(rawX, halfW + margin), vw - halfW - margin);

  // Y: prefer above; fall back to below when clearance is insufficient.
  const spaceAbove = cellTop - TOOLTIP_OFFSET - TOOLTIP_H;
  const showAbove  = spaceAbove >= 4;

  const rawTop = showAbove
    ? cellTop    - TOOLTIP_OFFSET - TOOLTIP_H   // bubble sits above the cell
    : cellBottom + TOOLTIP_OFFSET;              // bubble sits below the cell

  // Hard clamp — ensures the bubble never exits the viewport in any direction.
  const top = Math.min(Math.max(rawTop, 4), vh - TOOLTIP_H - 4);

  return { x, top, showAbove };
}

export default function Heatmap({ data }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Build week grid ───────────────────────────────────────────
  const weeks = useMemo(() => {
    const days: { date: Date; count: number; pad: boolean }[] = [];
    const now = new Date();

    for (let i = 363; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      const utcMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const ts = String(Math.floor(utcMs / 1000));
      days.push({ date: new Date(utcMs), count: data[ts] ?? 0, pad: false });
    }

    // Pad front so col 0 starts on Sunday.
    const leadPad = days[0].date.getUTCDay();
    const padded = [
      ...Array.from({ length: leadPad }, () => ({ date: new Date(0), count: -1, pad: true })),
      ...days,
    ];

    const result: (typeof padded[number])[][] = [];
    for (let i = 0; i < padded.length; i += 7) result.push(padded.slice(i, i + 7));
    return result;
  }, [data]);

  // Always >= 1 to prevent log(0) / division-by-zero artefacts.
  const maxCount = useMemo(() => {
    const vals = Object.values(data);
    if (!vals.length) return 1;
    return Math.max(1, ...vals);
  }, [data]);

  // ── Month labels ──────────────────────────────────────────────
  const monthLabels = useMemo(() => {
    const labels: { label: string; x: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const anchor = week[0]?.pad ? week.find(d => !d.pad) : week[0];
      if (!anchor || anchor.pad) return;
      const m = anchor.date.getUTCMonth();
      if (m !== lastMonth) {
        labels.push({ label: MONTHS[m], x: DOW_W + wi * STEP });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const svgWidth  = DOW_W + weeks.length * STEP - GAP;
  const svgHeight = MONTH_H + ROW_COUNT * STEP - GAP;

  // ── Tooltip handlers ─────────────────────────────────────────
  const showTooltip = useCallback((
    svgEl: SVGSVGElement,
    date: Date,
    count: number,
    cellX: number,
    cellY: number,
  ) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    const rect = svgEl.getBoundingClientRect();
    setTooltip({
      x:          rect.left + cellX + CELL / 2,
      cellTop:    rect.top  + cellY,
      cellBottom: rect.top  + cellY + CELL,
      date,
      count,
    });
  }, []);

  const hideTooltip = useCallback((delay = TOOLTIP_DELAY_MS) => {
    hideTimerRef.current = setTimeout(() => {
      setTooltip(null);
      hideTimerRef.current = null;
    }, delay);
  }, []);

  const handleMouseEnter = useCallback((
    e: React.MouseEvent<SVGRectElement>,
    date: Date, count: number, cellX: number, cellY: number,
  ) => showTooltip(e.currentTarget.ownerSVGElement as SVGSVGElement, date, count, cellX, cellY),
  [showTooltip]);

  const handleMouseLeave  = useCallback(() => hideTooltip(TOOLTIP_DELAY_MS), [hideTooltip]);

  const handleTouchStart  = useCallback((
    e: React.TouchEvent<SVGRectElement>,
    date: Date, count: number, cellX: number, cellY: number,
  ) => showTooltip(e.currentTarget.ownerSVGElement as SVGSVGElement, date, count, cellX, cellY),
  [showTooltip]);

  const handleTouchEnd = useCallback(() => hideTooltip(1200), [hideTooltip]);

  // ── Derived stats ─────────────────────────────────────────────
  const totalActiveDays = Object.values(data).filter(v => v > 0).length;
  const peakLabel = totalActiveDays > 0
    ? `${maxCount} submission${maxCount !== 1 ? 's' : ''}`
    : '—';

  // ── Tooltip resolved position ─────────────────────────────────
  const resolvedTooltip = tooltip
    ? resolveTooltipPos(tooltip.x, tooltip.cellTop, tooltip.cellBottom)
    : null;

  // ── Tooltip bubble (rendered via portal to escape stacking contexts) ──
  const tooltipEl = tooltip && resolvedTooltip && typeof document !== 'undefined'
    ? createPortal(
        <div
          role="tooltip"
          style={{
            position:     'fixed',
            left:         resolvedTooltip.x,
            top:          resolvedTooltip.top,
            transform:    'translateX(-50%)',
            zIndex:       99999,
            padding:      '6px 10px',
            background:   '#222236',
            border:       '1px solid #3E3E5E',
            borderRadius: '7px',
            fontSize:     '11px',
            fontFamily:   'DM Mono, monospace',
            color:        '#EAEAF4',
            whiteSpace:   'nowrap',
            pointerEvents:'none',
            boxShadow:    '0 4px 20px rgba(0,0,0,0.6)',
          }}
        >
          <span style={{ color: tooltip.count > 0 ? '#8B5CF6' : '#4E4E72', fontWeight: 600 }}>
            {tooltip.count > 0
              ? `${tooltip.count} submission${tooltip.count !== 1 ? 's' : ''}`
              : 'No submissions'}
          </span>
          <span style={{ color: '#6E6E9A', marginLeft: '6px' }}>{fmtDate(tooltip.date)}</span>

          {/* Arrow — direction flips with the bubble position. */}
          {resolvedTooltip.showAbove ? (
            // Bubble is above the cell → arrow points DOWN.
            <div style={{
              position: 'absolute', left: '50%', bottom: '-5px',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft:  '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop:   '5px solid #222236',
            }} />
          ) : (
            // Bubble is below the cell → arrow points UP.
            <div style={{
              position: 'absolute', left: '50%', top: '-5px',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft:   '5px solid transparent',
              borderRight:  '5px solid transparent',
              borderBottom: '5px solid #222236',
            }} />
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div style={{ position: 'relative' }}>
      {tooltipEl}

      {/* ── SVG heatmap ─────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          role="img"
          aria-label="Submission activity heatmap for the past year"
          style={{ display: 'block', minWidth: svgWidth }}
        >
          {/* Day-of-week labels */}
          {DOW_LABELS.map(({ di, label }) => (
            <text
              key={label}
              x={DOW_W - 6}
              y={MONTH_H + di * STEP + CELL / 2 + 1}
              textAnchor="end"
              dominantBaseline="middle"
              aria-hidden="true"
              style={{ fontSize: '9px', fontFamily: 'DM Mono, monospace', fill: '#4E4E72' }}
            >
              {label}
            </text>
          ))}

          {/* Month labels */}
          {monthLabels.map(({ label, x }) => (
            <text
              key={`${label}-${x}`}
              x={x}
              y={MONTH_H - 5}
              aria-hidden="true"
              style={{ fontSize: '9px', fontFamily: 'DM Mono, monospace', fill: '#4E4E72' }}
            >
              {label}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (day.pad) return null;
              const x     = DOW_W + wi * STEP;
              const y     = MONTH_H + di * STEP;
              const color = cellColor(day.count, maxCount);
              const ariaLabel = `${fmtDate(day.date)}: ${
                day.count > 0
                  ? `${day.count} submission${day.count !== 1 ? 's' : ''}`
                  : 'no submissions'
              }`;

              return (
                <rect
                  key={`${wi}-${di}`}
                  x={x} y={y}
                  width={CELL} height={CELL}
                  rx={3} ry={3}
                  fill={color}
                  aria-label={ariaLabel}
                  role="img"
                  style={{ cursor: 'crosshair', transition: 'fill 0.1s ease' }}
                  onMouseEnter={e => handleMouseEnter(e, day.date, day.count, x, y)}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={e => handleTouchStart(e, day.date, day.count, x, y)}
                  onTouchEnd={handleTouchEnd}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* ── Legend + summary ────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: '14px', flexWrap: 'wrap', gap: '10px',
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { label: 'Total active days', val: totalActiveDays > 0 ? totalActiveDays : '—' },
            { label: 'Peak day',          val: peakLabel },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{
                fontSize: '9px', color: '#4E4E72', fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.1em', marginBottom: '2px',
              }}>
                {label.toUpperCase()}
              </div>
              <div style={{ fontSize: '13px', color: '#EAEAF4', fontFamily: 'DM Mono, monospace' }}>
                {val}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} aria-hidden="true">
          <span style={{ fontSize: '9px', color: '#4E4E72', fontFamily: 'DM Mono, monospace' }}>Less</span>
          {(['#181826', '#3B2A6B', '#5B3E9F', '#7C4FD4', '#8B5CF6'] as const).map((c, i) => (
            <div
              key={i}
              style={{
                width: CELL, height: CELL, borderRadius: '3px', background: c,
                border: i === 0 ? '1px solid #2A2A42' : 'none',
              }}
            />
          ))}
          <span style={{ fontSize: '9px', color: '#4E4E72', fontFamily: 'DM Mono, monospace' }}>More</span>
        </div>
      </div>
    </div>
  );
}