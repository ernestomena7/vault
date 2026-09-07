import * as React from 'react';
/** Transient glass notification — appears over content, top or bottom corner of the viewport. */
export interface ToastProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  title: string;
  description?: string;
  onClose?: () => void;
  style?: React.CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
