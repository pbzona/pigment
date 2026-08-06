"use server";

import { refresh } from "next/cache";
import { isPaletteId } from "@pigment/palette-catalog";
import {
  getDatabase,
  updatePaletteFavorite,
} from "@pigment/palette-catalog/server/runtime";


export async function setPaletteFavorite(
  paletteId: number,
  isFavorite: boolean,
) {
  if (!isPaletteId(paletteId) || typeof isFavorite !== "boolean") {
    return false;
  }

  const updated = await updatePaletteFavorite(
    await getDatabase(),
    paletteId,
    isFavorite,
  );
  if (updated) refresh();
  return updated;
}
