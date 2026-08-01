import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiJson,
  parseApiPaletteFilters,
  requireApiKey,
} from "@pigment/palette-catalog/server";

import { GET as listPalettes, OPTIONS as listOptions } from "../app/api/v1/palettes/route";

const API_KEY = "a".repeat(32);
const originalApiKey = process.env.PALETTE_API_KEY;
const originalAllowedOrigins = process.env.PALETTE_API_ALLOWED_ORIGINS;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.PALETTE_API_KEY;
  else process.env.PALETTE_API_KEY = originalApiKey;
  if (originalAllowedOrigins === undefined) {
    delete process.env.PALETTE_API_ALLOWED_ORIGINS;
  } else {
    process.env.PALETTE_API_ALLOWED_ORIGINS = originalAllowedOrigins;
  }
  vi.restoreAllMocks();
});

describe("API authentication and HTTP responses", () => {
  it("accepts only the configured bearer token", async () => {
    process.env.PALETTE_API_KEY = API_KEY;
    const valid = new Request("http://localhost/api/v1/palettes", {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    expect(requireApiKey(valid)).toBeNull();

    const response = requireApiKey(
      new Request("http://localhost/api/v1/palettes", {
        headers: { Authorization: "Bearer wrong" },
      }),
    );
    expect(response?.status).toBe(401);
    expect(response?.headers.get("WWW-Authenticate")).toContain("Bearer");
    await expect(response?.json()).resolves.toMatchObject({
      code: "invalid_api_key",
      status: 401,
    });
  });

  it("fails closed when the API key is not configured", async () => {
    delete process.env.PALETTE_API_KEY;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = requireApiKey(
      new Request("http://localhost/api/v1/palettes"),
    );
    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({
      code: "api_not_configured",
    });
  });

  it("returns ETags and honors conditional requests", async () => {
    const request = new Request("http://localhost/api/v1/tags");
    const response = apiJson(request, { data: [] });
    const etag = response.headers.get("ETag");
    expect(response.status).toBe(200);
    expect(etag).toBeTruthy();
    expect(response.headers.get("Vary")).toContain("Authorization");

    const conditional = apiJson(
      new Request(request, { headers: { "If-None-Match": etag ?? "" } }),
      { data: [] },
    );
    expect(conditional.status).toBe(304);
    expect(await conditional.text()).toBe("");

    const weakConditional = apiJson(
      new Request(request, {
        headers: { "If-None-Match": `W/${etag ?? ""}` },
      }),
      { data: [] },
    );
    expect(weakConditional.status).toBe(304);
  });

  it("allows configured CORS preflights and rejects other origins", async () => {
    process.env.PALETTE_API_ALLOWED_ORIGINS = "https://pixide.example";
    const allowed = listOptions(
      new Request("http://localhost/api/v1/palettes", {
        method: "OPTIONS",
        headers: { Origin: "https://pixide.example" },
      }),
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://pixide.example",
    );

    const denied = listOptions(
      new Request("http://localhost/api/v1/palettes", {
        method: "OPTIONS",
        headers: { Origin: "https://attacker.example" },
      }),
    );
    expect(denied.status).toBe(403);
  });
});

describe("API query validation", () => {
  it("parses supported filters with page defaults", () => {
    const parsed = parseApiPaletteFilters(
      new URLSearchParams({
        q: "retro",
        minColors: "2",
        maxColors: "16",
        hue: "359",
        hueTolerance: "20",
        color: "#ff00aa80",
        colorTolerance: "2.5",
      }),
    );
    expect(parsed).toMatchObject({
      ok: true,
      filters: {
        query: "retro",
        minColorCount: 2,
        maxColorCount: 16,
        hue: 359,
        hueTolerance: 20,
        color: { red: 255, green: 0, blue: 170, alpha: 128 },
        colorTolerance: 2.5,
        sort: "relevance",
        page: 1,
        pageSize: 24,
      },
    });
  });

  it("accepts standard numeric exponent notation", () => {
    expect(
      parseApiPaletteFilters(new URLSearchParams("hue=3.599999e2&page=1e1")),
    ).toMatchObject({
      ok: true,
      filters: { hue: 359.9999, page: 10 },
    });
  });

  it("reports unknown fields and invalid dependent filters", () => {
    const parsed = parseApiPaletteFilters(
      new URLSearchParams("wat=1&minColors=20&maxColors=2&hueTolerance=5&sort=relevance"),
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(["wat", "minColors", "hueTolerance", "sort"]),
    );
  });

  it("rejects empty values and non-decimal numeric syntax", () => {
    const parsed = parseApiPaletteFilters(
      new URLSearchParams("color=&page=0x10&minColors="),
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(["color", "page", "minColors"]),
    );
  });

  it("rejects search text containing PostgreSQL null bytes", () => {
    const parsed = parseApiPaletteFilters(
      new URLSearchParams({ q: "retro\u0000dark" }),
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors).toContainEqual(
      expect.objectContaining({ field: "q", code: "invalid_parameter" }),
    );
  });

  it("rejects invalid requests in the route before opening the database", async () => {
    process.env.PALETTE_API_KEY = API_KEY;
    const response = await listPalettes(
      new Request("http://localhost/api/v1/palettes?unknown=1", {
        headers: { Authorization: `Bearer ${API_KEY}` },
      }),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe(
      "application/problem+json",
    );
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_query",
      errors: [{ field: "unknown", code: "unknown_parameter" }],
    });
  });
});
