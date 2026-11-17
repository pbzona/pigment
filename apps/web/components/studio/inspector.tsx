"use client";

import type { ComponentProps } from "react";

import { Button } from "@pigment/ui/button";
import { ScrollArea } from "@pigment/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pigment/ui/tabs";

import { ConvertPanel } from "./convert-panel";
import { OutputSidebar } from "./output-sidebar";
import { PaintPanel } from "./paint-panel";
import { ReferenceGridPanel } from "./reference-grid-panel";
import { SelectionPanel } from "./selection-panel";
import type { EditorMode } from "./types";

export const EDITOR_MODES = [
  { value: "convert", label: "Image" },
  { value: "select", label: "Regions" },
  { value: "paint", label: "Paint" },
  { value: "reference", label: "Reference" },
] as const;

type InspectorProps = Readonly<{
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  convertProps: ComponentProps<typeof ConvertPanel>;
  outputProps: ComponentProps<typeof OutputSidebar>;
  selectionProps: ComponentProps<typeof SelectionPanel>;
  paintProps: ComponentProps<typeof PaintPanel>;
  referenceProps: ComponentProps<typeof ReferenceGridPanel>;
  regionsEnabled?: boolean;
}>;

export function Inspector({
  mode,
  onModeChange,
  convertProps,
  outputProps,
  selectionProps,
  paintProps,
  referenceProps,
  regionsEnabled = true,
}: InspectorProps) {
  return (
    <Tabs
      value={mode}
      className="h-full min-h-0 gap-0"
      onValueChange={(value: string) => onModeChange(value as EditorMode)}
    >
      <div className="shrink-0 border-b border-border/30 px-3 py-3">
        <TabsList
          className="grid h-auto w-full grid-cols-4"
          aria-label="Editing tools"
        >
          {EDITOR_MODES.map((entry) => (
            <TabsTrigger
              key={entry.value}
              value={entry.value}
              className="min-w-0 px-1 text-[11px] tracking-normal"
            >
              {entry.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <TabsContent value="convert">
          <OutputSidebar
            {...outputProps}
            scrollable={false}
            methodControls={<ConvertPanel {...convertProps} section="method" />}
            sourceControls={<ConvertPanel {...convertProps} section="source" />}
          />
        </TabsContent>
        <TabsContent value="select" className="pt-5">
          {regionsEnabled ? (
            <SelectionPanel {...selectionProps} />
          ) : (
            <div className="space-y-4 px-4 pb-6">
              <h2 className="text-sm font-medium">
                Use different methods in one image
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Regional methods need square cells. Switch the cell shape to
                Square to make a selection. Your existing regional edits will
                return.
              </p>
              <Button onClick={() => outputProps.onPartitionChange("square")}>
                Use square cells
              </Button>
            </div>
          )}
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
