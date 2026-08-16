import { describe, expect, it } from "vitest";

import { restoreSparseValues, sparseValues } from "@/lib/browser/studio-project";

import { METHOD_INHERIT, NO_OVERRIDE_COLOR_ID } from "@pigment/quantization";

describe("Studio project sparse state", () => {
  it("round-trips regional method overrides", () => {
    const values = new Uint8Array(12);
    values.fill(METHOD_INHERIT);
    values[2] = 3;
    values[9] = 7;

    const restored = new Uint8Array(12);
    restored.fill(METHOD_INHERIT);
    restoreSparseValues(restored, sparseValues(values, METHOD_INHERIT));

    expect(restored).toEqual(values);
  });

  it("round-trips manual color overrides without serializing empty cells", () => {
    const values = new Int32Array(8);
    values.fill(NO_OVERRIDE_COLOR_ID);
    values[1] = 4;
    values[6] = 12;

    const sparse = sparseValues(values, NO_OVERRIDE_COLOR_ID);
    const restored = new Int32Array(8);
    restored.fill(NO_OVERRIDE_COLOR_ID);
    restoreSparseValues(restored, sparse);

    expect(sparse).toEqual([[1, 4], [6, 12]]);
    expect(restored).toEqual(values);
  });

  it("ignores stale indices when grid dimensions changed", () => {
    const restored = new Uint8Array(3);
    restored.fill(METHOD_INHERIT);

    restoreSparseValues(restored, [[1, 2], [9, 4]]);

    expect([...restored]).toEqual([METHOD_INHERIT, 2, METHOD_INHERIT]);
  });
});
