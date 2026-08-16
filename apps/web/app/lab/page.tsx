import type { Metadata } from "next";

import { QuantizationLab } from "@/components/learn/quantization-lab";

export const metadata: Metadata = {
  title: "Experiment lab",
  description:
    "Inspect the procedure behind your Pigment project through focused experiments in sampling, quantization, dithering, and palette matching.",
  alternates: { canonical: "/lab" },
  openGraph: {
    title: "Pigment Lab — Put the procedure under glass",
    description:
      "Share a project with Studio, isolate its stages, and inspect image algorithms through focused experiments.",
    url: "/lab",
  },
};

export default function LabPage() {
  return <QuantizationLab />;
}
