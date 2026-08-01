"use client";

import { useOptimistic, useTransition } from "react";

import { setPaletteFavorite } from "@/app/actions";

export function FavoriteButton({
  paletteId,
  paletteName,
  isFavorite,
  variant,
}: {
  paletteId: number;
  paletteName: string;
  isFavorite: boolean;
  variant: "card" | "detail";
}) {
  const [optimisticFavorite, setOptimisticFavorite] =
    useOptimistic(isFavorite);
  const [pending, startTransition] = useTransition();
  const action = optimisticFavorite ? "Remove" : "Add";

  function toggleFavorite() {
    const nextFavorite = !optimisticFavorite;

    startTransition(async () => {
      setOptimisticFavorite(nextFavorite);

      try {
        const updated = await setPaletteFavorite(paletteId, nextFavorite);
        if (!updated) setOptimisticFavorite(isFavorite);
      } catch {
        setOptimisticFavorite(isFavorite);
      }
    });
  }

  return (
    <button
      className={`favorite-button favorite-button-${variant}${optimisticFavorite ? " is-favorite" : ""}`}
      type="button"
      aria-label={`${action} ${paletteName} ${optimisticFavorite ? "from" : "to"} favorites`}
      aria-pressed={optimisticFavorite}
      disabled={pending}
      onClick={toggleFavorite}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 2.7 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1-6.2-4.5-4.4 6.3-.9L12 2.7Z" />
      </svg>
      {variant === "detail" ? (
        <span>{optimisticFavorite ? "Favorited" : "Favorite"}</span>
      ) : null}
    </button>
  );
}
