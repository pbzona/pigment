import {
  apiJson,
  apiOptions,
  apiProblem,
  getDatabase,
  isPublicPaletteId,
  queryApiPaletteById,
  requireApiKey,
  withDatabaseSnapshot,
} from "@pigment/palette-catalog/server";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return apiOptions(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authenticationError = requireApiKey(request);
  if (authenticationError) return authenticationError;

  const { id } = await params;
  if (!isPublicPaletteId(id)) {
    return apiProblem(request, 404, "Palette not found", {
      code: "palette_not_found",
      detail: "No palette exists with that ID.",
    });
  }

  try {
    const database = await getDatabase();
    const palette = await withDatabaseSnapshot(database, (snapshot) =>
      queryApiPaletteById(snapshot, id),
    );
    if (!palette) {
      return apiProblem(request, 404, "Palette not found", {
        code: "palette_not_found",
        detail: "No palette exists with that ID.",
      });
    }
    return apiJson(request, { data: palette }, { maxAge: 300 });
  } catch (error) {
    console.error("Palette API detail request failed", error);
    return apiProblem(request, 500, "Internal server error", {
      code: "internal_error",
      detail: "The palette could not be loaded.",
    });
  }
}
