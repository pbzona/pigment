import { parseCatalogFilters, type RawSearchParams } from "./catalog";
import { getDatabase, withDatabaseSnapshot } from "./database";
import {
  queryCatalog,
  queryCatalogStats,
  queryPaletteById,
} from "./queries";

export async function getCatalogPage(searchParams: RawSearchParams) {
  const database = await getDatabase();
  const filters = parseCatalogFilters(searchParams);

  return withDatabaseSnapshot(database, async (snapshot) => {
    const catalog = await queryCatalog(snapshot, filters);
    const stats = await queryCatalogStats(snapshot);
    return { catalog, stats };
  });
}

export async function getPalette(id: number) {
  const database = await getDatabase();
  return withDatabaseSnapshot(database, (snapshot) =>
    queryPaletteById(snapshot, id),
  );
}
