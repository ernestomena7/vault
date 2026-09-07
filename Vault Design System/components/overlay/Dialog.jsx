import * as React from 'react';
import { IconButton } from '../forms/IconButton.jsx';

export function Dialog({ open, title, description, children, onClose, footer, style }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,8,11,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{
        width: 420, background: 'var(--bg-surface-glass)', backdropFilter: 'blur(var(--blur-panel))', WebkitBackdropFilter: 'blur(var(--blur-panel))',
        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)',
        padding: 24, fontFamily: 'var(--font-sans)', animation: 'vault-fade-in var(--duration-slow) var(--ease-standard)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', ...style,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 'var(--text-heading-md)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{title}</div>
            {description && <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', marginTop: 6 }}>{description}</div>}
          </div>
          <IconButton icon="x" aria-label="Close" onClick={onClose} />
        </div>
        {children && <div style={{ marginTop: 16 }}>{children}</div>}
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>{footer}</div>}
      </div>
    </div>
  );
}
