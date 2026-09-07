import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

/**
 * Drag-and-drop video upload target — the entry point to Vault's core upload flow.
 *
 * The component owns a hidden file input, so both dropping and browsing deliver
 * files through the same `onFiles` callback. Consumers do not wire their own
 * input; that is what keeps every upload surface in the product identical.
 */
export function FileDropzone({
  state = 'idle',
  fileName,
  progress = 0,
  errorText,
  accept = 'video/*',
  multiple = false,
  disabled = false,
  onFiles,
  onBrowse,
  style,
}) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef(null);
  const isDragging = state === 'dragging' || dragging;

  const emit = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length > 0 && onFiles) onFiles(multiple ? files : files.slice(0, 1));
  };

  const browse = () => {
    if (disabled) return;
    if (onBrowse) onBrowse();
    inputRef.current?.click();
  };

  return (
    <div
      onDragEnter={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) emit(e.dataTransfer?.files);
      }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '32px 20px', borderRadius: 'var(--radius-lg)', textAlign: 'center', fontFamily: 'var(--font-sans)',
        border: `1.5px dashed ${state === 'error' ? 'var(--danger)' : isDragging ? 'var(--accent)' : 'var(--border-strong)'}`,
        background: isDragging ? 'var(--accent-subtle-bg)' : 'var(--bg-surface)',
        opacity: disabled ? 0.6 : 1,
        transition: `border-color var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)`,
        ...style,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={e => { emit(e.target.files); e.target.value = ''; }}
        style={{ display: 'none' }}
      />

      {state === 'uploading' ? (
        <>
          <Icon name="film" size={26} color="var(--accent)" />
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{fileName}</div>
          <div style={{ width: '70%', height: 6, background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 'var(--radius-full)' }} />
          </div>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-tertiary)' }}>{progress}% uploaded</div>
        </>
      ) : state === 'error' ? (
        <>
          <Icon name="alert-circle" size={26} color="var(--danger)" />
          <div style={{ fontSize: 'var(--text-body-md)', color: 'var(--danger)' }}>{errorText || "Hmm, that upload didn't go through."}</div>
          <button onClick={browse} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 'var(--text-body-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Try again</button>
        </>
      ) : (
        <>
          <Icon name="upload-cloud" size={26} color={isDragging ? 'var(--accent)' : 'var(--text-tertiary)'} />
          <div style={{ fontSize: 'var(--text-body-md)', color: 'var(--text-primary)' }}>Drag a video here, or <span onClick={browse} style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>browse</span></div>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-tertiary)' }}>MP4, MOV, or MKV up to 10GB</div>
        </>
      )}
    </div>
  );
}
