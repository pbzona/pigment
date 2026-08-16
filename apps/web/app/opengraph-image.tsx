import { OG_SIZE, pigmentOgImage } from "@/lib/og-image";

export const alt = "Pigment — see what an image becomes with fewer colors";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return pigmentOgImage({
    label: "Color workshop",
    title: "See what an image becomes with fewer colors.",
    description: "Transform an image with different algorithms, reshape its palette, and refine what survives.",
  });
}
