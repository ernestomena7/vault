import * as React from 'react';
/** Removable mono-type chip — folder paths, naming-convention tokens, applied filters. */
export interface TagProps {
  children: React.ReactNode;
  onRemove?: () => void;
  style?: React.CSSProperties;
}
export declare function Tag(props: TagProps): JSX.Element;
