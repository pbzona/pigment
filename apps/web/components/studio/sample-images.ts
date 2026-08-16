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
    name: "Colorful Umbrellas",
    fileName: "colorful-umbrellas.jpg",
    src: "/samples/colorful-umbrellas.jpg",
    width: 1280,
    height: 720,
    artist: "Szalax",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Colorful_umbrellas_over_the_Szinva_Bridge_01.jpg",
    license: "CC0",
  },
  {
    name: "Toledo Market Fruit",
    fileName: "fruit-market.jpg",
    src: "/samples/fruit-market.jpg",
    width: 1280,
    height: 720,
    artist: "QueenCityCebu",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Colorful_Toledo_Market_Fruit_Display.jpg",
    license: "CC BY-SA 4.0",
  },
  {
    name: "Floating Village",
    fileName: "floating-village.jpg",
    src: "/samples/floating-village.jpg",
    width: 1280,
    height: 853,
    artist: "Amdadphoto",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aerial_View_of_a_Floating_Village.jpg",
    license: "CC BY-SA 4.0",
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
    name: "Autumn Gold and Maroon",
    fileName: "autumn-mountains.jpg",
    src: "/samples/autumn-mountains.jpg",
    width: 1280,
    height: 850,
    artist: "MichaelKirsh",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Autumn_Gold_and_Maroon.jpg",
    license: "CC BY-SA 4.0",
  },
];

export async function sampleImageFile(sample: StudioSampleImage): Promise<File> {
  const response = await fetch(sample.src);
  if (!response.ok) throw new Error(`Pigment could not open ${sample.name}. Try another image.`);
  const blob = await response.blob();
  return new File([blob], sample.fileName, { type: blob.type || "image/jpeg" });
}
