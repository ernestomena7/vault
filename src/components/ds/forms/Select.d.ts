import * as React from 'react';
export interface SelectOption { value: string; label: string; }
/** Native single-select dropdown, styled to match Input. */
export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  /** Matches Input's scale, so a Select and an Input can sit on one row. */
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
