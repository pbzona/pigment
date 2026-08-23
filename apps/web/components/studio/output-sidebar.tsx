"use client";

import { Link2, RefreshCw, Unlink2 } from "lucide-react";

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
import type { Palette } from "@pigment/palette";
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
  processing: boolean;
  onGridChange: (axis: "width" | "height", value: number) => void;
  onPartitionChange: (partition: PartitionKind) => void;
  onPartitionScaleChange: (scale: number) => void;
  onGridScale: (factor: 0.5 | 2) => void;
  onAspectLockedChange: (locked: boolean) => void;
  onOpenPalette: () => void;
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
  processing,
  onGridChange,
  onPartitionChange,
  onPartitionScaleChange,
  onGridScale,
  onAspectLockedChange,
  onOpenPalette,
  onPaletteAdjustmentsChange,
  onRerun,
}: OutputSidebarProps) {
  const matchingColorCount = palette.colors.length - excludedColorIds.size;

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="min-w-0 divide-y divide-border/60">
        <section className="px-4 py-5">
          <Label className="mb-3">Partition</Label>
          <Select value={partition} onValueChange={(value: string) => onPartitionChange(value as PartitionKind)}>
            <SelectTrigger className="w-full rounded-none" aria-label="Partition shape"><SelectValue /></SelectTrigger>
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
                  <span className="font-mono text-muted-foreground">{partitionScale}</span>
                </span>
                <Slider min={2} max={16} step={1} value={[partitionScale]} onValueChange={([value]: number[]) => onPartitionScaleChange(value)} />
              </label>
              <p className="mt-3 border border-foreground/10 bg-muted/20 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                {partition === "voronoi" ? "Evenly spaced Poisson points produce stable irregular cells." : "Cell scale controls the radius of the hexagons."} Diffusion, pattern methods, and regional overrides require Square.
              </p>
            </>
          ) : null}
        </section>

        <section className="px-4 py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Label>Resolution</Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="xs" disabled={gridWidth <= 4 || gridHeight <= 4} onClick={() => onGridScale(0.5)}>÷2</Button>
              <Button variant="ghost" size="xs" disabled={gridWidth >= 512 || gridHeight >= 512} onClick={() => onGridScale(2)}>×2</Button>
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <label className="min-w-0">
              <span className="sr-only">Output width</span>
              <Input key={`${inputVersion}-output-width-${gridWidth}`} type="number" min={4} max={512} defaultValue={gridWidth} className="font-mono tabular-nums" onBlur={(event) => onGridChange("width", Number(event.target.value))} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
            </label>
            <Button variant={aspectLocked ? "secondary" : "ghost"} size="icon-sm" onClick={() => onAspectLockedChange(!aspectLocked)}>
              {aspectLocked ? <Link2 /> : <Unlink2 />}
              <span className="sr-only">{aspectLocked ? "Unlock aspect ratio" : "Preserve aspect ratio"}</span>
            </Button>
            <label className="min-w-0">
              <span className="sr-only">Output height</span>
              <Input key={`${inputVersion}-output-height-${gridHeight}`} type="number" min={4} max={512} defaultValue={gridHeight} className="font-mono tabular-nums" onBlur={(event) => onGridChange("height", Number(event.target.value))} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
            </label>
          </div>
          <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">{gridWidth} × {gridHeight}</p>
        </section>

        <section className="px-4 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label>Palette</Label>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{palette.name} · {matchingColorCount} colors available</p>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenPalette}>Manage</Button>
          </div>
          <div className="mt-4 flex h-12 overflow-hidden border" role="img" aria-label={`${palette.name} palette`}>
            {palette.colors.map((swatch) => (
              <span key={swatch.id} className="min-w-1 flex-1" style={{ backgroundColor: swatch.hex, opacity: excludedColorIds.has(swatch.id) ? 0.25 : 1 }} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <PaletteAdjustments value={paletteAdjustments} onChange={onPaletteAdjustmentsChange} />
            <Button variant="ghost" size="sm" disabled={processing} onClick={onRerun}>
              <RefreshCw data-icon="inline-start" /> Re-match
            </Button>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
