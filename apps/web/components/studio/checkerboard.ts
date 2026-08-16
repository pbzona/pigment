import type { PixelPaletteColor } from "@pigment/quantization";

const DARK_COLOR_LUMINANCE_THRESHOLD = 0.18;

const linearizeSrgbChannel = (channel: number) => {
  const srgb = channel / 255;
  return srgb <= 0.04045
    ? srgb / 12.92
    : ((srgb + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (red: number, green: number, blue: number) =>
  0.2126 * linearizeSrgbChannel(red) +
  0.7152 * linearizeSrgbChannel(green) +
  0.0722 * linearizeSrgbChannel(blue);

export const shouldUseLightCheckerboard = (
  palette: readonly PixelPaletteColor[],
  visibleColorIds: ReadonlySet<number> | null,
) => {
  if (!visibleColorIds?.size) return false;

  return palette.some(
    ({ id, color }) =>
      visibleColorIds.has(id) &&
      color.alpha > 0 &&
      relativeLuminance(color.r, color.g, color.b) <=
        DARK_COLOR_LUMINANCE_THRESHOLD,
  );
};
