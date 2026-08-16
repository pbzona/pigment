import { describe, expect, it } from "vitest";

import {
  relativeLuminance,
  shouldUseLightCheckerboard,
} from "@/components/studio/checkerboard";

const color = (id: number, r: number, g: number, b: number, alpha = 1) => ({
  id,
  color: { r, g, b, alpha },
});

describe("isolated color checkerboard", () => {
  it("uses the dark checkerboard when colors are not isolated", () => {
    expect(shouldUseLightCheckerboard([color(1, 0, 0, 0)], null)).toBe(false);
  });

  it("uses the light checkerboard for a dark isolated color", () => {
    expect(
      shouldUseLightCheckerboard([color(1, 20, 24, 32)], new Set([1])),
    ).toBe(true);
  });

  it("keeps the dark checkerboard for a light isolated color", () => {
    expect(
      shouldUseLightCheckerboard([color(1, 240, 210, 40)], new Set([1])),
    ).toBe(false);
  });

  it("uses the light checkerboard when any of several isolated colors is dark", () => {
    const palette = [color(1, 245, 242, 232), color(2, 14, 18, 24)];

    expect(shouldUseLightCheckerboard(palette, new Set([1, 2]))).toBe(true);
  });

  it("uses perceptual luminance instead of averaging RGB channels", () => {
    expect(relativeLuminance(0, 0, 255)).toBeLessThan(0.18);
    expect(relativeLuminance(0, 255, 0)).toBeGreaterThan(0.18);
  });
});
