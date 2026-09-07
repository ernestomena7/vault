import * as React from 'react';
/** Primary interactive control. Variants map to the one accent color plus neutral/danger — no ad-hoc colors. */
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> {
  /** Native button behaviour — `submit` inside a form, `button` otherwise. */
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Lucide icon name shown before the label */
  icon?: string;
  /** Lucide icon name shown after the label */
  iconTrailing?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
