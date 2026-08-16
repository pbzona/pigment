"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, LockKeyhole } from "lucide-react";

import { Button } from "@pigment/ui/button";
import { cn } from "@/lib/utils";
import { STUDIO_SAMPLE_IMAGES, type StudioSampleImage } from "./sample-images";

type ImageChooserProps = Readonly<{
  onFile: (file: File) => void;
  onSample: (sample: StudioSampleImage) => void;
  disabled?: boolean;
  error?: string | null;
  headingId?: string;
}>;

export function ImageChooser({
  onFile,
  onSample,
  disabled = false,
  error,
  headingId = "image-chooser-heading",
}: ImageChooserProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const acceptFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div>
      <div
        className={cn(
          "grid min-h-44 place-items-center border border-dashed border-foreground/25 bg-card/45 p-5 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          acceptFiles(event.dataTransfer.files);
        }}
      >
        <div>
          <ImagePlus className="mx-auto size-6 text-primary" aria-hidden="true" />
          <h2 id={headingId} className="mt-3 text-lg font-medium">Choose an image</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Drop a PNG, JPEG, WebP, or GIF, or choose one from your device.</p>
          <Button className="mt-4" disabled={disabled} onClick={() => inputRef.current?.click()}>
            <ImagePlus data-icon="inline-start" /> Upload image
          </Button>
          <p className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <LockKeyhole className="size-3" /> Your image stays in this browser
          </p>
        </div>
      </div>

      {error ? <p className="mt-3 border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">{error}</p> : null}

      <section className="mt-5" aria-labelledby={`${headingId}-samples`}>
        <div className="mb-3">
          <h3 id={`${headingId}-samples`} className="text-sm font-medium">Or use a sample</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">Openly licensed images with different color, shape, and detail.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STUDIO_SAMPLE_IMAGES.map((sample) => (
            <article key={sample.src} className="min-w-0 border bg-card">
              <button
                type="button"
                disabled={disabled}
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => onSample(sample)}
              >
                <Image
                  src={sample.src}
                  alt=""
                  width={sample.width}
                  height={sample.height}
                  sizes="(min-width: 1024px) 14rem, (min-width: 640px) 50vw, 100vw"
                  className="h-24 w-full border-b object-cover"
                />
                <span className="block p-2.5">
                  <span className="block truncate text-xs font-medium">{sample.name}</span>
                  <span className="mt-1 block truncate text-[10px] text-muted-foreground">{sample.artist} · {sample.license}</span>
                </span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        disabled={disabled}
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          acceptFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
