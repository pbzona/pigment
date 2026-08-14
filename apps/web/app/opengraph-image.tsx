import { OG_SIZE, pigmentOgImage } from "@/lib/og-image";

export const alt = "Pigment — turn images into pixels you can shape";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return pigmentOgImage({
    label: "Color workshop",
    title: "Turn images into pixels you can shape.",
    description: "Try image algorithms, tune the palette, and refine the result cell by cell.",
  });
}
