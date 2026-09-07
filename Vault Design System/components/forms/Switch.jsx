import * as React from 'react';

export function Switch({ label, checked, disabled, onChange, style, ...rest }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'var(--font-sans)', ...style }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} style={{ display: 'none' }} {...rest} />
      <span style={{
        width: 36, height: 20, borderRadius: 'var(--radius-full)', position: 'relative', flexShrink: 0,
        background: checked ? 'var(--accent)' : 'var(--bg-surface-overlay)', border: '1px solid var(--border-subtle)',
        transition: `background var(--duration-base) var(--ease-standard)`,
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2, width: 14, height: 14, borderRadius: 'var(--radius-full)',
          background: '#fff', transition: `left var(--duration-base) var(--ease-standard)`,
        }} />
      </span>
      {label && <span style={{ fontSize: 'var(--text-body-md)', color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
