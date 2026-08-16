export type StudioSampleImage = Readonly<{
  name: string;
  fileName: string;
  src: string;
  width: number;
  height: number;
  artist: string;
  sourceUrl: string;
  license: "Public domain" | "CC0" | "CC BY 2.0" | "CC BY-SA 4.0";
}>;

export const STUDIO_SAMPLE_IMAGES: readonly StudioSampleImage[] = [
  {
    name: "The Great Wave",
    fileName: "great-wave.jpg",
    src: "/samples/great-wave.jpg",
    width: 1280,
    height: 876,
    artist: "After Katsushika Hokusai",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Great_Wave_off_Kanagawa2.jpg",
    license: "Public domain",
  },
  {
    name: "Geometric Glass",
    fileName: "geometric-glass.jpg",
    src: "/samples/geometric-glass.jpg",
    width: 1280,
    height: 960,
    artist: "Andrehmarouti",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Wood_window_with_geometric_pattern_and_colorful_glass.jpg",
    license: "CC BY-SA 4.0",
  },
  {
    name: "Grand Canyon",
    fileName: "grand-canyon-poster.jpg",
    src: "/samples/grand-canyon-poster.jpg",
    width: 1280,
    height: 1744,
    artist: "National Park Service",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Grand_Canyon_poster_1938.jpg",
    license: "Public domain",
  },
  {
    name: "American Flamingo",
    fileName: "audubon-flamingo.jpg",
    src: "/samples/audubon-flamingo.jpg",
    width: 1280,
    height: 1855,
    artist: "John James Audubon",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Audubon-Flamingo.jpg",
    license: "Public domain",
  },
  {
    name: "Ōtani Oniji III",
    fileName: "sharaku-actor.jpg",
    src: "/samples/sharaku-actor.jpg",
    width: 1280,
    height: 1915,
    artist: "Tōshūsai Sharaku",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Toshusai_Sharaku-_Otani_Oniji,_1794.jpg",
    license: "Public domain",
  },
  {
    name: "Preserve Wild Life",
    fileName: "wildlife-poster.jpg",
    src: "/samples/wildlife-poster.jpg",
    width: 1280,
    height: 1650,
    artist: "J. Hirt / WPA Federal Art Project",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:The_national_parks_preserve_wild_life,_WPA_poster,_ca._1938.jpg",
    license: "Public domain",
  },
];

export async function sampleImageFile(sample: StudioSampleImage): Promise<File> {
  const response = await fetch(sample.src);
  if (!response.ok) throw new Error(`Pigment could not open ${sample.name}. Try another image.`);
  const blob = await response.blob();
  return new File([blob], sample.fileName, { type: blob.type || "image/jpeg" });
}
