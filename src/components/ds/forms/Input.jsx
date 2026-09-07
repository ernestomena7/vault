'use client';
import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

export function Input({ label, placeholder, helperText, error, icon, trailing, disabled, size = 'md', style, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  const height = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)', width: '100%', ...style }}>
      {label && <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>{label}</span>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height, padding: '0 12px',
        background: disabled ? 'var(--bg-surface)' : 'var(--bg-surface-raised)',
        border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)', boxShadow: focused ? 'var(--shadow-focus)' : 'none',
        transition: `border-color var(--duration-fast) var(--ease-standard)`,
      }}>
        {icon && <Icon name={icon} size={16} color="var(--text-tertiary)" />}
        <input
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            font: 'inherit', fontSize: 'var(--text-body-md)', color: 'var(--text-primary)',
          }}
          {...rest}
        />
        {trailing}
      </div>
      {(helperText || error) && (
        <span style={{ fontSize: 'var(--text-body-sm)', color: error ? 'var(--danger)' : 'var(--text-tertiary)' }}>{error || helperText}</span>
      )}
    </label>
  );
}
