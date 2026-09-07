'use client';
import * as React from 'react';

const SIZES = { sm: 24, md: 32, lg: 40 };
const COLORS = ['#6e5bff', '#38bdf8', '#34d399', '#fbbf24', '#f2495c'];
function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h); return Math.abs(h); }

export function Avatar({ name, src, size = 'md', style }) {
  const dim = SIZES[size];
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';
  const bg = COLORS[hash(name || '?') % COLORS.length];
  return src ? (
    <img src={src} alt={name} style={{ width: dim, height: dim, borderRadius: 'var(--radius-full)', objectFit: 'cover', ...style }} />
  ) : (
    <div style={{
      width: dim, height: dim, borderRadius: 'var(--radius-full)', background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)',
      fontSize: dim * 0.4, fontWeight: 'var(--fw-semibold)', flexShrink: 0, ...style,
    }}>{initials}</div>
  );
}
