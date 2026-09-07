import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

export function Checkbox({ label, checked, indeterminate, disabled, onChange, style, ...rest }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'var(--font-sans)', ...style }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} style={{ display: 'none' }} {...rest} />
      <span style={{
        width: 18, height: 18, borderRadius: 'var(--radius-sm)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked || indeterminate ? 'var(--accent)' : 'var(--bg-surface-raised)',
        border: checked || indeterminate ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
        transition: `background var(--duration-fast) var(--ease-standard)`,
      }}>
        {(checked || indeterminate) && <Icon name={indeterminate ? 'minus' : 'check'} size={13} color="var(--text-on-accent)" />}
      </span>
      {label && <span style={{ fontSize: 'var(--text-body-md)', color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
