export const C = {
  accent: 'var(--accent)',
  accentLight: 'var(--accent-light)',
  accentBorder: 'var(--accent-border)',
  cyan: 'var(--accent-2)',
  cyanLight: 'var(--accent-2-light)',
  cyanBorder: 'var(--accent-2-border)',
  easy: 'var(--easy)',
  easyLight: 'var(--easy-light)',
  easyBorder: 'var(--easy-border)',
  medium: 'var(--medium)',
  mediumLight: 'var(--medium-light)',
  mediumBorder: 'var(--medium-border)',
  hard: 'var(--hard)',
  hardLight: 'var(--hard-light)',
  hardBorder: 'var(--hard-border)',
  info: 'var(--info)',
  infoLight: 'var(--info-light)',
  infoBorder: 'var(--info-border)',
  border: 'var(--border)',
  borderHover: 'var(--border-hover)',
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  surface3: 'var(--surface-3)',
  bg: 'var(--bg)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
};

export const VERDICT_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  'Interview Ready': {
    color: C.easy,
    bg: C.easyLight,
    border: C.easyBorder,
    glow: '0 0 42px var(--easy-light)',
  },
  'Almost There': {
    color: C.accent,
    bg: C.accentLight,
    border: C.accentBorder,
    glow: 'var(--glow-accent)',
  },
  'On Track': {
    color: C.info,
    bg: C.infoLight,
    border: 'var(--info-border)',
    glow: '0 0 42px var(--info-light)',
  },
  'Keep Building': {
    color: C.textSecondary,
    bg: C.surface2,
    border: C.border,
    glow: 'none',
  },
};

export const tooltipStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '11px',
  fontFamily: 'DM Mono, monospace',
  color: 'var(--text-primary)',
};

export function getProblemUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}
