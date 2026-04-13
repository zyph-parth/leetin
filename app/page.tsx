'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { LeetCodeProfile } from '@/lib/leetcode';

const Dashboard = dynamic(() => import('@/components/Dashboard'), { ssr: false });

const FEATURES = [
  { icon: '⬡', label: 'Solver Personality' },
  { icon: '◈', label: 'Burnout Risk' },
  { icon: '◎', label: 'Topic Radar' },
  { icon: '▦', label: 'Activity Heatmap' },
  { icon: '◆', label: 'Readiness Score' },
  { icon: '⬟', label: 'Memory SRS' },
];

// ─── Must match srs-store.ts exactly ─────────────────────────────
const STORAGE_PREFIX = 'leetinsight:srs:';
const BACKUP_VERSION = 1;

/** Mirror of the isValidState guard in srs-store.ts */
function isValidSM2State(v: unknown): boolean {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>).slug === 'string' &&
    typeof (v as Record<string, unknown>).interval === 'number' &&
    typeof (v as Record<string, unknown>).nextReviewMs === 'number'
  );
}

/**
 * Validates a parsed backup object.
 * Returns the sanitised SRS record (slug -> SM2State) if valid, or null.
 * Accepts both:
 *   - New versioned envelope: { __version, username, exportedAt, data: {...} }
 *   - Legacy bare record:     { slug: SM2State, ... }
 */
function validateBackup(parsed: unknown): { record: Record<string, unknown>; fromUser: string | null } | null {
  let record: unknown;
  let fromUser: string | null = null;

  if (
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) &&
    (parsed as Record<string, unknown>).__version === BACKUP_VERSION
  ) {
    const env = parsed as Record<string, unknown>;
    fromUser = typeof env.username === 'string' ? env.username : null;
    record = env.data;
  } else {
    record = parsed;
  }

  if (typeof record !== 'object' || record === null || Array.isArray(record)) return null;

  const validEntries = Object.entries(record as Record<string, unknown>).filter(([, v]) => isValidSM2State(v));
  if (validEntries.length === 0) return null;

  return { record: Object.fromEntries(validEntries), fromUser };
}

// ─── Toast component ──────────────────────────────────────────────
type ToastKind = 'success' | 'error' | 'info';

function Toast({ message, kind, onDismiss }: { message: string; kind: ToastKind; onDismiss: () => void }) {
  const palette: Record<ToastKind, { bg: string; border: string; color: string }> = {
    success: { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)', color: '#10B981' },
    error:   { bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.35)',  color: '#F43F5E' },
    info:    { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.35)', color: '#8B5CF6' },
  };
  const c = palette[kind];
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      padding: '12px 18px',
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px',
      color: c.color, fontSize: '13px', fontFamily: 'DM Mono, monospace',
      display: 'flex', alignItems: 'center', gap: '12px',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: 'fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
      maxWidth: '400px',
    }}>
      <span style={{ flex: 1, lineHeight: 1.5 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: c.color, cursor: 'pointer', fontSize: '16px', lineHeight: 1, opacity: 0.6, padding: 0, flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Shared nav button style helpers ─────────────────────────────
const navBtnStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-secondary)',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '7px 12px',
  cursor: 'pointer',
  fontFamily: 'DM Mono, monospace',
  transition: 'all 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};
function navBtnHoverIn(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.borderColor = 'var(--accent)';
  e.currentTarget.style.color = 'var(--text-primary)';
}
function navBtnHoverOut(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.borderColor = 'var(--border)';
  e.currentTarget.style.color = 'var(--text-secondary)';
  e.currentTarget.style.background = 'transparent';
}

// ─── Page ─────────────────────────────────────────────────────────
export default function Home() {
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<LeetCodeProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(message: string, kind: ToastKind, durationMs = 3500) {
    setToast({ message, kind });
    setTimeout(() => setToast(null), durationMs);
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    setProfile(null);
    try {
      const res = await fetch(`/api/profile?username=${encodeURIComponent(username.trim())}`);
      let data: { error?: string } = {};
      try { data = await res.json(); } catch {
        throw new Error(`Server error (${res.status} - unexpected response format)`);
      }
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setProfile(data as unknown as LeetCodeProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setProfile(null);
    setUsername('');
    setError('');
  }

  // ── Export ────────────────────────────────────────────────────
  function handleExport() {
    if (!profile) return;

    const raw = localStorage.getItem(`${STORAGE_PREFIX}${profile.username}`);
    if (!raw) {
      showToast('No SRS data found — solve some problems first.', 'info');
      return;
    }

    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      showToast('SRS data appears corrupted — cannot export.', 'error');
      return;
    }

    // Versioned envelope so future schema migrations can detect and handle it
    const envelope = {
      __version: BACKUP_VERSION,
      username: profile.username,
      exportedAt: new Date().toISOString(),
      data: parsed,
    };

    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leetinsight_backup_${profile.username}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const count =
      typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? Object.keys(parsed as object).length
        : 0;
    showToast(`Exported ${count} problem${count !== 1 ? 's' : ''} successfully.`, 'success');
  }

  // ── Import ────────────────────────────────────────────────────
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    if (!profile) return;
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting the same file

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const result = validateBackup(parsed);

        if (!result) {
          showToast('Invalid backup — no valid SRS states found inside.', 'error');
          return;
        }

        const { record, fromUser } = result;
        const crossUser = fromUser && fromUser !== profile.username;

        // Write only the validated record (not the envelope) to storage
        localStorage.setItem(`${STORAGE_PREFIX}${profile.username}`, JSON.stringify(record));

        const count = Object.keys(record).length;
        const msg = crossUser
          ? `Restored ${count} problem${count !== 1 ? 's' : ''} from @${fromUser}'s backup.`
          : `Restored ${count} problem${count !== 1 ? 's' : ''} successfully.`;

        showToast(msg, 'success', 5000);

        // Soft remount: unmount Dashboard then remount so it picks up fresh
        // localStorage — avoids a jarring full page reload.
        const saved = profile;
        setProfile(null);
        setTimeout(() => setProfile(saved), 50);

      } catch {
        showToast('Could not parse file — make sure it is a valid JSON backup.', 'error');
      }
    };
    reader.readAsText(file);
  }

  return (
    <main style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} />}

      {/* Hidden file input — triggered by Import button via ref */}
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7, 7, 12, 0.85)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1160px', margin: '0 auto', padding: '0 28px',
          height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
              <path d="M2 12l10 5 10-5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
            </svg>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              LeetInsight
            </span>
            <span style={{
              fontSize: '9px', fontFamily: 'DM Mono, monospace', color: 'var(--accent)',
              letterSpacing: '0.12em', background: 'var(--accent-light)',
              border: '1px solid rgba(139,92,246,0.3)', borderRadius: '4px', padding: '2px 6px',
            }}>
              BETA
            </span>
          </div>

          {profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => fileInputRef.current?.click()} style={navBtnStyle}
                onMouseEnter={navBtnHoverIn} onMouseLeave={navBtnHoverOut}
                title="Restore from a .json backup file">
                <span style={{ fontSize: '11px' }}>↓</span> Import
              </button>

              <button onClick={handleExport} style={navBtnStyle}
                onMouseEnter={navBtnHoverIn} onMouseLeave={navBtnHoverOut}
                title="Download your SRS data as a backup">
                <span style={{ fontSize: '11px' }}>↑</span> Export
              </button>

              <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

              <button
                onClick={handleReset}
                style={{ ...navBtnStyle, padding: '7px 16px' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.color = 'var(--accent)';
                  e.currentTarget.style.background = 'var(--accent-light)';
                }}
                onMouseLeave={navBtnHoverOut}
              >
                <span style={{ fontSize: '11px' }}>←</span> New Search
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── Landing ─────────────────────────────────────────── */}
      {!profile && !loading && (
        <div style={{
          minHeight: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.15) 0%, transparent 60%),
              radial-gradient(ellipse 50% 30% at 80% 60%, rgba(6,182,212,0.08) 0%, transparent 50%),
              radial-gradient(ellipse 40% 40% at 20% 80%, rgba(139,92,246,0.05) 0%, transparent 50%)
            `,
          }} />
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
            backgroundSize: '60px 60px', opacity: 0.25,
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          }} />

          <div className="animate-fade-up" style={{ maxWidth: '560px', width: '100%', position: 'relative', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              marginBottom: '28px', padding: '6px 14px',
              background: 'var(--accent-light)', border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '999px', fontSize: '11px', fontFamily: 'DM Mono, monospace',
              color: 'var(--accent)', letterSpacing: '0.08em',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)',
                boxShadow: '0 0 8px var(--accent)', display: 'inline-block',
                animation: 'pulse-glow 2s ease-in-out infinite',
              }} />
              DEEP LEETCODE ANALYTICS
            </div>

            <h1 style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 'clamp(40px, 6vw, 62px)',
              lineHeight: 1.05, color: 'var(--text-primary)',
              marginBottom: '16px', letterSpacing: '-0.02em',
            }}>
              Know your code,{' '}
              <span style={{
                fontStyle: 'italic',
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                know yourself.
              </span>
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1.65, margin: '0 auto 36px', maxWidth: '440px' }}>
              Beyond stats — uncover your solver personality, burnout risk, topic weaknesses,
              and a real path to interview readiness.
            </p>

            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}>@</span>
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="leetcode-username" autoFocus suppressHydrationWarning
                  style={{
                    width: '100%', padding: '15px 18px 15px 34px',
                    border: '1px solid var(--border)', borderRadius: '12px',
                    fontSize: '15px', background: 'var(--surface)', color: 'var(--text-primary)',
                    fontFamily: 'DM Mono, monospace', outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button
                type="submit" disabled={loading || !username.trim()} suppressHydrationWarning
                style={{
                  width: '100%', padding: '15px 24px',
                  background: 'linear-gradient(135deg, var(--accent) 0%, #7C3AED 100%)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontSize: '15px', fontFamily: 'DM Mono, monospace', fontWeight: 500,
                  cursor: loading || !username.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !username.trim() ? 0.5 : 1,
                  transition: 'opacity 0.2s, transform 0.1s, box-shadow 0.2s', letterSpacing: '0.02em',
                  boxShadow: loading || !username.trim() ? 'none' : '0 0 24px rgba(139,92,246,0.4)',
                }}
                onMouseEnter={(e) => { if (!loading && username.trim()) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 36px rgba(139,92,246,0.6)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = loading || !username.trim() ? 'none' : '0 0 24px rgba(139,92,246,0.4)'; }}
              >
                {loading ? 'Analyzing...' : 'Run Analysis →'}
              </button>
            </form>

            {error && (
              <div style={{
                marginTop: '16px', padding: '12px 16px',
                background: 'var(--danger-light)', border: '1px solid rgba(244,63,94,0.3)',
                borderRadius: '10px', color: 'var(--danger)',
                fontSize: '13px', fontFamily: 'DM Mono, monospace', textAlign: 'left',
              }}>⚠ {error}</div>
            )}

            <div style={{ marginTop: '40px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {FEATURES.map((f) => (
                <span key={f.label} style={{
                  fontSize: '11px', fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)',
                  padding: '5px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  <span style={{ color: 'var(--accent)', fontSize: '10px' }}>{f.icon}</span>
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────── */}
      {loading && (
        <div style={{ maxWidth: '1160px', margin: '48px auto', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 28px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '20px' }}>
            <div className="skeleton" style={{ width: '52px', height: '52px', borderRadius: '10px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: '18px', width: '180px', marginBottom: '10px', borderRadius: '6px' }} />
              <div className="skeleton" style={{ height: '13px', width: '280px', borderRadius: '6px' }} />
            </div>
          </div>
          <div className="skeleton" style={{ height: '180px', borderRadius: '16px', marginBottom: '16px' }} />
          <div className="skeleton" style={{ height: '120px', borderRadius: '16px', marginBottom: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '220px', borderRadius: '14px' }} />)}
          </div>
          <div className="skeleton" style={{ height: '160px', borderRadius: '14px' }} />
        </div>
      )}

      {/* ── Dashboard ────────────────────────────────────────── */}
      {profile && !loading && (
        <div style={{ paddingTop: '36px' }}>
          <Dashboard profile={profile} />
        </div>
      )}
    </main>
  );
}