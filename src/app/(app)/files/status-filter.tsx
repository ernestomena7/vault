'use client';

import { useRouter } from 'next/navigation';
import { Select } from '@/components/ds';

export function StatusFilter({
  statuses,
  selected,
}: {
  statuses: Array<{ id: number; name: string }>;
  selected: number | null;
}) {
  const router = useRouter();

  return (
    <div style={{ maxWidth: 260 }}>
      <Select
        label="Filter by status"
        value={selected === null ? '' : String(selected)}
        options={[
          { value: '', label: 'All statuses' },
          ...statuses.map((status) => ({ value: String(status.id), label: status.name })),
        ]}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
          const value = event.target.value;
          router.push(value === '' ? '/files' : `/files?status=${value}`);
        }}
      />
    </div>
  );
}
