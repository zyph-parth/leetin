'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'leetinsight:theme';

function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }

  return 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  function handleToggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  const light = theme === 'light';

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-pressed={light}
      title={light ? 'Dark mode' : 'Light mode'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        height: '34px',
        padding: '0 11px',
        borderRadius: '999px',
        border: '1px solid var(--border)',
        background: 'var(--surface-elevated)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontFamily: 'DM Mono, monospace',
        fontSize: '11px',
        transition: 'border-color 0.16s ease, color 0.16s ease, background 0.16s ease, transform 0.16s ease',
        boxShadow: 'var(--card-shadow)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-border)';
        e.currentTarget.style.color = 'var(--accent)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {light ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
      <span>{light ? 'Light' : 'Dark'}</span>
    </button>
  );
}
