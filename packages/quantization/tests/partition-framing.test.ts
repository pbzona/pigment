import { describe, expect, it } from "vitest";

import { rgba } from "@pigment/color";
import {
  canvasFrameBackgroundMask,
  convertImage,
  createPartition,
  rasterizePartitionColors,
  type CanvasFrame,
  type PartitionFraming,
} from "@pigment/quantization";

const frame: CanvasFrame = {
  columns: 4,
  rows: 4,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  backgroundColorId: 42,
};
const source = () => {
  const pixels = new Uint8ClampedArray(128 * 64 * 4);
  for (let index = 0; index < 128 * 64; index += 1) pixels[index * 4 + 3] = 255;
  return pixels;
};

for (const kind of ["hex", "voronoi"] as const) {
  describe(`framed ${kind} rasterization`, () => {
    const width = 64;
    const height = 64;
    const scale = 6;
    const seed = 1;
    const framing: PartitionFraming = {
      backgroundMask: canvasFrameBackgroundMask(128, 64, frame, width, height),
      backgroundColorId: frame.backgroundColorId,
    };
    const convert = () =>
      convertImage(source(), 128, 64, {
        gridWidth: width,
        gridHeight: height,
        method: "average",
        partition: kind,
        partitionScale: scale,
        partitionSeed: seed,
        palette: [{ id: 10, color: rgba(0, 0, 0) }],
        frame,
        frameBackground: { id: 42, color: rgba(255, 255, 255) },
        preserveTransparency: true,
        alphaThreshold: 128,
      }).colorIds;

    it.each([1, 4, 7])(
      "preserves every pure background pixel at multiplier %s",
      (multiplier) => {
        const ids = convert();
        const result = rasterizePartitionColors(
          ids,
          width,
          height,
          kind,
          scale,
          seed,
          multiplier,
          framing,
        );
        let backgroundPixels = 0;
        for (let y = 0; y < result.height; y += 1) {
          for (let x = 0; x < result.width; x += 1) {
            const cellIndex =
              Math.floor(y / multiplier) * width + Math.floor(x / multiplier);
            if (!framing.backgroundMask[cellIndex]) continue;
            if (result.colorIds[y * result.width + x] !== 42) {
              throw new Error(`Changed background pixel at ${x},${y}.`);
            }
            backgroundPixels += 1;
          }
        }
        expect(backgroundPixels).toBe(32 * width * multiplier * multiplier);
      },
    );

    it("chooses image representatives rather than the first masked cell in mixed regions", () => {
      const ids = convert();
      const regions = createPartition(kind, width, height, scale, seed);
      const startsInMargin = new Set<number>();
      const seen = new Set<number>();
      for (let index = 0; index < ids.length; index += 1) {
        const region = regions.regionIds[index];
        if (seen.has(region)) continue;
        seen.add(region);
        if (framing.backgroundMask[index]) startsInMargin.add(region);
      }
      const result = rasterizePartitionColors(
        ids,
        width,
        height,
        kind,
        scale,
        seed,
        1,
        framing,
      );
      let checkedMixedCells = 0;
      for (let index = 0; index < ids.length; index += 1) {
        if (
          !framing.backgroundMask[index] &&
          startsInMargin.has(regions.regionIds[index])
        ) {
          expect(result.colorIds[index]).toBe(10);
          checkedMixedCells += 1;
        }
      }
      expect(checkedMixedCells).toBeGreaterThan(0);
    });

    it("preserves painted margin cells without using paint as an image region representative", () => {
      const ids = convert();
      // Painting every margin cell proves fully-masked regions still use the
      // explicit fill color internally, never leaking painted margins into image.
      for (let index = 0; index < ids.length; index += 1) {
        if (framing.backgroundMask[index])
          ids[index] = index % 2 === 0 ? 70 : 80;
      }
      const multiplier = 4;
      const result = rasterizePartitionColors(
        ids,
        width,
        height,
        kind,
        scale,
        seed,
        multiplier,
        framing,
      );
      let wrongMarginPixels = 0;
      let leakedPaintPixels = 0;
      for (let y = 0; y < result.height; y += 1) {
        for (let x = 0; x < result.width; x += 1) {
          const cellIndex =
            Math.floor(y / multiplier) * width + Math.floor(x / multiplier);
          const id = result.colorIds[y * result.width + x];
          if (framing.backgroundMask[cellIndex]) {
            if (id !== ids[cellIndex]) wrongMarginPixels += 1;
          } else if (id === 70 || id === 80) leakedPaintPixels += 1;
        }
      }
      expect(wrongMarginPixels).toBe(0);
      expect(leakedPaintPixels).toBe(0);
    });

    it("handles entirely background canvases and painted cells", () => {
      const backgroundMask = canvasFrameBackgroundMask(
        128,
        64,
        { ...frame, offsetX: 1 },
        4,
        4,
      );
      const ids = new Uint16Array(16).fill(42);
      ids[5] = 70;
      const result = rasterizePartitionColors(ids, 4, 4, kind, 2, seed, 3, {
        backgroundMask,
        backgroundColorId: 42,
      });
      expect([...result.colorIds].filter((id) => id === 70)).toHaveLength(9);
      expect([...result.colorIds].filter((id) => id === 42)).toHaveLength(135);
    });

    it("leaves legacy rasterization unchanged when framing is omitted or has no margins", () => {
      const regions = createPartition(kind, width, height, scale, seed);
      const ids = Uint16Array.from(
        regions.regionIds,
        (region) => (region % 5) + 10,
      );
      const legacy = rasterizePartitionColors(
        ids,
        width,
        height,
        kind,
        scale,
        seed,
        3,
      );
      expect(
        rasterizePartitionColors(
          ids,
          width,
          height,
          kind,
          scale,
          seed,
          3,
          undefined,
        ),
      ).toEqual(legacy);
      expect(
        rasterizePartitionColors(ids, width, height, kind, scale, seed, 3, {
          backgroundMask: new Uint8Array(width * height),
          backgroundColorId: 42,
        }),
      ).toEqual(legacy);
    });

    it("rejects a background mask with mismatched grid dimensions", () => {
      expect(() =>
        rasterizePartitionColors(new Uint16Array(16), 4, 4, kind, 2, seed, 1, {
          backgroundMask: new Uint8Array(15),
          backgroundColorId: 42,
        }),
      ).toThrow(
        "Frame background mask must match the partition grid dimensions.",
      );
    });
  });
}
