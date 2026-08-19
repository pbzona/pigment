"use client";

import { useId, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";

import { Button } from "@pigment/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@pigment/ui/collapsible";
import { Label } from "@pigment/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pigment/ui/select";
import { Slider } from "@pigment/ui/slider";
import { Switch } from "@pigment/ui/switch";
import {
  CONVERSION_METHODS,
  type ConversionMethod,
  type InputAdjustments,
  type PartitionKind,
} from "@pigment/quantization";

import { SourceAdjustments } from "./source-adjustments";
import type { SourceMeta } from "./types";

type ConvertPanelProps = Readonly<{
  source: SourceMeta;
  method: ConversionMethod;
  partition?: PartitionKind;
  inputAdjustments: InputAdjustments;
  preserveTransparency: boolean;
  alphaThreshold: number;
  onMethodChange: (method: ConversionMethod) => void;
  onInputAdjustmentsChange: (adjustments: InputAdjustments) => void;
  onPreserveTransparencyChange: (preserve: boolean) => void;
  onAlphaThresholdChange: (threshold: number) => void;
  firstResultGuide?: boolean;
  onDismissFirstResultGuide?: () => void;
  compact?: boolean;
}>;

export function ConvertPanel({
  source,
  method,
  partition = "square",
  inputAdjustments,
  preserveTransparency,
  alphaThreshold,
  onMethodChange,
  onInputAdjustmentsChange,
  onPreserveTransparencyChange,
  onAlphaThresholdChange,
  firstResultGuide = false,
  onDismissFirstResultGuide,
  compact = false,
}: ConvertPanelProps) {
  const methodId = useId();
  const compatibleMethods = partition === "square"
    ? CONVERSION_METHODS
    : CONVERSION_METHODS.filter((entry) =>
        !["dither", "atkinson", "bayer", "blue-noise", "riemersma"].includes(entry.value),
      );
  const preserveTransparencyId = useId();
  const [advancedOpen, setAdvancedOpen] = useState(!firstResultGuide);

  return (
    <div className="divide-y divide-border pb-6">
      {!compact ? <section className="px-4 pb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium">Source</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Source: {source.width}×{source.height} pixels</p>
          </div>
        </div>
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              Source adjustments
              <ChevronDown
                className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-5">
            <SourceAdjustments value={inputAdjustments} onChange={onInputAdjustmentsChange} compact />
            <div className="mt-6 border-t pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor={preserveTransparencyId}>Preserve transparency</Label>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Keep empty source areas empty.</p>
                </div>
                <Switch
                  id={preserveTransparencyId}
                  checked={preserveTransparency}
                  onCheckedChange={onPreserveTransparencyChange}
                />
              </div>
              {preserveTransparency ? (
                <label className="mt-5 block">
                  <span className="mb-2 flex items-center justify-between text-xs">
                    <span>Alpha threshold</span>
                    <span className="font-mono text-muted-foreground">{alphaThreshold}</span>
                  </span>
                  <Slider
                    aria-label="Alpha threshold"
                    min={0}
                    max={255}
                    step={1}
                    value={[alphaThreshold]}
                    onValueChange={([value]: number[]) => onAlphaThresholdChange(value)}
                  />
                </label>
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section> : null}

      <section className={compact ? "px-4 pb-5" : "px-4 py-6"}>
        {firstResultGuide ? (
          <div className="mb-5 border-2 border-primary bg-primary/10 p-3 shadow-[3px_3px_0_var(--primary)]">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Try another algorithm</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Pick a method below and watch the same image make a different color decision.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Dismiss first experiment suggestion"
                onClick={onDismissFirstResultGuide}
              >
                <X />
              </Button>
            </div>
          </div>
        ) : null}
        <Label htmlFor={methodId} className="mb-3">Sampling method</Label>
        <Select value={method} onValueChange={(value: string) => onMethodChange(value as ConversionMethod)}>
          <SelectTrigger id={methodId} className="h-9 w-full rounded-none py-0">
            <SelectValue>{CONVERSION_METHODS.find((entry) => entry.value === method)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {compatibleMethods.map((entry) => (
              <SelectItem key={entry.value} value={entry.value} className="rounded-none py-2">
                <span className="flex flex-col items-start">
                  <span>{entry.label}</span>
                  <span className="text-[11px] text-muted-foreground">{entry.description}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          This algorithm {CONVERSION_METHODS.find((entry) => entry.value === method)?.description.toLowerCase()}.
          {partition !== "square" ? " Diffusion and pattern methods require a square partition." : ""}
        </p>
      </section>
    </div>
  );
}
