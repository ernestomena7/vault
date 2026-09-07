'use client';

import { StatusPill } from '@/components/ds';

/**
 * Approval statuses are defined by an Admin, so a deployment may have any number
 * of them with any names. The design system's pill carries one of four semantic
 * tones, so each status is mapped onto the tone that matches its meaning, by
 * name where recognisable and by position otherwise.
 *
 * The name shown is always the Admin's own (FR-044 keeps it English).
 */
type Tone = 'pending' | 'approved' | 'rejected' | 'processing';

const BY_NAME: Array<[RegExp, Tone]> = [
  [/reject|declin|denied/i, 'rejected'],
  [/approv|publish|live|done|complete/i, 'approved'],
  [/review|progress|processing|editing/i, 'processing'],
  [/pending|draft|new|queue/i, 'pending'],
];

export function toneFor(statusName: string, position: number, total: number): Tone {
  for (const [pattern, tone] of BY_NAME) {
    if (pattern.test(statusName)) return tone;
  }
  // Unrecognised names fall back to position: the last step reads as done,
  // the first as waiting, anything between as in flight.
  if (total > 1 && position >= total) return 'approved';
  if (position <= 1) return 'pending';
  return 'processing';
}

export function FileStatus({
  name,
  position,
  totalStatuses,
}: {
  name: string;
  position: number;
  totalStatuses: number;
}) {
  return <StatusPill status={toneFor(name, position, totalStatuses)} label={name} />;
}
