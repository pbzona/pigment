import { describe, expect, it } from "vitest";

import {
  fittedCanvasZoom,
  increaseCanvasZoom,
} from "@/components/studio/pixel-canvas";

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
});
