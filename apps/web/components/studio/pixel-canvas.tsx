"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Columns2,
  Crop,
  Grid3X3,
  Maximize2,
  Minus,
  Plus,
  X,
} from "lucide-react";

import { Button } from "@pigment/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@pigment/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pigment/ui/tooltip";
import {
  brushIndices,
  colorIdsToRgba,
  combineSelectionMasks,
  contiguousSelectionMask,
  getGuidePositions,
  lineCells,
  MIN_GRID_SIDE,
  rectangleSelectionMask,
  rasterizePartitionColors,
  type CellCrop,
  type PartitionKind,
  type PixelPaletteColor,
  type PixelPreview,
  type SelectionMask,
} from "@pigment/quantization";
import { cn } from "@/lib/utils";

import type {
  EditorMode,
  EditorTool,
  ReferenceGrid,
  ReferenceView,
  SelectionCombineMode,
  SelectionTool,
} from "./types";
import { ComparisonPreview } from "./comparison-preview";
import { shouldUseLightCheckerboard } from "./checkerboard";

type PixelCanvasProps = Readonly<{
  width: number;
  height: number;
  colorIds: Uint16Array | null;
  partition: PartitionKind;
  partitionScale: number;
  palette: readonly PixelPaletteColor[];
  visibleColorIds: ReadonlySet<number> | null;
  originalPreview: PixelPreview | null;
  adjustedPreview: PixelPreview | null;
  mode: EditorMode;
  tool: EditorTool;
  brushSize: number;
  selectionMask: Uint8Array | null;
  selectionTool: SelectionTool;
  selectionBrushSize: number;
  selectionCombineMode: SelectionCombineMode;
  processing: boolean;
  crop: CellCrop | null;
  cropping: boolean;
  referenceGrid: ReferenceGrid;
  referenceView: ReferenceView;
  onReferenceGridChange: (grid: ReferenceGrid) => void;
  onBeginStroke: (bulk?: boolean) => void;
  onPaint: (indices: readonly number[], restore: boolean) => void;
  onEndStroke: () => void;
  onFill: (index: number) => void;
  onPick: (index: number) => void;
  onSelectionChange: (mask: Uint8Array | null) => void;
  onCropChange: (crop: CellCrop | null) => void;
  onCropApply: () => void;
}>;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 40;
const CANVAS_INLINE_SPACE = 82;
const CANVAS_BLOCK_SPACE = 130;

export const increaseCanvasZoom = (zoom: number) => {
  if (zoom < 2) {
    const nextZoom = Number((zoom + 0.25).toFixed(2));
    return nextZoom >= 2 ? 2 : nextZoom;
  }
  return Math.min(MAX_ZOOM, zoom + 2);
};

export const shouldRefitCanvas = (
  previous: Readonly<{ width: number; height: number }>,
  next: Readonly<{ width: number; height: number }>,
) => previous.width !== next.width || previous.height !== next.height;

export const fittedCanvasZoom = (
  viewportWidth: number,
  viewportHeight: number,
  width: number,
  height: number,
) => {
  const availableWidth = Math.max(1, viewportWidth - CANVAS_INLINE_SPACE);
  const availableHeight = Math.max(1, viewportHeight - CANVAS_BLOCK_SPACE);
  const availableZoom = Math.min(
    availableWidth / width,
    availableHeight / height,
  );
  const fittedZoom =
    availableZoom >= 1
      ? Math.floor(availableZoom)
      : Math.floor(availableZoom * 100) / 100;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fittedZoom));
};

type Cell = Readonly<{ x: number; y: number }>;

type GuideRegion = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;
type GuideResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type GuideGesture = Readonly<{
  kind: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  region: GuideRegion;
  handle?: GuideResizeHandle;
  boundsWidth: number;
  boundsHeight: number;
}>;

const MIN_GUIDE_CELL_PX = 4;

export const fitGuideRegion = (
  imageWidth: number,
  imageHeight: number,
  columns: number,
  rows: number,
): GuideRegion => {
  const cellSize = Math.min(imageWidth / columns, imageHeight / rows);
  const regionWidth = cellSize * columns;
  const regionHeight = cellSize * rows;
  return {
    x: (imageWidth - regionWidth) / (2 * imageWidth),
    y: (imageHeight - regionHeight) / (2 * imageHeight),
    width: regionWidth / imageWidth,
    height: regionHeight / imageHeight,
  };
};

const clampGuideRegion = (region: GuideRegion): GuideRegion => ({
  ...region,
  x: Math.max(0, Math.min(1 - region.width, region.x)),
  y: Math.max(0, Math.min(1 - region.height, region.y)),
});

const GUIDE_HANDLE_CLASSES: Record<GuideResizeHandle, string> = {
  nw: "-left-2 -top-2 cursor-nwse-resize",
  n: "left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize",
  ne: "-right-2 -top-2 cursor-nesw-resize",
  e: "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize",
  se: "-bottom-2 -right-2 cursor-nwse-resize",
  s: "-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize",
  sw: "-bottom-2 -left-2 cursor-nesw-resize",
  w: "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize",
};

const GUIDE_HANDLES = Object.keys(GUIDE_HANDLE_CLASSES) as GuideResizeHandle[];

type PaintGesture = {
  kind: "paint";
  pointerId: number;
  lastCell: Cell;
  tool: Extract<EditorTool, "pencil" | "restore">;
  brushSize: number;
  width: number;
  height: number;
};

type SelectionGesture = {
  kind: "selection";
  pointerId: number;
  startCell: Cell;
  lastCell: Cell;
  tool: Exclude<SelectionTool, "contiguous">;
  brushSize: number;
  combineMode: SelectionCombineMode;
  width: number;
  height: number;
  baseMask: SelectionMask;
  incomingMask: SelectionMask;
  previewMask: SelectionMask;
};

type CropGesture = {
  kind: "crop";
  pointerId: number;
  startCell: Cell;
  lastCell: Cell;
  width: number;
  height: number;
};

type CanvasGesture = PaintGesture | SelectionGesture | CropGesture;

type PanGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
};

const ignoresPanShortcut = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      "input, textarea, select, button, a[href], [role=option], [role=menuitem], [role=dialog], [contenteditable=true]",
    ),
  );

export function PixelCanvas({
  width,
  height,
  colorIds,
  partition,
  partitionScale,
  palette,
  visibleColorIds,
  originalPreview,
  adjustedPreview,
  mode,
  tool,
  brushSize,
  selectionMask,
  selectionTool,
  selectionBrushSize,
  selectionCombineMode,
  processing,
  crop,
  cropping,
  referenceGrid,
  referenceView,
  onReferenceGridChange,
  onBeginStroke,
  onPaint,
  onEndStroke,
  onFill,
  onPick,
  onSelectionChange,
  onCropChange,
  onCropApply,
}: PixelCanvasProps) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<CanvasGesture | null>(null);
  const panGestureRef = useRef<PanGesture | null>(null);
  const guideGestureRef = useRef<GuideGesture | null>(null);
  const spaceHeldRef = useRef(false);
  const zoomRef = useRef(12);
  const [zoom, setZoom] = useState(12);
  const [showGrid, setShowGrid] = useState(true);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [keyboardCell, setKeyboardCell] = useState({ x: 0, y: 0 });
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [selectionPreview, setSelectionPreview] =
    useState<SelectionMask | null>(null);
  const guideColumns = referenceGrid.columns;
  const guideRows = referenceGrid.rows;
  const guideRegion = referenceGrid.region;
  const setGuideRegion = (
    next: GuideRegion | ((current: GuideRegion) => GuideRegion),
  ) => {
    onReferenceGridChange({
      ...referenceGrid,
      region: typeof next === "function" ? next(guideRegion) : next,
    });
  };
  const lightCheckerboard = shouldUseLightCheckerboard(
    palette,
    visibleColorIds,
  );
  const surfaceWidth =
    mode === "reference" && originalPreview ? originalPreview.width : width;
  const surfaceHeight =
    mode === "reference" && originalPreview ? originalPreview.height : height;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rendered =
      colorIds && partition !== "square"
        ? rasterizePartitionColors(
            colorIds,
            width,
            height,
            partition,
            partitionScale,
            1,
            4,
          )
        : { width, height, colorIds };
    canvas.width = rendered.width;
    canvas.height = rendered.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, rendered.width, rendered.height);
    if (!rendered.colorIds) return;
    context.putImageData(
      new ImageData(
        colorIdsToRgba(rendered.colorIds, palette, visibleColorIds),
        rendered.width,
        rendered.height,
      ),
      0,
      0,
    );
  }, [
    colorIds,
    height,
    palette,
    partition,
    partitionScale,
    visibleColorIds,
    width,
  ]);

  useEffect(() => {
    const canvas = sourceCanvasRef.current;
    const preview = originalPreview;
    if (!canvas || !preview) return;
    canvas.width = preview.width;
    canvas.height = preview.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.putImageData(
      new ImageData(preview.pixels, preview.width, preview.height),
      0,
      0,
    );
  }, [originalPreview]);

  useEffect(() => {
    const canvas = selectionCanvasRef.current;
    if (!canvas) return;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);

    const visibleMask = selectionPreview ?? selectionMask;
    if (!visibleMask || visibleMask.length !== width * height) return;
    const imageData = context.createImageData(width, height);
    for (let index = 0; index < visibleMask.length; index += 1) {
      if (!visibleMask[index]) continue;
      const offset = index * 4;
      imageData.data[offset] = 56;
      imageData.data[offset + 1] = 189;
      imageData.data[offset + 2] = 248;
      imageData.data[offset + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);
  }, [height, selectionMask, selectionPreview, width]);

  useEffect(() => {
    const releaseSpace = () => {
      spaceHeldRef.current = false;
      setSpaceHeld(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code !== "Space" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        ignoresPanShortcut(event.target)
      ) {
        return;
      }
      event.preventDefault();
      if (spaceHeldRef.current) return;
      spaceHeldRef.current = true;
      setSpaceHeld(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") releaseSpace();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseSpace);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseSpace);
    };
  }, []);

  const applyFittedZoom = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextZoom = fittedCanvasZoom(
      viewport.clientWidth,
      viewport.clientHeight,
      surfaceWidth,
      surfaceHeight,
    );
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
  };

  const fitCanvas = () => {
    applyFittedZoom();
  };

  const fitCanvasToViewport = useEffectEvent(applyFittedZoom);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const frame = window.requestAnimationFrame(fitCanvasToViewport);
    return () => window.cancelAnimationFrame(frame);
  }, [surfaceWidth, surfaceHeight]);

  const beginGuideGesture = (
    event: React.PointerEvent<HTMLElement>,
    kind: GuideGesture["kind"],
    handle?: GuideResizeHandle,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds =
      event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    guideGestureRef.current = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      region: guideRegion,
      handle,
      boundsWidth: bounds.width,
      boundsHeight: bounds.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateGuideGesture = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = guideGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const dx = (event.clientX - gesture.startX) / gesture.boundsWidth;
    const dy = (event.clientY - gesture.startY) / gesture.boundsHeight;
    if (gesture.kind === "move") {
      setGuideRegion(
        clampGuideRegion({
          ...gesture.region,
          x: gesture.region.x + dx,
          y: gesture.region.y + dy,
        }),
      );
      return;
    }

    const handle = gesture.handle;
    if (!handle) return;
    const horizontalDirection = handle.includes("w") ? -1 : 1;
    const verticalDirection = handle.includes("n") ? -1 : 1;
    const horizontalCell =
      ((gesture.region.width + dx * horizontalDirection) *
        gesture.boundsWidth) /
      guideColumns;
    const verticalCell =
      ((gesture.region.height + dy * verticalDirection) *
        gesture.boundsHeight) /
      guideRows;
    const isHorizontalSide = handle === "e" || handle === "w";
    const isVerticalSide = handle === "n" || handle === "s";
    let cellSize = isHorizontalSide
      ? horizontalCell
      : isVerticalSide
        ? verticalCell
        : Math.min(horizontalCell, verticalCell);

    const anchorX = handle.includes("w")
      ? (gesture.region.x + gesture.region.width) * gesture.boundsWidth
      : handle.includes("e")
        ? gesture.region.x * gesture.boundsWidth
        : (gesture.region.x + gesture.region.width / 2) * gesture.boundsWidth;
    const anchorY = handle.includes("n")
      ? (gesture.region.y + gesture.region.height) * gesture.boundsHeight
      : handle.includes("s")
        ? gesture.region.y * gesture.boundsHeight
        : (gesture.region.y + gesture.region.height / 2) * gesture.boundsHeight;
    const maxWidth = handle.includes("w")
      ? anchorX
      : handle.includes("e")
        ? gesture.boundsWidth - anchorX
        : 2 * Math.min(anchorX, gesture.boundsWidth - anchorX);
    const maxHeight = handle.includes("n")
      ? anchorY
      : handle.includes("s")
        ? gesture.boundsHeight - anchorY
        : 2 * Math.min(anchorY, gesture.boundsHeight - anchorY);
    const maxCellSize = Math.min(
      maxWidth / guideColumns,
      maxHeight / guideRows,
    );
    cellSize = Math.max(
      Math.min(MIN_GUIDE_CELL_PX, maxCellSize),
      Math.min(cellSize, maxCellSize),
    );

    const nextWidth = (cellSize * guideColumns) / gesture.boundsWidth;
    const nextHeight = (cellSize * guideRows) / gesture.boundsHeight;
    const nextX = handle.includes("w")
      ? anchorX / gesture.boundsWidth - nextWidth
      : handle.includes("e")
        ? anchorX / gesture.boundsWidth
        : anchorX / gesture.boundsWidth - nextWidth / 2;
    const nextY = handle.includes("n")
      ? anchorY / gesture.boundsHeight - nextHeight
      : handle.includes("s")
        ? anchorY / gesture.boundsHeight
        : anchorY / gesture.boundsHeight - nextHeight / 2;
    setGuideRegion(
      clampGuideRegion({
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight,
      }),
    );
  };

  const finishGuideGesture = (event: React.PointerEvent<HTMLElement>) => {
    if (guideGestureRef.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    guideGestureRef.current = null;
  };

  const cellFromPointer = (
    event: React.PointerEvent<HTMLDivElement>,
    gridWidth = width,
    gridHeight = height,
  ): Cell => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - bounds.left - event.currentTarget.clientLeft;
    const localY = event.clientY - bounds.top - event.currentTarget.clientTop;
    return {
      x: Math.min(
        gridWidth - 1,
        Math.max(
          0,
          Math.floor((localX / event.currentTarget.clientWidth) * gridWidth),
        ),
      ),
      y: Math.min(
        gridHeight - 1,
        Math.max(
          0,
          Math.floor((localY / event.currentTarget.clientHeight) * gridHeight),
        ),
      ),
    };
  };

  const paintSegment = (from: Cell, to: Cell, gesture: PaintGesture) => {
    const indices = new Set<number>();
    for (const cell of lineCells(from.x, from.y, to.x, to.y)) {
      for (const index of brushIndices(
        cell.x,
        cell.y,
        gesture.brushSize,
        gesture.width,
        gesture.height,
      )) {
        indices.add(index);
      }
    }
    onPaint([...indices], gesture.tool === "restore");
  };

  const baseSelectionMask = (
    gridWidth: number,
    gridHeight: number,
  ): SelectionMask => {
    const size = gridWidth * gridHeight;
    return selectionMask?.length === size
      ? selectionMask.slice()
      : new Uint8Array(size);
  };

  const combineModeFromModifiers = (
    shiftKey: boolean,
    altKey: boolean,
    fallback: SelectionCombineMode,
  ): SelectionCombineMode => {
    if (altKey) return "subtract";
    if (shiftKey) return "add";
    return fallback;
  };

  const addBrushSegment = (
    mask: SelectionMask,
    from: Cell,
    to: Cell,
    size: number,
    gridWidth: number,
    gridHeight: number,
  ) => {
    for (const cell of lineCells(from.x, from.y, to.x, to.y)) {
      for (const index of brushIndices(
        cell.x,
        cell.y,
        size,
        gridWidth,
        gridHeight,
      )) {
        mask[index] = 1;
      }
    }
  };

  const updateGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const cell = cellFromPointer(event, gesture.width, gesture.height);
    if (cell.x === gesture.lastCell.x && cell.y === gesture.lastCell.y) return;

    if (gesture.kind === "paint") {
      paintSegment(gesture.lastCell, cell, gesture);
      gesture.lastCell = cell;
      return;
    }

    if (gesture.kind === "crop") {
      gesture.lastCell = cell;
      onCropChange({
        left: Math.min(gesture.startCell.x, cell.x),
        top: Math.min(gesture.startCell.y, cell.y),
        right: Math.max(gesture.startCell.x, cell.x) + 1,
        bottom: Math.max(gesture.startCell.y, cell.y) + 1,
      });
      return;
    }

    if (gesture.tool === "brush") {
      addBrushSegment(
        gesture.incomingMask,
        gesture.lastCell,
        cell,
        gesture.brushSize,
        gesture.width,
        gesture.height,
      );
    } else {
      gesture.incomingMask = rectangleSelectionMask(
        gesture.startCell.x,
        gesture.startCell.y,
        cell.x,
        cell.y,
        gesture.width,
        gesture.height,
      );
    }
    gesture.lastCell = cell;
    gesture.previewMask = combineSelectionMasks(
      gesture.baseMask,
      gesture.incomingMask,
      gesture.combineMode,
    );
    setSelectionPreview(gesture.previewMask);
  };

  const finishGesture = (pointerId: number, commitSelection: boolean) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== pointerId) return;
    gestureRef.current = null;
    if (gesture.kind === "paint") {
      onEndStroke();
      return;
    }
    if (gesture.kind === "crop") return;

    setSelectionPreview(null);
    if (commitSelection) onSelectionChange(gesture.previewMask);
  };

  const beginPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const startsWithSpace = event.button === 0 && spaceHeldRef.current;
    const startsWithRightButton = event.button === 2;
    if ((!startsWithSpace && !startsWithRightButton) || panGestureRef.current)
      return;

    event.preventDefault();
    event.stopPropagation();
    panGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
  };

  const updatePan = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = panGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.scrollLeft =
      gesture.scrollLeft - (event.clientX - gesture.startX);
    event.currentTarget.scrollTop =
      gesture.scrollTop - (event.clientY - gesture.startY);
  };

  const finishPan = (pointerId: number) => {
    if (panGestureRef.current?.pointerId !== pointerId) return;
    panGestureRef.current = null;
    setPanning(false);
  };

  const activateKeyboardCell = (shiftKey: boolean, altKey: boolean) => {
    if (mode !== "paint" && mode !== "select") return;
    const x = Math.min(width - 1, keyboardCell.x);
    const y = Math.min(height - 1, keyboardCell.y);
    const index = y * width + x;

    if (mode === "select") {
      let incomingMask: SelectionMask;
      if (selectionTool === "contiguous") {
        if (!colorIds) return;
        incomingMask = contiguousSelectionMask(index, colorIds, width, height);
      } else if (selectionTool === "rectangle") {
        incomingMask = rectangleSelectionMask(x, y, x, y, width, height);
      } else {
        incomingMask = new Uint8Array(width * height);
        addBrushSegment(
          incomingMask,
          { x, y },
          { x, y },
          selectionBrushSize,
          width,
          height,
        );
      }
      const combineMode = combineModeFromModifiers(
        shiftKey,
        altKey,
        selectionCombineMode,
      );
      onSelectionChange(
        combineSelectionMasks(
          baseSelectionMask(width, height),
          incomingMask,
          combineMode,
        ),
      );
      return;
    }

    if (!colorIds) return;
    if (tool === "eyedropper") {
      onPick(index);
      return;
    }
    onBeginStroke(tool === "fill");
    if (tool === "fill") onFill(index);
    else
      onPaint(brushIndices(x, y, brushSize, width, height), tool === "restore");
    onEndStroke();
  };

  const beginGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || gestureRef.current) return;
    if (crop) {
      const cell = cellFromPointer(event);
      const gesture: CropGesture = {
        kind: "crop",
        pointerId: event.pointerId,
        startCell: cell,
        lastCell: cell,
        width,
        height,
      };
      gestureRef.current = gesture;
      event.currentTarget.setPointerCapture(event.pointerId);
      onCropChange({
        left: cell.x,
        top: cell.y,
        right: cell.x + 1,
        bottom: cell.y + 1,
      });
      return;
    }
    if (mode !== "paint" && mode !== "select") return;
    if (mode === "paint" && !colorIds) return;

    event.currentTarget.focus({ preventScroll: true });
    const cell = cellFromPointer(event);
    setKeyboardCell(cell);
    const index = cell.y * width + cell.x;

    if (mode === "paint") {
      if (tool === "eyedropper") {
        onPick(index);
        return;
      }
      if (tool === "fill") {
        onBeginStroke(true);
        onFill(index);
        onEndStroke();
        return;
      }

      const gesture: PaintGesture = {
        kind: "paint",
        pointerId: event.pointerId,
        lastCell: cell,
        tool,
        brushSize,
        width,
        height,
      };
      gestureRef.current = gesture;
      event.currentTarget.setPointerCapture(event.pointerId);
      onBeginStroke();
      paintSegment(cell, cell, gesture);
      return;
    }

    const combineMode = combineModeFromModifiers(
      event.shiftKey,
      event.altKey,
      selectionCombineMode,
    );
    const baseMask = baseSelectionMask(width, height);
    if (selectionTool === "contiguous") {
      if (!colorIds) return;
      const incomingMask = contiguousSelectionMask(
        index,
        colorIds,
        width,
        height,
      );
      onSelectionChange(
        combineSelectionMasks(baseMask, incomingMask, combineMode),
      );
      return;
    }

    let incomingMask: SelectionMask;
    if (selectionTool === "rectangle") {
      incomingMask = rectangleSelectionMask(
        cell.x,
        cell.y,
        cell.x,
        cell.y,
        width,
        height,
      );
    } else {
      incomingMask = new Uint8Array(width * height);
      addBrushSegment(
        incomingMask,
        cell,
        cell,
        selectionBrushSize,
        width,
        height,
      );
    }
    const previewMask = combineSelectionMasks(
      baseMask,
      incomingMask,
      combineMode,
    );
    const gesture: SelectionGesture = {
      kind: "selection",
      pointerId: event.pointerId,
      startCell: cell,
      lastCell: cell,
      tool: selectionTool,
      brushSize: selectionBrushSize,
      combineMode,
      width,
      height,
      baseMask,
      incomingMask,
      previewMask,
    };
    gestureRef.current = gesture;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectionPreview(previewMask);
  };

  const revealKeyboardCell = (cell: { x: number; y: number }) => {
    window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      const artwork = canvasRef.current?.parentElement;
      if (!viewport || !artwork) return;
      const viewportBounds = viewport.getBoundingClientRect();
      const artworkBounds = artwork.getBoundingClientRect();
      const left = artworkBounds.left + artwork.clientLeft + cell.x * zoom;
      const right = left + zoom;
      const top = artworkBounds.top + artwork.clientTop + cell.y * zoom;
      const bottom = top + zoom;
      const visibleTop = viewportBounds.top + 56;
      let leftDelta = 0;
      let topDelta = 0;
      if (left < viewportBounds.left + 16)
        leftDelta = left - viewportBounds.left - 16;
      else if (right > viewportBounds.right - 16)
        leftDelta = right - viewportBounds.right + 16;
      if (top < visibleTop + 16) topDelta = top - visibleTop - 16;
      else if (bottom > viewportBounds.bottom - 16) {
        topDelta = bottom - viewportBounds.bottom + 16;
      }
      if (leftDelta || topDelta)
        viewport.scrollBy({ left: leftDelta, top: topDelta });
    });
  };

  return (
    <section
      ref={containerRef}
      className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[#0e0f11]"
    >
      <div className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 border-2 border-border bg-card p-1 shadow-[4px_4px_0_var(--shadow)]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11 sm:size-8"
              onClick={() => {
                const nextZoom = Math.max(
                  MIN_ZOOM,
                  zoomRef.current - (zoomRef.current <= 2 ? 0.25 : 2),
                );
                zoomRef.current = nextZoom;
                setZoom(nextZoom);
              }}
            >
              <Minus />
              <span className="sr-only">Zoom out</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <span className="w-11 text-center font-mono text-[11px] tabular-nums">
          {Number(zoom.toFixed(2))}×
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11 sm:size-8"
              onClick={() => {
                const nextZoom = increaseCanvasZoom(zoomRef.current);
                zoomRef.current = nextZoom;
                setZoom(nextZoom);
              }}
            >
              <Plus />
              <span className="sr-only">Zoom in</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>
        <span className="mx-1 h-4 w-px bg-border" />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11 sm:size-8"
            >
              <Columns2 />
              <span className="sr-only">Compare source and pixel output</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            className="w-[min(42rem,calc(100vw-2rem))] rounded-none p-4"
          >
            <ComparisonPreview
              width={width}
              height={height}
              colorIds={colorIds}
              partition={partition}
              partitionScale={partitionScale}
              palette={palette}
              visibleColorIds={visibleColorIds}
              originalPreview={originalPreview}
              adjustedPreview={adjustedPreview}
            />
          </PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11 sm:size-8"
              onClick={fitCanvas}
            >
              <Maximize2 />
              <span className="sr-only">Fit canvas</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit canvas</TooltipContent>
        </Tooltip>
        {mode !== "reference" ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={crop ? "secondary" : "ghost"}
                  size="icon-sm"
                  className="size-11 sm:size-8"
                  disabled={cropping}
                  aria-pressed={crop !== null}
                  onClick={() =>
                    onCropChange(
                      crop
                        ? null
                        : { left: 0, top: 0, right: width, bottom: height },
                    )
                  }
                >
                  <Crop />
                  <span className="sr-only">
                    {crop ? "Cancel crop" : "Crop source image"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {crop ? "Cancel crop" : "Crop source image"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    showGrid && partition === "square" ? "secondary" : "ghost"
                  }
                  size="icon-sm"
                  className="size-11 sm:size-8"
                  disabled={partition !== "square"}
                  onClick={() => setShowGrid((value) => !value)}
                >
                  <Grid3X3 />
                  <span className="sr-only">Toggle grid</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle grid</TooltipContent>
            </Tooltip>
          </>
        ) : null}
      </div>

      {crop ? (
        <div className="absolute top-15 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 border-2 border-border bg-card p-1 shadow-[4px_4px_0_var(--shadow)]">
          <span className="px-2 font-mono text-[10px] tabular-nums text-white/70">
            {crop.right - crop.left}×{crop.bottom - crop.top} cells
            {crop.right - crop.left < MIN_GRID_SIDE ||
            crop.bottom - crop.top < MIN_GRID_SIDE
              ? ` · minimum ${MIN_GRID_SIDE}×${MIN_GRID_SIDE}`
              : null}
          </span>
          <Button
            size="xs"
            disabled={
              cropping ||
              processing ||
              crop.right - crop.left < MIN_GRID_SIDE ||
              crop.bottom - crop.top < MIN_GRID_SIDE ||
              (crop.left === 0 &&
                crop.top === 0 &&
                crop.right === width &&
                crop.bottom === height)
            }
            onClick={onCropApply}
          >
            Apply crop
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={cropping}
            onClick={() => onCropChange(null)}
          >
            <X />
            <span className="sr-only">Cancel crop</span>
          </Button>
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className={cn(
          "absolute inset-0 overflow-auto overscroll-contain pt-12",
          spaceHeld && !panning && "cursor-grab",
          panning && "cursor-grabbing select-none",
        )}
        onPointerDownCapture={beginPan}
        onPointerMoveCapture={updatePan}
        onPointerUpCapture={(event) => {
          updatePan(event);
          finishPan(event.pointerId);
        }}
        onPointerCancel={(event) => finishPan(event.pointerId)}
        onLostPointerCapture={(event) => finishPan(event.pointerId)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div
          className="flex min-h-full min-w-full items-center justify-center p-10"
          style={{
            width: surfaceWidth * zoom + 82,
            height: surfaceHeight * zoom + 82,
          }}
        >
          <div
            className={cn(
              "relative box-content shrink-0 overflow-hidden border border-white/20 bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] shadow-[0_22px_70px_rgba(0,0,0,.55)]",
              lightCheckerboard
                ? "bg-[#d8d4ca] bg-[linear-gradient(45deg,#f5f2e8_25%,transparent_25%),linear-gradient(-45deg,#f5f2e8_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f2e8_75%),linear-gradient(-45deg,transparent_75%,#f5f2e8_75%)]"
                : "bg-[#17191c] bg-[linear-gradient(45deg,#25282d_25%,transparent_25%),linear-gradient(-45deg,#25282d_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#25282d_75%),linear-gradient(-45deg,transparent_75%,#25282d_75%)]",
              panning && "cursor-grabbing",
              spaceHeld && !panning && "cursor-grab",
              !spaceHeld &&
                !panning &&
                (crop || mode === "paint" || mode === "select") &&
                "cursor-crosshair touch-none",
            )}
            style={{ width: surfaceWidth * zoom, height: surfaceHeight * zoom }}
            role="grid"
            aria-label={`Editable image grid, ${width} columns by ${height} rows`}
            aria-describedby="pixel-canvas-instructions"
            aria-rowcount={height}
            aria-colcount={width}
            aria-activedescendant={
              keyboardActive && (mode === "paint" || mode === "select")
                ? "pixel-active-cell"
                : undefined
            }
            tabIndex={!crop && (mode === "paint" || mode === "select") ? 0 : -1}
            onFocus={() => setKeyboardActive(true)}
            onBlur={() => setKeyboardActive(false)}
            onKeyDown={(event) => {
              if (mode !== "paint" && mode !== "select") return;
              const movement = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              }[event.key];
              if (movement) {
                event.preventDefault();
                const next = {
                  x: Math.min(
                    width - 1,
                    Math.max(0, keyboardCell.x + movement[0]),
                  ),
                  y: Math.min(
                    height - 1,
                    Math.max(0, keyboardCell.y + movement[1]),
                  ),
                };
                setKeyboardCell(next);
                revealKeyboardCell(next);
              } else if (event.key === "Enter") {
                event.preventDefault();
                activateKeyboardCell(event.shiftKey, event.altKey);
              }
            }}
            onPointerDown={beginGesture}
            onPointerMove={updateGesture}
            onPointerUp={(event) => {
              updateGesture(event);
              finishGesture(event.pointerId, true);
            }}
            onPointerCancel={(event) => finishGesture(event.pointerId, false)}
            onLostPointerCapture={(event) => {
              finishGesture(event.pointerId, false);
            }}
          >
            <canvas
              ref={canvasRef}
              className={cn(
                "block size-full",
                mode === "reference" && referenceView === "original" && "invisible",
              )}
              style={{ imageRendering: "pixelated" }}
              aria-hidden="true"
            />
            <canvas
              ref={sourceCanvasRef}
              className={cn(
                "absolute inset-0 size-full",
                mode === "reference" && referenceView === "original"
                  ? "block"
                  : "hidden",
              )}
              style={{ imageRendering: "auto" }}
              aria-hidden="true"
            />
            <canvas
              ref={selectionCanvasRef}
              width={width}
              height={height}
              className={cn(
                "pointer-events-none absolute inset-0 block size-full",
                mode === "select" && "opacity-[0.46]",
                mode === "paint" && "opacity-[0.2]",
                (mode === "convert" || mode === "reference") && "opacity-0",
              )}
              style={{ imageRendering: "pixelated" }}
              aria-hidden="true"
            />
            {partition === "square" && showGrid && zoom >= 8 ? (
              <span
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.14)_1px,transparent_1px)]"
                style={{
                  backgroundPosition: "-0.5px 0, 0 -0.5px",
                  backgroundSize: `${zoom}px ${zoom}px`,
                }}
                aria-hidden="true"
              />
            ) : null}
            {crop ? (
              <span
                className="pointer-events-none absolute border-2 border-[#ef6a47] shadow-[0_0_0_9999px_rgba(0,0,0,.58)]"
                style={{
                  left: crop.left * zoom,
                  top: crop.top * zoom,
                  width: (crop.right - crop.left) * zoom,
                  height: (crop.bottom - crop.top) * zoom,
                }}
                aria-hidden="true"
              />
            ) : null}
            {mode === "reference" && referenceGrid.visible ? (
              <div
                className="absolute inset-0 z-10 touch-none"
                aria-label={`${guideColumns} by ${guideRows} movable square reference grid`}
              >
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 bg-black/35"
                  style={{ height: `${guideRegion.y * 100}%` }}
                />
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/35"
                  style={{
                    height: `${(1 - guideRegion.y - guideRegion.height) * 100}%`,
                  }}
                />
                <span
                  className="pointer-events-none absolute left-0 bg-black/35"
                  style={{
                    top: `${guideRegion.y * 100}%`,
                    width: `${guideRegion.x * 100}%`,
                    height: `${guideRegion.height * 100}%`,
                  }}
                />
                <span
                  className="pointer-events-none absolute right-0 bg-black/35"
                  style={{
                    top: `${guideRegion.y * 100}%`,
                    width: `${(1 - guideRegion.x - guideRegion.width) * 100}%`,
                    height: `${guideRegion.height * 100}%`,
                  }}
                />

                {Array.from(
                  { length: guideColumns * referenceGrid.subdivisions - 1 },
                  (_, index) => index + 1,
                )
                  .filter((index) => index % referenceGrid.subdivisions !== 0)
                  .map((index) => {
                    const left =
                      (guideRegion.x +
                        (guideRegion.width * index) /
                          (guideColumns * referenceGrid.subdivisions)) *
                      100;
                    return (
                      <span
                        key={`sub-column-${index}`}
                        className="pointer-events-none absolute w-px -translate-x-1/2 bg-[#ff7657]"
                        style={{
                          left: `${left}%`,
                          top: `${guideRegion.y * 100}%`,
                          height: `${guideRegion.height * 100}%`,
                          opacity: (referenceGrid.opacity / 100) * 0.42,
                        }}
                      />
                    );
                  })}
                {Array.from(
                  { length: guideRows * referenceGrid.subdivisions - 1 },
                  (_, index) => index + 1,
                )
                  .filter((index) => index % referenceGrid.subdivisions !== 0)
                  .map((index) => {
                    const top =
                      (guideRegion.y +
                        (guideRegion.height * index) /
                          (guideRows * referenceGrid.subdivisions)) *
                      100;
                    return (
                      <span
                        key={`sub-row-${index}`}
                        className="pointer-events-none absolute h-px -translate-y-1/2 bg-[#ff7657]"
                        style={{
                          top: `${top}%`,
                          left: `${guideRegion.x * 100}%`,
                          width: `${guideRegion.width * 100}%`,
                          opacity: (referenceGrid.opacity / 100) * 0.42,
                        }}
                      />
                    );
                  })}

                {getGuidePositions(guideColumns).map((position) => {
                  const left =
                    (guideRegion.x + (guideRegion.width * position) / 100) *
                    100;
                  return (
                    <span
                      key={`column-${position}`}
                      className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 border-l border-dashed border-[#f5f2e8]/35"
                      style={{
                        left: `${left}%`,
                        opacity: referenceGrid.opacity / 100,
                      }}
                    >
                      <span
                        className="absolute w-px bg-[#ff7657] shadow-[1px_0_0_rgba(0,0,0,.75)]"
                        style={{
                          top: `${guideRegion.y * 100}%`,
                          height: `${guideRegion.height * 100}%`,
                        }}
                      />
                    </span>
                  );
                })}
                {getGuidePositions(guideRows).map((position) => {
                  const top =
                    (guideRegion.y + (guideRegion.height * position) / 100) *
                    100;
                  return (
                    <span
                      key={`row-${position}`}
                      className="pointer-events-none absolute inset-x-0 h-px -translate-y-1/2 border-t border-dashed border-[#f5f2e8]/35"
                      style={{
                        top: `${top}%`,
                        opacity: referenceGrid.opacity / 100,
                      }}
                    >
                      <span
                        className="absolute h-px bg-[#ff7657] shadow-[0_1px_0_rgba(0,0,0,.75)]"
                        style={{
                          left: `${guideRegion.x * 100}%`,
                          width: `${guideRegion.width * 100}%`,
                        }}
                      />
                    </span>
                  );
                })}

                <div
                  role="group"
                  tabIndex={0}
                  aria-label="Reference grid region. Use arrow keys to move it."
                  className="absolute cursor-move border-2 border-[#ff7657] outline-none focus-visible:ring-2 focus-visible:ring-[#4d7cff] focus-visible:ring-offset-2 focus-visible:ring-offset-black/70"
                  style={{
                    left: `${guideRegion.x * 100}%`,
                    top: `${guideRegion.y * 100}%`,
                    width: `${guideRegion.width * 100}%`,
                    height: `${guideRegion.height * 100}%`,
                    borderColor: `rgb(255 118 87 / ${referenceGrid.opacity / 100})`,
                  }}
                  onPointerDown={(event) => beginGuideGesture(event, "move")}
                  onPointerMove={updateGuideGesture}
                  onPointerUp={finishGuideGesture}
                  onPointerCancel={finishGuideGesture}
                  onLostPointerCapture={finishGuideGesture}
                  onKeyDown={(event) => {
                    const movement = {
                      ArrowLeft: [-1, 0],
                      ArrowRight: [1, 0],
                      ArrowUp: [0, -1],
                      ArrowDown: [0, 1],
                    }[event.key];
                    if (!movement) return;
                    event.preventDefault();
                    event.stopPropagation();
                    const step = event.shiftKey ? 0.05 : 0.01;
                    setGuideRegion((current) =>
                      clampGuideRegion({
                        ...current,
                        x: current.x + movement[0] * step,
                        y: current.y + movement[1] * step,
                      }),
                    );
                  }}
                >
                  {GUIDE_HANDLES.map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      aria-label={`Resize reference grid from ${handle}`}
                      className={cn(
                        "absolute size-4 border border-[#17100c] bg-[#f5f2e8] outline-none hover:bg-[#ff7657] focus-visible:ring-2 focus-visible:ring-[#4d7cff]",
                        GUIDE_HANDLE_CLASSES[handle],
                      )}
                      onPointerDown={(event) =>
                        beginGuideGesture(event, "resize", handle)
                      }
                      onPointerMove={updateGuideGesture}
                      onPointerUp={finishGuideGesture}
                      onPointerCancel={finishGuideGesture}
                      onLostPointerCapture={finishGuideGesture}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {!crop &&
            keyboardActive &&
            (mode === "paint" || mode === "select") ? (
              <span
                role="row"
                className="pointer-events-none absolute"
                style={{
                  left: Math.min(width - 1, keyboardCell.x) * zoom,
                  top: Math.min(height - 1, keyboardCell.y) * zoom,
                  width: zoom,
                  height: zoom,
                }}
              >
                <span
                  id="pixel-active-cell"
                  role="gridcell"
                  aria-rowindex={Math.min(height - 1, keyboardCell.y) + 1}
                  aria-colindex={Math.min(width - 1, keyboardCell.x) + 1}
                  aria-label={`Cursor at row ${Math.min(height - 1, keyboardCell.y) + 1}, column ${Math.min(width - 1, keyboardCell.x) + 1}`}
                  className="block size-full border-2 border-[#ef6a47] shadow-[0_0_0_1px_white]"
                />
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p id="pixel-canvas-instructions" className="sr-only">
        Use arrow keys to move between cells. Press Enter to use the active
        tool. Hold Space and drag, or drag with the right mouse button, to pan.
      </p>

      <div className="pointer-events-none absolute bottom-4 left-4 hidden border border-border/40 bg-card px-2.5 py-1.5 font-mono text-[11px] tracking-[0.04em] text-muted-foreground md:block">
        Space + drag / right-drag to pan
      </div>

      {processing ? (
        <div className="pointer-events-none absolute right-4 bottom-4 flex items-center gap-2 border-2 border-border bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground shadow-[3px_3px_0_var(--shadow)]">
          <span className="size-2 animate-pulse bg-[#ef6a47]" />
          Quantizing
        </div>
      ) : null}
    </section>
  );
}
