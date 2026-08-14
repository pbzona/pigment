import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { OgCard } from "@/components/og-card";

export const OG_SIZE = { width: 1200, height: 630 } as const;

export async function pigmentOgImage(props: {
  title: string;
  label: string;
  description?: string;
}) {
  const [sans, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets/geist-sans.ttf")),
    readFile(join(process.cwd(), "assets/geist-mono.ttf")),
  ]);

  return new ImageResponse(<OgCard {...props} />, {
    ...OG_SIZE,
    fonts: [
      { name: "Geist", data: sans, weight: 400, style: "normal" },
      { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
    ],
  });
}
