"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { formatColorHex } from "@pigment/color";
import {
  canvasFrameLayout,
  type CanvasFrame,
  type PixelPaletteColor,
  type PixelPreview,
} from "@pigment/quantization";
import { Button } from "@pigment/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pigment/ui/dialog";
import { Input } from "@pigment/ui/input";
import { Label } from "@pigment/ui/label";
import { Slider } from "@pigment/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@pigment/ui/toggle-group";

export type CanvasFrameDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: PixelPreview;
  sourceWidth: number;
  sourceHeight: number;
  frame: CanvasFrame | null;
  palette: readonly PixelPaletteColor[];
  onApply: (frame: CanvasFrame | null) => void;
}>;

const PRESETS = [
  { columns: 4, rows: 4, label: "Square" },
  { columns: 4, rows: 5, label: "Portrait" },
  { columns: 5, rows: 4, label: "Landscape" },
  { columns: 2, rows: 3, label: "Tall portrait" },
  { columns: 3, rows: 2, label: "Wide landscape" },
] as const;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const percentage = (value: number) => Math.round(value * 1_000) / 10;

// The shared Slider forwards labels to its root, not the focusable Radix thumb.
function labelScaleSlider(element: HTMLSpanElement | null) {
  element
    ?.querySelector('[role="slider"]')
    ?.setAttribute("aria-label", "Image scale (%)");
}

/** Keep incomplete numeric entries editable without sending invalid geometry. */
function NumberControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: Readonly<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}>) {
  const id = useId();
  const [entry, setEntry] = useState<string | null>(null);

  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="mb-1.5 text-[11px] text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={entry ?? value}
        className="h-9 font-mono tabular-nums"
        onChange={(event) => {
          const text = event.target.value;
          setEntry(text);
          const number = Number(text);
          if (
            text.trim() &&
            Number.isFinite(number) &&
            number >= min &&
            number <= max
          ) {
            onChange(number);
          }
        }}
        onBlur={() => {
          if (
            entry !== null &&
            entry.trim() &&
            Number.isFinite(Number(entry))
          ) {
            onChange(clamp(Number(entry), min, max));
          }
          setEntry(null);
        }}
      />
    </div>
  );
}

/** Mount only while open so each session starts with the applied frame. */
export function CanvasFrameDialog({
  open,
  onOpenChange,
  source,
  sourceWidth,
  sourceHeight,
  frame,
  palette,
  onApply,
}: CanvasFrameDialogProps) {
  const [draft, setDraft] = useState<CanvasFrame>(
    () =>
      frame ?? {
        columns: 4,
        rows: 4,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        backgroundColorId: palette[0]?.id ?? 0,
      },
  );
  const instructionsId = useId();
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const layout = canvasFrameLayout(sourceWidth, sourceHeight, draft);
  const background =
    palette.find((color) => color.id === draft.backgroundColorId) ?? palette[0];
  const backgroundHex = background
    ? formatColorHex(background.color)
    : undefined;
  const preset = PRESETS.find(
    ({ columns, rows }) => columns === draft.columns && rows === draft.rows,
  );

  // Draw once per source, including when the dialog portal first mounts. Moving
  // and scaling only change CSS placement; no pixels are resampled while dragging.
  const drawSource = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      canvas.width = source.width;
      canvas.height = source.height;
      canvas
        .getContext("2d")
        ?.putImageData(
          new ImageData(source.pixels, source.width, source.height),
          0,
          0,
        );
    },
    [source],
  );

  const changeDraft = (changes: Partial<CanvasFrame>) => {
    setDraft((current) => ({ ...current, ...changes }));
  };

  const moveWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const step = event.shiftKey ? 0.1 : 0.01;
    let x = 0;
    let y = 0;
    switch (event.key) {
      case "ArrowLeft":
        x = -step;
        break;
      case "ArrowRight":
        x = step;
        break;
      case "ArrowUp":
        y = -step;
        break;
      case "ArrowDown":
        y = step;
        break;
      case "Home":
        event.preventDefault();
        changeDraft({ offsetX: 0, offsetY: 0 });
        return;
      default:
        return;
    }
    event.preventDefault();
    setDraft((current) => ({
      ...current,
      offsetX: clamp(current.offsetX + x, -1, 1),
      offsetY: clamp(current.offsetY + y, -1, 1),
    }));
  };

  const apply = (next: CanvasFrame | null) => {
    onApply(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-none p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle>Canvas framing</DialogTitle>
          <DialogDescription>
            Set the proportions, place your image, and choose a palette
            background.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 overflow-y-auto md:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4 bg-background/50 p-4 sm:p-5 md:sticky md:top-0 md:self-start">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium">Composition preview</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {draft.columns}:{draft.rows}
              </span>
            </div>
            <div className="flex min-h-40 items-center justify-center py-2">
              <button
                type="button"
                aria-label="Move image in canvas"
                aria-describedby={instructionsId}
                className="relative block shrink-0 touch-none select-none overflow-hidden border border-foreground/40 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background cursor-grab active:cursor-grabbing"
                style={{
                  aspectRatio: `${layout.width} / ${layout.height}`,
                  width: `min(100%, calc(min(45dvh, 28rem) * ${layout.width / layout.height}))`,
                  backgroundColor: backgroundHex,
                }}
                onKeyDown={moveWithKeyboard}
                onPointerDown={(event) => {
                  if (!event.isPrimary || event.button !== 0) return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  if (!bounds.width || !bounds.height) return;
                  event.preventDefault();
                  event.currentTarget.focus();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  drag.current = {
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                    width: bounds.width,
                    height: bounds.height,
                    offsetX: draft.offsetX,
                    offsetY: draft.offsetY,
                  };
                }}
                onPointerMove={(event) => {
                  const start = drag.current;
                  if (!start || start.pointerId !== event.pointerId) return;
                  changeDraft({
                    offsetX: clamp(
                      start.offsetX + (event.clientX - start.x) / start.width,
                      -1,
                      1,
                    ),
                    offsetY: clamp(
                      start.offsetY + (event.clientY - start.y) / start.height,
                      -1,
                      1,
                    ),
                  });
                }}
                onPointerUp={(event) => {
                  if (drag.current?.pointerId !== event.pointerId) return;
                  drag.current = null;
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onLostPointerCapture={() => {
                  drag.current = null;
                }}
              >
                <canvas
                  ref={drawSource}
                  aria-hidden="true"
                  className="pointer-events-none absolute max-w-none bg-[#17191c] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-[linear-gradient(45deg,#25282d_25%,transparent_25%),linear-gradient(-45deg,#25282d_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#25282d_75%),linear-gradient(-45deg,transparent_75%,#25282d_75%)]"
                  style={{
                    left: `${(layout.imageX / layout.width) * 100}%`,
                    top: `${(layout.imageY / layout.height) * 100}%`,
                    width: `${(layout.imageWidth / layout.width) * 100}%`,
                    height: `${(layout.imageHeight / layout.height) * 100}%`,
                  }}
                />
              </button>
            </div>
            <p
              id={instructionsId}
              className="text-xs leading-5 text-muted-foreground"
            >
              Drag the image to move it. Or focus the preview and use arrow
              keys; hold Shift for larger moves. Anything outside the canvas is
              clipped.
            </p>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t pt-3 font-mono text-[11px] tabular-nums text-muted-foreground">
              <span>
                Source {sourceWidth} × {sourceHeight}
              </span>
              <span>
                Canvas {layout.width} × {layout.height}
              </span>
            </div>
          </div>

          <div className="min-w-0 space-y-5 border-t p-4 sm:p-5 md:border-t-0 md:border-l">
            <section className="space-y-3" aria-label="Canvas proportions">
              <Label>Canvas ratio</Label>
              <ToggleGroup
                type="single"
                aria-label="Canvas ratio presets"
                variant="outline"
                spacing={0}
                value={preset ? `${preset.columns}:${preset.rows}` : ""}
                className="w-full"
                onValueChange={(value: string) => {
                  const selected = PRESETS.find(
                    ({ columns, rows }) => `${columns}:${rows}` === value,
                  );
                  if (selected)
                    changeDraft({
                      columns: selected.columns,
                      rows: selected.rows,
                    });
                }}
              >
                {PRESETS.map(({ columns, rows, label }) => (
                  <ToggleGroupItem
                    key={`${columns}:${rows}`}
                    value={`${columns}:${rows}`}
                    aria-label={`${label} ${columns}:${rows}`}
                    title={`${label} ${columns}:${rows}`}
                    className={`min-w-0 flex-1 px-1 text-xs ${draft.columns === columns && draft.rows === rows ? "bg-primary text-primary-foreground underline decoration-2 underline-offset-4 hover:bg-primary" : ""}`}
                  >
                    {columns}:{rows}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="grid grid-cols-2 gap-3">
                <NumberControl
                  label="Columns"
                  value={draft.columns}
                  min={2}
                  max={32}
                  onChange={(columns) =>
                    changeDraft({ columns: Math.round(columns) })
                  }
                />
                <NumberControl
                  label="Rows"
                  value={draft.rows}
                  min={2}
                  max={32}
                  onChange={(rows) => changeDraft({ rows: Math.round(rows) })}
                />
              </div>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Use 2–32 transfer divisions per side. Columns and rows set the
                canvas proportions, not the pixel resolution.
              </p>
            </section>

            <section
              className="space-y-3 border-t pt-4"
              aria-label="Image placement"
            >
              <div className="flex items-center justify-between gap-3">
                <Label>Image placement</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => changeDraft({ offsetX: 0, offsetY: 0 })}
                >
                  Center
                </Button>
              </div>
              <NumberControl
                label="Scale (%)"
                value={percentage(draft.scale)}
                min={10}
                max={300}
                step={0.1}
                onChange={(scale) => changeDraft({ scale: scale / 100 })}
              />
              <Slider
                ref={labelScaleSlider}
                aria-label="Image scale"
                min={10}
                max={300}
                step={1}
                value={[draft.scale * 100]}
                onValueChange={([scale]: number[]) =>
                  changeDraft({ scale: scale / 100 })
                }
              />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <NumberControl
                  label="Horizontal (%)"
                  value={percentage(draft.offsetX)}
                  min={-100}
                  max={100}
                  step={0.1}
                  onChange={(offsetX) =>
                    changeDraft({ offsetX: offsetX / 100 })
                  }
                />
                <NumberControl
                  label="Vertical (%)"
                  value={percentage(draft.offsetY)}
                  min={-100}
                  max={100}
                  step={0.1}
                  onChange={(offsetY) =>
                    changeDraft({ offsetY: offsetY / 100 })
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  changeDraft({ scale: 1, offsetX: 0, offsetY: 0 })
                }
              >
                Fit whole image
              </Button>
            </section>

            <section
              className="space-y-3 border-t pt-4"
              aria-label="Canvas background"
            >
              <div className="flex items-center justify-between gap-3">
                <Label>Background</Label>
                {backgroundHex ? (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {backgroundHex}
                  </span>
                ) : null}
              </div>
              {palette.length ? (
                <div
                  className="grid max-h-32 grid-cols-7 gap-2 overflow-y-auto p-1"
                  role="group"
                  aria-label="Palette background colors"
                >
                  {palette.map((swatch, index) => {
                    const hex = formatColorHex(swatch.color);
                    const selected = background?.id === swatch.id;
                    return (
                      <button
                        key={swatch.id}
                        type="button"
                        aria-label={`Background color ${index + 1}, ${hex}`}
                        aria-pressed={selected}
                        title={`Color ${index + 1}, ${hex}`}
                        className={`aspect-square min-h-7 border border-foreground/30 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover ${selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover" : "hover:ring-1 hover:ring-foreground"}`}
                        style={{ backgroundColor: hex }}
                        onClick={() =>
                          changeDraft({ backgroundColorId: swatch.id })
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  Add a palette color before applying a frame.
                </p>
              )}
            </section>
          </div>
        </div>

        <DialogFooter className="grid grid-cols-2 gap-3 px-4 py-4 sm:flex sm:flex-wrap sm:px-5">
          <Button
            type="button"
            variant="ghost"
            className="col-span-2 sm:mr-auto"
            onClick={() => apply(null)}
          >
            Use original bounds
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!background}
            onClick={() => {
              if (background)
                apply({ ...draft, backgroundColorId: background.id });
            }}
          >
            Apply frame
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
