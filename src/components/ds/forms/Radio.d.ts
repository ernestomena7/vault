import * as React from 'react';
/** Single radio option — group several with the same `name` for mutually-exclusive choice. */
export interface RadioProps {
  label?: string;
  name?: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
}
export declare function Radio(props: RadioProps): JSX.Element;
