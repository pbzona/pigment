import { describe, expect, it } from "vitest";

import { increaseCanvasZoom } from "@/components/studio/pixel-canvas";

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
});
