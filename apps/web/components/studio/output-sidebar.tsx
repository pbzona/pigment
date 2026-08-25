"use client";

import { useId, useState } from "react";
import {
  CircleSlash2,
  Eye,
  Link2,
  Plus,
  RefreshCw,
  Trash2,
  Unlink2,
} from "lucide-react";

import { PaletteAdjustments } from "@/components/palette/palette-adjustments";
import { Button } from "@pigment/ui/button";
import { Input } from "@pigment/ui/input";
import { Label } from "@pigment/ui/label";
import { ScrollArea } from "@pigment/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pigment/ui/select";
import { Slider } from "@pigment/ui/slider";
import type { PaletteAdjustments as PaletteAdjustmentsValue } from "@pigment/color";
import {
  insertMidpointSwatch,
  midpointColor,
  nextSwatchId,
  removeSwatch,
  replaceSwatch,
  type Palette,
} from "@pigment/palette";
import { cn } from "@/lib/utils";
import type { PartitionKind } from "@pigment/quantization";

type OutputSidebarProps = Readonly<{
  gridWidth: number;
  gridHeight: number;
  partition: PartitionKind;
  partitionScale: number;
  aspectLocked: boolean;
  inputVersion: number;
  palette: Palette;
  paletteAdjustments: PaletteAdjustmentsValue;
  excludedColorIds: ReadonlySet<number>;
  isolatedColorIds: ReadonlySet<number>;
  selectedSwatchId: number | null;
  processing: boolean;
  onGridChange: (axis: "width" | "height", value: number) => void;
  onPartitionChange: (partition: PartitionKind) => void;
  onPartitionScaleChange: (scale: number) => void;
  onGridScale: (factor: 0.5 | 2) => void;
  onAspectLockedChange: (locked: boolean) => void;
  onPaletteChange: (palette: Palette) => void;
  onOpenPalette: () => void;
  onToggleExcludedColor: (colorId: number) => void;
  onToggleIsolatedColor: (colorId: number) => void;
  onClearIsolation: () => void;
  onSelectedSwatchChange: (colorId: number | null) => void;
  onPaletteAdjustmentsChange: (adjustments: PaletteAdjustmentsValue) => void;
  onRerun: () => void;
}>;

export function OutputSidebar({
  gridWidth,
  gridHeight,
  partition,
  partitionScale,
  aspectLocked,
  inputVersion,
  palette,
  paletteAdjustments,
  excludedColorIds,
  isolatedColorIds,
  selectedSwatchId,
  processing,
  onGridChange,
  onPartitionChange,
  onPartitionScaleChange,
  onGridScale,
  onAspectLockedChange,
  onPaletteChange,
  onOpenPalette,
  onToggleExcludedColor,
  onToggleIsolatedColor,
  onClearIsolation,
  onSelectedSwatchChange,
  onPaletteAdjustmentsChange,
  onRerun,
}: OutputSidebarProps) {
  const [editColor, setEditColor] = useState("#ef6a47");
  const [error, setError] = useState<string | null>(null);
  const insertionDescriptionId = useId();
  const selectedIndex =
    selectedSwatchId === null
      ? -1
      : palette.colors.findIndex((swatch) => swatch.id === selectedSwatchId);
  const selectedColor =
    selectedIndex >= 0 ? palette.colors[selectedIndex] : undefined;
  const nextSelectedColor =
    selectedIndex >= 0 ? palette.colors[selectedIndex + 1] : undefined;
  const selectedMidpoint =
    selectedColor && nextSelectedColor
      ? midpointColor(selectedColor.hex, nextSelectedColor.hex)
      : null;
  const selectedInsertion =
    selectedColor && nextSelectedColor
      ? insertMidpointSwatch(palette, selectedColor.id, nextSelectedColor.id)
      : null;
  const matchingColorCount = palette.colors.length - excludedColorIds.size;

  const insertMidpoint = (colorId: number) => {
    const index = palette.colors.findIndex((swatch) => swatch.id === colorId);
    const nextColor = palette.colors[index + 1];
    if (!nextColor) return;
    const result = insertMidpointSwatch(palette, colorId, nextColor.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const newId = nextSwatchId(palette.colors);
    const newColor = result.value.colors.find((color) => color.id === newId);
    onPaletteChange(result.value);
    onSelectedSwatchChange(newId);
    if (newColor) setEditColor(newColor.hex);
    setError(null);
  };

  const updateColor = () => {
    if (selectedSwatchId === null) return;
    const result = replaceSwatch(palette, selectedSwatchId, editColor);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onPaletteChange(result.value);
    setError(null);
  };

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="min-w-0 divide-y divide-border">
        <section className="px-4 py-5">
          <Label className="mb-3">Partition</Label>
          <Select
            value={partition}
            onValueChange={(value: string) =>
              onPartitionChange(value as PartitionKind)
            }
          >
            <SelectTrigger
              className="w-full rounded-none"
              aria-label="Partition shape"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="hex">Hexagonal</SelectItem>
              <SelectItem value="voronoi">Voronoi</SelectItem>
            </SelectContent>
          </Select>
          {partition !== "square" ? (
            <>
              <label className="mt-5 block">
                <span className="mb-2 flex items-center justify-between text-xs">
                  <span>Cell scale</span>
                  <span className="font-mono text-muted-foreground">
                    {partitionScale}
                  </span>
                </span>
                <Slider
                  min={2}
                  max={16}
                  step={1}
                  value={[partitionScale]}
                  onValueChange={([value]: number[]) =>
                    onPartitionScaleChange(value)
                  }
                />
              </label>
              <p className="mt-3 border border-foreground/10 bg-muted/20 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                {partition === "voronoi"
                  ? "Evenly spaced Poisson points produce stable irregular cells."
                  : "Cell scale controls the radius of the hexagons."}{" "}
                Diffusion, pattern methods, and regional overrides require
                Square.
              </p>
            </>
          ) : null}
        </section>

        <section className="px-4 py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Label>Resolution</Label>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="xs"
                aria-label="Divide cell grid dimensions by two"
                disabled={gridWidth <= 4 || gridHeight <= 4}
                onClick={() => onGridScale(0.5)}
              >
                ÷2
              </Button>
              <Button
                variant="ghost"
                size="xs"
                aria-label="Multiply cell grid dimensions by two"
                disabled={gridWidth >= 512 || gridHeight >= 512}
                onClick={() => onGridScale(2)}
              >
                ×2
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <label className="min-w-0">
              <span className="sr-only">Grid width</span>
              <Input
                key={`${inputVersion}-output-width-${gridWidth}`}
                type="number"
                min={4}
                max={512}
                defaultValue={gridWidth}
                className="font-mono tabular-nums"
                onBlur={(event) =>
                  onGridChange("width", Number(event.target.value))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </label>
            <Button
              variant={aspectLocked ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => onAspectLockedChange(!aspectLocked)}
            >
              {aspectLocked ? <Link2 /> : <Unlink2 />}
              <span className="sr-only">
                {aspectLocked ? "Unlock aspect ratio" : "Preserve aspect ratio"}
              </span>
            </Button>
            <label className="min-w-0">
              <span className="sr-only">Grid height</span>
              <Input
                key={`${inputVersion}-output-height-${gridHeight}`}
                type="number"
                min={4}
                max={512}
                defaultValue={gridHeight}
                className="font-mono tabular-nums"
                onBlur={(event) =>
                  onGridChange("height", Number(event.target.value))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </label>
          </div>
          <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">
            {gridWidth} × {gridHeight}
          </p>
        </section>

        <section className="px-4 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label>Palette</Label>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {palette.name} · {matchingColorCount}/{palette.colors.length}{" "}
                matching
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenPalette}>
              Manage
            </Button>
          </div>

          <div className="mt-4 border bg-muted/20 p-2">
            <div
              className="flex flex-wrap justify-center gap-1 py-1"
              role="group"
              aria-label="Palette colors"
            >
              {palette.colors.map((swatch, index) => {
                const excluded = excludedColorIds.has(swatch.id);
                const isolated = isolatedColorIds.has(swatch.id);

                return (
                  <div key={swatch.id} className="group relative shrink-0">
                    <button
                      type="button"
                      className={cn(
                        "relative block size-9 touch-manipulation border border-white/15 outline-offset-2 transition-transform hover:-translate-y-0.5 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-ring",
                        excluded && "opacity-40 grayscale",
                        isolated &&
                          "ring-2 ring-[#ef6a47] ring-offset-2 ring-offset-background",
                        selectedSwatchId === swatch.id &&
                          "z-10 outline-2 outline-foreground",
                      )}
                      style={{ backgroundColor: swatch.hex }}
                      aria-label={`Edit color ${index + 1} of ${palette.colors.length}, ${swatch.hex}${excluded ? ", excluded from matching" : ""}${isolated ? ", isolated in previews" : ""}`}
                      aria-pressed={selectedSwatchId === swatch.id}
                      onClick={() => {
                        onSelectedSwatchChange(swatch.id);
                        setEditColor(swatch.hex);
                        setError(null);
                      }}
                    >
                      {excluded ? (
                        <CircleSlash2
                          className="absolute inset-0 m-auto size-4 text-white drop-shadow-[0_1px_2px_rgb(0_0_0)]"
                          aria-hidden="true"
                        />
                      ) : null}
                      {isolated ? (
                        <Eye
                          className="absolute -top-1.5 -right-1.5 size-3.5 bg-background p-0.5 text-[#ef6a47]"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                    {index < palette.colors.length - 1 ? (
                      <button
                        type="button"
                        aria-label={`Insert a midpoint after color ${index + 1}`}
                        className="absolute -right-2.5 top-1/2 z-30 grid size-5 -translate-y-1/2 translate-x-1/2 place-items-center border-2 border-border bg-primary text-primary-foreground opacity-0 shadow-[2px_2px_0_var(--shadow)] transition-[opacity,transform] hover:scale-110 focus:scale-110 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                        onClick={() => insertMidpoint(swatch.id)}
                      >
                        <Plus className="size-3" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedSwatchId !== null && selectedColor ? (
            <div className="mt-4 border bg-muted/25 p-3">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2">
                <label>
                  <Label className="mb-2">Color</Label>
                  <input
                    type="color"
                    value={editColor.slice(0, 7)}
                    className="block size-8 cursor-pointer border bg-transparent p-0"
                    onChange={(event) => setEditColor(event.target.value)}
                  />
                </label>
                <label className="min-w-0">
                  <span className="sr-only">Hex or CSS color</span>
                  <Input
                    value={editColor}
                    onChange={(event) => setEditColor(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") updateColor();
                    }}
                  />
                </label>
              </div>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Button size="sm" className="w-full" onClick={updateColor}>
                  Update
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    const result = removeSwatch(palette, selectedSwatchId);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    onPaletteChange(result.value);
                    onSelectedSwatchChange(null);
                    setError(null);
                  }}
                >
                  <Trash2 />
                  <span className="sr-only">Remove selected color</span>
                </Button>
              </div>
              <div className="mt-3 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!selectedInsertion?.ok}
                  aria-describedby={insertionDescriptionId}
                  onClick={() => {
                    if (!selectedInsertion?.ok) return;
                    const newId = nextSwatchId(palette.colors);
                    const newColor = selectedInsertion.value.colors.find(
                      (color) => color.id === newId,
                    );
                    onPaletteChange(selectedInsertion.value);
                    onSelectedSwatchChange(newId);
                    if (newColor) setEditColor(newColor.hex);
                    setError(null);
                  }}
                >
                  <Plus data-icon="inline-start" />
                  Insert midpoint
                </Button>
                <p
                  id={insertionDescriptionId}
                  className="mt-2 text-[11px] leading-4 text-muted-foreground"
                >
                  {selectedInsertion?.ok &&
                  selectedMidpoint?.ok &&
                  nextSelectedColor
                    ? `Add ${selectedMidpoint.value} between this color and ${nextSelectedColor.hex}.`
                    : selectedInsertion && !selectedInsertion.ok
                      ? selectedInsertion.error
                      : "The last color has no following midpoint."}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                <Button
                  variant={
                    excludedColorIds.has(selectedColor.id)
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  aria-pressed={excludedColorIds.has(selectedColor.id)}
                  disabled={
                    !excludedColorIds.has(selectedColor.id) &&
                    matchingColorCount <= 1
                  }
                  onClick={() => onToggleExcludedColor(selectedColor.id)}
                >
                  <CircleSlash2 data-icon="inline-start" />
                  {excludedColorIds.has(selectedColor.id)
                    ? "Excluded"
                    : "Exclude"}
                </Button>
                <Button
                  variant={
                    isolatedColorIds.has(selectedColor.id)
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  aria-pressed={isolatedColorIds.has(selectedColor.id)}
                  onClick={() => onToggleIsolatedColor(selectedColor.id)}
                >
                  <Eye data-icon="inline-start" />
                  {isolatedColorIds.has(selectedColor.id)
                    ? "Isolated"
                    : "Isolate"}
                </Button>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                Exclude changes matching. Isolate only changes on-screen
                previews.
              </p>
              {error ? (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
              Select a swatch to edit it or insert a midpoint.
            </p>
          )}

          {excludedColorIds.size > 0 || isolatedColorIds.size > 0 ? (
            <div
              className="mt-3 flex flex-wrap items-center justify-between gap-3 border bg-muted/20 px-3 py-2"
              aria-live="polite"
            >
              <p className="text-[11px] leading-4 text-muted-foreground">
                {excludedColorIds.size > 0
                  ? `${excludedColorIds.size} excluded`
                  : "All colors matching"}
                {" · "}
                {isolatedColorIds.size > 0
                  ? `${isolatedColorIds.size} isolated`
                  : "All previews visible"}
              </p>
              {isolatedColorIds.size > 0 ? (
                <Button variant="ghost" size="xs" onClick={onClearIsolation}>
                  Show all
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            <PaletteAdjustments
              value={paletteAdjustments}
              onChange={onPaletteAdjustmentsChange}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={processing}
              onClick={onRerun}
            >
              <RefreshCw data-icon="inline-start" />
              Re-match
            </Button>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
