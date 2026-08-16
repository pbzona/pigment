"use client";

import type { ComponentProps } from "react";
import { useId, useState } from "react";
import {
  Aperture,
  ChevronDown,
  CircleDotDashed,
  Crop,
  Image,
  Layers3,
  Palette,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { Button } from "@pigment/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@pigment/ui/collapsible";
import { Label } from "@pigment/ui/label";
import { ScrollArea } from "@pigment/ui/scroll-area";
import { Slider } from "@pigment/ui/slider";
import { Switch } from "@pigment/ui/switch";
import { cn } from "@/lib/utils";
import { CONVERSION_METHODS, inputAdjustmentsChanged } from "@pigment/quantization";

import { ConvertPanel } from "./convert-panel";
import { SelectionPanel } from "./selection-panel";
import { SourceAdjustments } from "./source-adjustments";

type PipelinePanelProps = Readonly<{
  convertProps: ComponentProps<typeof ConvertPanel>;
  selectionProps: ComponentProps<typeof SelectionPanel>;
  gridWidth: number;
  gridHeight: number;
  paletteName: string;
  paletteColorCount: number;
  interventionCount: number;
  onOpenOutput: () => void;
  onStartIntervention: () => void;
}>;

const stepClass = "border border-foreground/12 bg-card/45";

export function PipelinePanel({
  convertProps,
  selectionProps,
  gridWidth,
  gridHeight,
  paletteName,
  paletteColorCount,
  interventionCount,
  onOpenOutput,
  onStartIntervention,
}: PipelinePanelProps) {
  const [openStep, setOpenStep] = useState("adjust");
  const preserveTransparencyId = useId();
  const methodLabel = CONVERSION_METHODS.find((entry) => entry.value === convertProps.method)?.label;
  const adjustmentsChanged = inputAdjustmentsChanged(convertProps.inputAdjustments);
  const adjustmentCount = Object.values(convertProps.inputAdjustments).filter((value) => value !== 0).length;
  const adjustmentSummary = adjustmentsChanged
    ? `${adjustmentCount} ${adjustmentCount === 1 ? "adjustment" : "adjustments"}`
    : "Source unchanged";

  const summaryStep = (
    id: string,
    icon: typeof Image,
    title: string,
    summary: string,
    action?: () => void,
  ) => {
    const Icon = icon;
    return (
      <button
        type="button"
        className={cn(stepClass, "flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-primary/45 hover:bg-primary/5")}
        onClick={action}
      >
        <span className="font-mono text-[9px] text-muted-foreground">{id}</span>
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium">{title}</span>
          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{summary}</span>
        </span>
      </button>
    );
  };

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="px-3 pb-6 pt-3">
        <div className="mb-3 flex items-start justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-semibold">Procedure</p>
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
              A constrained pipeline. Open a stage to change how the image flows through it.
            </p>
          </div>
          <Layers3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        </div>

        <div className="space-y-1.5" aria-label="Image procedure">
          {summaryStep("01", Image, "Source", `${convertProps.source.width}×${convertProps.source.height} pixels`)}
          {summaryStep("02", Crop, "Frame", "Full source image")}

          <Collapsible open={openStep === "adjust"} onOpenChange={(open) => setOpenStep(open ? "adjust" : "")}>
            <CollapsibleTrigger asChild>
              <button type="button" className={cn(stepClass, "flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-primary/45")}>
                <span className="font-mono text-[9px] text-muted-foreground">03</span>
                <SlidersHorizontal className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">Adjust</span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{adjustmentSummary}</span>
                </span>
                <ChevronDown className={cn("size-3.5 transition-transform", openStep === "adjust" && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-x border-b border-foreground/12 bg-background px-4 pb-5 pt-5">
              <SourceAdjustments
                value={convertProps.inputAdjustments}
                onChange={convertProps.onInputAdjustmentsChange}
                compact
              />
              <div className="mt-6 border-t pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor={preserveTransparencyId}>Preserve transparency</Label>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Keep empty source areas out of the procedure.</p>
                  </div>
                  <Switch
                    id={preserveTransparencyId}
                    checked={convertProps.preserveTransparency}
                    onCheckedChange={convertProps.onPreserveTransparencyChange}
                  />
                </div>
                {convertProps.preserveTransparency ? (
                  <label className="mt-5 block">
                    <span className="mb-2 flex items-center justify-between text-xs">
                      <span>Alpha threshold</span>
                      <span className="font-mono text-muted-foreground">{convertProps.alphaThreshold}</span>
                    </span>
                    <Slider
                      aria-label="Alpha threshold"
                      min={0}
                      max={255}
                      step={1}
                      value={[convertProps.alphaThreshold]}
                      onValueChange={([value]: number[]) => convertProps.onAlphaThresholdChange(value)}
                    />
                  </label>
                ) : null}
              </div>
              <p className="mt-5 border-t pt-4 text-[10px] leading-4 text-muted-foreground">
                These changes alter the source before partitioning, sampling, and palette matching.
              </p>
            </CollapsibleContent>
          </Collapsible>

          {summaryStep("04", CircleDotDashed, "Partition", `Square · ${gridWidth}×${gridHeight}`, onOpenOutput)}

          <Collapsible open={openStep === "sample"} onOpenChange={(open) => setOpenStep(open ? "sample" : "")}>
            <CollapsibleTrigger asChild>
              <button type="button" className={cn(stepClass, "flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-primary/45")}>
                <span className="font-mono text-[9px] text-muted-foreground">05</span>
                <Aperture className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">Sample</span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{methodLabel}</span>
                </span>
                <ChevronDown className={cn("size-3.5 transition-transform", openStep === "sample" && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-x border-b border-foreground/12 bg-background pt-4">
              <ConvertPanel {...convertProps} compact />
            </CollapsibleContent>
          </Collapsible>

          {summaryStep("06", Palette, "Map color", `${paletteName} · ${paletteColorCount} colors`, onOpenOutput)}
          {summaryStep("07", ScanLine, "Texture", "No texture modifier")}

          <Collapsible open={openStep === "interventions"} onOpenChange={(open) => setOpenStep(open ? "interventions" : "")}>
            <CollapsibleTrigger asChild>
              <button type="button" className={cn(stepClass, "flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-primary/45")} onClick={onStartIntervention}>
                <span className="font-mono text-[9px] text-muted-foreground">08</span>
                <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">Interventions</span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {interventionCount === 0 ? "Select a region to vary the procedure" : `${interventionCount} local method ${interventionCount === 1 ? "override" : "overrides"}`}
                  </span>
                </span>
                <ChevronDown className={cn("size-3.5 transition-transform", openStep === "interventions" && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-x border-b border-foreground/12 bg-background pt-5">
              <SelectionPanel {...selectionProps} />
            </CollapsibleContent>
          </Collapsible>

          {summaryStep("09", Sparkles, "Output", `${gridWidth}×${gridHeight} cells`)}
        </div>

        <div className="mt-4 border border-dashed border-foreground/20 p-3">
          <p className="text-[10px] font-medium">Modifiers, not nodes</p>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
            Each stage stays legible. Future modifiers can extend a stage without turning the procedure into a graph.
          </p>
          <Button variant="ghost" size="xs" className="mt-2 px-0" disabled>
            Add modifier · soon
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
