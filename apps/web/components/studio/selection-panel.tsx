"use client";

import { useId } from "react";

import { Blend, Brush, Grid2X2Check, Scan, Ungroup } from "lucide-react";

import { Button } from "@pigment/ui/button";
import { Label } from "@pigment/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pigment/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@pigment/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pigment/ui/tooltip";
import {
  CONVERSION_METHODS,
  type ConversionMethod,
} from "@pigment/quantization";

import type { SelectionCombineMode, SelectionTool } from "./types";

type SelectionPanelProps = Readonly<{
  tool: SelectionTool;
  combineMode: SelectionCombineMode;
  brushSize: number;
  selectedCount: number | null;
  method: ConversionMethod;
  globalMethod: ConversionMethod;
  processing: boolean;
  onToolChange: (tool: SelectionTool) => void;
  onCombineModeChange: (mode: SelectionCombineMode) => void;
  onBrushSizeChange: (size: number) => void;
  onMethodChange: (method: ConversionMethod) => void;
  onSelectAll: () => void;
  onInvert: () => void;
  onDeselect: () => void;
  onApplyMethod: () => void;
  onUseGlobal: () => void;
}>;

const tools: readonly Readonly<{
  value: SelectionTool;
  label: string;
  icon: typeof Brush;
}>[] = [
  { value: "brush", label: "Selection brush", icon: Brush },
  { value: "rectangle", label: "Rectangle", icon: Scan },
  { value: "contiguous", label: "Contiguous color", icon: Blend },
];

export function SelectionPanel({
  tool,
  combineMode,
  brushSize,
  selectedCount,
  method,
  globalMethod,
  processing,
  onToolChange,
  onCombineModeChange,
  onBrushSizeChange,
  onMethodChange,
  onSelectAll,
  onInvert,
  onDeselect,
  onApplyMethod,
  onUseGlobal,
}: SelectionPanelProps) {
  const hasSelection = selectedCount !== null && selectedCount > 0;
  const methodId = useId();

  return (
    <div className="space-y-7 px-4 pb-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <Label>Region tool</Label>
          <span className="font-mono text-[10px] text-muted-foreground">
            {selectedCount === null ? "none" : `${selectedCount} cells`}
          </span>
        </div>
        <ToggleGroup
          type="single"
          value={tool}
          variant="outline"
          spacing={0}
          className="w-full"
          onValueChange={(value: string) => {
            if (value) onToolChange(value as SelectionTool);
          }}
        >
          {tools.map((entry) => {
            const Icon = entry.icon;
            return (
              <Tooltip key={entry.value}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={entry.value}
                    className="h-auto min-h-12 flex-1 flex-col gap-1 px-1 py-2 text-[11px]"
                    aria-label={entry.label}
                  >
                    <Icon />
                    <span>
                      {entry.value === "brush"
                        ? "Brush"
                        : entry.value === "contiguous"
                          ? "By color"
                          : "Rectangle"}
                    </span>
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{entry.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
      </section>

      <section>
        <Label className="mb-3">Combine</Label>
        <ToggleGroup
          type="single"
          value={combineMode}
          variant="outline"
          spacing={0}
          className="w-full"
          onValueChange={(value: string) => {
            if (value) onCombineModeChange(value as SelectionCombineMode);
          }}
        >
          {(["replace", "add", "subtract"] as const).map((value) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="flex-1 rounded-none text-[10px] capitalize"
            >
              {value === "replace" ? "New" : value}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
          Hold Shift to add or Option/Alt to subtract while dragging.
        </p>
      </section>

      <section>
        <Label className="mb-3">Brush size</Label>
        <ToggleGroup
          type="single"
          value={String(brushSize)}
          variant="outline"
          spacing={0}
          className="w-full"
          disabled={tool !== "brush"}
          onValueChange={(value: string) => {
            if (value) onBrushSizeChange(Number(value));
          }}
        >
          {[1, 2, 3, 5].map((size) => (
            <ToggleGroupItem
              key={size}
              value={String(size)}
              className="flex-1 rounded-none font-mono"
            >
              {size}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="xs" onClick={onSelectAll}>
            <Grid2X2Check data-icon="inline-start" /> All
          </Button>
          <Button variant="outline" size="xs" onClick={onInvert}>
            <Ungroup data-icon="inline-start" /> Invert
          </Button>
          <Button
            variant="outline"
            size="xs"
            className="col-span-2"
            disabled={selectedCount === null}
            onClick={onDeselect}
          >
            Deselect
          </Button>
        </div>
      </section>

      <section className="border-t pt-5">
        <Label htmlFor={methodId} className="mb-3">
          Method for this region
        </Label>
        <Select
          value={method}
          onValueChange={(value: string) =>
            onMethodChange(value as ConversionMethod)
          }
        >
          <SelectTrigger id={methodId} className="h-9 w-full rounded-none py-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {CONVERSION_METHODS.map((entry) => (
              <SelectItem
                key={entry.value}
                value={entry.value}
                className="rounded-none"
              >
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-3 grid gap-2">
          <Button
            disabled={!hasSelection || processing}
            onClick={onApplyMethod}
          >
            Apply method
          </Button>
          <Button
            variant="outline"
            disabled={!hasSelection || processing}
            onClick={onUseGlobal}
          >
            Use image method
          </Button>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
          Other cells keep the image’s{" "}
          {CONVERSION_METHODS.find((entry) => entry.value === globalMethod)
            ?.label ?? globalMethod}{" "}
          method.
        </p>
      </section>
    </div>
  );
}
