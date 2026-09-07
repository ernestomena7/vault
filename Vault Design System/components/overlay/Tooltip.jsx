import * as React from 'react';

export function Tooltip({ label, children, side = 'top' }) {
  const [open, setOpen] = React.useState(false);
  const pos = { top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }, bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 } }[side];
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && (
        <span style={{
          position: 'absolute', ...pos, whiteSpace: 'nowrap', padding: '5px 9px', borderRadius: 'var(--radius-sm)',
          background: 'var(--neutral-50)', color: 'var(--neutral-950)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body-sm)',
          fontWeight: 'var(--fw-medium)', boxShadow: 'var(--shadow-md)', zIndex: 200,
          animation: 'vault-fade-in var(--duration-fast) var(--ease-standard)',
        }}>{label}</span>
      )}
    </span>
  );
}
