import { OG_SIZE, pigmentOgImage } from "@/lib/og-image";

export const alt = "Pigment Studio — turn an image into pixels";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return pigmentOgImage({
    label: "Studio",
    title: "Turn an image into pixels.",
    description: "Compare algorithms, tune palettes, paint cells, and export a crisp PNG—entirely in your browser.",
  });
}
