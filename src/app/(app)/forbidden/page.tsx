import Link from 'next/link';
import { Card, Icon } from '@/components/ds';

export const metadata = { title: 'No access · Vault' };

export default function ForbiddenPage() {
  return (
    <Card style={{ padding: 'var(--space-8)', textAlign: 'center', maxWidth: 460, margin: '0 auto' }}>
      <div style={{ color: 'var(--warning)', marginBottom: 'var(--space-4)' }}>
        <Icon name="shield" size={28} />
      </div>
      <h1 style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 'var(--fw-semibold)' }}>
        You do not have access to that
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
        That area is for administrators. If you think you should have access, ask an admin to
        change your role.
      </p>
      <p style={{ marginTop: 'var(--space-6)' }}>
        <Link href="/upload">Go to upload</Link>
      </p>
    </Card>
  );
}
