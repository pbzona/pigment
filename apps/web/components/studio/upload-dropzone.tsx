"use client";

import Link from "next/link";
import { BookOpenText } from "lucide-react";

import { BrandMark } from "@pigment/ui/brand-mark";
import { Button } from "@pigment/ui/button";
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
    <main className="flex min-h-svh items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3">
            <BrandMark className="size-7" />
            <span className="text-sm font-semibold tracking-[-0.02em]">PIGMENT STUDIO</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/lab">
              <BookOpenText data-icon="inline-start" />
              <span className="hidden sm:inline">Lab</span>
              <span className="sm:hidden">Lab</span>
            </Link>
          </Button>
        </div>
        <ImageChooser
          onFile={onFile}
          onSample={onSample}
          disabled={disabled}
          error={error}
          headingId="studio-image-heading"
        />
      </div>
    </main>
  );
}
