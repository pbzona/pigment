import type { PaletteColor } from "@pigment/palette-catalog";

export function PaletteStrip({
  colors,
}: {
  colors: PaletteColor[];
}) {
  return (
    <div
      className="palette-strip palette-strip-card"
      role="img"
      aria-label={`Palette colors: ${colors.map((color) => color.hex).join(", ")}`}
    >
      {colors.map((color) => (
        <span
          key={`${color.position}-${color.hex}`}
          className="palette-swatch"
          style={{ backgroundColor: color.hex }}
          title={`${color.position + 1}. ${color.hex}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
