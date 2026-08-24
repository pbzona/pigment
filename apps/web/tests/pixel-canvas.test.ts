import { describe, expect, it } from "vitest";

import {
  fitGuideRegion,
  fittedCanvasZoom,
  increaseCanvasZoom,
  shouldRefitCanvas,
} from "@/components/studio/pixel-canvas";

describe("guideline grid", () => {
  it("fits square cells inside a landscape image", () => {
    expect(fitGuideRegion(800, 600, 4, 4)).toEqual({
      x: 0.125,
      y: 0,
      width: 0.75,
      height: 1,
    });
  });

  it("fits rectangular grids using one cell size", () => {
    expect(fitGuideRegion(800, 600, 4, 3)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });
});

describe("canvas zoom", () => {
  it("snaps to an integer before reaching grid-visible zoom levels", () => {
    let zoom = 0.6;
    const visibleZooms: number[] = [];

    while (zoom < 12) {
      zoom = increaseCanvasZoom(zoom);
      if (zoom >= 8) visibleZooms.push(zoom);
    }

    expect(visibleZooms).toEqual([8, 10, 12]);
  });

  it("does not exceed the maximum zoom", () => {
    expect(increaseCanvasZoom(40)).toBe(40);
  });

  it("fits the artwork when the canvas viewport narrows", () => {
    const zoom = fittedCanvasZoom(320, 516, 64, 16);

    expect(zoom).toBe(3);
    expect(64 * zoom + 82).toBeLessThanOrEqual(320);
  });

  it("reserves vertical space for the canvas toolbar", () => {
    const zoom = fittedCanvasZoom(672, 668, 60, 64);

    expect(zoom).toBe(8);
    expect(64 * zoom + 130).toBeLessThanOrEqual(668);
  });

  it("lets a fitted high-resolution grid advance by a visible zoom step", () => {
    const fitted = fittedCanvasZoom(1040, 900, 512, 512);

    expect(fitted).toBe(1);
    expect(increaseCanvasZoom(fitted)).toBeGreaterThanOrEqual(fitted * 1.25);
  });

  it("does not refit when zoom only changes the scrollable canvas content", () => {
    expect(
      shouldRefitCanvas(
        { width: 832, height: 948 },
        { width: 832, height: 948 },
      ),
    ).toBe(false);
    expect(
      shouldRefitCanvas(
        { width: 832, height: 948 },
        { width: 640, height: 948 },
      ),
    ).toBe(true);
  });
});
