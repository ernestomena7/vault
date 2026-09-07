import * as React from 'react';
/** Linear progress track — upload/transcode progress. Use `indeterminate` when duration is unknown. */
export interface ProgressBarProps {
  /** 0-100, ignored when indeterminate */
  value?: number;
  indeterminate?: boolean;
  style?: React.CSSProperties;
}
export declare function ProgressBar(props: ProgressBarProps): JSX.Element;
