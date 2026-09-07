function PlayerScreen() {
  const { Icon, ProgressBar, Badge, IconButton, Card } = window.VaultDesignSystem_72e5ce;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-md)', color: 'var(--text-primary)' }}>onboarding_2026-09-02_v3.mp4</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Badge tone="warning">Temporary link</Badge>
          <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-tertiary)' }}>Expires in 5h 42m · streaming only, download disabled</span>
        </div>
      </div>
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--neutral-800), var(--neutral-700))', border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-glass)',
          backdropFilter: 'blur(var(--blur-panel))', WebkitBackdropFilter: 'blur(var(--blur-panel))',
          border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><Icon name="play" size={28} color="var(--text-primary)" /></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8, background: 'linear-gradient(transparent, rgba(0,0,0,0.55))' }}>
          <ProgressBar value={38} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconButton icon="play" variant="ghost" aria-label="Play" style={{ color: '#fff' }} />
            <IconButton icon="volume-2" variant="ghost" aria-label="Volume" style={{ color: '#fff' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: '#fff' }}>01:36 / 04:12</span>
            <div style={{ flex: 1 }} />
            <IconButton icon="maximize" variant="ghost" aria-label="Fullscreen" style={{ color: '#fff' }} />
          </div>
        </div>
      </div>
      <Card style={{ display: 'flex', gap: 24 }}>
        <div><div style={{ fontSize: 'var(--text-label)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Uploaded by</div><div style={{ fontSize: 'var(--text-body-md)', color: 'var(--text-primary)', marginTop: 4 }}>Marta Reyes</div></div>
        <div><div style={{ fontSize: 'var(--text-label)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Folder</div><div style={{ fontSize: 'var(--text-body-md)', color: 'var(--text-primary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>/marketing/q3-launch</div></div>
        <div><div style={{ fontSize: 'var(--text-label)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Size</div><div style={{ fontSize: 'var(--text-body-md)', color: 'var(--text-primary)', marginTop: 4 }}>1.2 GB</div></div>
      </Card>
    </div>
  );
}
window.VaultUI = Object.assign(window.VaultUI || {}, { PlayerScreen });
