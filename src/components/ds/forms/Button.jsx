'use client';
import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

const SIZES = {
  sm: { height: 32, paddingInline: 12, fontSize: 'var(--text-body-sm)', gap: 6, iconSize: 15 },
  md: { height: 40, paddingInline: 16, fontSize: 'var(--text-body-md)', gap: 8, iconSize: 17 },
  lg: { height: 48, paddingInline: 20, fontSize: 'var(--text-body-lg)', gap: 8, iconSize: 19 },
};

const BASE = { primary: 'var(--accent)', secondary: 'var(--bg-surface-raised)', ghost: 'transparent', danger: 'var(--danger)' };
const HOVER = { primary: 'var(--accent-hover)', secondary: 'var(--bg-surface-overlay)', ghost: 'var(--bg-surface-raised)', danger: '#ff6376' };
const ACTIVE = { primary: 'var(--accent-active)', secondary: 'var(--bg-surface-overlay)', ghost: 'var(--bg-surface-overlay)', danger: 'var(--danger)' };
const TEXT = { primary: 'var(--text-on-accent)', secondary: 'var(--text-primary)', ghost: 'var(--text-secondary)', danger: '#fff' };
const BORDER = { primary: '1px solid transparent', secondary: '1px solid var(--border-subtle)', ghost: '1px solid transparent', danger: '1px solid transparent' };

export function Button({ variant = 'primary', size = 'md', icon, iconTrailing, loading, disabled, fullWidth, children, style, onClick, ...rest }) {
  const [pressed, setPressed] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const s = SIZES[size];
  const isDisabled = disabled || loading;
  const bg = isDisabled ? BASE[variant] : pressed ? ACTIVE[variant] : hovered ? HOVER[variant] : BASE[variant];
  return (
    <button
      disabled={isDisabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: s.gap,
        height: s.height, padding: `0 ${s.paddingInline}px`, width: fullWidth ? '100%' : undefined,
        fontFamily: 'var(--font-sans)', fontSize: s.fontSize, fontWeight: 'var(--fw-semibold)',
        color: TEXT[variant], background: bg, border: BORDER[variant],
        borderRadius: 'var(--radius-md)', cursor: isDisabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: `background var(--duration-fast) var(--ease-standard)`,
        outline: 'none', boxShadow: 'none',
        ...style,
      }}
      onFocus={e => { e.target.style.boxShadow = 'var(--shadow-focus)'; }}
      onBlur={e => { e.target.style.boxShadow = 'none'; }}
      {...rest}
    >
      {loading ? <Icon name="loader-2" size={s.iconSize} style={{ animation: 'vault-spin 0.8s linear infinite' }} /> : icon ? <Icon name={icon} size={s.iconSize} /> : null}
      {children}
      {!loading && iconTrailing ? <Icon name={iconTrailing} size={s.iconSize} /> : null}
    </button>
  );
}
