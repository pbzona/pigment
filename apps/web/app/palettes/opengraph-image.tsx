import { OG_SIZE, pigmentOgImage } from "@/lib/og-image";

export const alt = "Pigment palette archive — searchable color systems";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return pigmentOgImage({
    label: "Palette archive",
    title: "Find a color system worth using.",
    description: "Search, compare, favorite, and inspect palettes by color, lightness, chroma, and source metadata.",
  });
}
