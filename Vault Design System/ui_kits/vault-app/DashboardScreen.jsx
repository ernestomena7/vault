function DashboardScreen({ onNavigate }) {
  const { Card, Table, Avatar, StatusPill, Icon, Breadcrumbs } = window.VaultDesignSystem_72e5ce;
  const { VideoThumb } = window.VaultUI;
  const { stats, uploads, currentUser } = window.VaultData;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 'var(--text-display-md)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>Welcome back, {currentUser.name.split(' ')[0]}</div>
        <div style={{ fontSize: 'var(--text-body-md)', color: 'var(--text-secondary)', marginTop: 4 }}>Here's what's moving through Vault this week.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Icon name={s.icon} size={18} color="var(--accent)" />
            <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-tertiary)' }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <Card padding={0}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 'var(--text-heading-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>Recent uploads</div>
          <div onClick={() => onNavigate('uploads')} style={{ fontSize: 'var(--text-body-sm)', color: 'var(--accent)', cursor: 'pointer' }}>View all</div>
        </div>
        <div style={{ padding: '4px 20px 16px' }}>
          <Table
            columns={[
              { key: 'name', label: 'File', render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <VideoThumb size={48} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-primary)' }}>{r.name}</div>
                    <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}><Breadcrumbs items={r.folder.split('/').filter(Boolean)} /></div>
                  </div>
                </div>
              ) },
              { key: 'owner', label: 'Owner', render: r => <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={r.owner} size="sm" />{r.owner}</div> },
              { key: 'duration', label: 'Duration', mono: true },
              { key: 'status', label: 'Status', render: r => <StatusPill status={r.status} /> },
            ]}
            rows={uploads}
          />
        </div>
      </Card>
    </div>
  );
}
window.VaultUI = Object.assign(window.VaultUI || {}, { DashboardScreen });
