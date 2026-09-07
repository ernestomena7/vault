function ApprovalsScreen() {
  const { Card, Avatar, Button, Tabs, Dialog, Textarea } = window.VaultDesignSystem_72e5ce;
  const { VideoThumb } = window.VaultUI;
  const { approvalQueue } = window.VaultData;
  const [tab, setTab] = React.useState('pending');
  const [rejecting, setRejecting] = React.useState(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', height: '100%' }}>
      <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>Approvals</div>
      <Tabs items={[{ value: 'pending', label: `Pending (${approvalQueue.length})` }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} value={tab} onChange={setTab} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {approvalQueue.map(item => (
          <Card key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <VideoThumb size={72} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-md)', color: 'var(--text-primary)' }}>{item.name}</div>
              <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-tertiary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{item.folder}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Avatar name={item.owner} size="sm" />
                <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>{item.owner} · submitted {item.submitted}</span>
              </div>
            </div>
            <Button variant="secondary" icon="x" onClick={() => setRejecting(item)}>Reject</Button>
            <Button variant="primary" icon="check">Approve</Button>
          </Card>
        ))}
      </div>
      <Dialog
        open={!!rejecting}
        title={`Reject ${rejecting ? rejecting.name : ''}?`}
        description="This sends the video back to the uploader with your note."
        onClose={() => setRejecting(null)}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => setRejecting(null)}>Reject video</Button>
        </>}
      >
        <Textarea label="Reason for rejection" rows={3} placeholder="Explain what needs to change…" />
      </Dialog>
    </div>
  );
}
window.VaultUI = Object.assign(window.VaultUI || {}, { ApprovalsScreen });
