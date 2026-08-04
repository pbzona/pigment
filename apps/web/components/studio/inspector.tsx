"use client";

import type { ComponentProps } from "react";

import { ScrollArea } from "@pigment/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pigment/ui/tabs";

import { ConvertPanel } from "./convert-panel";
import { PaintPanel } from "./paint-panel";
import { SelectionPanel } from "./selection-panel";
import type { EditorMode } from "./types";

type InspectorProps = Readonly<{
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  convertProps: ComponentProps<typeof ConvertPanel>;
  selectionProps: ComponentProps<typeof SelectionPanel>;
  paintProps: ComponentProps<typeof PaintPanel>;
}>;

export function Inspector({
  mode,
  onModeChange,
  convertProps,
  selectionProps,
  paintProps,
}: InspectorProps) {
  return (
    <Tabs
      value={mode}
      className="h-full min-h-0 gap-0"
      onValueChange={(value: string) => onModeChange(value as EditorMode)}
    >
      <div className="border-b px-4 py-3">
        <TabsList className="w-full rounded-none">
          <TabsTrigger value="convert" className="min-w-0 flex-1 rounded-none px-2">Convert</TabsTrigger>
          <TabsTrigger value="select" className="min-w-0 flex-1 rounded-none px-2">Select</TabsTrigger>
          <TabsTrigger value="paint" className="min-w-0 flex-1 rounded-none px-2">Paint</TabsTrigger>
        </TabsList>
      </div>
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <TabsContent value="convert" className="pt-5">
          <ConvertPanel {...convertProps} />
        </TabsContent>
        <TabsContent value="paint" className="pt-5">
          <PaintPanel {...paintProps} />
        </TabsContent>
        <TabsContent value="select" className="pt-5">
          <SelectionPanel {...selectionProps} />
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
}
