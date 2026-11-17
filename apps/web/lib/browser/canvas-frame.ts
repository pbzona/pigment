import {
  MAX_GRID_SIDE,
  MIN_GRID_SIDE,
  type CanvasFrame,
  type PixelPaletteColor,
} from "@pigment/quantization";

/** Keep integer pixel cells square, even for ratios that do not divide 64. */
export function canvasGridDimensions(
  frame: Pick<CanvasFrame, "columns" | "rows">,
  axis: "width" | "height",
  value: number,
): Readonly<{ width: number; height: number }> {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(frame.columns, frame.rows);
  const width = frame.columns / divisor;
  const height = frame.rows / divisor;
  const minimum = Math.ceil(MIN_GRID_SIDE / Math.min(width, height));
  const maximum = Math.floor(MAX_GRID_SIDE / Math.max(width, height));
  const unit = Math.min(
    maximum,
    Math.max(minimum, Math.round(value / (axis === "width" ? width : height))),
  );
  return { width: width * unit, height: height * unit };
}

export function sameCanvasGeometry(
  a: CanvasFrame | null,
  b: CanvasFrame | null,
): boolean {
  if (!a || !b) return a === b;
  return (
    a.columns * b.rows === b.columns * a.rows &&
    a.scale === b.scale &&
    a.offsetX === b.offsetX &&
    a.offsetY === b.offsetY
  );
}

export function canvasBackground(
  frame: CanvasFrame | null,
  palette: readonly PixelPaletteColor[],
): PixelPaletteColor | undefined {
  return frame
    ? (palette.find((color) => color.id === frame.backgroundColorId) ??
        palette[0])
    : undefined;
}
