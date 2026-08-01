import {
  apiJson,
  apiOptions,
  apiProblem,
  getDatabase,
  parseApiPaletteFilters,
  queryApiCatalog,
  requireApiKey,
  withDatabaseSnapshot,
} from "@pigment/palette-catalog/server";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return apiOptions(request);
}

export async function GET(request: Request) {
  const authenticationError = requireApiKey(request);
  if (authenticationError) return authenticationError;

  const parsed = parseApiPaletteFilters(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return apiProblem(request, 400, "Invalid query parameters", {
      code: "invalid_query",
      detail: "One or more query parameters are invalid.",
      errors: parsed.errors,
    });
  }

  try {
    const database = await getDatabase();
    const catalog = await withDatabaseSnapshot(database, (snapshot) =>
      queryApiCatalog(snapshot, parsed.filters),
    );
    return apiJson(request, {
      data: catalog.palettes,
      pagination: {
        page: catalog.page,
        pageSize: catalog.pageSize,
        totalItems: catalog.total,
        totalPages: catalog.totalPages,
      },
    });
  } catch (error) {
    console.error("Palette API catalog request failed", error);
    return apiProblem(request, 500, "Internal server error", {
      code: "internal_error",
      detail: "The palette catalog could not be loaded.",
    });
  }
}
