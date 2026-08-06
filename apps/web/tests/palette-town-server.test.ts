import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPaletteTown, PaletteTownError } from "@/lib/server/palette-town";
import { GET as listPalettes } from "@/app/api/palettes/route";

const originalUrl = process.env.PALETTE_TOWN_URL;
const originalApiKey = process.env.PALETTE_TOWN_API_KEY;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.PALETTE_TOWN_URL;
  else process.env.PALETTE_TOWN_URL = originalUrl;
  if (originalApiKey === undefined) delete process.env.PALETTE_TOWN_API_KEY;
  else process.env.PALETTE_TOWN_API_KEY = originalApiKey;
  vi.restoreAllMocks();
});

describe("Palette Town server client", () => {
  it("fails with JSON-safe metadata when configuration is missing", async () => {
    delete process.env.PALETTE_TOWN_URL;
    delete process.env.PALETTE_TOWN_API_KEY;

    await expect(fetchPaletteTown("api/v1/palettes")).rejects.toMatchObject({
      message: "Palette Town is not configured.",
      status: 503,
    });
  });

  it("forwards validated queries with the server-only bearer token", async () => {
    process.env.PALETTE_TOWN_URL = "https://palette.example";
    process.env.PALETTE_TOWN_API_KEY = "a".repeat(32);
    const body = { data: [], pagination: { page: 1 } };
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(body));

    await expect(
      fetchPaletteTown(
        "api/v1/palettes",
        new URLSearchParams("page=1&pageSize=12"),
        (value) => JSON.stringify(value) === JSON.stringify(body),
      ),
    ).resolves.toEqual(body);

    const [url, init] = request.mock.calls[0];
    expect(String(url)).toBe(
      "https://palette.example/api/v1/palettes?page=1&pageSize=12",
    );
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      `Bearer ${"a".repeat(32)}`,
    );
    expect(init?.cache).toBe("no-store");
  });

  it("returns Palette Town data through the browser proxy", async () => {
    process.env.PALETTE_TOWN_URL = "https://palette.example";
    process.env.PALETTE_TOWN_API_KEY = "a".repeat(32);
    const body = {
      data: [
        {
          id: "palette_test",
          name: "Test palette",
          colors: ["#112233"],
          colorCount: 1,
          tags: [],
          author: null,
          attribution: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 12,
        totalItems: 1,
        totalPages: 1,
      },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body));

    const response = await listPalettes(
      new Request(
        "http://localhost/api/palettes?sort=popularity&page=1&pageSize=12",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual(body);
  });

  it("normalizes an HTML upstream response instead of leaking a JSON parse error", async () => {
    process.env.PALETTE_TOWN_URL = "https://palette.example";
    process.env.PALETTE_TOWN_API_KEY = "a".repeat(32);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<!DOCTYPE html>", {
        headers: { "Content-Type": "text/html" },
      }),
    );

    await expect(fetchPaletteTown("api/v1/palettes")).rejects.toEqual(
      expect.objectContaining<Partial<PaletteTownError>>({
        message: "Palette Town returned invalid data.",
        status: 502,
      }),
    );
  });

  it("preserves upstream rate-limit metadata", async () => {
    process.env.PALETTE_TOWN_URL = "https://palette.example";
    process.env.PALETTE_TOWN_API_KEY = "a".repeat(32);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: { "Retry-After": "30" },
      }),
    );

    await expect(fetchPaletteTown("api/v1/palettes")).rejects.toMatchObject({
      message: "Palette Town is temporarily rate limited.",
      status: 429,
      retryAfter: "30",
    });
  });
});
