import * as React from 'react';
/** Modal dialog — confirmations, the naming-convention picker, the rejection-reason form. Fixed to the viewport; no positioned ancestor needed. */
export interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
