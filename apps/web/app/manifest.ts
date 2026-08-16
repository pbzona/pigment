import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pigment — Visual color workshop",
    short_name: "Pigment",
    description:
      "Transform images, test color ideas, and learn image algorithms in a private browser-based art workshop.",
    start_url: "/studio",
    display: "standalone",
    background_color: "#11100f",
    theme_color: "#11100f",
    categories: ["art", "design", "graphics", "education"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
