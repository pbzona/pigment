import { OG_SIZE, pigmentOgImage } from "@/lib/og-image";

export const alt = "Pigment learning lab — inspect how pixelation works";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return pigmentOgImage({
    label: "Learning lab",
    title: "See how an image becomes pixels.",
    description: "Inspect sampling, quantization, dithering, palette matching, and extraction through working experiments.",
  });
}
