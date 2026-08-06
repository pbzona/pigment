import "server-only";

export {
  apiJson,
  apiOptions,
  apiProblem,
  requireApiKey,
  type ApiFieldError,
} from "./api-http";
export {
  isPublicPaletteId,
  parseApiPaletteFilters,
  type ApiPaletteFilters,
  type ApiPaletteSort,
} from "./api-palettes";
export {
  queryApiCatalog,
  queryApiPaletteById,
  queryApiTags,
  type ApiCatalogResult,
  type ApiPalette,
} from "./api-queries";
export {
  getDatabaseUrl,
  getPaletteDirectory,
  getPaletteDirectoryRelativePath,
  MAX_PALETTE_COLORS,
} from "./config";
export {
  getDatabase,
  openDatabase,
  withDatabaseSnapshot,
  type PaletteDatabase,
  type PaletteDatabaseConnection,
} from "./database";
export {
  queryCatalog,
  queryCatalogStats,
  queryPaletteById,
  queryPaletteImageById,
  updatePaletteFavorite,
} from "./queries";
export { getCatalogPage, getPalette } from "./services";
