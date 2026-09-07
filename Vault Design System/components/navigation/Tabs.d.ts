import * as React from 'react';
export interface TabItem { value: string; label: string; }
/** Underlined tab strip for switching between views within one screen (e.g. Uploads / Approvals / Archive). */
export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
