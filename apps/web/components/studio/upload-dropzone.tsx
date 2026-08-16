"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpenText, ImagePlus, LockKeyhole } from "lucide-react";

import { BrandMark } from "@pigment/ui/brand-mark";
import { Button } from "@pigment/ui/button";
import { cn } from "@/lib/utils";
import { STUDIO_SAMPLE_IMAGES, type StudioSampleImage } from "./sample-images";

type UploadDropzoneProps = Readonly<{
  onFile: (file: File) => void;
  error?: string | null;
  compact?: boolean;
  disabled?: boolean;
  onSample?: (sample: StudioSampleImage) => void;
}>;

export function UploadDropzone({
  onFile,
  error,
  compact = false,
  disabled = false,
  onSample,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const acceptFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  if (compact) {
    return (
      <>
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
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus data-icon="inline-start" />
          Replace image
        </Button>
      </>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl">
        <div className="mb-10 flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3">
            <BrandMark className="size-7" />
            <span className="text-sm font-semibold tracking-[-0.02em]">PIGMENT STUDIO</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/lab">
              <BookOpenText data-icon="inline-start" />
              <span className="hidden sm:inline">How image reduction works</span>
              <span className="sm:hidden">Learn</span>
            </Link>
          </Button>
        </div>

        <div
          className={cn(
            "group relative flex min-h-[390px] w-full flex-col items-center justify-center overflow-hidden border-2 border-dashed border-foreground/25 bg-card px-8 text-center transition-colors",
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
          <ImagePlus className="mb-6 size-7 text-primary" strokeWidth={1.5} aria-hidden="true" />
          <h1 className="text-balance text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
            Transform an image with color.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Drop a PNG, JPEG, WebP, or GIF here, or choose one from your device.
          </p>
          <Button
            className="mt-6"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus data-icon="inline-start" />
            Choose image
          </Button>
          <span className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="size-3.5" />
            Your image never leaves this browser
          </span>
          {error ? (
            <span className="mt-5 max-w-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
              {error}
            </span>
          ) : null}
        </div>

        {onSample ? (
          <section className="mt-8" aria-labelledby="sample-images-heading">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 id="sample-images-heading" className="text-sm font-semibold">Or start with a sample</h2>
                <p className="mt-1 text-xs text-muted-foreground">Public-domain images, ready to experiment with.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {STUDIO_SAMPLE_IMAGES.map((sample) => (
                <article key={sample.src} className="border-2 border-border bg-card shadow-[3px_3px_0_var(--shadow)]">
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
                      sizes="(min-width: 640px) 15rem, calc(100vw - 2rem)"
                      className="h-28 w-full border-b-2 border-border object-cover"
                    />
                    <span className="block p-3">
                      <span className="block text-sm font-semibold">{sample.name}</span>
                      <span className="mt-1 block truncate text-[11px] text-muted-foreground">{sample.artist}</span>
                    </span>
                  </button>
                  <a
                    href={sample.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block border-t px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
                  >
                    {sample.license} · source
                  </a>
                </article>
              ))}
            </div>
          </section>
        ) : null}
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
    </main>
  );
}
