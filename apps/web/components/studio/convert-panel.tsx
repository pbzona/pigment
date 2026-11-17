"use client";

import { useId, useState } from "react";
import { ChevronDown, X } from "lucide-react";

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
  section?: "method" | "source";
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
  section = "method",
}: ConvertPanelProps) {
  const methodId = useId();
  const transparencyId = useId();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const compatibleMethods =
    partition === "square"
      ? CONVERSION_METHODS
      : CONVERSION_METHODS.filter(
          (entry) =>
            ![
              "dither",
              "atkinson",
              "bayer",
              "blue-noise",
              "riemersma",
            ].includes(entry.value),
        );
  const activeMethod = CONVERSION_METHODS.find(
    (entry) => entry.value === method,
  );

  if (section === "source") {
    return (
      <section className="px-4 py-5">
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-0">
              Adjust source image
              <ChevronDown
                className={advancedOpen ? "rotate-180" : ""}
                aria-hidden="true"
              />
            </Button>
          </CollapsibleTrigger>
          <p className="mt-1 text-xs text-muted-foreground">
            {source.width} × {source.height} pixels · before conversion
          </p>
          <CollapsibleContent className="pt-5">
            <SourceAdjustments
              value={inputAdjustments}
              onChange={onInputAdjustmentsChange}
              compact
            />
            <div className="mt-6 border-t border-border/30 pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor={transparencyId}>Keep transparency</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Keep empty source areas empty.
                  </p>
                </div>
                <Switch
                  id={transparencyId}
                  checked={preserveTransparency}
                  onCheckedChange={onPreserveTransparencyChange}
                />
              </div>
              {preserveTransparency ? (
                <label className="mt-5 block">
                  <span className="mb-2 flex items-center justify-between text-xs">
                    <span>Transparency threshold</span>
                    <span className="font-mono text-muted-foreground">
                      {alphaThreshold}
                    </span>
                  </span>
                  <Slider
                    aria-label="Transparency threshold"
                    min={0}
                    max={255}
                    step={1}
                    value={[alphaThreshold]}
                    onValueChange={([value]: number[]) =>
                      onAlphaThresholdChange(value)
                    }
                  />
                </label>
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>
    );
  }

  return (
    <section className="px-4 py-5">
      <Label htmlFor={methodId} className="mb-3">
        Method
      </Label>
      <Select
        value={method}
        onValueChange={(value: string) =>
          onMethodChange(value as ConversionMethod)
        }
      >
        <SelectTrigger id={methodId} className="w-full">
          <SelectValue>{activeMethod?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {compatibleMethods.map((entry) => (
            <SelectItem key={entry.value} value={entry.value} className="py-2">
              <span className="flex flex-col items-start">
                <span>{entry.label}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.description}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {activeMethod?.description}.
        {partition !== "square"
          ? " Dithering and regional methods are available with Square cells."
          : ""}
      </p>
      {firstResultGuide ? (
        <div className="mt-3 flex items-start gap-2 bg-primary/10 px-3 py-2">
          <p className="flex-1 text-xs leading-5">
            Try another method to see how it changes your image. Changes appear
            automatically.
          </p>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss first experiment suggestion"
            onClick={onDismissFirstResultGuide}
          >
            <X />
          </Button>
        </div>
      ) : null}
    </section>
  );
}
