import { OG_SIZE, pigmentOgImage } from "@/lib/og-image";

export const alt = "Pigment — make pixels with intentional color";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return pigmentOgImage({
    label: "Color workshop",
    title: "Make pixels with intentional color.",
    description: "A playful browser studio for artwork, palettes, and inspectable image algorithms.",
  });
}
