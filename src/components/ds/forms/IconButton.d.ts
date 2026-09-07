import * as React from 'react';
/** A square icon-only control for toolbars and table rows. Always requires an aria-label. */
export interface IconButtonProps {
  /** Lucide icon name */
  icon: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  'aria-label': string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
