import { beforeEach, describe, expect, it, vi } from "vitest";

const catalog = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  queryApiCatalog: vi.fn(),
  queryApiTags: vi.fn(),
  withDatabaseSnapshot: vi.fn(),
}));

vi.mock("@pigment/palette-catalog/server/runtime", async (importOriginal) => ({
  ...(await importOriginal()),
  ...catalog,
}));

import { GET as listTags } from "@/app/api/palette-tags/route";
import { GET as listPalettes } from "@/app/api/palettes/route";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.PALETTE_TOWN_URL;
  delete process.env.PALETTE_TOWN_API_KEY;
  catalog.getDatabase.mockResolvedValue({});
  catalog.withDatabaseSnapshot.mockImplementation(
    async (_database, read: (snapshot: object) => Promise<unknown>) => read({}),
  );
});

describe("integrated Palette Town routes", () => {
  it("loads palettes from Pigment's catalog database", async () => {
    catalog.queryApiCatalog.mockResolvedValue({
      palettes: [
        {
          id: "palette_test",
          name: "Test palette",
          colors: ["#112233"],
          colorCount: 1,
          tags: [],
          popularity: 0,
          author: null,
          attribution: null,
          createdAt: "2026-08-06T00:00:00.000Z",
          updatedAt: "2026-08-06T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 12,
      totalPages: 1,
    });

    const response = await listPalettes(
      new Request(
        "http://localhost/api/palettes?sort=popularity&page=1&pageSize=12",
      ),
    );

    expect(response.status).toBe(200);
    expect(catalog.getDatabase).toHaveBeenCalledOnce();
    expect(catalog.queryApiCatalog).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: "palette_test", name: "Test palette" }],
      pagination: { totalItems: 1, totalPages: 1 },
    });
  });

  it("loads tags from the same catalog database", async () => {
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
