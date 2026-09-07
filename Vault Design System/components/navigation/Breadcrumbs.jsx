import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

export function Breadcrumbs({ items, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', ...style }}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icon name="chevron-right" size={12} color="var(--text-tertiary)" />}
          <span style={{ color: i === items.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: i === items.length - 1 ? 'default' : 'pointer' }}>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
