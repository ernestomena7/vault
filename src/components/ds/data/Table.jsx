'use client';
import * as React from 'react';

export function Table({ columns, rows, onRowClick, style }) {
  const [hoveredRow, setHoveredRow] = React.useState(null);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', ...style }}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} style={{
              textAlign: 'left', padding: '10px 12px', fontSize: 'var(--text-label)', color: 'var(--text-tertiary)',
              fontWeight: 'var(--fw-semibold)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase',
              borderBottom: '1px solid var(--border-subtle)',
            }}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            onClick={() => onRowClick && onRowClick(row)}
            onMouseEnter={() => setHoveredRow(i)}
            onMouseLeave={() => setHoveredRow(null)}
            style={{ background: hoveredRow === i ? 'var(--bg-surface-raised)' : 'transparent', cursor: onRowClick ? 'pointer' : 'default' }}
          >
            {columns.map(col => (
              <td key={col.key} style={{
                padding: '12px', fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)',
                borderBottom: '1px solid var(--bg-surface-raised)', fontFamily: col.mono ? 'var(--font-mono)' : 'inherit',
              }}>{col.render ? col.render(row) : row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
