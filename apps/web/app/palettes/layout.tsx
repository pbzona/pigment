import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Palette archive",
  description:
    "Search, compare, favorite, and inspect color palettes by perceptual color, lightness, chroma, and source metadata.",
  alternates: { canonical: "/palettes" },
  openGraph: {
    title: "Palette archive — Pigment",
    description:
      "Search, compare, favorite, and inspect color systems by perceptual color, lightness, and chroma.",
    url: "/palettes",
  },
  twitter: {
    card: "summary_large_image",
    title: "Palette archive — Pigment",
    description:
      "Search, compare, favorite, and inspect color systems by perceptual color, lightness, and chroma.",
  },
};

export default function PalettesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
