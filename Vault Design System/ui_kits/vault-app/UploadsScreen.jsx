function UploadsScreen() {
  const { Card, FileDropzone, Select, Input, Table, StatusPill, Button, Tag, IconButton } = window.VaultDesignSystem_72e5ce;
  const { uploads, namingTemplates } = window.VaultData;
  const [template, setTemplate] = React.useState('std');
  const [state, setState] = React.useState('idle');
  const preview = namingTemplates.find(t => t.value === template).label
    .replace('{project}', 'q3-launch').replace('{date}', '2026-09-02').replace('{n}', '4').replace('{owner}', 'mreyes');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>Upload a video</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20 }}>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FileDropzone state={state} fileName="onboarding_v3.mp4" progress={64} onBrowse={() => setState(state === 'idle' ? 'uploading' : 'idle')} />
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-tertiary)' }}>Click the dropzone to preview upload states.</div>
        </Card>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Select label="Destination folder" options={[{ value: 'a', label: '/marketing/q3-launch' }, { value: 'b', label: '/leadership/all-hands' }, { value: 'c', label: '/product/demo-reel' }]} />
          <Select label="Naming convention" value={template} onChange={e => setTemplate(e.target.value)} options={namingTemplates} />
          <div>
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)', marginBottom: 6 }}>Resulting filename</div>
            <Tag>{preview}.mp4</Tag>
          </div>
          <Button variant="primary" icon="upload-cloud" fullWidth>Start upload</Button>
        </Card>
      </div>
      <Card padding={0}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontSize: 'var(--text-heading-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>All uploads</div>
        <div style={{ padding: '4px 20px 16px' }}>
          <Table
            columns={[
              { key: 'name', label: 'File', mono: true },
              { key: 'folder', label: 'Folder', mono: true },
              { key: 'size', label: 'Size', mono: true },
              { key: 'status', label: 'Status', render: r => <StatusPill status={r.status} /> },
              { key: 'actions', label: '', render: () => <IconButton icon="more-horizontal" aria-label="More" /> },
            ]}
            rows={uploads}
          />
        </div>
      </Card>
    </div>
  );
}
window.VaultUI = Object.assign(window.VaultUI || {}, { UploadsScreen });
