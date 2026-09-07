function ProfileScreen() {
  const { Card, Avatar, Input, Switch, Button, IconButton } = window.VaultDesignSystem_72e5ce;
  const user = window.VaultData.currentUser;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
      <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>Profile</div>
      <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar name={user.name} size="lg" />
        <div>
          <div style={{ fontSize: 'var(--text-heading-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{user.name}</div>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-tertiary)' }}>{user.role}</div>
        </div>
      </Card>
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input label="Name" defaultValue={user.name} />
        <Input label="Email" defaultValue={user.email} />
        <Switch label="Email me when a video is approved or rejected" checked />
        <Switch label="Auto-approve my own re-uploads" checked={false} />
      </Card>
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>Personal API token</div>
        <Input defaultValue="vlt_live_9f3a2b7c21e4" readOnly trailing={<IconButton icon="copy" aria-label="Copy token" />} style={{ fontFamily: 'var(--font-mono)' }} />
      </Card>
      <Button variant="danger" style={{ alignSelf: 'flex-start' }} icon="log-out">Sign out</Button>
    </div>
  );
}
window.VaultUI = Object.assign(window.VaultUI || {}, { ProfileScreen });
