'use client';
import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

const SIZES = { sm: 28, md: 36, lg: 44 };
const ICON_SIZES = { sm: 15, md: 17, lg: 19 };
const BASE = { primary: 'var(--accent)', secondary: 'var(--bg-surface-raised)', ghost: 'transparent' };
const HOVER = { primary: 'var(--accent-hover)', secondary: 'var(--bg-surface-overlay)', ghost: 'var(--bg-surface-raised)' };
const COLOR = { primary: 'var(--text-on-accent)', secondary: 'var(--text-primary)', ghost: 'var(--text-secondary)' };

export function IconButton({ icon, variant = 'ghost', size = 'md', disabled, 'aria-label': ariaLabel, style, ...rest }) {
  const [hovered, setHovered] = React.useState(false);
  const dim = SIZES[size];
  return (
    <button
      aria-label={ariaLabel}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: dim, height: dim, border: variant === 'secondary' ? '1px solid var(--border-subtle)' : '1px solid transparent',
        borderRadius: 'var(--radius-md)', background: hovered && !disabled ? HOVER[variant] : BASE[variant],
        color: COLOR[variant], cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: `background var(--duration-fast) var(--ease-standard)`,
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZES[size]} />
    </button>
  );
}
