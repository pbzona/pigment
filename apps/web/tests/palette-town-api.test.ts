import { beforeEach, describe, expect, it, vi } from "vitest";

const catalog = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  queryApiTags: vi.fn(),
  withDatabaseSnapshot: vi.fn(),
}));

vi.mock("@pigment/palette-catalog/server/runtime", async (importOriginal) => ({
  ...(await importOriginal()),
  ...catalog,
}));

import { GET as listTags } from "@/app/api/palette-tags/route";

beforeEach(() => {
  vi.clearAllMocks();
  catalog.getDatabase.mockResolvedValue({});
  catalog.withDatabaseSnapshot.mockImplementation(
    async (_database, read: (snapshot: object) => Promise<unknown>) => read({}),
  );
});

describe("integrated palette archive routes", () => {
  it("loads tags from the catalog database", async () => {
    catalog.queryApiTags.mockResolvedValue([
      { name: "retro", paletteCount: 4 },
    ]);

    const response = await listTags();

    expect(response.status).toBe(200);
    expect(catalog.getDatabase).toHaveBeenCalledOnce();
    expect(catalog.queryApiTags).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({
      data: [{ name: "retro", paletteCount: 4 }],
    });
  });
});
