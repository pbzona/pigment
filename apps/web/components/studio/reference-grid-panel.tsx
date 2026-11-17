"use client";

import { Crop, Frame, Grid2X2 } from "lucide-react";

import { Button } from "@pigment/ui/button";
import { Input } from "@pigment/ui/input";
import { Label } from "@pigment/ui/label";
import { Slider } from "@pigment/ui/slider";
import { Switch } from "@pigment/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@pigment/ui/toggle-group";

import type { ReferenceGrid, ReferenceView } from "./types";

type ReferenceGridPanelProps = Readonly<{
  grid: ReferenceGrid;
  view: ReferenceView;
  cropping: boolean;
  framed?: boolean;
  onFrame: () => void;
  onViewChange: (view: ReferenceView) => void;
  onChange: (grid: ReferenceGrid) => void;
  onFit: () => void;
  onCrop: () => void;
}>;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Math.round(value)));

export function ReferenceGridPanel({
  grid,
  view,
  cropping,
  framed = false,
  onFrame,
  onViewChange,
  onChange,
  onFit,
  onCrop,
}: ReferenceGridPanelProps) {
  return (
    <div className="space-y-7 px-4 pb-6">
      <section>
        <Button variant="outline" className="w-full" onClick={onFrame}>
          <Frame data-icon="inline-start" /> Canvas framing
        </Button>
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
          {framed
            ? "The grid covers your full canvas. Edit framing to change its proportions or add space."
            : "Add space around your image without cropping or stretching the subject."}
        </p>
      </section>
      <section>
        <Label className="mb-2">Image</Label>
        <ToggleGroup
          type="single"
          value={view}
          variant="outline"
          spacing={0}
          className="w-full"
          onValueChange={(value: string) => {
            if (value) onViewChange(value as ReferenceView);
          }}
        >
          <ToggleGroupItem value="original" className="min-w-0 flex-1 px-2">
            Original
          </ToggleGroupItem>
          <ToggleGroupItem value="adjusted" className="min-w-0 flex-1 px-2">
            Adjusted
          </ToggleGroupItem>
          <ToggleGroupItem value="pixel" className="min-w-0 flex-1 px-2">
            Pixelated
          </ToggleGroupItem>
        </ToggleGroup>
      </section>

      <section className="border-t pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="reference-grid-visible">Reference grid</Label>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {framed ? "Square transfer cells cover the entire canvas." : "Position a square transfer grid over the source image."}
            </p>
          </div>
          <Switch
            id="reference-grid-visible"
            checked={grid.visible}
            onCheckedChange={(visible) => onChange({ ...grid, visible })}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1.5 block text-[11px] text-muted-foreground">Columns</span>
          <Input
            type="number"
            min={2}
            max={32}
            disabled={framed}
            value={grid.columns}
            className="font-mono tabular-nums"
            onChange={(event) =>
              onChange({ ...grid, columns: clamp(Number(event.target.value), 2, 32) })
            }
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] text-muted-foreground">Rows</span>
          <Input
            type="number"
            min={2}
            max={32}
            disabled={framed}
            value={grid.rows}
            className="font-mono tabular-nums"
            onChange={(event) =>
              onChange({ ...grid, rows: clamp(Number(event.target.value), 2, 32) })
            }
          />
        </label>
      </section>

      <section>
        <label className="block">
          <span className="mb-2 flex items-center justify-between text-xs">
            <span>Subdivisions</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {grid.subdivisions}×{grid.subdivisions}
            </span>
          </span>
          <Slider
            aria-label="Subdivisions per main grid cell"
            min={1}
            max={10}
            step={1}
            value={[grid.subdivisions]}
            onValueChange={([subdivisions]: number[]) =>
              onChange({ ...grid, subdivisions })
            }
          />
        </label>
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
          Faint lines divide each main cell for more precise proportion checks.
        </p>
      </section>

      <section>
        <label className="block">
          <span className="mb-2 flex items-center justify-between text-xs">
            <span>Line opacity</span>
            <span className="font-mono tabular-nums text-muted-foreground">{grid.opacity}%</span>
          </span>
          <Slider
            aria-label="Reference grid opacity"
            min={10}
            max={100}
            step={5}
            value={[grid.opacity]}
            onValueChange={([opacity]: number[]) => onChange({ ...grid, opacity })}
          />
        </label>
      </section>

      {!framed ? <section className="grid gap-2 border-t pt-5">
        <Button variant="outline" onClick={onFit}>
          <Grid2X2 data-icon="inline-start" /> Fit grid to image
        </Button>
        <Button disabled={!grid.visible || cropping} onClick={onCrop}>
          <Crop data-icon="inline-start" />
          {cropping ? "Cropping…" : "Crop to grid"}
        </Button>
        <p className="text-[10px] leading-4 text-muted-foreground">
          Cropping is destructive and reduces the artwork dimensions proportionally.
        </p>
      </section> : null}
    </div>
  );
}
