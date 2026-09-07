import * as React from 'react';
export interface SidebarItem { value: string; label: string; icon: string; }
/** Primary app navigation rail — Dashboard, Uploads, Approvals, Admin, etc. */
export interface SidebarProps {
  items: SidebarItem[];
  activeValue: string;
  onChange?: (value: string) => void;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Sidebar(props: SidebarProps): JSX.Element;
