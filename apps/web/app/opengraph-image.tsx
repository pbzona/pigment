import { OG_SIZE, pigmentOgImage } from "@/lib/og-image";

export const alt = "Pigment — see how much image a few pixels can hold";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return pigmentOgImage({
    label: "Color workshop",
    title: "See how much image a few pixels can hold.",
    description: "Reduce an image with different algorithms, reshape its palette, and refine what survives.",
  });
}
