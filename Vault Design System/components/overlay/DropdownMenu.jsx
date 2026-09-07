import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

export function DropdownMenu({ trigger, items, open, onOpenChange, align = 'start' }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <span onClick={() => onOpenChange && onOpenChange(!open)}>{trigger}</span>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', marginTop: 6, [align === 'end' ? 'right' : 'left']: 0, minWidth: 180,
          background: 'var(--bg-surface-glass)', backdropFilter: 'blur(var(--blur-panel))', WebkitBackdropFilter: 'blur(var(--blur-panel))',
          border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          padding: 6, zIndex: 150, animation: 'vault-fade-in var(--duration-fast) var(--ease-standard)',
        }}>
          {items.map((item, i) => <MenuItem key={i} {...item} onOpenChange={onOpenChange} />)}
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, icon, danger, onSelect, onOpenChange }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { onSelect && onSelect(); onOpenChange && onOpenChange(false); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: 32, padding: '0 8px', border: 'none', textAlign: 'left',
        borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body-sm)',
        background: hovered ? 'var(--bg-surface-raised)' : 'transparent', color: danger ? 'var(--danger)' : 'var(--text-primary)',
      }}
    >
      {icon && <Icon name={icon} size={15} color={danger ? 'var(--danger)' : 'var(--text-tertiary)'} />}
      {label}
    </button>
  );
}
