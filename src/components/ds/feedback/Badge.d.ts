import * as React from 'react';
/** Small uppercase pill for counts and short labels ("NEW", "12", "v3"). Not for approval status — see StatusPill. */
export interface BadgeProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
