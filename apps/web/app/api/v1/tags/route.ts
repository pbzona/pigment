import {
  apiJson,
  apiOptions,
  apiProblem,
  getDatabase,
  queryApiTags,
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

  try {
    const database = await getDatabase();
    const tags = await withDatabaseSnapshot(database, (snapshot) =>
      queryApiTags(snapshot),
    );
    return apiJson(request, { data: tags }, { maxAge: 300 });
  } catch (error) {
    console.error("Palette API tag request failed", error);
    return apiProblem(request, 500, "Internal server error", {
      code: "internal_error",
      detail: "Palette tags could not be loaded.",
    });
  }
}
