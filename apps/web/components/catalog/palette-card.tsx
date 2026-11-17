"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PaletteSummary } from "@pigment/palette-catalog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@pigment/ui/dialog";
import { Button } from "@pigment/ui/button";
import {
  readProjectSnapshot,
  writePendingPalette,
} from "@/lib/browser/project-snapshot";

import { PaletteStrip } from "./palette-strip";

const percent = (value: number) => Math.round(value * 100);
const chroma = (value: number) => (value * 100).toFixed(1);

export function PaletteCard({ palette }: { palette: PaletteSummary }) {
  const [open, setOpen] = useState(false);
  const [hasProject, setHasProject] = useState(false);
  const router = useRouter();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setHasProject(readProjectSnapshot() !== null);
    setOpen(nextOpen);
  };

  const loadIntoStudio = () => {
    writePendingPalette({
      name: palette.displayName,
      colors: palette.colors.map((color) => color.hex),
    });
    router.push("/studio");
  };

  return (
    <>
      <article className="palette-card">
        <button
          type="button"
          className="palette-card-link"
          aria-label={`Inspect ${palette.displayName}, ${palette.colorCount} colors`}
          onClick={() => handleOpenChange(true)}
        >
          <PaletteStrip colors={palette.colors} />
          <div className="palette-card-body">
            <h2>{palette.displayName}</h2>
          </div>
          <footer className="palette-card-footer">
            <span>{palette.colorCount} colors</span>
            <span>Lightness {percent(palette.averageLightness)}</span>
            <span>Chroma {chroma(palette.averageChroma)}</span>
            {palette.distance !== null ? (
              <span>Color distance {palette.distance.toFixed(1)}</span>
            ) : null}
          </footer>
        </button>
      </article>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="palette-inspector max-h-[min(86svh,54rem)] overflow-y-auto rounded-none p-0 sm:max-w-4xl">
          <DialogHeader className="border-b border-foreground/15 px-5 py-5 pr-14 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:pr-8">
              <div>
                <DialogTitle className="text-2xl sm:text-3xl">
                  {palette.displayName}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  {palette.colorCount} colors · lightness{" "}
                  {percent(palette.minLightness)}–
                  {percent(palette.maxLightness)} · average chroma{" "}
                  {chroma(palette.averageChroma)}
                </DialogDescription>
              </div>
              <Button onClick={loadIntoStudio}>
                {hasProject ? "Apply to current project" : "Start in Studio"}
              </Button>
            </div>
          </DialogHeader>

          <PaletteStrip colors={palette.colors} />

          <dl className="palette-inspector-summary">
            <div>
              <dt>Colors</dt>
              <dd>{palette.colorCount}</dd>
            </div>
            <div>
              <dt>Average lightness</dt>
              <dd>{percent(palette.averageLightness)}</dd>
            </div>
            <div>
              <dt>Lightness range</dt>
              <dd>
                {percent(palette.minLightness)}–{percent(palette.maxLightness)}
              </dd>
            </div>
            <div>
              <dt>Average chroma</dt>
              <dd>{chroma(palette.averageChroma)}</dd>
            </div>
            {palette.distance !== null ? (
              <div>
                <dt>Color distance</dt>
                <dd>{palette.distance.toFixed(1)}</dd>
              </div>
            ) : null}
          </dl>

          <section
            className="palette-inspector-colors"
            aria-labelledby={`palette-${palette.id}-colors`}
          >
            <div className="palette-inspector-heading">
              <h3 id={`palette-${palette.id}-colors`}>Color characteristics</h3>
              <p>Source order</p>
            </div>
            <div className="palette-inspector-grid">
              {palette.colors.map((color) => (
                <article key={color.id} className="palette-inspector-color">
                  <div
                    className="palette-inspector-swatch"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="palette-inspector-color-name">
                    <span>{String(color.position + 1).padStart(2, "0")}</span>
                    <strong>{color.hex}</strong>
                  </div>
                  <dl>
                    <div>
                      <dt>Lightness</dt>
                      <dd>{percent(color.okL)}</dd>
                    </div>
                    <div>
                      <dt>Chroma</dt>
                      <dd>{chroma(color.chroma)}</dd>
                    </div>
                    <div>
                      <dt>Hue</dt>
                      <dd>
                        {color.hue === null ? "—" : `${Math.round(color.hue)}°`}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
}
