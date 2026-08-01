import { rgbToOklab, srgbByteToLinear } from "./conversion";

const HEX_COLOR_PATTERN = /^#?([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

export interface Rgb8Color {
  red: number;
  green: number;
  blue: number;
  alpha?: number;
}

export interface ColorMetrics {
  hex: string;
  red: number;
  green: number;
  blue: number;
  alpha: number;
  okL: number;
  okA: number;
  okB: number;
  chroma: number;
  hue: number | null;
  relativeLuminance: number;
}

export function rgb8ToHex({ red, green, blue, alpha = 255 }: Rgb8Color) {
  return `#${[red, green, blue, ...(alpha === 255 ? [] : [alpha])]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

export function parseHex8Color(value: string): Rgb8Color | null {
  const match = HEX_COLOR_PATTERN.exec(value.trim());
  if (!match) return null;

  const compact = match[1];
  const hex =
    compact.length === 3 || compact.length === 4
      ? compact
          .split("")
          .map((character) => character.repeat(2))
          .join("")
      : compact;

  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
    alpha: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) : 255,
  };
}

export function rgb8ToOklab({ red, green, blue, alpha = 255 }: Rgb8Color) {
  const color = rgbToOklab({ r: red, g: green, b: blue, alpha: alpha / 255 });
  return { okL: color.l, okA: color.a, okB: color.b };
}

export function getColorMetrics(color: Rgb8Color): ColorMetrics {
  const { okL, okA, okB } = rgb8ToOklab(color);
  const alpha = color.alpha ?? 255;
  const chroma = Math.hypot(okA, okB);
  const angle = (Math.atan2(okB, okA) * 180) / Math.PI;

  return {
    ...color,
    alpha,
    hex: rgb8ToHex({ ...color, alpha }),
    okL,
    okA,
    okB,
    chroma,
    hue: chroma < 0.00001 ? null : angle < 0 ? angle + 360 : angle,
    relativeLuminance:
      0.2126 * srgbByteToLinear(color.red) +
      0.7152 * srgbByteToLinear(color.green) +
      0.0722 * srgbByteToLinear(color.blue),
  };
}

export function oklabMetricsDistanceSquared(
  first: Pick<ColorMetrics, "okL" | "okA" | "okB">,
  second: Pick<ColorMetrics, "okL" | "okA" | "okB">,
) {
  return (
    (first.okL - second.okL) ** 2 +
    (first.okA - second.okA) ** 2 +
    (first.okB - second.okB) ** 2
  );
}
