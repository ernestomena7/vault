import type { ApprovalStatus } from '@/lib/db/schema';
import { ApiError } from '@/lib/http/errors';

/**
 * Transition legality.
 *
 * A file may move FORWARD exactly one position, or BACKWARD any number of
 * positions (FR-034). Forward steps cannot be skipped, so nothing bypasses a
 * review; backing a file out to the start is a single action.
 *
 * The rule is derived from `approval_statuses.position` and never stored.
 * Reordering statuses therefore changes what is legal immediately, with no
 * migration and nothing to keep in sync (research.md R-006).
 *
 * Pure function, no I/O — this is the unit under the mandatory transition suite.
 */

export type StatusLike = Pick<ApprovalStatus, 'id' | 'name' | 'position'> & {
  isActive?: boolean;
};

export function allowedTransitionsFor<T extends StatusLike>(
  currentPosition: number,
  statuses: readonly T[],
): T[] {
  return statuses
    .filter((status) => {
      if (status.position === currentPosition) return false;
      if (status.isActive === false) return false;
      // One step forward…
      if (status.position === currentPosition + 1) return true;
      // …or anywhere behind.
      return status.position < currentPosition;
    })
    .sort((a, b) => a.position - b.position);
}

export function isTransitionAllowed(
  currentPosition: number,
  targetPosition: number,
  statuses: readonly StatusLike[],
): boolean {
  return allowedTransitionsFor(currentPosition, statuses).some(
    (status) => status.position === targetPosition,
  );
}

/**
 * Throws unless the move is legal, naming the permitted targets so the caller
 * can show them rather than leaving the user guessing (FR-035).
 */
export function assertTransitionAllowed(
  current: StatusLike,
  target: StatusLike,
  statuses: readonly StatusLike[],
): void {
  if (current.id === target.id) {
    throw new ApiError('illegal_transition', `That file is already in ${target.name}.`);
  }

  if (!isTransitionAllowed(current.position, target.position, statuses)) {
    const allowed = allowedTransitionsFor(current.position, statuses);
    const forward = target.position > current.position;

    throw new ApiError(
      'illegal_transition',
      forward
        ? `A file can only move forward one step at a time. From ${current.name} the next step is ${
            allowed.find((s) => s.position === current.position + 1)?.name ?? 'not available'
          }.`
        : `${target.name} is not a valid destination from ${current.name}.`,
      { allowedStatusIds: allowed.map((s) => s.id) },
    );
  }
}
