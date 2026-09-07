import * as React from 'react';

export function ProgressBar({ value, indeterminate, style }) {
  return (
    <div style={{ height: 6, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-raised)', overflow: 'hidden', ...style }}>
      {indeterminate ? (
        <div style={{
          height: '100%', width: '100%', borderRadius: 'var(--radius-full)',
          backgroundImage: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          backgroundSize: '60% 100%', backgroundRepeat: 'no-repeat',
          animation: 'vault-progress-sweep 1.4s linear infinite',
        }} />
      ) : (
        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, value))}%`, background: 'var(--accent)', borderRadius: 'var(--radius-full)', transition: `width var(--duration-base) var(--ease-standard)` }} />
      )}
    </div>
  );
}
