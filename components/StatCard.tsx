'use client';

import { useEffect } from 'react';

const KEYFRAME_ID = '__stat-card-kf__';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAME_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAME_ID;
  style.textContent = `
    @keyframes statFadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      [data-stat-card] {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  delay?: number;
}

export default function StatCard({ label, value, sub, accent, delay = 0 }: StatCardProps) {
  useEffect(() => { ensureKeyframes(); }, []);

  return (
    <div
      data-stat-card
      style={{
        background: accent ? 'rgba(139,92,246,0.1)' : '#0F0F1A',
        border: `1px solid ${accent ? 'rgba(139,92,246,0.3)' : '#2A2A42'}`,
        borderRadius: '12px',
        padding: '20px 24px',
        animationName: 'statFadeUp',
        animationDuration: '0.45s',
        animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
        boxShadow: accent ? '0 0 20px rgba(139,92,246,0.1)' : 'none',
      }}
    >
      <div style={{
        fontSize: '10px', color: '#4E4E72',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        fontFamily: 'DM Mono, monospace', marginBottom: '10px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '28px', fontFamily: 'DM Serif Display, serif',
        color: accent ? '#8B5CF6' : '#EAEAF4',
        lineHeight: 1, marginBottom: sub ? '6px' : 0,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '12px', color: '#8A8AAE', marginTop: '4px' }}>
          {sub}
        </div>
      )}
    </div>
  );
}
