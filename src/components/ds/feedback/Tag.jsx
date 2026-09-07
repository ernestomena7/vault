'use client';
import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

export function Tag({ children, onRemove, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 6px 0 10px',
      borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-secondary)', ...style,
    }}>
      {children}
      {onRemove && (
        <button onClick={onRemove} aria-label="Remove" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16,
          border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)',
        }}>
          <Icon name="x" size={12} />
        </button>
      )}
    </span>
  );
}
