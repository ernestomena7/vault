import * as React from 'react';

export function Radio({ label, checked, disabled, onChange, name, style, ...rest }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'var(--font-sans)', ...style }}>
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} style={{ display: 'none' }} {...rest} />
      <span style={{
        width: 18, height: 18, borderRadius: 'var(--radius-full)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`, background: 'var(--bg-surface-raised)',
      }}>
        {checked && <span style={{ width: 9, height: 9, borderRadius: 'var(--radius-full)', background: 'var(--accent)' }} />}
      </span>
      {label && <span style={{ fontSize: 'var(--text-body-md)', color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
