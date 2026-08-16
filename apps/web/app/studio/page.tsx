import type { Metadata } from "next";

import { PixelStudio } from "@/components/studio/pixel-studio";

export const metadata: Metadata = {
  title: "Image and color studio",
  description:
    "Transform an image with a limited palette, compare algorithms, refine individual cells, and export a crisp PNG—entirely in your browser.",
  alternates: { canonical: "/studio" },
  openGraph: {
    title: "Pigment Studio — Transform images with color",
    description:
      "Compare algorithms, tune palettes, paint cells, and export a crisp PNG—entirely in your browser.",
    url: "/studio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pigment Studio — Transform images with color",
    description:
      "Compare algorithms, tune palettes, paint cells, and export a crisp PNG—entirely in your browser.",
  },
};

export default function EditorPage() {
  return <PixelStudio />;
}
