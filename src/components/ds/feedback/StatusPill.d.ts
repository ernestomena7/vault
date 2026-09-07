import * as React from 'react';
/** The approval-flow status indicator — used on every uploaded video everywhere in Vault. */
export interface StatusPillProps {
  /** Chooses the semantic color and icon. */
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  /**
   * Overrides the displayed text. Use it when a deployment names its workflow
   * steps itself (e.g. "In review", "Published") while still mapping each one
   * onto a canonical tone.
   */
  label?: string;
  style?: React.CSSProperties;
}
export declare function StatusPill(props: StatusPillProps): JSX.Element;
