import { NextResponse } from "next/server";

import { parsePaletteTownTags } from "@pigment/palette/palette-town";
import {
  getDatabase,
  queryApiTags,
  withDatabaseSnapshot,
} from "@pigment/palette-catalog/server/runtime";

export async function GET() {
  try {
    const tags = await withDatabaseSnapshot(await getDatabase(), (snapshot) =>
      queryApiTags(snapshot),
    );
    const body = { data: tags };
    const parsedBody = parsePaletteTownTags(body);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: "Palette Town returned invalid data." },
        { status: 502 },
      );
    }
    return NextResponse.json(body, {
      headers: { "Cache-Control": "private, max-age=300, must-revalidate" },
    });
  } catch (error) {
    console.error("Palette tag request failed", error);
    return NextResponse.json(
      { error: "Palette catalog is unavailable." },
      { status: 503 },
    );
  }
}
