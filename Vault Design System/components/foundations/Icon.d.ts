import * as React from 'react';
/**
 * Renders one Lucide outline glyph as inline SVG (path data copied from Lucide, MIT/ISC),
 * so it recolors via currentColor/color and renders correctly under screenshot/export tooling.
 */
export interface IconProps {
  /** Lucide icon name, kebab-case. Only names used elsewhere in this system are registered — see Icon.jsx's ICONS map. */
  name: string;
  /** Pixel size, square. Default 20. */
  size?: number;
  /** Any CSS color, or "currentColor". Default "currentColor". */
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}
export declare function Icon(props: IconProps): JSX.Element;
