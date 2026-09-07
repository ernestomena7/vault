import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

export function Toast({ tone = 'neutral', title, description, onClose, style }) {
  const icon = { neutral: 'info', success: 'check-circle-2', warning: 'alert-triangle', danger: 'alert-circle' }[tone];
  const color = { neutral: 'var(--text-secondary)', success: 'var(--status-approved)', warning: 'var(--status-pending)', danger: 'var(--status-rejected)' }[tone];
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', width: 340, padding: 14,
      background: 'var(--bg-surface-glass)', backdropFilter: 'blur(var(--blur-panel))', WebkitBackdropFilter: 'blur(var(--blur-panel))',
      border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
      fontFamily: 'var(--font-sans)', animation: 'vault-fade-in var(--duration-slow) var(--ease-standard)', ...style,
    }}>
      <Icon name={icon} size={18} color={color} style={{ marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--text-body-md)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{title}</div>
        {description && <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>{description}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}
