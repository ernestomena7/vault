'use client';
import * as React from 'react';
const TONE = {
  neutral: { bg: 'var(--bg-surface-overlay)', color: 'var(--text-secondary)' },
  accent: { bg: 'var(--accent-subtle-bg)', color: 'var(--accent-hover)' },
  success: { bg: 'var(--status-approved-bg)', color: 'var(--status-approved)' },
  warning: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending)' },
  danger: { bg: 'var(--status-rejected-bg)', color: 'var(--status-rejected)' },
};
export function Badge({ children, tone = 'neutral', style }) {
  const t = TONE[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px', borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-sans)', fontSize: 'var(--text-label)', fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', background: t.bg, color: t.color, ...style,
    }}>{children}</span>
  );
}
