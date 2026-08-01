import "server-only";

export * from "./index";
export {
  apiJson,
  apiOptions,
  apiProblem,
  requireApiKey,
  type ApiFieldError,
} from "./api-http";
export {
  parseApiPaletteFilters,
  isPublicPaletteId,
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
  advancePaletteBuildState,
  decideBuildPaletteScan,
  ensurePaletteBuildState,
  isBuildPaletteScanEnabled,
  queryPaletteBuildState,
  runGit,
  type BuildScanDecision,
  type BuildScanEnvironment,
  type GitCommandResult,
  type GitRunner,
  type PaletteBuildState,
} from "./build-scan";
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
export { extractPaletteImage, PaletteFormatError } from "./extract";
export {
  createPublicPaletteId,
  loadPaletteMetadata,
  PALETTE_METADATA_FILENAME,
  resolvePaletteMetadata,
  type PaletteMetadata,
  type PaletteMetadataEntries,
} from "./metadata";
export {
  queryCatalog,
  queryCatalogStats,
  queryPaletteById,
  queryPaletteImageById,
  updatePaletteFavorite,
} from "./queries";
export {
  assertPaletteScanAllowed,
  filenameToDisplayName,
  scanPaletteDirectory,
} from "./scan";
export { getCatalogPage, getPalette } from "./services";
