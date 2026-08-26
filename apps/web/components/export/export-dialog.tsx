"use client";

import { Download } from "lucide-react";

import { Button } from "@pigment/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pigment/ui/dialog";
import { Label } from "@pigment/ui/label";
import { Switch } from "@pigment/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@pigment/ui/toggle-group";

export type ExportTarget = "artwork" | "reference";

type ExportDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ExportTarget;
  onTargetChange: (target: ExportTarget) => void;
  artworkWidth: number;
  artworkHeight: number;
  referenceWidth: number;
  referenceHeight: number;
  scale: number;
  onScaleChange: (scale: number) => void;
  showReferenceGrid: boolean;
  onShowReferenceGridChange: (show: boolean) => void;
  onExport: () => Promise<void>;
  exporting: boolean;
}>;

export function ExportDialog({
  open,
  onOpenChange,
  target,
  onTargetChange,
  artworkWidth,
  artworkHeight,
  referenceWidth,
  referenceHeight,
  scale,
  onScaleChange,
  showReferenceGrid,
  onShowReferenceGridChange,
  onExport,
  exporting,
}: ExportDialogProps) {
  const outputWidth = target === "artwork" ? artworkWidth * scale : referenceWidth;
  const outputHeight = target === "artwork" ? artworkHeight * scale : referenceHeight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export PNG</DialogTitle>
          <DialogDescription>
            Download the pixel artwork or a full-resolution drawing reference.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div>
            <Label className="mb-2">Export</Label>
            <ToggleGroup
              type="single"
              value={target}
              variant="outline"
              spacing={0}
              className="w-full"
              onValueChange={(value: string) => {
                if (value) onTargetChange(value as ExportTarget);
              }}
            >
              <ToggleGroupItem value="artwork" className="flex-1">Artwork</ToggleGroupItem>
              <ToggleGroupItem value="reference" className="flex-1">Reference</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {target === "artwork" ? (
            <div>
              <Label className="mb-2">Output scale</Label>
              <ToggleGroup
                type="single"
                value={String(scale)}
                variant="outline"
                spacing={0}
                className="w-full"
                onValueChange={(value: string) => {
                  if (value) onScaleChange(Number(value));
                }}
              >
                {[1, 2, 4, 8].map((value) => (
                  <ToggleGroupItem key={value} value={String(value)} className="flex-1">
                    {value}×
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 border p-3">
              <div>
                <Label htmlFor="export-reference-grid">Show reference grid</Label>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  Includes main cells and faint subdivisions.
                </p>
              </div>
              <Switch
                id="export-reference-grid"
                checked={showReferenceGrid}
                onCheckedChange={onShowReferenceGridChange}
              />
            </div>
          )}

          <div className="flex items-end justify-between border bg-muted/30 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Output dimensions</p>
              <p className="mt-1 font-mono text-lg tabular-nums">
                {outputWidth} × {outputHeight}
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              PNG
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={exporting} onClick={() => void onExport()}>
            <Download data-icon="inline-start" />
            {exporting ? "Preparing…" : "Download PNG"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
