export { MAX_PALETTE_COLORS } from "./constants";

export function getPaletteDirectoryRelativePath(
  configuredDirectory = process.env.PALETTE_DIRECTORY,
) {
  const directory = configuredDirectory?.trim() || "palettes";
  if (
    directory.startsWith("/") ||
    /^[a-zA-Z]:\//.test(directory) ||
    directory.includes("\\")
  ) {
    throw new Error(
      "PALETTE_DIRECTORY must be a portable path relative to the project root.",
    );
  }

  const segments = directory
    .split("/")
    .filter((segment) => segment && segment !== ".");
  if (
    segments.length === 0 ||
    segments.includes("..") ||
    segments.some((segment) => !/^[a-zA-Z0-9._-]+$/.test(segment))
  ) {
    throw new Error(
      "PALETTE_DIRECTORY must use safe path segments inside the project root.",
    );
  }

  return segments.join("/");
}

export function getPaletteDirectory() {
  return `${process.cwd()}/${getPaletteDirectoryRelativePath()}`;
}

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must contain a PostgreSQL connection string.");
  }

  return databaseUrl;
}
