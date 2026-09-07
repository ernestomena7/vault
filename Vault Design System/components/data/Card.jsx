import * as React from 'react';

export function Card({ children, padding = 20, style }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
      padding, fontFamily: 'var(--font-sans)', ...style,
    }}>{children}</div>
  );
}
