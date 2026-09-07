import * as React from 'react';
/** Round user avatar — image when `src` is given, else colored initials. */
export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}
export declare function Avatar(props: AvatarProps): JSX.Element;
