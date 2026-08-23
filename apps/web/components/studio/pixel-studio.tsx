"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Beaker,
  Download,
  HelpCircle,
  PanelRight,
  Redo2,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ExportDialog } from "@/components/export/export-dialog";
import { PaletteDialog } from "@/components/palette/palette-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@pigment/ui/alert-dialog";
import { BrandMark } from "@pigment/ui/brand-mark";
import { Button } from "@pigment/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@pigment/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@pigment/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@pigment/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pigment/ui/tooltip";
import { usePixelWorker } from "@/hooks/use-pixel-worker";
import {
  DEFAULT_PALETTE_ADJUSTMENTS,
  nearestColorIndex,
  type PaletteAdjustments,
} from "@pigment/color";
import { exportPixelPng } from "@/lib/browser/export";
import { decodeImageFile } from "@/lib/browser/image";
import { previewToThumbnail, takePendingPalette, writeProjectSnapshot } from "@/lib/browser/project-snapshot";
import { readProjectSource, saveProjectSource } from "@/lib/browser/project-source";
import {
  readStudioProject,
  restoreSparseValues,
  sparseValues,
  writeStudioProject,
  type StudioProject,
} from "@/lib/browser/studio-project";
import {
  createPalette,
  DEFAULT_PALETTE,
  parsePaletteContents,
  type Palette,
  paletteIdentity,
} from "@pigment/palette";
import {
  CONVERSION_METHODS,
  DEFAULT_INPUT_ADJUSTMENTS,
  METHOD_INHERIT,
  composeColorIds,
  conversionMethodCode,
  dimensionsForAspect,
  finalColorAt,
  floodFillIndices,
  invertSelectionMask,
  MAX_GRID_SIDE,
  MIN_GRID_SIDE,
  NO_OVERRIDE_COLOR_ID,
  normalizeGuideDivisions,
  paletteToMatchingColors,
  paletteToPixelColors,
  selectAllMask,
  sourceCropFromCells,
  TRANSPARENT_COLOR_ID,
  type CellCrop,
  type ConversionMethod,
  type InputAdjustments,
  type PixelPaletteColor,
  type PixelPreview,
  type PartitionKind,
  type SourceCrop,
} from "@pigment/quantization";

import { ImageChooser } from "./image-chooser";
import { Inspector } from "./inspector";
import { OutputSidebar } from "./output-sidebar";
import { PixelCanvas } from "./pixel-canvas";
import type {
  EditorMode,
  EditorTool,
  HistoryPatch,
  SelectionCombineMode,
  SelectionTool,
  SourceMeta,
} from "./types";
import { sampleImageFile } from "./sample-images";
import { UploadDropzone } from "./upload-dropzone";

const CUSTOM_PALETTES_KEY = "pixide:palettes:v1";
const FIRST_RESULT_GUIDE_KEY = "pigment:first-result-guide:v1";
const MAX_HISTORY_BYTES = 24 * 1024 * 1024;

const clampGrid = (value: number) =>
  Math.min(MAX_GRID_SIDE, Math.max(MIN_GRID_SIDE, Math.round(value)));

const initialGrid = (width: number, height: number) => {
  if (width >= height) {
    return { width: 64, height: clampGrid((64 * height) / width) };
  }
  return { width: clampGrid((64 * width) / height), height: 64 };
};

const loadCustomPalettes = (): Palette[] => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_PALETTES_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const value = entry as Record<string, unknown>;
      if (
        typeof value.id !== "string" ||
        typeof value.name !== "string" ||
        !Array.isArray(value.colors)
      ) {
        return [];
      }
      const colors = value.colors.flatMap((swatch) =>
        typeof swatch === "object" &&
        swatch !== null &&
        typeof (swatch as Record<string, unknown>).hex === "string"
          ? [(swatch as Record<string, unknown>).hex as string]
          : [],
      );
      if (colors.length !== value.colors.length) return [];
      const restored = createPalette(value.id, value.name, colors, "local");
      return restored.ok ? [restored.value] : [];
    });
  } catch {
    return [];
  }
};

const hasOverrides = (overrides: Int32Array) => {
  for (const value of overrides) {
    if (value !== NO_OVERRIDE_COLOR_ID) return true;
  }
  return false;
};

const createOverrides = (length: number) => {
  const overrides = new Int32Array(length);
  overrides.fill(NO_OVERRIDE_COLOR_ID);
  return overrides;
};

const createMethodOverrides = (length: number) => {
  const overrides = new Uint8Array(length);
  overrides.fill(METHOD_INHERIT);
  return overrides;
};

const hasMethodOverrides = (overrides: Uint8Array) => {
  for (const value of overrides) {
    if (value !== METHOD_INHERIT) return true;
  }
  return false;
};

const countSelection = (selection: Uint8Array | null): number | null => {
  if (!selection) return null;
  let count = 0;
  for (const value of selection) count += Number(value !== 0);
  return count;
};

const historyPatchBytes = (patch: HistoryPatch) =>
  patch.indices.byteLength + patch.before.byteLength + patch.after.byteLength;

type ActiveStroke =
  | Readonly<{ kind: "sparse"; before: Map<number, number> }>
  | Readonly<{
      kind: "dense";
      touched: Uint8Array;
      before: Int32Array;
      indices: number[];
    }>;

const createPaletteIdMapping = (
  oldPalette: readonly PixelPaletteColor[],
  nextPalette: readonly PixelPaletteColor[],
) => {
  const mapping = new Map<number, number>();
  const nextColors = nextPalette.map((color) => color.color);
  for (const entry of oldPalette) {
    const index = nearestColorIndex(entry.color, nextColors);
    mapping.set(entry.id, nextPalette[index]?.id ?? NO_OVERRIDE_COLOR_ID);
  }
  return mapping;
};

const remapColorIds = (values: Int32Array, mapping: ReadonlyMap<number, number>) => {
  const remapped = values.slice();
  for (let index = 0; index < remapped.length; index += 1) {
    const current = remapped[index];
    if (current !== NO_OVERRIDE_COLOR_ID) {
      remapped[index] = mapping.get(current) ?? NO_OVERRIDE_COLOR_ID;
    }
  }
  return remapped;
};

const remapPaintedColors = (
  overrides: Int32Array,
  mapping: ReadonlyMap<number, number>,
) => {
  const remapped = overrides.slice();
  for (let index = 0; index < remapped.length; index += 1) {
    const current = remapped[index];
    if (current === NO_OVERRIDE_COLOR_ID) continue;
    remapped[index] = mapping.get(current) ?? NO_OVERRIDE_COLOR_ID;
  }
  return remapped;
};

const remapHistoryPatch = (
  patch: HistoryPatch,
  mapping: ReadonlyMap<number, number>,
): HistoryPatch =>
  patch.kind === "paint"
    ? {
        ...patch,
        before: remapColorIds(patch.before, mapping),
        after: remapColorIds(patch.after, mapping),
      }
    : patch;

const customPaletteId = () =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const pruneColorIds = (colorIds: ReadonlySet<number>, palette: Palette) => {
  const paletteIds = new Set(palette.colors.map((swatch) => swatch.id));
  return new Set([...colorIds].filter((id) => paletteIds.has(id)));
};

const pruneExcludedColorIds = (colorIds: ReadonlySet<number>, palette: Palette) => {
  const pruned = pruneColorIds(colorIds, palette);
  if (pruned.size === palette.colors.length && palette.colors.length > 0) {
    pruned.delete(palette.colors[0].id);
  }
  return pruned;
};

export function PixelStudio() {
  const {
    setSource: setWorkerSource,
    cropSource: cropWorkerSource,
    convert,
    preview,
    extractPalette,
  } = usePixelWorker();
  const [source, setSource] = useState<SourceMeta | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const sourceFileRef = useRef<File | null>(null);
  const sourceGenerationRef = useRef(0);
  const sourceCropRef = useRef<SourceCrop | null>(null);
  const [sourceVersion, setSourceVersion] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [restoringSource, setRestoringSource] = useState(true);
  const uploadRequestRef = useRef(0);
  const uploadInFlightRef = useRef(false);

  const [gridWidth, setGridWidth] = useState(64);
  const [gridHeight, setGridHeight] = useState(64);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [pendingGrid, setPendingGrid] = useState<{ width: number; height: number } | null>(null);
  const [cropDraft, setCropDraft] = useState<CellCrop | null>(null);
  const [pendingCrop, setPendingCrop] = useState<CellCrop | null>(null);
  const [cropping, setCropping] = useState(false);
  const [dimensionInputVersion, setDimensionInputVersion] = useState(0);
  const [method, setMethod] = useState<ConversionMethod>("dominant");
  const previousSquareMethodRef = useRef<ConversionMethod>("dominant");
  const [partition, setPartition] = useState<PartitionKind>("square");
  const [partitionScale, setPartitionScale] = useState(6);
  const [preserveTransparency, setPreserveTransparency] = useState(true);
  const [alphaThreshold, setAlphaThreshold] = useState(128);
  const [inputAdjustments, setInputAdjustments] = useState<InputAdjustments>(
    DEFAULT_INPUT_ADJUSTMENTS,
  );
  const [showGuides, setShowGuides] = useState(false);
  const [guideColumns, setGuideColumns] = useState(3);
  const [guideRows, setGuideRows] = useState(3);
  const [activePalette, setActivePalette] = useState<Palette>(DEFAULT_PALETTE);
  const [customPalettes, setCustomPalettes] = useState<Palette[]>(loadCustomPalettes);
  const [adjustments, setAdjustments] = useState<PaletteAdjustments>(
    DEFAULT_PALETTE_ADJUSTMENTS,
  );
  const activePaletteRef = useRef(activePalette);
  const adjustmentsRef = useRef(adjustments);
  const [excludedColorIds, setExcludedColorIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const excludedColorIdsRef = useRef<ReadonlySet<number>>(excludedColorIds);
  const [isolatedColorIds, setIsolatedColorIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [matchingPalette, setMatchingPalette] = useState<readonly PixelPaletteColor[]>(() =>
    paletteToMatchingColors(DEFAULT_PALETTE, DEFAULT_PALETTE_ADJUSTMENTS, new Set()),
  );

  const [generated, setGenerated] = useState<Uint16Array | null>(null);
  const [overrides, setOverrides] = useState(() => createOverrides(64 * 64));
  const overridesRef = useRef(overrides);
  const [methodOverrides, setMethodOverrides] = useState(() =>
    createMethodOverrides(64 * 64),
  );
  const methodOverridesRef = useRef(methodOverrides);
  const [selectionMask, setSelectionMask] = useState<Uint8Array | null>(null);
  const selectionMaskRef = useRef<Uint8Array | null>(null);
  const [originalPreview, setOriginalPreview] = useState<PixelPreview | null>(null);
  const [adjustedPreview, setAdjustedPreview] = useState<PixelPreview | null>(null);
  const [processing, setProcessing] = useState(false);
  const latestConversionRef = useRef(0);
  const latestPreviewRef = useRef(0);

  const [mode, setMode] = useState<EditorMode>("convert");
  const [tool, setTool] = useState<EditorTool>("pencil");
  const brushSize = 1;
  const [selectionTool, setSelectionTool] = useState<SelectionTool>("brush");
  const [selectionBrushSize, setSelectionBrushSize] = useState(1);
  const [selectionCombineMode, setSelectionCombineMode] =
    useState<SelectionCombineMode>("replace");
  const [selectionMethod, setSelectionMethod] =
    useState<ConversionMethod>("dither");
  const [selectedColorId, setSelectedColorId] = useState(activePalette.colors[0].id);
  const [selectedOutputSwatchId, setSelectedOutputSwatchId] = useState<number | null>(null);
  const activeStrokeRef = useRef<ActiveStroke | null>(null);
  const historyRef = useRef<HistoryPatch[]>([]);
  const futureRef = useRef<HistoryPatch[]>([]);
  const [historyStatus, setHistoryStatus] = useState({ undo: 0, redo: 0 });

  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteOpenRef = useRef(false);
  const paletteRevisionRef = useRef(0);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [imageChooserOpen, setImageChooserOpen] = useState(false);
  const [desktopControls, setDesktopControls] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScale, setExportScale] = useState(4);
  const [exporting, setExporting] = useState(false);
  const [pendingPaletteDelete, setPendingPaletteDelete] = useState<Palette | null>(null);
  const [firstResultGuide, setFirstResultGuide] = useState(false);
  const pendingPaletteRef = useRef<ReturnType<typeof takePendingPalette>>(null);
  const savedProjectRef = useRef<StudioProject | null>(null);
  const projectReadyRef = useRef(false);

  useEffect(() => {
    const pendingPalette = pendingPaletteRef.current;
    if (!pendingPalette || !source) return;
    pendingPaletteRef.current = null;
    const result = createPalette(customPaletteId(), pendingPalette.name, pendingPalette.colors);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCustomPalettes((palettes) => [...palettes, result.value]);
    activePaletteRef.current = result.value;
    setActivePalette(result.value);
    setMatchingPalette(
      paletteToMatchingColors(result.value, adjustmentsRef.current, excludedColorIdsRef.current),
    );
    setSelectedColorId(result.value.colors[0].id);
    setProcessing(true);
    toast.success(`${result.value.name} loaded into Studio`);
  }, [source]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktopControls(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const adjustedPalette = useMemo(
    () => paletteToPixelColors(activePalette, adjustments),
    [activePalette, adjustments],
  );
  const finalColorIds = useMemo(
    () => (generated ? composeColorIds(generated, overrides) : null),
    [generated, overrides],
  );
  const selectedCount = useMemo(() => countSelection(selectionMask), [selectionMask]);
  const interventionCount = useMemo(() => {
    let count = 0;
    for (const value of methodOverrides) count += Number(value !== METHOD_INHERIT);
    return count;
  }, [methodOverrides]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_PALETTES_KEY, JSON.stringify(customPalettes));
  }, [customPalettes]);

  useEffect(() => {
    if (!projectReadyRef.current || !source || !sourceCropRef.current) return;
    const timer = window.setTimeout(() => {
      writeStudioProject({
        version: 1,
        gridWidth,
        gridHeight,
        aspectLocked,
        method,
        partition,
        partitionScale,
        preserveTransparency,
        alphaThreshold,
        inputAdjustments,
        sourceCrop: sourceCropRef.current as SourceCrop,
        palette: activePalette,
        paletteAdjustments: adjustments,
        excludedColorIds: [...excludedColorIds],
        methodOverrides: sparseValues(methodOverrides, METHOD_INHERIT),
        colorOverrides: sparseValues(overrides, NO_OVERRIDE_COLOR_ID),
        showGuides,
        guideColumns,
        guideRows,
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [
    source,
    gridWidth,
    gridHeight,
    aspectLocked,
    method,
    partition,
    partitionScale,
    preserveTransparency,
    alphaThreshold,
    inputAdjustments,
    activePalette,
    adjustments,
    excludedColorIds,
    methodOverrides,
    overrides,
    showGuides,
    guideColumns,
    guideRows,
  ]);

  useEffect(() => {
    if (!source || !originalPreview) return;
    writeProjectSnapshot({
      name: source.name,
      sourceWidth: source.width,
      sourceHeight: source.height,
      gridWidth,
      gridHeight,
      method,
      partition,
      paletteName: activePalette.name,
      paletteColors: activePalette.colors.map((color) => color.hex),
      inputAdjustments,
      interventionCount,
      thumbnail: previewToThumbnail(originalPreview),
      updatedAt: Date.now(),
    });
  }, [source, originalPreview, gridWidth, gridHeight, method, partition, activePalette, inputAdjustments, interventionCount]);

  useEffect(() => {
    activePaletteRef.current = activePalette;
  }, [activePalette]);

  useEffect(() => {
    adjustmentsRef.current = adjustments;
  }, [adjustments]);

  useEffect(
    () => () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    },
    [],
  );

  const performConversion = useEffectEvent(
    async (conversionId: number, sourceGeneration: number) => {
    setProcessing(true);
    try {
      const options = {
        gridWidth,
        gridHeight,
        method,
        methodOverrides: partition === "square" ? methodOverrides : undefined,
        partition,
        partitionScale,
        partitionSeed: 1,
        palette: matchingPalette,
        preserveTransparency,
        alphaThreshold,
        inputAdjustments,
      } as const;
      let result: Awaited<ReturnType<typeof convert>>;
      try {
        result = await convert(options);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const sourceFile = sourceFileRef.current;
        const recoverable =
          message.includes("worker") || message.includes("Upload a source image first");
        if (!recoverable || !sourceFile) throw error;
        if (
          sourceGeneration !== sourceGenerationRef.current ||
          uploadInFlightRef.current
        ) {
          return;
        }
        const decoded = await decodeImageFile(sourceFile);
        if (
          conversionId !== latestConversionRef.current ||
          sourceGeneration !== sourceGenerationRef.current ||
          uploadInFlightRef.current
        ) {
          return;
        }
        let recoveredPreview = await setWorkerSource(
          decoded.pixels,
          decoded.width,
          decoded.height,
        );
        const sourceCrop = sourceCropRef.current;
        if (
          sourceCrop &&
          (sourceCrop.x !== 0 ||
            sourceCrop.y !== 0 ||
            sourceCrop.width !== decoded.width ||
            sourceCrop.height !== decoded.height)
        ) {
          recoveredPreview = await cropWorkerSource(sourceCrop);
        }
        if (sourceGeneration !== sourceGenerationRef.current) return;
        setOriginalPreview(recoveredPreview);
        result = await convert(options);
      }
      if (conversionId !== latestConversionRef.current) return;
      setGenerated(result.colorIds);
      if (overridesRef.current.length !== result.colorIds.length) {
        overridesRef.current = createOverrides(result.colorIds.length);
        setOverrides(overridesRef.current);
      }
    } catch (error) {
      if (conversionId === latestConversionRef.current) {
        toast.error(error instanceof Error ? error.message : "Image conversion failed.");
      }
    } finally {
      if (conversionId === latestConversionRef.current) setProcessing(false);
    }
    },
  );

  useEffect(() => {
    if (!sourceVersion) return;
    const conversionId = ++latestConversionRef.current;
    const sourceGeneration = sourceGenerationRef.current;
    const timer = window.setTimeout(
      () => void performConversion(conversionId, sourceGeneration),
      120,
    );
    return () => window.clearTimeout(timer);
  }, [
    sourceVersion,
    gridWidth,
    gridHeight,
    method,
    methodOverrides,
    partition,
    partitionScale,
    matchingPalette,
    preserveTransparency,
    alphaThreshold,
    inputAdjustments,
  ]);

  const performPreview = useEffectEvent(
    async (previewId: number, sourceGeneration: number) => {
      try {
        const result = await preview(
          inputAdjustments,
          preserveTransparency,
          alphaThreshold,
        );
        if (
          previewId !== latestPreviewRef.current ||
          sourceGeneration !== sourceGenerationRef.current
        ) {
          return;
        }
        setAdjustedPreview(result);
      } catch (error) {
        if (previewId === latestPreviewRef.current) {
          toast.error(error instanceof Error ? error.message : "Source preview failed.");
        }
      }
    },
  );

  useEffect(() => {
    if (!sourceVersion) return;
    const previewId = ++latestPreviewRef.current;
    const sourceGeneration = sourceGenerationRef.current;
    const timer = window.setTimeout(
      () => void performPreview(previewId, sourceGeneration),
      100,
    );
    return () => window.clearTimeout(timer);
  }, [sourceVersion, inputAdjustments, preserveTransparency, alphaThreshold]);

  const clearHistory = () => {
    historyRef.current = [];
    futureRef.current = [];
    activeStrokeRef.current = null;
    setHistoryStatus({ undo: 0, redo: 0 });
  };

  const remapHistory = (mapping: ReadonlyMap<number, number>) => {
    historyRef.current = historyRef.current.map((patch) => remapHistoryPatch(patch, mapping));
    futureRef.current = futureRef.current.map((patch) => remapHistoryPatch(patch, mapping));
    setHistoryStatus({
      undo: historyRef.current.length,
      redo: futureRef.current.length,
    });
  };

  const handleImageFile = async (file: File) => {
    if (uploadInFlightRef.current) {
      toast.info("Finish the current image first.");
      return;
    }
    uploadInFlightRef.current = true;
    sourceGenerationRef.current += 1;
    latestConversionRef.current += 1;
    latestPreviewRef.current += 1;
    const uploadRequest = ++uploadRequestRef.current;
    setUploading(true);
    setUploadError(null);
    try {
      const decoded = await decodeImageFile(file);
      if (uploadRequest !== uploadRequestRef.current) return;
      let sourcePreview = await setWorkerSource(
        decoded.pixels,
        decoded.width,
        decoded.height,
      );
      if (uploadRequest !== uploadRequestRef.current) return;
      const savedProject = savedProjectRef.current;
      const savedCrop = savedProject?.sourceCrop;
      if (
        savedCrop &&
        savedCrop.x >= 0 &&
        savedCrop.y >= 0 &&
        savedCrop.width > 0 &&
        savedCrop.height > 0 &&
        savedCrop.x + savedCrop.width <= decoded.width &&
        savedCrop.y + savedCrop.height <= decoded.height
      ) {
        sourcePreview = await cropWorkerSource(savedCrop);
      }
      const url = URL.createObjectURL(file);
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      sourceUrlRef.current = url;
      sourceFileRef.current = file;
      void saveProjectSource(file).catch(() => undefined);
      sourceCropRef.current = savedCrop ?? {
        x: 0,
        y: 0,
        width: decoded.width,
        height: decoded.height,
      };
      const sourceWidth = sourceCropRef.current.width;
      const sourceHeight = sourceCropRef.current.height;
      const initialDimensions = initialGrid(sourceWidth, sourceHeight);
      const grid = savedProject
        ? {
            width: clampGrid(savedProject.gridWidth),
            height: clampGrid(savedProject.gridHeight),
          }
        : initialDimensions;
      const restoredPalette = savedProject?.palette ?? activePaletteRef.current;
      const restoredPaletteAdjustments = savedProject?.paletteAdjustments ?? adjustmentsRef.current;
      const restoredExcludedIds = new Set(savedProject?.excludedColorIds ?? []);
      const restoredOverrides = restoreSparseValues(
        createOverrides(grid.width * grid.height),
        savedProject?.colorOverrides ?? [],
      );
      const restoredMethodOverrides = restoreSparseValues(
        createMethodOverrides(grid.width * grid.height),
        savedProject?.methodOverrides ?? [],
      );
      setSource({
        name: file.name,
        url,
        width: sourceWidth,
        height: sourceHeight,
      });
      setGridWidth(grid.width);
      setGridHeight(grid.height);
      if (savedProject) {
        setAspectLocked(savedProject.aspectLocked);
        setMethod(savedProject.method);
        if ((savedProject.partition ?? "square") === "square") {
          previousSquareMethodRef.current = savedProject.method;
        }
        setPartition(savedProject.partition ?? "square");
        setPartitionScale(savedProject.partitionScale ?? 6);
        setPreserveTransparency(savedProject.preserveTransparency);
        setAlphaThreshold(savedProject.alphaThreshold);
        setInputAdjustments(savedProject.inputAdjustments);
        setShowGuides(savedProject.showGuides);
        setGuideColumns(normalizeGuideDivisions(savedProject.guideColumns));
        setGuideRows(normalizeGuideDivisions(savedProject.guideRows));
        activePaletteRef.current = restoredPalette;
        setActivePalette(restoredPalette);
        adjustmentsRef.current = restoredPaletteAdjustments;
        setAdjustments(restoredPaletteAdjustments);
        excludedColorIdsRef.current = restoredExcludedIds;
        setExcludedColorIds(restoredExcludedIds);
        setSelectedColorId(restoredPalette.colors[0]?.id ?? 0);
      }
      setGenerated(null);
      overridesRef.current = restoredOverrides;
      setOverrides(restoredOverrides);
      methodOverridesRef.current = restoredMethodOverrides;
      setMethodOverrides(restoredMethodOverrides);
      selectionMaskRef.current = null;
      setSelectionMask(null);
      setCropDraft(null);
      setPendingCrop(null);
      setOriginalPreview(sourcePreview);
      setAdjustedPreview(sourcePreview);
      clearHistory();
      setMatchingPalette(
        paletteToMatchingColors(
          restoredPalette,
          restoredPaletteAdjustments,
          restoredExcludedIds,
        ),
      );
      setProcessing(true);
      projectReadyRef.current = true;
      savedProjectRef.current = null;
      setSourceVersion((value) => value + 1);
      if (!savedProject && localStorage.getItem(FIRST_RESULT_GUIDE_KEY) !== "dismissed") {
        setFirstResultGuide(true);
        setMode("convert");
      }
    } catch (error) {
      if (uploadRequest !== uploadRequestRef.current) return;
      const message = error instanceof Error ? error.message : "Image upload failed.";
      setUploadError(message);
      if (source) {
        setProcessing(false);
        toast.error(message);
      }
    } finally {
      if (uploadRequest === uploadRequestRef.current) {
        uploadInFlightRef.current = false;
        setUploading(false);
      }
    }
  };

  useEffect(() => {
    pendingPaletteRef.current = takePendingPalette();
    savedProjectRef.current = readStudioProject();
    void readProjectSource()
      .then((file) => {
        if (file) return handleImageFile(file);
      })
      .catch(() => undefined)
      .finally(() => setRestoringSource(false));
    // Restore the last source once when Studio opens; the source itself stays local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyGrid = (next: { width: number; height: number }) => {
    setProcessing(true);
    setGridWidth(next.width);
    setGridHeight(next.height);
    setGenerated(null);
    overridesRef.current = createOverrides(next.width * next.height);
    setOverrides(overridesRef.current);
    methodOverridesRef.current = createMethodOverrides(next.width * next.height);
    setMethodOverrides(methodOverridesRef.current);
    selectionMaskRef.current = null;
    setSelectionMask(null);
    setCropDraft(null);
    clearHistory();
    setMatchingPalette(
      paletteToMatchingColors(activePalette, adjustments, excludedColorIdsRef.current),
    );
  };

  const hasEditorChanges = () =>
    hasOverrides(overridesRef.current) ||
    hasMethodOverrides(methodOverridesRef.current) ||
    selectionMaskRef.current !== null ||
    historyRef.current.length > 0 ||
    futureRef.current.length > 0;

  const requestGridChange = (next: { width: number; height: number }) => {
    if (next.width === gridWidth && next.height === gridHeight) return;
    if (hasEditorChanges()) {
      setPendingGrid(next);
    } else applyGrid(next);
  };

  const applyCrop = async (crop: CellCrop) => {
    if (!source) return;
    const nextGrid = {
      width: crop.right - crop.left,
      height: crop.bottom - crop.top,
    };
    if (nextGrid.width < MIN_GRID_SIDE || nextGrid.height < MIN_GRID_SIDE) return;

    const localCrop = sourceCropFromCells(
      crop,
      gridWidth,
      gridHeight,
      source.width,
      source.height,
    );
    latestConversionRef.current += 1;
    latestPreviewRef.current += 1;
    setCropping(true);
    setProcessing(true);
    try {
      const croppedPreview = await cropWorkerSource(localCrop);
      const currentCrop = sourceCropRef.current ?? {
        x: 0,
        y: 0,
        width: source.width,
        height: source.height,
      };
      sourceCropRef.current = {
        x: currentCrop.x + localCrop.x,
        y: currentCrop.y + localCrop.y,
        width: localCrop.width,
        height: localCrop.height,
      };
      setSource((current) =>
        current
          ? { ...current, width: localCrop.width, height: localCrop.height }
          : current,
      );
      applyGrid(nextGrid);
      setOriginalPreview(croppedPreview);
      setAdjustedPreview(croppedPreview);
      setSourceVersion((value) => value + 1);
    } catch (error) {
      setProcessing(false);
      toast.error(error instanceof Error ? error.message : "Source crop failed.");
    } finally {
      setCropping(false);
    }
  };

  const requestCrop = () => {
    if (!cropDraft) return;
    if (hasEditorChanges()) setPendingCrop(cropDraft);
    else void applyCrop(cropDraft);
  };

  const handleGridChange = (axis: "width" | "height", rawValue: number) => {
    if (!Number.isFinite(rawValue)) return;
    const value = clampGrid(rawValue);
    let next =
      axis === "width"
        ? { width: value, height: gridHeight }
        : { width: gridWidth, height: value };
    if (aspectLocked && source) {
      const aspectDimensions = dimensionsForAspect(
        axis,
        value,
        source.width,
        source.height,
      );
      next = {
        width: clampGrid(aspectDimensions.width),
        height: clampGrid(aspectDimensions.height),
      };
    }
    requestGridChange(next);
  };

  const updateMatchingPalette = (
    palette: Palette,
    nextAdjustments = adjustments,
    nextExcludedColorIds = excludedColorIdsRef.current,
  ) => {
    setProcessing(true);
    setGenerated(null);
    setMatchingPalette(
      paletteToMatchingColors(palette, nextAdjustments, nextExcludedColorIds),
    );
  };

  const toggleExcludedColor = (colorId: number) => {
    const next = new Set(excludedColorIdsRef.current);
    if (next.has(colorId)) {
      next.delete(colorId);
    } else {
      if (activePalette.colors.length - next.size <= 1) {
        toast.error("At least one color must remain available for matching.");
        return;
      }
      next.add(colorId);
    }
    excludedColorIdsRef.current = next;
    setExcludedColorIds(next);
    updateMatchingPalette(activePalette, adjustments, next);
  };

  const toggleIsolatedColor = (colorId: number) => {
    setIsolatedColorIds((current) => {
      const next = new Set(current);
      if (next.has(colorId)) next.delete(colorId);
      else next.add(colorId);
      return next;
    });
  };

  const selectPalette = (palette: Palette) => {
    const currentPalette = activePaletteRef.current;
    const currentAdjustments = adjustmentsRef.current;
    if (
      paletteIdentity(palette) === paletteIdentity(currentPalette)
    ) {
      return;
    }
    paletteRevisionRef.current += 1;
    const currentAdjusted = paletteToPixelColors(currentPalette, currentAdjustments);
    const nextAdjusted = paletteToPixelColors(palette, currentAdjustments);
    const mapping = createPaletteIdMapping(currentAdjusted, nextAdjusted);
    overridesRef.current = remapPaintedColors(
      overridesRef.current,
      mapping,
    );
    setOverrides(overridesRef.current);
    remapHistory(mapping);
    activePaletteRef.current = palette;
    setActivePalette(palette);
    const emptyColorIds = new Set<number>();
    excludedColorIdsRef.current = emptyColorIds;
    setExcludedColorIds(emptyColorIds);
    setIsolatedColorIds(emptyColorIds);
    setGenerated(null);
    setProcessing(true);
    setSelectedColorId(palette.colors[0].id);
    setSelectedOutputSwatchId(null);
    setMatchingPalette(nextAdjusted);
  };

  const changePalette = (palette: Palette) => {
    paletteRevisionRef.current += 1;
    const colorsChanged = palette.colors !== activePalette.colors;
    const nextPalette = activePalette.source !== "local"
      ? {
          ...palette,
          id: customPaletteId(),
          name: palette.name === activePalette.name ? `${palette.name} copy` : palette.name,
          source: "local" as const,
          tags: undefined,
          author: undefined,
          attribution: undefined,
        }
      : palette;

    if (colorsChanged) {
      const nextAdjusted = paletteToPixelColors(nextPalette, adjustments);
      const nextExcludedColorIds = pruneExcludedColorIds(
        excludedColorIdsRef.current,
        nextPalette,
      );
      const nextIsolatedColorIds = pruneColorIds(isolatedColorIds, nextPalette);
      const mapping = createPaletteIdMapping(adjustedPalette, nextAdjusted);
      overridesRef.current = remapPaintedColors(
        overridesRef.current,
        mapping,
      );
      setOverrides(overridesRef.current);
      remapHistory(mapping);
      excludedColorIdsRef.current = nextExcludedColorIds;
      setExcludedColorIds(nextExcludedColorIds);
      setIsolatedColorIds(nextIsolatedColorIds);
      setMatchingPalette(
        paletteToMatchingColors(nextPalette, adjustments, nextExcludedColorIds),
      );
      setGenerated(null);
      setProcessing(true);
      if (!nextPalette.colors.some((swatch) => swatch.id === selectedColorId)) {
        setSelectedColorId(nextPalette.colors[0].id);
      }
      if (
        selectedOutputSwatchId !== null &&
        !nextPalette.colors.some((swatch) => swatch.id === selectedOutputSwatchId)
      ) {
        setSelectedOutputSwatchId(null);
      }
    }

    activePaletteRef.current = nextPalette;
    setActivePalette(nextPalette);
    setCustomPalettes((palettes) => {
      const existing = palettes.findIndex((entry) => entry.id === nextPalette.id);
      if (existing < 0) return [...palettes, nextPalette];
      return palettes.map((entry) => (entry.id === nextPalette.id ? nextPalette : entry));
    });
  };

  const createNewPalette = () => {
    const result = createPalette(customPaletteId(), "New palette", ["#1e1d1a", "#f4efe4"]);
    if (!result.ok) return;
    setCustomPalettes((palettes) => [...palettes, result.value]);
    selectPalette(result.value);
  };

  const savePaletteToLibrary = (palette: Palette) => {
    const alreadySaved = customPalettes.some(
      (savedPalette) =>
        savedPalette.colors.map((color) => color.hex).join(",") ===
        palette.colors.map((color) => color.hex).join(","),
    );
    if (alreadySaved) {
      toast.info(`${palette.name} is already in your palettes`);
      return;
    }
    const result = createPalette(
      customPaletteId(),
      palette.name,
      palette.colors.map((swatch) => swatch.hex),
    );
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCustomPalettes((palettes) => [...palettes, result.value]);
    toast.success(`${palette.name} saved to your palettes`);
  };

  const duplicateActivePalette = () => {
    const palette = activePaletteRef.current;
    const result = createPalette(
      customPaletteId(),
      `${palette.name} copy`,
      palette.colors.map((swatch) => swatch.hex),
    );
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCustomPalettes((palettes) => [...palettes, result.value]);
    selectPalette(result.value);
  };

  const deleteCustomPalette = (palette: Palette) => {
    if (palette.source !== "local") return;
    const current = activePaletteRef.current;
    if (current.source === "local" && current.id === palette.id) {
      selectPalette(DEFAULT_PALETTE);
    }
    setCustomPalettes((palettes) =>
      palettes.filter((entry) => entry.id !== palette.id),
    );
    setPendingPaletteDelete(null);
    toast.success(`${palette.name || "Palette"} deleted`);
  };

  const importPalette = async (file: File, colorCount: number) => {
    const importRevision = paletteRevisionRef.current;
    let colors: readonly string[];
    let extracted = false;
    if (file.type.startsWith("image/")) {
      const decoded = await decodeImageFile(file);
      const result = await extractPalette(decoded.pixels, colorCount);
      colors = result.colors;
      extracted = result.mode === "extracted";
    } else {
      const parsed = parsePaletteContents(await file.text(), file.name);
      if (!parsed.ok) throw new Error(parsed.error);
      colors = parsed.value;
    }
    if (colors.length === 0) throw new Error("No opaque colors were found in this file.");

    const name = file.name.replace(/\.[^.]+$/u, "") || "Imported palette";
    const result = createPalette(customPaletteId(), name, colors);
    if (!result.ok) throw new Error(result.error);
    setCustomPalettes((palettes) => [...palettes, result.value]);
    const shouldSelect =
      importRevision === paletteRevisionRef.current && paletteOpenRef.current;
    if (shouldSelect) selectPalette(result.value);
    const action = extracted ? "Extracted" : "Imported";
    toast.success(
      shouldSelect
        ? `${action} ${colors.length} colors`
        : `${action} palette added to your palettes`,
    );
  };

  const beginStroke = (bulk = false) => {
    if (activeStrokeRef.current) return;
    activeStrokeRef.current = bulk
      ? {
          kind: "dense",
          touched: new Uint8Array(overridesRef.current.length),
          before: new Int32Array(overridesRef.current.length),
          indices: [],
        }
      : { kind: "sparse", before: new Map() };
  };

  const paintIndices = (indices: readonly number[], restore: boolean) => {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    const nextId = restore ? NO_OVERRIDE_COLOR_ID : selectedColorId;
    let changed = false;
    for (const index of indices) {
      if (selectionMaskRef.current && !selectionMaskRef.current[index]) continue;
      const before = overridesRef.current[index];
      if (before === nextId) continue;
      if (stroke.kind === "sparse") {
        if (!stroke.before.has(index)) stroke.before.set(index, before);
      } else if (!stroke.touched[index]) {
        stroke.touched[index] = 1;
        stroke.before[index] = before;
        stroke.indices.push(index);
      }
      overridesRef.current[index] = nextId;
      changed = true;
    }
    if (changed) setOverrides(overridesRef.current.slice());
  };

  const pushHistoryPatch = (patch: HistoryPatch) => {
    const retained = [...historyRef.current, patch].slice(-100);
    let bytes = 0;
    let firstRetained = retained.length;
    for (let index = retained.length - 1; index >= 0; index -= 1) {
      bytes += historyPatchBytes(retained[index]);
      if (bytes > MAX_HISTORY_BYTES && index < retained.length - 1) break;
      firstRetained = index;
    }
    historyRef.current = retained.slice(firstRetained);
    futureRef.current = [];
    setHistoryStatus({ undo: historyRef.current.length, redo: 0 });
  };

  const endStroke = () => {
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (!stroke) return;
    let changed = 0;
    if (stroke.kind === "sparse") {
      for (const [index, before] of stroke.before) {
        if (before !== overridesRef.current[index]) changed += 1;
      }
    } else {
      for (const index of stroke.indices) {
        if (stroke.before[index] !== overridesRef.current[index]) changed += 1;
      }
    }
    if (!changed) return;
    const indices = new Int32Array(changed);
    const before = new Int32Array(changed);
    const after = new Int32Array(changed);
    let patchIndex = 0;
    const addChange = (index: number, previous: number) => {
      const next = overridesRef.current[index];
      if (previous === next) return;
      indices[patchIndex] = index;
      before[patchIndex] = previous;
      after[patchIndex] = next;
      patchIndex += 1;
    };
    if (stroke.kind === "sparse") {
      for (const [index, previous] of stroke.before) addChange(index, previous);
    } else {
      for (const index of stroke.indices) addChange(index, stroke.before[index]);
    }
    const patch: HistoryPatch = {
      kind: "paint",
      indices,
      before,
      after,
    };
    pushHistoryPatch(patch);
  };

  const fillAt = (index: number) => {
    if (!generated) return;
    paintIndices(
      floodFillIndices(
        index,
        selectedColorId,
        generated,
        overridesRef.current,
        gridWidth,
        gridHeight,
        selectionMaskRef.current,
      ),
      false,
    );
  };

  const pickAt = (index: number) => {
    if (!generated) return;
    const id = finalColorAt(index, generated, overridesRef.current);
    if (id === TRANSPARENT_COLOR_ID) {
      setTool("restore");
      return;
    }
    if (activePalette.colors.some((swatch) => swatch.id === id)) {
      setSelectedColorId(id);
      setTool("pencil");
    }
  };

  const applyHistoryPatch = (patch: HistoryPatch, direction: "undo" | "redo") => {
    const values = direction === "undo" ? patch.before : patch.after;
    if (patch.kind === "paint") {
      for (let index = 0; index < patch.indices.length; index += 1) {
        overridesRef.current[patch.indices[index]] = values[index];
      }
      setOverrides(overridesRef.current.slice());
      return;
    }
    for (let index = 0; index < patch.indices.length; index += 1) {
      methodOverridesRef.current[patch.indices[index]] = values[index];
    }
    setMethodOverrides(methodOverridesRef.current.slice());
    setProcessing(true);
  };

  const undo = () => {
    const patch = historyRef.current.at(-1);
    if (!patch) return;
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, patch];
    applyHistoryPatch(patch, "undo");
    setHistoryStatus({ undo: historyRef.current.length, redo: futureRef.current.length });
  };

  const redo = () => {
    const patch = futureRef.current.at(-1);
    if (!patch) return;
    futureRef.current = futureRef.current.slice(0, -1);
    historyRef.current = [...historyRef.current, patch];
    applyHistoryPatch(patch, "redo");
    setHistoryStatus({ undo: historyRef.current.length, redo: futureRef.current.length });
  };

  const updateSelectionMask = (mask: Uint8Array | null) => {
    if (mask && mask.length !== gridWidth * gridHeight) return;
    selectionMaskRef.current = mask;
    setSelectionMask(mask);
  };

  const invertSelection = () => {
    const current =
      selectionMaskRef.current ?? new Uint8Array(gridWidth * gridHeight);
    updateSelectionMask(invertSelectionMask(current));
  };

  const assignMethodToSelection = (code: number) => {
    const selection = selectionMaskRef.current;
    if (!selection) return;
    const entries: { index: number; before: number }[] = [];
    for (let index = 0; index < selection.length; index += 1) {
      if (!selection[index] || methodOverridesRef.current[index] === code) continue;
      entries.push({ index, before: methodOverridesRef.current[index] });
      methodOverridesRef.current[index] = code;
    }
    if (!entries.length) return;
    setMethodOverrides(methodOverridesRef.current.slice());
    setProcessing(true);
    pushHistoryPatch({
      kind: "method",
      indices: Int32Array.from(entries.map((entry) => entry.index)),
      before: Uint8Array.from(entries.map((entry) => entry.before)),
      after: new Uint8Array(entries.length).fill(code),
    });
  };

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (uploading) return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        "input, textarea, select, button, a[href], [role=option], [role=menuitem], [role=dialog], [contenteditable=true]",
      )
    ) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (activeStrokeRef.current) return;
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.toLowerCase() === "s") {
      setMode("select");
      setSelectionTool("brush");
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleExport = async () => {
    if (!finalColorIds || !source) return;
    setExporting(true);
    try {
      const baseName = source.name.replace(/\.[^.]+$/u, "") || "pigment-image";
      await exportPixelPng(
        finalColorIds,
        gridWidth,
        gridHeight,
        adjustedPalette,
        exportScale,
        `${baseName}-${partition}-${gridWidth}x${gridHeight}@${exportScale}x.png`,
        partition,
        partitionScale,
      );
      toast.success("PNG exported");
      setExportOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PNG export failed.");
    } finally {
      setExporting(false);
    }
  };

  if (!source) {
    if (restoringSource) {
      return (
        <div className="grid min-h-svh place-items-center bg-background text-foreground">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Restoring Studio…
          </p>
        </div>
      );
    }
    return (
      <div className="min-h-svh bg-background text-foreground">
        <UploadDropzone
          onFile={(file) => void handleImageFile(file)}
          onSample={(sample) => {
            void sampleImageFile(sample)
              .then(handleImageFile)
              .catch((error: unknown) => {
                setUploadError(error instanceof Error ? error.message : "Pigment could not open that sample.");
              });
          }}
          error={uploadError}
          disabled={uploading}
        />
        {uploading ? (
          <div className="fixed inset-x-0 bottom-5 mx-auto w-fit border bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] shadow-sm">
            Reading pixels…
          </div>
        ) : null}
      </div>
    );
  }

  const setPaletteDialogOpen = (open: boolean) => {
    paletteOpenRef.current = open;
    setPaletteOpen(open);
  };

  const dismissFirstResultGuide = () => {
    setFirstResultGuide(false);
    localStorage.setItem(FIRST_RESULT_GUIDE_KEY, "dismissed");
  };

  const convertProps = {
    source,
    method,
    partition,
    inputAdjustments,
    preserveTransparency,
    alphaThreshold,
    firstResultGuide,
    onDismissFirstResultGuide: dismissFirstResultGuide,
    onMethodChange: (nextMethod: ConversionMethod) => {
      setMethod(nextMethod);
      if (partition === "square") previousSquareMethodRef.current = nextMethod;
      updateMatchingPalette(activePalette);
      if (firstResultGuide) dismissFirstResultGuide();
    },
    onInputAdjustmentsChange: (nextAdjustments: InputAdjustments) => {
      setInputAdjustments(nextAdjustments);
      setProcessing(true);
    },
    onPreserveTransparencyChange: (preserve: boolean) => {
      setPreserveTransparency(preserve);
      updateMatchingPalette(activePalette);
    },
    onAlphaThresholdChange: (threshold: number) => {
      setAlphaThreshold(threshold);
      setProcessing(true);
    },
  };

  const outputProps = {
    gridWidth,
    gridHeight,
    partition,
    partitionScale,
    onPartitionChange: (nextPartition: PartitionKind) => {
      if (nextPartition === partition) return;
      if (nextPartition === "square") {
        setPartition(nextPartition);
        if (previousSquareMethodRef.current !== method) {
          setMethod(previousSquareMethodRef.current);
          toast.info(`${CONVERSION_METHODS.find((entry) => entry.value === previousSquareMethodRef.current)?.label ?? "Previous method"} restored for Square.`);
        }
      } else {
        previousSquareMethodRef.current = method;
        setPartition(nextPartition);
        setMode("convert");
        if (["dither", "atkinson", "bayer", "blue-noise", "riemersma"].includes(method)) {
          setMethod("dominant");
          toast.info("Dominant vote is active. Diffusion and pattern methods require Square.");
        }
      }
      setProcessing(true);
    },
    onPartitionScaleChange: (scale: number) => {
      setPartitionScale(scale);
      setProcessing(true);
    },
    aspectLocked,
    inputVersion: dimensionInputVersion,
    palette: activePalette,
    paletteAdjustments: adjustments,
    excludedColorIds,
    isolatedColorIds,
    selectedSwatchId: selectedOutputSwatchId,
    processing,
    onGridChange: handleGridChange,
    onGridScale: (factor: 0.5 | 2) =>
      requestGridChange({
        width: clampGrid(gridWidth * factor),
        height: clampGrid(gridHeight * factor),
      }),
    onAspectLockedChange: setAspectLocked,
    onPaletteChange: changePalette,
    onOpenPalette: () => setPaletteDialogOpen(true),
    onToggleExcludedColor: toggleExcludedColor,
    onToggleIsolatedColor: toggleIsolatedColor,
    onClearIsolation: () => setIsolatedColorIds(new Set()),
    onSelectedSwatchChange: setSelectedOutputSwatchId,
    onPaletteAdjustmentsChange: (nextAdjustments: PaletteAdjustments) => {
      adjustmentsRef.current = nextAdjustments;
      setAdjustments(nextAdjustments);
    },
    onRerun: () => updateMatchingPalette(activePalette),
  };

  const selectionProps = {
    tool: selectionTool,
    combineMode: selectionCombineMode,
    brushSize: selectionBrushSize,
    selectedCount,
    method: selectionMethod,
    globalMethod: method,
    processing,
    onToolChange: setSelectionTool,
    onCombineModeChange: setSelectionCombineMode,
    onBrushSizeChange: setSelectionBrushSize,
    onMethodChange: setSelectionMethod,
    onSelectAll: () => updateSelectionMask(selectAllMask(gridWidth, gridHeight)),
    onInvert: invertSelection,
    onDeselect: () => updateSelectionMask(null),
    onApplyMethod: () => {
      assignMethodToSelection(conversionMethodCode(selectionMethod));
      updateSelectionMask(null);
    },
    onUseGlobal: () => {
      assignMethodToSelection(METHOD_INHERIT);
      updateSelectionMask(null);
    },
  };

  const canUndo = historyStatus.undo > 0;
  const canRedo = historyStatus.redo > 0;

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header
        className="flex h-13 shrink-0 items-center justify-between border-b bg-background px-3 sm:px-4"
        inert={cropping}
      >
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="size-6" />
          <span className="hidden text-xs font-semibold tracking-[-0.02em] sm:inline">PIGMENT STUDIO</span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{source.name}</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {gridWidth}×{gridHeight} cells
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/lab">
              <Beaker data-icon="inline-start" />
              Inspect in Lab
            </Link>
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-11 sm:size-8"
                disabled={!canUndo || uploading}
                onClick={undo}
              >
                <Undo2 />
                <span className="sr-only">Undo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo · ⌘/Ctrl Z</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-11 sm:size-8"
                disabled={!canRedo || uploading}
                onClick={redo}
              >
                <Redo2 />
                <span className="sr-only">Redo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo · ⌘/Ctrl Shift Z</TooltipContent>
          </Tooltip>
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label="Open shortcuts and help">
                    <HelpCircle />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Shortcuts and help</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
              <div className="border-b-2 p-4">
                <p className="font-heading text-base font-bold">Shortcuts</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Switch tools without leaving the canvas. Shortcuts pause while you type in a field.
                </p>
              </div>
              <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 p-4 text-xs">
                <dt>Undo / redo</dt><dd className="font-mono text-muted-foreground">⌘/Ctrl Z · Shift Z</dd>
                <dt>New intervention</dt><dd className="font-mono text-muted-foreground">S</dd>
                <dt>Move cell cursor</dt><dd className="font-mono text-muted-foreground">Arrow keys</dd>
                <dt>Use active tool</dt><dd className="font-mono text-muted-foreground">Enter</dd>
                <dt>Pan canvas</dt><dd className="font-mono text-muted-foreground">Space + drag</dd>
              </dl>
              <div className="border-t-2 p-3">
                <Button asChild variant="link" size="sm" className="h-auto px-1">
                  <Link href="/lab">Inspect this project in Lab</Link>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <span className="mx-1 h-4 w-px bg-border" />
          <div className="hidden sm:block">
            <Button variant="outline" disabled={uploading} onClick={() => setImageChooserOpen(true)}>
              Replace image
            </Button>
          </div>
          {!desktopControls ? <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-11 sm:size-8"
                disabled={uploading}
              >
                <SlidersHorizontal />
                <span className="sr-only">Open controls</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="overflow-hidden rounded-none p-0 data-[side=bottom]:h-[82svh] data-[side=bottom]:max-h-[82svh]"
            >
              <SheetHeader className="border-b text-left">
                <SheetTitle>Controls</SheetTitle>
                <SheetDescription>
                  Shape the procedure and add regional interventions.
                </SheetDescription>
              </SheetHeader>
              <div className="border-b px-4 py-3 sm:hidden">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => {
                    setControlsOpen(false);
                    setImageChooserOpen(true);
                  }}
                >
                  Replace image
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <Inspector
                  mode={mode}
                  onModeChange={setMode}
                  convertProps={convertProps}
                  selectionProps={selectionProps}
                  regionsEnabled={partition === "square"}
                />
              </div>
            </SheetContent>
          </Sheet> : null}
          {!desktopControls ? <Sheet open={outputOpen} onOpenChange={setOutputOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="size-11 sm:size-8" disabled={uploading}>
                <PanelRight />
                <span className="sr-only">Open output controls</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="min-h-0 gap-0 overflow-hidden p-0 data-[side=right]:w-[92vw] data-[side=right]:max-w-[22rem]"
            >
              <SheetHeader className="shrink-0 border-b text-left">
                <SheetTitle>Output</SheetTitle>
                <SheetDescription>Set the partition, output resolution, and palette.</SheetDescription>
              </SheetHeader>
              <OutputSidebar {...outputProps} />
            </SheetContent>
          </Sheet> : null}
          <Button
            aria-label="Export PNG"
            className="size-11 px-0 sm:h-10 sm:w-auto sm:px-4"
            disabled={!finalColorIds || processing || uploading}
            onClick={() => setExportOpen(true)}
          >
            <Download data-icon="inline-start" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </header>

      <div
        className="relative flex min-h-0 min-w-0 flex-1"
        inert={uploading || cropping}
        aria-busy={uploading || cropping}
      >
        {desktopControls ? <aside className="flex min-h-0 min-w-0 w-80 shrink-0 flex-col border-r bg-background">
          <Inspector
            mode={mode}
            onModeChange={setMode}
            convertProps={convertProps}
            selectionProps={selectionProps}
            regionsEnabled={partition === "square"}
          />
        </aside> : null}
        <PixelCanvas
          width={gridWidth}
          height={gridHeight}
          colorIds={finalColorIds}
          partition={partition}
          partitionScale={partitionScale}
          palette={adjustedPalette}
          visibleColorIds={isolatedColorIds.size > 0 ? isolatedColorIds : null}
          originalPreview={originalPreview}
          adjustedPreview={adjustedPreview}
          mode={mode}
          tool={tool}
          brushSize={brushSize}
          selectionMask={selectionMask}
          selectionTool={selectionTool}
          selectionBrushSize={selectionBrushSize}
          selectionCombineMode={selectionCombineMode}
          processing={processing}
          crop={cropDraft}
          cropping={cropping}
          showGuides={showGuides}
          guideColumns={guideColumns}
          guideRows={guideRows}
          onShowGuidesChange={setShowGuides}
          onGuideColumnsChange={(value) => setGuideColumns(normalizeGuideDivisions(value))}
          onGuideRowsChange={(value) => setGuideRows(normalizeGuideDivisions(value))}
          onBeginStroke={beginStroke}
          onPaint={paintIndices}
          onEndStroke={endStroke}
          onFill={fillAt}
          onPick={pickAt}
          onSelectionChange={updateSelectionMask}
          onCropChange={setCropDraft}
          onCropApply={requestCrop}
        />
        {desktopControls ? (
          <aside className="flex min-h-0 min-w-0 w-80 shrink-0 flex-col border-l bg-background">
            <div className="shrink-0 border-b px-4 py-3">
              <p className="text-xs font-medium">Output</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Partition and palette</p>
            </div>
            <OutputSidebar {...outputProps} />
          </aside>
        ) : null}
        {uploading || cropping ? (
          <div className="absolute inset-0 z-40 grid place-items-center bg-background/45 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 border bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] shadow-sm">
              <span className="size-2 animate-pulse bg-[#ef6a47] motion-reduce:animate-none" />
              {uploading ? "Replacing image" : "Cropping image"}
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={imageChooserOpen} onOpenChange={setImageChooserOpen}>
        <DialogContent className="max-h-[min(90svh,58rem)] overflow-y-auto rounded-none p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-5 py-4 pr-14">
            <DialogTitle>Replace image</DialogTitle>
            <DialogDescription>
              Choose a file or start from an openly licensed sample. Replacing the image resets the current procedure.
            </DialogDescription>
          </DialogHeader>
          <div className="p-5">
            <ImageChooser
              headingId="replace-image-heading"
              disabled={uploading}
              error={uploadError}
              onFile={(file) => {
                setImageChooserOpen(false);
                void handleImageFile(file);
              }}
              onSample={(sample) => {
                setImageChooserOpen(false);
                void sampleImageFile(sample)
                  .then(handleImageFile)
                  .catch((error: unknown) => {
                    setUploadError(error instanceof Error ? error.message : "Pigment could not open that sample.");
                  });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      <PaletteDialog
        open={paletteOpen}
        onOpenChange={setPaletteDialogOpen}
        activePalette={activePalette}
        customPalettes={customPalettes}
        onSelect={selectPalette}
        onChange={changePalette}
        onCreate={createNewPalette}
        onDuplicate={duplicateActivePalette}
        onSaveToLibrary={savePaletteToLibrary}
        onDelete={() => {
          setPaletteDialogOpen(false);
          setPendingPaletteDelete(activePalette);
        }}
        onImport={importPalette}
      />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        width={gridWidth}
        height={gridHeight}
        scale={exportScale}
        onScaleChange={setExportScale}
        onExport={handleExport}
        exporting={exporting}
      />
      <AlertDialog
        open={pendingPaletteDelete !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setPendingPaletteDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this palette?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingPaletteDelete?.name}” will be removed from this browser. If it is
              active, Arcade will replace it and painted colors will be remapped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep palette</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingPaletteDelete) deleteCustomPalette(pendingPaletteDelete);
              }}
            >
              Delete palette
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={pendingCrop !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setPendingCrop(null);
        }}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Crop the source image?</AlertDialogTitle>
            <AlertDialogDescription>
              Cropping changes cell positions, so manual paint edits, selections, and
              regional quantization methods will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current crop</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const crop = pendingCrop;
                setPendingCrop(null);
                if (crop) void applyCrop(crop);
              }}
            >
              Crop and clear edits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={pendingGrid !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setPendingGrid(null);
            setDimensionInputVersion((value) => value + 1);
          }
        }}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Resize the pixel grid?</AlertDialogTitle>
            <AlertDialogDescription>
              Resizing changes cell positions, so manual paint edits, selections, and
              regional quantization methods will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDimensionInputVersion((value) => value + 1)}
            >
              Keep current size
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingGrid) applyGrid(pendingGrid);
                setPendingGrid(null);
              }}
            >
              Resize and clear edits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
