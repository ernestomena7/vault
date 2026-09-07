function AdminScreen() {
  const { Card, Tabs, Table, Avatar, Switch, Select, Button, Tag } = window.VaultDesignSystem_72e5ce;
  const { users, namingTemplates } = window.VaultData;
  const [tab, setTab] = React.useState('users');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>Admin</div>
        {tab === 'users' && <Button variant="primary" icon="user-plus" size="sm">Invite person</Button>}
      </div>
      <Tabs items={[{ value: 'users', label: 'Users' }, { value: 'folders', label: 'Folders' }, { value: 'naming', label: 'Naming rules' }]} value={tab} onChange={setTab} />
      {tab === 'users' && (
        <Card padding={0}>
          <div style={{ padding: '4px 20px 16px' }}>
            <Table
              columns={[
                { key: 'name', label: 'Person', render: r => <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={r.name} size="sm" /><div><div style={{ color: 'var(--text-primary)' }}>{r.name}</div><div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-tertiary)' }}>{r.email}</div></div></div> },
                { key: 'role', label: 'Role' },
                { key: 'active', label: 'Active', render: r => <Switch checked={r.active} /> },
              ]}
              rows={users}
            />
          </div>
        </Card>
      )}
      {tab === 'folders' && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {['/marketing/q3-launch', '/leadership/all-hands', '/product/demo-reel', '/support/training'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-md)', color: 'var(--text-primary)' }}>{f}</span>
              <Select options={[{ value: 'auto', label: 'Auto-approve' }, { value: 'review', label: 'Requires review' }]} value="review" style={{ width: 200 }} />
            </div>
          ))}
        </Card>
      )}
      {tab === 'naming' && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {namingTemplates.map(t => (
            <div key={t.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Tag>{t.label}</Tag>
              <Switch checked={t.value === 'std'} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
window.VaultUI = Object.assign(window.VaultUI || {}, { AdminScreen });
