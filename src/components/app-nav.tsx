'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Icon } from '@/components/ds';
import { VaultMark } from '@/components/vault-mark';
import type { Role } from '@/lib/db/schema';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { href: '/upload', label: 'Upload', icon: 'upload-cloud' },
  { href: '/my-files', label: 'My files', icon: 'film' },
  { href: '/files', label: 'Approvals', icon: 'check-circle-2', adminOnly: true },
  { href: '/taxonomy/statuses', label: 'Workflow', icon: 'layout-dashboard', adminOnly: true },
  { href: '/taxonomy/tree', label: 'Taxonomy', icon: 'folder', adminOnly: true },
  { href: '/users', label: 'Users', icon: 'user', adminOnly: true },
];

export function AppNav({ role, userName }: { role: Role; userName: string }) {
  const pathname = usePathname();
  // Admin-only entries are not rendered for an Uploader — absent, not disabled.
  const items = ITEMS.filter((item) => !item.adminOnly || role === 'admin');

  return (
    <nav
      style={{
        width: 232,
        flexShrink: 0,
        background: 'var(--bg-app)',
        borderRight: '1px solid var(--border-subtle)',
        padding: 'var(--space-6) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        // A plain column, not a grid: the items must pack at the top and stay
        // packed regardless of how tall the sidebar grows. A CSS grid here
        // would default to align-content: stretch and spread the rows apart
        // to fill the leftover height — which is exactly the bug this replaces.
        gap: 'var(--space-6)',
        height: '100%',
      }}
    >
      <div style={{ paddingInline: 'var(--space-2)' }}>
        <Link
          href="/upload"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--text-primary)',
          }}
        >
          <VaultMark size={22} style={{ color: 'var(--accent)' }} />
          <span
            style={{
              fontSize: 'var(--text-heading-md)',
              fontWeight: 'var(--fw-bold)',
              letterSpacing: '-0.02em',
            }}
          >
            Vault
          </span>
        </Link>
      </div>

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
        }}
      >
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--accent-subtle-bg)' : 'transparent',
                  fontSize: 'var(--text-body-md)',
                  fontWeight: active ? 'var(--fw-semibold)' : 'var(--fw-regular)',
                }}
              >
                <Icon name={item.icon} size={17} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Pushes the account block to the bottom without stretching the list above. */}
      <div style={{ flex: 1 }} />

      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 'var(--space-4)',
          display: 'grid',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ paddingInline: 'var(--space-3)' }}>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>
            {userName}
          </div>
          <div className="eyebrow">{role === 'admin' ? 'Admin' : 'Uploader'}</div>
        </div>
        <button
          type="button"
          onClick={() => void signOut({ redirectTo: '/sign-in' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: 0,
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-body-md)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Icon name="log-out" size={17} />
          Sign out
        </button>
      </div>
    </nav>
  );
}
