import * as React from 'react';
/** Single-line text field. Covers text, email, password, number, search — set `type` as on a native input. */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  /** Leading Lucide icon name */
  icon?: string;
  /** Trailing element, e.g. a clear IconButton */
  trailing?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;
