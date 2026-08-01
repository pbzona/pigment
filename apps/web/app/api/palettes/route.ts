import { NextResponse } from "next/server";

import {
  parsePaletteTownList,
  parsePaletteTownQuery,
  serializePaletteTownQuery,
} from "@pigment/palette/palette-town";
import {
  getDatabase,
  parseApiPaletteFilters,
  queryApiCatalog,
  withDatabaseSnapshot,
} from "@pigment/palette-catalog/server";

export async function GET(request: Request) {
  const parsedQuery = parsePaletteTownQuery(new URL(request.url).searchParams);
  if (!parsedQuery.ok) {
    return NextResponse.json({ error: parsedQuery.error }, { status: 400 });
  }

  try {
    const catalogQuery = parseApiPaletteFilters(
      serializePaletteTownQuery(parsedQuery.value),
    );
    if (!catalogQuery.ok) {
      return NextResponse.json({ error: "Invalid palette query." }, { status: 400 });
    }
    const catalog = await withDatabaseSnapshot(await getDatabase(), (snapshot) =>
      queryApiCatalog(snapshot, catalogQuery.filters),
    );
    const body = {
      data: catalog.palettes,
      pagination: {
        page: catalog.page,
        pageSize: catalog.pageSize,
        totalItems: catalog.total,
        totalPages: catalog.totalPages,
      },
    };
    const parsedBody = parsePaletteTownList(body);
    if (!parsedBody.ok) {
      return NextResponse.json({ error: "Palette Town returned invalid data." }, { status: 502 });
    }
    return NextResponse.json(body, {
      headers: { "Cache-Control": "private, max-age=60, must-revalidate" },
    });
  } catch (error) {
    console.error("Palette browser request failed", error);
    return NextResponse.json({ error: "Palette catalog is unavailable." }, { status: 503 });
  }
}
