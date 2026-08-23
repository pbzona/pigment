"use client";

import type { ComponentProps } from "react";

import { ScrollArea } from "@pigment/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pigment/ui/tabs";

import { ConvertPanel } from "./convert-panel";
import { SelectionPanel } from "./selection-panel";
import type { EditorMode } from "./types";

type InspectorProps = Readonly<{
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  convertProps: ComponentProps<typeof ConvertPanel>;
  selectionProps: ComponentProps<typeof SelectionPanel>;
  regionsEnabled?: boolean;
}>;

export function Inspector({
  mode,
  onModeChange,
  convertProps,
  selectionProps,
  regionsEnabled = true,
}: InspectorProps) {
  const activeMode = mode === "select" ? "select" : "convert";
  return (
    <Tabs
      value={activeMode}
      className="h-full min-h-0 gap-0"
      onValueChange={(value: string) => onModeChange(value as EditorMode)}
    >
      <div className="border-b px-4 py-3">
        <TabsList className="w-full rounded-none">
          <TabsTrigger value="convert" className="min-w-0 flex-1 rounded-none px-2">Image</TabsTrigger>
          <TabsTrigger
            value="select"
            disabled={!regionsEnabled}
            title={regionsEnabled ? undefined : "Regional overrides require a square partition"}
            className="min-w-0 flex-1 rounded-none px-2"
          >
            Regions{regionsEnabled ? "" : " · Square only"}
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
      </ScrollArea>
    </Tabs>
  );
}
