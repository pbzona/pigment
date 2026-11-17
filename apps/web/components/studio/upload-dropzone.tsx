"use client";

import { SiteHeader } from "@/components/site-header";
import { ImageChooser } from "./image-chooser";
import type { StudioSampleImage } from "./sample-images";

type UploadDropzoneProps = Readonly<{
  onFile: (file: File) => void;
  error?: string | null;
  disabled?: boolean;
  onSample: (sample: StudioSampleImage) => void;
}>;

export function UploadDropzone({
  onFile,
  error,
  disabled = false,
  onSample,
}: UploadDropzoneProps) {
  return (
    <>
      <SiteHeader active="studio" context="Image studio" />
      <main className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">
            Start an experiment
          </h1>
          <p className="mb-6 text-sm leading-6 text-muted-foreground">
            Bring an image, or pick a sample to start playing. No account
            needed.
          </p>
          <ImageChooser
            onFile={onFile}
            onSample={onSample}
            disabled={disabled}
            error={error}
            headingId="studio-image-heading"
          />
        </div>
      </main>
    </>
  );
}
