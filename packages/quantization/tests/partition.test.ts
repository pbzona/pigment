import { describe, expect, it } from "vitest";

import {
  createHexPartition,
  createPoissonPartition,
  rasterizePartitionColors,
} from "../src/partition";

describe("polygon partitions", () => {
  it("creates deterministic Poisson partitions with full raster coverage", () => {
    const first = createPoissonPartition(64, 40, 6, 42, 48);
    const second = createPoissonPartition(64, 40, 6, 42, 48);

    expect(first.regionCount).toBeGreaterThan(20);
    expect(first.regionIds).toEqual(second.regionIds);
    expect(first.regionIds).toHaveLength(64 * 40);
    expect(Math.max(...first.regionIds)).toBeLessThan(first.regionCount);
  });

  it("changes the deterministic distribution when the seed changes", () => {
    const first = createPoissonPartition(32, 24, 5, 1);
    const second = createPoissonPartition(32, 24, 5, 2);
    expect(first.regionIds).not.toEqual(second.regionIds);
  });

  it("creates complete hex coverage", () => {
    const partition = createHexPartition(48, 32, 5);
    expect(partition.regionCount).toBeGreaterThan(10);
    expect(partition.regionIds).toHaveLength(48 * 32);
    expect(new Set(partition.regionIds).size).toBeGreaterThan(10);
  });

  it("rasterizes polygon regions at export resolution", () => {
    const colors = new Uint16Array(24 * 16).map((_, index) => index % 4);
    const rendered = rasterizePartitionColors(colors, 24, 16, "voronoi", 4, 8, 3);
    expect(rendered.width).toBe(72);
    expect(rendered.height).toBe(48);
    expect(rendered.colorIds).toHaveLength(72 * 48);
    expect(new Set(rendered.colorIds).size).toBeGreaterThan(1);
  });
});
