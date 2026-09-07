function VideoThumb({ size = 64 }) {
  const { Icon } = window.VaultDesignSystem_72e5ce;
  return (
    <div style={{
      width: size, height: size * 0.62, borderRadius: 'var(--radius-sm)', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--neutral-700), var(--neutral-600))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)',
    }}>
      <Icon name="play" size={size * 0.22} color="var(--text-tertiary)" />
    </div>
  );
}

function AppShell({ active, onNavigate, children }) {
  const { Sidebar, Avatar, Input } = window.VaultDesignSystem_72e5ce;
  const user = window.VaultData.currentUser;
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-app)', fontFamily: 'var(--font-sans)' }}>
      <Sidebar
        items={[
          { value: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
          { value: 'uploads', label: 'Uploads', icon: 'upload-cloud' },
          { value: 'approvals', label: 'Approvals', icon: 'check-circle-2' },
          { value: 'admin', label: 'Admin', icon: 'shield' },
        ]}
        activeValue={active}
        onChange={onNavigate}
        footer={
          <div onClick={() => onNavigate('profile')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 'var(--radius-md)', cursor: 'pointer', background: active === 'profile' ? 'var(--accent-subtle-bg)' : 'transparent' }}>
            <Avatar name={user.name} size="sm" />
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)', fontWeight: 'var(--fw-medium)' }}>{user.name}</div>
          </div>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ width: 280 }}><Input icon="search" placeholder="Search uploads, folders, people…" size="sm" /></div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>vault.company.com</div>
        </div>
        <div style={{ flex: 1, padding: 28 }}>{children}</div>
      </div>
    </div>
  );
}

window.VaultUI = Object.assign(window.VaultUI || {}, { VideoThumb, AppShell });
