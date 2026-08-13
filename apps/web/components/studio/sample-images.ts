export type StudioSampleImage = Readonly<{
  name: string;
  fileName: string;
  src: string;
  width: number;
  height: number;
  artist: string;
  sourceUrl: string;
  license: "Public domain";
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
    name: "Almond Blossom",
    fileName: "almond-blossom.jpg",
    src: "/samples/almond-blossom.jpg",
    width: 1280,
    height: 1011,
    artist: "Vincent van Gogh",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Amandelbloesem_-_s0176V1962_-_Van_Gogh_Museum.jpg",
    license: "Public domain",
  },
  {
    name: "The Blue Marble",
    fileName: "blue-marble.jpg",
    src: "/samples/blue-marble.jpg",
    width: 1280,
    height: 1280,
    artist: "Harrison Schmitt / Apollo 17",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Blue_Marble,_AS17-148-22727.jpg",
    license: "Public domain",
  },
];

export async function sampleImageFile(sample: StudioSampleImage): Promise<File> {
  const response = await fetch(sample.src);
  if (!response.ok) throw new Error(`Pigment could not open ${sample.name}. Try another image.`);
  const blob = await response.blob();
  return new File([blob], sample.fileName, { type: blob.type || "image/jpeg" });
}
