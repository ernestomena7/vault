import * as React from 'react';

export function Tabs({ items, value, onChange, style }) {
  const [hovered, setHovered] = React.useState(null);
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-sans)', ...style }}>
      {items.map(item => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            onClick={() => onChange && onChange(item.value)}
            onMouseEnter={() => setHovered(item.value)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: 'relative', border: 'none', background: 'none', cursor: 'pointer',
              padding: '10px 14px', fontSize: 'var(--text-body-md)', fontWeight: 'var(--fw-medium)',
              color: active ? 'var(--text-primary)' : hovered === item.value ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            }}
          >
            {item.label}
            {active && <span style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: 'var(--accent)', borderRadius: 'var(--radius-full)' }} />}
          </button>
        );
      })}
    </div>
  );
}
