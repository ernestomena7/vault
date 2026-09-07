import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

export function Sidebar({ items, activeValue, onChange, footer, style }) {
  const [hovered, setHovered] = React.useState(null);
  return (
    <nav style={{
      display: 'flex', flexDirection: 'column', width: 232, height: '100%', padding: 12, boxSizing: 'border-box',
      background: 'var(--bg-canvas)', borderRight: '1px solid var(--border-subtle)', fontFamily: 'var(--font-sans)', gap: 2, ...style,
    }}>
      {items.map(item => {
        const active = item.value === activeValue;
        return (
          <button
            key={item.value}
            onClick={() => onChange && onChange(item.value)}
            onMouseEnter={() => setHovered(item.value)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 10px', border: 'none', textAlign: 'left',
              borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--text-body-md)', fontWeight: 'var(--fw-medium)',
              background: active ? 'var(--accent-subtle-bg)' : hovered === item.value ? 'var(--bg-surface-raised)' : 'transparent',
              color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
            }}
          >
            <Icon name={item.icon} size={17} color={active ? 'var(--accent-hover)' : 'var(--text-tertiary)'} />
            {item.label}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      {footer}
    </nav>
  );
}
