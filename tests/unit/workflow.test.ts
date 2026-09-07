import { describe, expect, it } from 'vitest';
import {
  allowedTransitionsFor,
  assertTransitionAllowed,
  isTransitionAllowed,
  type StatusLike,
} from '@/lib/workflow/transitions';
import { ApiError } from '@/lib/http/errors';

/**
 * Transition rules — mandatory under Constitution Principle V.
 *
 * The workflow below is five steps long on purpose: with fewer, "one step
 * forward" and "any step forward" produce the same answers and the suite would
 * pass while the rule was wrong.
 *
 * Rule (FR-034): forward exactly one position; backward any number.
 */
const WORKFLOW: StatusLike[] = [
  { id: 10, name: 'Pending', position: 1 },
  { id: 20, name: 'In review', position: 2 },
  { id: 30, name: 'Approved', position: 3 },
  { id: 40, name: 'Scheduled', position: 4 },
  { id: 50, name: 'Published', position: 5 },
];

const at = (position: number): StatusLike =>
  WORKFLOW.find((status) => status.position === position)!;

describe('allowedTransitionsFor', () => {
  it('from the first step, offers only the second', () => {
    expect(allowedTransitionsFor(1, WORKFLOW).map((s) => s.position)).toEqual([2]);
  });

  it('from the middle, offers every earlier step plus exactly one forward', () => {
    expect(allowedTransitionsFor(3, WORKFLOW).map((s) => s.position)).toEqual([1, 2, 4]);
  });

  it('from the last step, offers only backward moves', () => {
    expect(allowedTransitionsFor(5, WORKFLOW).map((s) => s.position)).toEqual([1, 2, 3, 4]);
  });

  it('never offers the status the file is already in', () => {
    for (const status of WORKFLOW) {
      const allowed = allowedTransitionsFor(status.position, WORKFLOW);
      expect(allowed.map((s) => s.position)).not.toContain(status.position);
    }
  });

  it('never offers a forward jump of more than one position', () => {
    for (const status of WORKFLOW) {
      const forward = allowedTransitionsFor(status.position, WORKFLOW).filter(
        (s) => s.position > status.position,
      );
      expect(forward.length).toBeLessThanOrEqual(1);
      for (const target of forward) {
        expect(target.position).toBe(status.position + 1);
      }
    }
  });

  it('returns targets in workflow order', () => {
    const positions = allowedTransitionsFor(4, WORKFLOW).map((s) => s.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('omits inactive statuses', () => {
    const withInactive: StatusLike[] = [
      { id: 10, name: 'Pending', position: 1, isActive: true },
      { id: 20, name: 'Retired', position: 2, isActive: false },
      { id: 30, name: 'Approved', position: 3, isActive: true },
    ];
    // The one legal forward step is inactive, so nothing forward is offered.
    expect(allowedTransitionsFor(1, withInactive).map((s) => s.id)).toEqual([]);
  });

  it('offers nothing in a single-status workflow', () => {
    expect(allowedTransitionsFor(1, [{ id: 1, name: 'Only', position: 1 }])).toEqual([]);
  });
});

describe('isTransitionAllowed', () => {
  const cases: Array<[number, number, boolean, string]> = [
    [1, 2, true, 'one step forward'],
    [1, 3, false, 'two steps forward'],
    [1, 5, false, 'jumping to the end'],
    [2, 1, true, 'one step back'],
    [5, 1, true, 'all the way back in one move'],
    [3, 2, true, 'one step back from the middle'],
    [3, 4, true, 'one step forward from the middle'],
    [3, 5, false, 'skipping a step forward'],
    [3, 3, false, 'staying put'],
  ];

  it.each(cases)('%i -> %i is %s (%s)', (from, to, expected) => {
    expect(isTransitionAllowed(from, to, WORKFLOW)).toBe(expected);
  });

  it('covers every ordered pair in the workflow', () => {
    // Exhaustive: no pair is left unasserted by the table above.
    for (const from of WORKFLOW) {
      for (const to of WORKFLOW) {
        const expected = to.position === from.position + 1 || to.position < from.position;
        expect(isTransitionAllowed(from.position, to.position, WORKFLOW)).toBe(expected);
      }
    }
  });
});

describe('assertTransitionAllowed', () => {
  it('permits a legal move', () => {
    expect(() => assertTransitionAllowed(at(2), at(3), WORKFLOW)).not.toThrow();
    expect(() => assertTransitionAllowed(at(5), at(1), WORKFLOW)).not.toThrow();
  });

  it('refuses a forward jump and names the step that is available', () => {
    const error = (() => {
      try {
        assertTransitionAllowed(at(1), at(4), WORKFLOW);
      } catch (caught) {
        return caught as InstanceType<typeof ApiError>;
      }
      throw new Error('expected a refusal');
    })();

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('illegal_transition');
    expect(error.status).toBe(422);
    // FR-035: the user is told where they can go, not just where they cannot.
    expect(error.message).toContain('In review');
    expect(error.details?.allowedStatusIds).toEqual([20]);
  });

  it('refuses moving a file to the status it is already in', () => {
    expect(() => assertTransitionAllowed(at(3), at(3), WORKFLOW)).toThrow(ApiError);
  });

  it('returns the permitted set with every refusal', () => {
    try {
      assertTransitionAllowed(at(3), at(5), WORKFLOW);
      throw new Error('expected a refusal');
    } catch (caught) {
      const error = caught as InstanceType<typeof ApiError>;
      expect(error.details?.allowedStatusIds).toEqual([10, 20, 40]);
    }
  });
});

describe('reordering statuses changes legality immediately', () => {
  it('needs no migration, because the rule reads position', () => {
    // "Approved" is at 3 and cannot be reached from 1.
    expect(isTransitionAllowed(1, 3, WORKFLOW)).toBe(false);

    // An Admin reorders so Approved sits at 2.
    const reordered: StatusLike[] = [
      { id: 10, name: 'Pending', position: 1 },
      { id: 30, name: 'Approved', position: 2 },
      { id: 20, name: 'In review', position: 3 },
    ];
    expect(isTransitionAllowed(1, 2, reordered)).toBe(true);
    expect(allowedTransitionsFor(1, reordered).map((s) => s.id)).toEqual([30]);
  });
});
