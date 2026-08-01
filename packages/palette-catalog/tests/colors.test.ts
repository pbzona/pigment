import { describe, expect, it } from "vitest";

import {
  getColorMetrics,
  oklabDistanceSquared,
  parseHexColor,
  rgbToHex,
} from "../src/colors";

describe("color utilities", () => {
  it("parses compact and full hex colors", () => {
    expect(parseHexColor("#0af")).toEqual({
      red: 0,
      green: 170,
      blue: 255,
      alpha: 255,
    });
    expect(parseHexColor("F5EBDD")).toEqual({
      red: 245,
      green: 235,
      blue: 221,
      alpha: 255,
    });
    expect(parseHexColor("#0af8")).toEqual({
      red: 0,
      green: 170,
      blue: 255,
      alpha: 136,
    });
    expect(parseHexColor("not-a-color")).toBeNull();
  });

  it("normalizes RGB and RGBA colors to uppercase hex", () => {
    expect(rgbToHex({ red: 4, green: 16, blue: 255 })).toBe("#0410FF");
    expect(rgbToHex({ red: 4, green: 16, blue: 255, alpha: 128 })).toBe(
      "#0410FF80",
    );
  });

  it("produces stable perceptual distances", () => {
    const red = getColorMetrics({ red: 255, green: 0, blue: 0 });
    const nearRed = getColorMetrics({ red: 250, green: 10, blue: 10 });
    const blue = getColorMetrics({ red: 0, green: 0, blue: 255 });

    expect(oklabDistanceSquared(red, red)).toBe(0);
    expect(oklabDistanceSquared(red, nearRed)).toBeLessThan(
      oklabDistanceSquared(red, blue),
    );
  });
});
