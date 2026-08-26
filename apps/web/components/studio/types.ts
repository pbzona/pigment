import type { SelectionCombineMode } from "@pigment/quantization";

export type EditorMode = "convert" | "select" | "paint" | "reference";
export type ReferenceView = "original" | "pixel";
export type EditorTool = "pencil" | "fill" | "eyedropper" | "restore";
export type SelectionTool = "brush" | "rectangle" | "contiguous";
export type { SelectionCombineMode };

export type ReferenceGridRegion = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type ReferenceGrid = Readonly<{
  visible: boolean;
  columns: number;
  rows: number;
  subdivisions: number;
  opacity: number;
  region: ReferenceGridRegion;
}>;

export type SourceMeta = Readonly<{
  name: string;
  url: string;
  width: number;
  height: number;
}>;

export type HistoryPatch =
  | Readonly<{
      kind: "paint";
      indices: Int32Array;
      before: Int32Array;
      after: Int32Array;
    }>
  | Readonly<{
      kind: "method";
      indices: Int32Array;
      before: Uint8Array;
      after: Uint8Array;
    }>;
