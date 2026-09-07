/**
 * The Vault brand mark.
 *
 * A vault-door bolt shackle, drawn with straight chamfered facets rather than a
 * smooth arc — a technical, schematic silhouette instead of a generic padlock
 * glyph. One flat colour, no gradient, per the design system's rule that the
 * accent carries every primary element on its own (`Vault Design System/
 * readme.md`, "Visual foundations"). No keyhole detail: at nav and favicon
 * sizes a keyhole cutout just blurs into a dot, so the shape alone has to read.
 *
 * `currentColor` throughout, so a parent can set `color` to reposition it (the
 * accent normally, `--text-on-accent` on a tile).
 */
export function VaultMark({
  size = 24,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
      role="img"
      aria-label="Vault"
    >
      {/* The shackle: a chamfered arch, not a circle — reads as engineered, not decorative. */}
      <path
        d="M20 32V22L27 15H37L44 22V32"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The body: the vault door itself. */}
      <rect x={15} y="30" width={34} height={22} rx={6} fill="currentColor" />
    </svg>
  );
}
