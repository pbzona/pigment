"use client";

import { Eraser, PaintBucket, Pencil, Pipette } from "lucide-react";

import { Button } from "@pigment/ui/button";
import { Label } from "@pigment/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@pigment/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pigment/ui/tooltip";
import {
  adjustHexColor,
  type PaletteAdjustments as PaletteAdjustmentsValue,
} from "@pigment/color";
import type { Palette } from "@pigment/palette";
import { cn } from "@/lib/utils";

import type { EditorTool } from "./types";

type PaintPanelProps = Readonly<{
  palette: Palette;
  adjustments: PaletteAdjustmentsValue;
  selectedColorId: number;
  tool: EditorTool;
  brushSize: number;
  selectionCount: number | null;
  onSelectedColorChange: (id: number) => void;
  onToolChange: (tool: EditorTool) => void;
  onBrushSizeChange: (size: number) => void;
  onOpenPalette: () => void;
}>;

const tools: readonly Readonly<{
  value: EditorTool;
  label: string;
  icon: typeof Pencil;
  key: string;
}>[] = [
  { value: "pencil", label: "Pencil", icon: Pencil, key: "P" },
  { value: "fill", label: "Fill", icon: PaintBucket, key: "F" },
  { value: "eyedropper", label: "Eyedropper", icon: Pipette, key: "I" },
  { value: "restore", label: "Restore generated", icon: Eraser, key: "E" },
];

export function PaintPanel({
  palette,
  adjustments,
  selectedColorId,
  tool,
  brushSize,
  selectionCount,
  onSelectedColorChange,
  onToolChange,
  onBrushSizeChange,
  onOpenPalette,
}: PaintPanelProps) {
  return (
    <div className="space-y-7 px-4 pb-6">
      <section>
        <Label className="mb-3">Tool</Label>
        <ToggleGroup
          type="single"
          value={tool}
          variant="outline"
          spacing={0}
          className="grid w-full grid-cols-2 gap-2 [&>[data-slot=toggle-group-item]]:ml-0"
          aria-label="Paint tool"
          onValueChange={(value: string) => {
            if (value) onToolChange(value as EditorTool);
          }}
        >
          {tools.map((entry) => {
            const Icon = entry.icon;
            return (
              <Tooltip key={entry.value}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={entry.value}
                    className="justify-start px-2 text-xs"
                    aria-label={entry.label}
                  >
                    <Icon />
                    <span>
                      {entry.value === "eyedropper"
                        ? "Pick color"
                        : entry.value === "restore"
                          ? "Restore"
                          : entry.label}
                    </span>
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>
                  {entry.label}{" "}
                  <span className="ml-1 opacity-60">{entry.key}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Label>Color</Label>
          <Button variant="ghost" size="xs" onClick={onOpenPalette}>
            Manage palette
          </Button>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {palette.colors.map((swatch) => (
            <button
              type="button"
              key={swatch.id}
              className={cn(
                "aspect-square border border-white/15 outline-offset-2 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring",
                selectedColorId === swatch.id && "outline-2 outline-foreground",
              )}
              style={{
                backgroundColor: adjustHexColor(swatch.hex, adjustments),
              }}
              aria-label={`Paint with ${swatch.hex}`}
              aria-pressed={selectedColorId === swatch.id}
              onClick={() => {
                onSelectedColorChange(swatch.id);
                if (tool === "eyedropper" || tool === "restore")
                  onToolChange("pencil");
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <Label className="mb-3">Brush size</Label>
        <ToggleGroup
          type="single"
          value={String(brushSize)}
          variant="outline"
          spacing={0}
          className="w-full"
          disabled={tool === "fill" || tool === "eyedropper"}
          onValueChange={(value: string) => {
            if (value) onBrushSizeChange(Number(value));
          }}
        >
          {[1, 2, 3].map((size) => (
            <ToggleGroupItem
              key={size}
              value={String(size)}
              className="flex-1 rounded-none font-mono"
            >
              {size}×{size}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      <div className="border-t pt-4 text-[11px] leading-5 text-muted-foreground">
        {selectionCount === null
          ? "Drag to paint."
          : `Paint is limited to ${selectionCount} selected cells.`}{" "}
        Use <kbd className="font-mono text-foreground">⌘/Ctrl Z</kbd> to undo a
        complete stroke.
      </div>
    </div>
  );
}
