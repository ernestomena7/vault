import * as React from 'react';
/** Mono-type folder-path trail, e.g. the current Dropbox destination folder. */
export interface BreadcrumbsProps {
  items: string[];
  style?: React.CSSProperties;
}
export declare function Breadcrumbs(props: BreadcrumbsProps): JSX.Element;
