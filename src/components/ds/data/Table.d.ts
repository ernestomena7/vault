import * as React from 'react';
export interface TableColumn { key: string; label: string; mono?: boolean; render?: (row: any) => React.ReactNode; }
/** Dense data table for uploads lists, admin user lists, activity logs. */
export interface TableProps {
  columns: TableColumn[];
  rows: any[];
  onRowClick?: (row: any) => void;
  style?: React.CSSProperties;
}
export declare function Table(props: TableProps): JSX.Element;
