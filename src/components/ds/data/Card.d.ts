import * as React from 'react';
/** Base surface container — opaque, hairline border, no shadow. The building block for dashboard panels, list rows, settings sections. */
export interface CardProps {
  children: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
