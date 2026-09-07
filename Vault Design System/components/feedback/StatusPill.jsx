import * as React from 'react';
import { Icon } from '../foundations/Icon.jsx';

const TONE = {
  pending: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending)', icon: 'clock' },
  approved: { bg: 'var(--status-approved-bg)', color: 'var(--status-approved)', icon: 'check-circle-2' },
  rejected: { bg: 'var(--status-rejected-bg)', color: 'var(--status-rejected)', icon: 'x-circle' },
  processing: { bg: 'var(--status-processing-bg)', color: 'var(--status-processing)', icon: 'loader-2' },
};
const LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', processing: 'Processing' };

/**
 * `status` picks the tone; `label` overrides the displayed text.
 *
 * The label override exists because a Vault deployment defines its own approval
 * statuses — a workflow may have "In review" or "Published" alongside the four
 * canonical tones. The pill still carries one of the four semantic colors, so
 * status reads consistently no matter what a workflow calls its steps.
 */
export function StatusPill({ status, label, style }) {
  const t = TONE[status] || TONE.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 'var(--radius-full)',
      background: t.bg, color: t.color, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--fw-semibold)', ...style,
    }}>
      <Icon name={t.icon} size={13} color={t.color} style={status === 'processing' ? { animation: 'vault-spin 1s linear infinite' } : undefined} />
      {label || LABEL[status]}
    </span>
  );
}
