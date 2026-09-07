'use client';
import * as React from 'react';

export function Textarea({ label, placeholder, helperText, error, rows = 4, disabled, style, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)', width: '100%', ...style }}>
      {label && <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>{label}</span>}
      <textarea
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          padding: '10px 12px', resize: 'vertical', font: 'inherit', fontSize: 'var(--text-body-md)',
          color: 'var(--text-primary)', background: disabled ? 'var(--bg-surface)' : 'var(--bg-surface-raised)',
          border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)', outline: 'none', boxShadow: focused ? 'var(--shadow-focus)' : 'none',
        }}
        {...rest}
      />
      {(helperText || error) && (
        <span style={{ fontSize: 'var(--text-body-sm)', color: error ? 'var(--danger)' : 'var(--text-tertiary)' }}>{error || helperText}</span>
      )}
    </label>
  );
}
