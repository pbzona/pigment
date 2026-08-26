"use client";

import type { ComponentProps } from "react";

import { ScrollArea } from "@pigment/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pigment/ui/tabs";

import { ConvertPanel } from "./convert-panel";
import { PaintPanel } from "./paint-panel";
import { ReferenceGridPanel } from "./reference-grid-panel";
import { SelectionPanel } from "./selection-panel";
import type { EditorMode } from "./types";

type InspectorProps = Readonly<{
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  convertProps: ComponentProps<typeof ConvertPanel>;
  selectionProps: ComponentProps<typeof SelectionPanel>;
  paintProps: ComponentProps<typeof PaintPanel>;
  referenceProps: ComponentProps<typeof ReferenceGridPanel>;
  regionsEnabled?: boolean;
}>;

export function Inspector({
  mode,
  onModeChange,
  convertProps,
  selectionProps,
  paintProps,
  referenceProps,
  regionsEnabled = true,
}: InspectorProps) {
  const activeMode = mode;
  return (
    <Tabs
      value={activeMode}
      className="h-full min-h-0 gap-0"
      onValueChange={(value: string) => onModeChange(value as EditorMode)}
    >
      <div className="border-b px-4 py-3">
        <TabsList className="grid h-auto w-full grid-cols-4 rounded-none">
          <TabsTrigger
            value="convert"
            className="min-w-0 rounded-none px-1 text-[10px] tracking-[0.03em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Image
          </TabsTrigger>
          <TabsTrigger
            value="select"
            disabled={!regionsEnabled}
            title={regionsEnabled ? undefined : "Regional overrides require a square partition"}
            className="min-w-0 rounded-none px-1 text-[10px] tracking-[0.03em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Regions{regionsEnabled ? "" : " · Square only"}
          </TabsTrigger>
          <TabsTrigger
            value="paint"
            className="min-w-0 rounded-none px-1 text-[10px] tracking-[0.03em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Paint
          </TabsTrigger>
          <TabsTrigger
            value="reference"
            className="min-w-0 rounded-none px-1 text-[10px] tracking-[0.03em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Reference
          </TabsTrigger>
        </TabsList>
      </div>
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <TabsContent value="convert" className="pt-5">
          {!regionsEnabled ? (
            <p className="mx-4 mb-4 border border-foreground/10 bg-muted/20 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
              Regional overrides return when the partition is set to Square.
            </p>
          ) : null}
          <ConvertPanel {...convertProps} />
        </TabsContent>
        <TabsContent value="select" className="pt-5">
          <SelectionPanel {...selectionProps} />
        </TabsContent>
        <TabsContent value="paint" className="pt-5">
          <PaintPanel {...paintProps} />
        </TabsContent>
        <TabsContent value="reference" className="pt-5">
          <ReferenceGridPanel {...referenceProps} />
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
}
