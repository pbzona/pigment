import { OG_SIZE, pigmentOgImage } from "@/lib/og-image";

export const alt = "Pigment Studio — transform images with color";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return pigmentOgImage({
    label: "Studio",
    title: "Transform images with color.",
    description: "Compare algorithms, tune palettes, paint cells, and export a crisp PNG—entirely in your browser.",
  });
}
