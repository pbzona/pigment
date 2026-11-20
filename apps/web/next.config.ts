import type { NextConfig } from "next";
import { getPaletteDirectoryRelativePath } from "@pigment/palette-catalog/server/config";

const paletteDirectory = getPaletteDirectoryRelativePath();

const nextConfig: NextConfig = {
  experimental: { goRoutes: true },
  outputFileTracingIncludes: {
    "/palette-images/*": [`./${paletteDirectory}/**/*.png`],
  },
};

export default nextConfig;
