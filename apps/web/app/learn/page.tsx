import type { Metadata } from "next";

import { QuantizationLab } from "@/components/learn/quantization-lab";

export const metadata: Metadata = {
  title: "How image reduction works",
  description:
    "Inspect image sampling, palette matching, quantization, dithering, and palette extraction through interactive experiments.",
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "See how an image becomes a grid of color — Pigment",
    description:
      "Inspect sampling, quantization, dithering, palette matching, and extraction through working experiments.",
    url: "/learn",
  },
  twitter: {
    card: "summary_large_image",
    title: "See how an image becomes a grid of color — Pigment",
    description:
      "Inspect sampling, quantization, dithering, palette matching, and extraction through working experiments.",
  },
};

export default function LearnPage() {
  return <QuantizationLab />;
}
