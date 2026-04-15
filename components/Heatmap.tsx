'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, TouchEvent } from 'react';

interface HeatmapProps {
  data: Record<string, number>;
}

const CELL = 14;
const GAP = 3;
const STEP = CELL + GAP;
const DOW_W = 28;
const MONTH_H = 18;
const ROW_COUNT = 7;
const TOOLTIP_DELAY_MS = 60;
const TOOLTIP_H = 34;
const TOOLTIP_OFFSET = 8;
const TOOLTIP_W = 220;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_LABELS = [
  { di: 1, label: 'Mon' },
  { di: 3, label: 'Wed' },
  { di: 5, label: 'Fri' },
];

function intensity(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(Math.log(count + 1) / Math.log(max + 1), 1);
}

function cellColor(count: number, max: number): string {
  if (count <= 0) return '#181826';
  const t = intensity(count, max);
  if (t < 0.25) return '#3B2A6B';
  if (t < 0.5) return '#5B3E9F';
  if (t < 0.75) return '#7C4FD4';
  return '#8B5CF6';
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toLocalDayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

interface TooltipState {
  x: number;
  cellTop: number;
  cellBottom: number;
  date: Date;
  count: number;
}

function resolveTooltipPos(
  rawX: number,
  cellTop: number,
  cellBottom: number,
): { x: number; top: number; showAbove: boolean } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const halfW = TOOLTIP_W / 2;
  const margin = 8;
  const x = Math.min(Math.max(rawX, halfW + margin), vw - halfW - margin);
  const showAbove = cellTop - TOOLTIP_OFFSET - TOOLTIP_H >= 4;
  const rawTop = showAbove
    ? cellTop - TOOLTIP_OFFSET - TOOLTIP_H
    : cellBottom + TOOLTIP_OFFSET;
  const top = Math.min(Math.max(rawTop, 4), vh - TOOLTIP_H - 4);

  return { x, top, showAbove };
}

export default function Heatmap({ data }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const { weeks, maxCount, totalActiveDays } = useMemo(() => {
    const history = new Map<number, number>();

    Object.entries(data).forEach(([ts, count]) => {
      const date = new Date(Number(ts) * 1000);
      const dayStart = toLocalDayStart(date);
      history.set(dayStart, (history.get(dayStart) ?? 0) + count);
    });

    const days: { date: Date; count: number; pad: boolean }[] = [];
    const now = new Date();
    for (let i = 363; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = date.getTime();
      days.push({ date, count: history.get(dayStart) ?? 0, pad: false });
    }

    const leadPad = days[0].date.getDay();
    const padded = [
      ...Array.from({ length: leadPad }, () => ({ date: new Date(0), count: -1, pad: true })),
      ...days,
    ];

    const weeks: (typeof padded[number])[][] = [];
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

    return {
      weeks,
      maxCount: Math.max(1, ...days.map((day) => day.count)),
      totalActiveDays: days.filter((day) => day.count > 0).length,
    };
  }, [data]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; x: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const anchor = week[0]?.pad ? week.find((day) => !day.pad) : week[0];
      if (!anchor || anchor.pad) return;

      const month = anchor.date.getMonth();
      if (month !== lastMonth) {
        labels.push({ label: MONTHS[month], x: DOW_W + weekIndex * STEP });
        lastMonth = month;
      }
    });

    return labels;
  }, [weeks]);

  const svgWidth = DOW_W + weeks.length * STEP - GAP;
  const svgHeight = MONTH_H + ROW_COUNT * STEP - GAP;

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
      x: rect.left + cellX + CELL / 2,
      cellTop: rect.top + cellY,
      cellBottom: rect.top + cellY + CELL,
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
    e: MouseEvent<SVGRectElement>,
    date: Date,
    count: number,
    cellX: number,
    cellY: number,
  ) => showTooltip(e.currentTarget.ownerSVGElement as SVGSVGElement, date, count, cellX, cellY), [showTooltip]);

  const handleMouseLeave = useCallback(() => hideTooltip(TOOLTIP_DELAY_MS), [hideTooltip]);

  const handleTouchStart = useCallback((
    e: TouchEvent<SVGRectElement>,
    date: Date,
    count: number,
    cellX: number,
    cellY: number,
  ) => showTooltip(e.currentTarget.ownerSVGElement as SVGSVGElement, date, count, cellX, cellY), [showTooltip]);

  const handleTouchEnd = useCallback(() => hideTooltip(1200), [hideTooltip]);

  const peakLabel = totalActiveDays > 0
    ? `${maxCount} submission${maxCount !== 1 ? 's' : ''}`
    : '—';

  const resolvedTooltip = tooltip
    ? resolveTooltipPos(tooltip.x, tooltip.cellTop, tooltip.cellBottom)
    : null;

  const tooltipEl = tooltip && resolvedTooltip && typeof document !== 'undefined'
    ? createPortal(
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: resolvedTooltip.x,
            top: resolvedTooltip.top,
            transform: 'translateX(-50%)',
            zIndex: 99999,
            padding: '6px 10px',
            background: '#222236',
            border: '1px solid #3E3E5E',
            borderRadius: '7px',
            fontSize: '11px',
            fontFamily: 'DM Mono, monospace',
            color: '#EAEAF4',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
        >
          <span style={{ color: tooltip.count > 0 ? '#8B5CF6' : '#4E4E72', fontWeight: 600 }}>
            {tooltip.count > 0
              ? `${tooltip.count} submission${tooltip.count !== 1 ? 's' : ''}`
              : 'No submissions'}
          </span>
          <span style={{ color: '#6E6E9A', marginLeft: '6px' }}>{fmtDate(tooltip.date)}</span>
          {resolvedTooltip.showAbove ? (
            <div style={{
              position: 'absolute',
              left: '50%',
              bottom: '-5px',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #222236',
            }}
            />
          ) : (
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '-5px',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: '5px solid #222236',
            }}
            />
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div style={{ position: 'relative' }}>
      {tooltipEl}

      <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          role="img"
          aria-label="Submission activity heatmap for the past year"
          style={{ display: 'block', minWidth: svgWidth }}
        >
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

          {weeks.map((week, weekIndex) => (
            week.map((day, dayIndex) => {
              if (day.pad) return null;

              const x = DOW_W + weekIndex * STEP;
              const y = MONTH_H + dayIndex * STEP;
              const color = cellColor(day.count, maxCount);
              const ariaLabel = `${fmtDate(day.date)}: ${
                day.count > 0
                  ? `${day.count} submission${day.count !== 1 ? 's' : ''}`
                  : 'no submissions'
              }`;

              return (
                <rect
                  key={`${weekIndex}-${dayIndex}`}
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  ry={3}
                  fill={color}
                  aria-label={ariaLabel}
                  role="img"
                  style={{ cursor: 'pointer', transition: 'fill 0.1s ease' }}
                  onMouseEnter={(e) => handleMouseEnter(e, day.date, day.count, x, y)}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={(e) => handleTouchStart(e, day.date, day.count, x, y)}
                  onTouchEnd={handleTouchEnd}
                />
              );
            })
          ))}
        </svg>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '14px',
        flexWrap: 'wrap',
        gap: '10px',
        }}
      >
        <div style={{ width: '100%', fontSize: '11px', color: '#4E4E72', lineHeight: 1.5 }}>
          Scroll horizontally on smaller screens to inspect the full year.
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { label: 'Total active days', val: totalActiveDays > 0 ? totalActiveDays : '—' },
            { label: 'Peak day', val: peakLabel },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{
                fontSize: '9px',
                color: '#4E4E72',
                fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.1em',
                marginBottom: '2px',
              }}
              >
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
          {(['#181826', '#3B2A6B', '#5B3E9F', '#7C4FD4', '#8B5CF6'] as const).map((color, index) => (
            <div
              key={index}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: '3px',
                background: color,
                border: index === 0 ? '1px solid #2A2A42' : 'none',
              }}
            />
          ))}
          <span style={{ fontSize: '9px', color: '#4E4E72', fontFamily: 'DM Mono, monospace' }}>More</span>
        </div>
      </div>
    </div>
  );
}
