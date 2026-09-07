'use client';
import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

const SELECT_SIZES = { sm: 32, md: 40, lg: 48 };

export function Select({ label, options = [], value, onChange, helperText, error, disabled, size = 'md', style, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)', width: '100%', ...style }}>
      {label && <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>{label}</span>}
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', height: SELECT_SIZES[size] || SELECT_SIZES.md, padding: '0 36px 0 12px', appearance: 'none',
            font: 'inherit', fontSize: 'var(--text-body-md)', color: 'var(--text-primary)',
            background: disabled ? 'var(--bg-surface)' : 'var(--bg-surface-raised)',
            border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)', outline: 'none', boxShadow: focused ? 'var(--shadow-focus)' : 'none',
          }}
          {...rest}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Icon name="chevron-down" size={16} color="var(--text-tertiary)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      </div>
      {(helperText || error) && (
        <span style={{ fontSize: 'var(--text-body-sm)', color: error ? 'var(--danger)' : 'var(--text-tertiary)' }}>{error || helperText}</span>
      )}
    </label>
  );
}
