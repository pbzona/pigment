"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ImagePlus, LockKeyhole, RefreshCw } from "lucide-react";

import { Button } from "@pigment/ui/button";
import { Label } from "@pigment/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pigment/ui/select";
import { Slider } from "@pigment/ui/slider";
import { usePixelWorker } from "@/hooks/use-pixel-worker";
import { adjustHexColor } from "@pigment/color";
import { decodeImageFile } from "@/lib/browser/image";
import { readProjectSource } from "@/lib/browser/project-source";
import {
  readStudioProject,
  type StudioProject,
} from "@/lib/browser/studio-project";
import {
  CONVERSION_METHODS,
  colorIdsToRgba,
  paletteToPixelColors,
  type ConversionMethod,
  type ConversionResult,
  type PixelPaletteColor,
  type PixelPreview,
} from "@pigment/quantization";
import {
  DEFAULT_PALETTE,
  DEFAULT_PALETTES,
  createPalette,
  type Palette,
} from "@pigment/palette";
import { cn } from "@/lib/utils";
import {
  comparisonGridForSource,
  comparisonOptions,
  comparisonPaletteAdjustments,
  DEFAULT_COMPARISON_SETTINGS,
  labProjectContext,
  type ComparisonGrid,
  type ComparisonSettings,
  type LabProjectContext,
} from "./lab-project-context";

type ComparisonSource = Readonly<{
  name: string;
  width: number;
  height: number;
  preview: PixelPreview;
}>;

type ResultCanvasProps = Readonly<{
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  label: string;
  pixelated?: boolean;
}>;

function ResultCanvas({
  width,
  height,
  pixels,
  label,
  pixelated = true,
}: ResultCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || pixels.length !== width * height * 4) return;
    canvas.width = width;
    canvas.height = height;
    const imagePixels = new Uint8ClampedArray(pixels.length);
    imagePixels.set(pixels);
    context.putImageData(new ImageData(imagePixels, width, height), 0, 0);
  }, [height, pixels, width]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className="block h-auto max-h-[34rem] w-full border border-foreground/10 bg-[repeating-conic-gradient(#2e2924_0_25%,#211e1a_0_50%)] bg-[length:16px_16px] object-contain"
      style={{
        imageRendering: pixelated ? "pixelated" : "auto",
        aspectRatio: `${width} / ${height}`,
      }}
    />
  );
}

type OutputPanelProps = Readonly<{
  side: "A" | "B";
  method: ConversionMethod;
  onMethodChange: (method: ConversionMethod) => void;
  result: ConversionResult | null;
  palette: readonly PixelPaletteColor[];
  processing: boolean;
  disabled: boolean;
}>;

function OutputPanel({
  side,
  method,
  onMethodChange,
  result,
  palette,
  processing,
  disabled,
}: OutputPanelProps) {
  const definition = CONVERSION_METHODS.find(
    (entry) => entry.value === method,
  )!;
  const pixels = result
    ? colorIdsToRgba(result.colorIds, palette)
    : new Uint8ClampedArray();
  return (
    <article
      className="min-w-0 border border-foreground/10 bg-card/55"
      aria-busy={processing}
    >
      <header className="border-b border-foreground/10 p-2 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-primary">Output {side}</span>
          {result ? (
            <span className="font-mono text-xs text-muted-foreground">
              {result.width}×{result.height}
            </span>
          ) : null}
        </div>
        <Select
          disabled={disabled}
          value={method}
          onValueChange={(value: string) =>
            onMethodChange(value as ConversionMethod)
          }
        >
          <SelectTrigger
            className="min-w-0 w-full text-xs sm:text-sm"
            aria-label={`Output ${side} sampling method`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONVERSION_METHODS.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {definition.description}
        </p>
      </header>
      <div className="relative p-3 sm:p-4">
        {result ? (
          <ResultCanvas
            width={result.width}
            height={result.height}
            pixels={pixels}
            label={`Output ${side}: ${definition.label} result`}
          />
        ) : (
          <div className="grid aspect-square place-items-center border border-dashed border-foreground/15 bg-background/35 text-sm text-muted-foreground">
            Preparing output {side}…
          </div>
        )}
        {processing ? (
          <span
            role="status"
            className="absolute bottom-6 right-6 flex items-center gap-2 border bg-background px-2 py-1.5 text-xs"
          >
            <RefreshCw className="size-3 animate-spin motion-reduce:animate-none" />
            Processing
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function ImageComparisonLab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const settingsId = useId();
  const [sharedSettingsOpen, setSharedSettingsOpen] = useState(false);
  const requestGeneration = useRef(0);
  const sourceGeneration = useRef(0);
  const {
    setSource: setWorkerSource,
    cropSource,
    convert,
    extractPalette,
  } = usePixelWorker();
  const [source, setSource] = useState<ComparisonSource | null>(null);
  const [studioContext, setStudioContext] = useState<LabProjectContext | null>(
    null,
  );
  const [settings, setSettings] = useState<ComparisonSettings>(
    DEFAULT_COMPARISON_SETTINGS,
  );
  const [extractedPalette, setExtractedPalette] = useState<Palette | null>(
    null,
  );
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE.id);
  const [leftMethod, setLeftMethod] = useState<ConversionMethod>("average");
  const [rightMethod, setRightMethod] = useState<ConversionMethod>("dither");
  const [grid, setGrid] = useState<ComparisonGrid>({ width: 32, height: 32 });
  const [gridAspect, setGridAspect] = useState<ComparisonGrid>({
    width: 1,
    height: 1,
  });
  const [leftResult, setLeftResult] = useState<ConversionResult | null>(null);
  const [rightResult, setRightResult] = useState<ConversionResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [restoringStudioImage, setRestoringStudioImage] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availablePalettes = [
    ...(studioContext ? [studioContext.palette] : []),
    ...DEFAULT_PALETTES,
    ...(extractedPalette ? [extractedPalette] : []),
  ];
  const activePalette =
    availablePalettes.find((palette) => palette.id === paletteId) ??
    DEFAULT_PALETTE;
  const paletteAdjustments = comparisonPaletteAdjustments(
    activePalette,
    settings,
  );
  const pixelPalette = paletteToPixelColors(activePalette, paletteAdjustments);

  const runComparison = async (
    nextGrid: ComparisonGrid,
    nextLeftMethod: ConversionMethod,
    nextRightMethod: ConversionMethod,
    nextPalette: Palette,
    nextSettings = settings,
  ) => {
    const generation = ++requestGeneration.current;
    setProcessing(true);
    setError(null);
    const shared = comparisonOptions(nextGrid, nextPalette, nextSettings);
    try {
      if (shared.palette.length === 0)
        throw new Error(
          "No colors are available for matching. Choose another palette.",
        );
      const nextLeft = await convert({ ...shared, method: nextLeftMethod });
      if (generation !== requestGeneration.current) return;
      const nextRight =
        nextLeftMethod === nextRightMethod
          ? nextLeft
          : await convert({ ...shared, method: nextRightMethod });
      if (generation !== requestGeneration.current) return;
      setLeftResult(nextLeft);
      setRightResult(nextRight);
    } catch (failure) {
      if (generation !== requestGeneration.current) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "Comparison failed. Try another method or image.",
      );
    } finally {
      if (generation === requestGeneration.current) setProcessing(false);
    }
  };

  const handleFile = async (
    file: File,
    project: StudioProject | null = null,
  ) => {
    const generation = ++sourceGeneration.current;
    requestGeneration.current += 1;
    setUploading(true);
    setProcessing(false);
    setError(null);
    try {
      const decoded = await decodeImageFile(file);
      if (generation !== sourceGeneration.current) return;
      const context = project
        ? labProjectContext(project, decoded.width, decoded.height)
        : null;
      let preview = await setWorkerSource(
        decoded.pixels,
        decoded.width,
        decoded.height,
      );
      if (generation !== sourceGeneration.current) return;
      if (context?.crop) preview = await cropSource(context.crop);
      if (generation !== sourceGeneration.current) return;
      let nextExtracted: Palette | null = null;
      try {
        const extraction = await extractPalette(preview.pixels.slice(), 12);
        const created = createPalette(
          "learn-image",
          "Image colors",
          extraction.colors,
        );
        if (created.ok) nextExtracted = created.value;
      } catch {
        // Palette extraction is optional; built-in and Studio palettes still work.
      }
      if (generation !== sourceGeneration.current) return;
      const width = context?.crop?.width ?? decoded.width;
      const height = context?.crop?.height ?? decoded.height;
      const nextGrid =
        context?.grid ?? comparisonGridForSource(32, width, height);
      const nextSettings = context?.settings ?? DEFAULT_COMPARISON_SETTINGS;
      const nextPalette = context?.palette ?? DEFAULT_PALETTE;
      const nextLeft = context?.method ?? "average";
      const nextRight = nextLeft === "dither" ? "average" : "dither";
      setStudioContext(context);
      setSettings(nextSettings);
      setExtractedPalette(nextExtracted);
      setSource({ name: file.name, width, height, preview });
      setGrid(nextGrid);
      setGridAspect(context ? nextGrid : { width, height });
      setPaletteId(nextPalette.id);
      setLeftMethod(nextLeft);
      setRightMethod(nextRight);
      setLeftResult(null);
      setRightResult(null);
      await runComparison(
        nextGrid,
        nextLeft,
        nextRight,
        nextPalette,
        nextSettings,
      );
    } catch (failure) {
      if (generation === sourceGeneration.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not read this image. Choose another PNG, JPEG, WebP, or GIF.",
        );
    } finally {
      if (generation === sourceGeneration.current) setUploading(false);
    }
  };

  const restoreStudio = async () => {
    try {
      const file = await readProjectSource();
      if (file) await handleFile(file, readStudioProject());
      else
        setError(
          "There is no saved Studio image in this browser. Choose an image below or start in Studio.",
        );
    } catch {
      setError(
        "The Studio image could not be restored. Choose an image here or reopen it in Studio.",
      );
    }
  };

  useEffect(() => {
    let cancelled = false;
    void readProjectSource()
      .then((file) => {
        if (file && !cancelled) return handleFile(file, readStudioProject());
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "The Studio image could not be restored. Choose an image here or reopen it in Studio.",
          );
      })
      .finally(() => {
        if (!cancelled) setRestoringStudioImage(false);
      });
    return () => {
      cancelled = true;
      sourceGeneration.current += 1;
      requestGeneration.current += 1;
    };
    // Load a separate local copy once. Lab changes never write back to Studio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section id="compare" className="scroll-mt-28 pt-8 sm:pt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
            Compare methods on your image.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Try different methods with the same source, grid, and colors. Your
            Studio project stays unchanged.
          </p>
        </div>
        {source ? (
          <Button
            variant="outline"
            size="sm"
            disabled={uploading || restoringStudioImage}
            onClick={() => void restoreStudio()}
          >
            Reset from Studio
          </Button>
        ) : null}
      </div>

      {studioContext ? (
        <div className="mb-6 border border-foreground/15 bg-card p-4 text-sm leading-6">
          <p>
            Copied Studio’s{" "}
            <span className="font-medium">
              {studioContext.grid.width}×{studioContext.grid.height}
            </span>{" "}
            grid, {studioContext.crop ? "saved crop" : "full source"}, adjusted
            palette, and processing settings. Output A starts with{" "}
            {
              CONVERSION_METHODS.find(
                (entry) => entry.value === studioContext.method,
              )?.label
            }
            . This square-cell experiment does not include manual artwork edits.
          </p>
          {studioContext.differences.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {studioContext.differences.map((difference) => (
                <li key={difference}>{difference}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!source ? (
        restoringStudioImage ? (
          <div className="grid min-h-48 place-items-center border border-foreground/10 bg-card/45">
            <p role="status" className="text-sm text-muted-foreground">
              Loading your Studio image and settings…
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid min-h-72 place-items-center border border-dashed border-foreground/25 bg-card/45 p-6 text-center",
              dragging && "border-primary bg-primary/5",
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node))
                setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
          >
            <div>
              <ImagePlus
                className="mx-auto size-6 text-primary"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-xl font-medium">
                Bring an image to the bench.
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Drop a PNG, JPEG, WebP, or GIF here, or use a sample in Studio.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  {uploading ? "Reading pixels…" : "Choose an image"}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/studio">Try a Studio sample</Link>
                </Button>
              </div>
              <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="size-3.5" />
                Your image stays in this browser.
              </p>
            </div>
          </div>
        )
      ) : (
        <div
          className="border border-foreground/10 bg-card/45"
          aria-busy={uploading}
        >
          <div className="grid gap-px bg-foreground/10 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <aside className="min-w-0 bg-background p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{source.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {source.width}×{source.height} source
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  aria-label="Use another image in Lab"
                >
                  <ImagePlus />
                </Button>
              </div>
              <Button
                variant="outline"
                className="mt-3 min-h-11 w-full justify-between lg:hidden"
                aria-expanded={sharedSettingsOpen}
                aria-controls={settingsId}
                onClick={() => setSharedSettingsOpen((open) => !open)}
              >
                Shared settings · {grid.width}×{grid.height}
                <ChevronDown
                  className={sharedSettingsOpen ? "rotate-180" : undefined}
                />
              </Button>
              <div
                id={settingsId}
                className={cn("lg:block", !sharedSettingsOpen && "hidden")}
              >
                <div className="mt-4 [&_canvas]:max-h-40 lg:[&_canvas]:max-h-[34rem]">
                  <ResultCanvas
                    width={source.preview.width}
                    height={source.preview.height}
                    pixels={source.preview.pixels}
                    label="Comparison source before adjustments"
                    pixelated={false}
                  />
                </div>
                <div className="mt-6 space-y-6 border-t border-foreground/10 pt-5">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <Label>Grid size</Label>
                      <span className="font-mono text-xs text-primary">
                        {grid.width}×{grid.height}
                      </span>
                    </div>
                    <Slider
                      aria-label="Output grid longest side"
                      min={4}
                      max={512}
                      step={1}
                      disabled={uploading}
                      value={[Math.max(grid.width, grid.height)]}
                      onValueChange={([value]: number[]) => {
                        const nextGrid = comparisonGridForSource(
                          value,
                          gridAspect.width,
                          gridAspect.height,
                        );
                        setGrid(nextGrid);
                        void runComparison(
                          nextGrid,
                          leftMethod,
                          rightMethod,
                          activePalette,
                        );
                      }}
                    />
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Scales both sides together, keeping these proportions.
                    </p>
                  </div>
                  <div>
                    <Label className="mb-2">Palette for both outputs</Label>
                    <Select
                      disabled={uploading}
                      value={activePalette.id}
                      onValueChange={(value: string) => {
                        const palette = availablePalettes.find(
                          (entry) => entry.id === value,
                        );
                        if (!palette) return;
                        setPaletteId(value);
                        setLeftResult(null);
                        setRightResult(null);
                        void runComparison(
                          grid,
                          leftMethod,
                          rightMethod,
                          palette,
                        );
                      }}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label="Shared comparison palette"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePalettes.map((palette) => (
                          <SelectItem key={palette.id} value={palette.id}>
                            {palette.name} · {palette.colors.length}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div
                      className="mt-3 flex flex-wrap gap-1"
                      aria-label="Comparison palette colors"
                    >
                      {activePalette.colors.map((swatch) => (
                        <span
                          key={swatch.id}
                          className="size-4 border border-white/15"
                          style={{
                            backgroundColor: adjustHexColor(
                              swatch.hex,
                              paletteAdjustments,
                            ),
                          }}
                          title={swatch.hex}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {settings.preserveTransparency
                      ? `Source alpha below ${settings.alphaThreshold} stays transparent.`
                      : "Source transparency is not preserved."}{" "}
                    Source adjustments stay the same for both outputs.
                  </p>
                </div>
              </div>
            </aside>
            <div className="min-w-0 bg-card p-2 sm:p-5">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <OutputPanel
                  side="A"
                  method={leftMethod}
                  onMethodChange={(method) => {
                    setLeftMethod(method);
                    void runComparison(
                      grid,
                      method,
                      rightMethod,
                      activePalette,
                    );
                  }}
                  result={leftResult}
                  palette={pixelPalette}
                  processing={processing}
                  disabled={uploading}
                />
                <OutputPanel
                  side="B"
                  method={rightMethod}
                  onMethodChange={(method) => {
                    setRightMethod(method);
                    void runComparison(grid, leftMethod, method, activePalette);
                  }}
                  result={rightResult}
                  palette={pixelPalette}
                  processing={processing}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {error ? (
        <p
          role="alert"
          className="mt-4 border border-destructive/40 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
        >
          {error}
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={uploading || restoringStudioImage}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.currentTarget.value = "";
        }}
      />
    </section>
  );
}
