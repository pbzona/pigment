import type { Metadata } from "next";

import { PixelStudio } from "@/components/studio/pixel-studio";

export const metadata: Metadata = {
  title: "Pixel art studio",
  description:
    "Turn an image into palette-driven pixel art, compare algorithms, refine individual cells, and export a crisp PNG—entirely in your browser.",
  alternates: { canonical: "/studio" },
  openGraph: {
    title: "Pigment Studio — Turn an image into pixels",
    description:
      "Compare algorithms, tune palettes, paint cells, and export a crisp PNG—entirely in your browser.",
    url: "/studio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pigment Studio — Turn an image into pixels",
    description:
      "Compare algorithms, tune palettes, paint cells, and export a crisp PNG—entirely in your browser.",
  },
};

export default function EditorPage() {
  return <PixelStudio />;
}
