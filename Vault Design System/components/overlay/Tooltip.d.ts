import * as React from 'react';
/** Hover label wrapper — wrap any single element (usually an IconButton). */
export interface TooltipProps {
  label: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
}
export declare function Tooltip(props: TooltipProps): JSX.Element;
