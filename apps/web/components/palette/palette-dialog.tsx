"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  FileUp,
  ImageIcon,
  LoaderCircle,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@pigment/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@pigment/ui/dialog";
import { Input } from "@pigment/ui/input";
import { Label } from "@pigment/ui/label";
import { Slider } from "@pigment/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pigment/ui/tabs";
import {
  DEFAULT_PALETTES,
  appendSwatch,
  moveSwatch,
  paletteIdentity,
  parsePaletteTownList,
  removeSwatch,
  replaceSwatch,
  serializePaletteTownQuery,
  type Palette,
  type PaletteTownPagination,
} from "@pigment/palette";
import { cn } from "@/lib/utils";

type PaletteDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activePalette: Palette;
  customPalettes: readonly Palette[];
  onSelect: (palette: Palette) => void;
  onChange: (palette: Palette) => void;
  onCreate: () => void;
  onDuplicate: () => void;
  onSaveToLibrary: (palette: Palette) => void;
  onDelete: () => void;
  onImport: (file: File, colorCount: number) => Promise<void>;
}>;

const EMPTY_PAGINATION: PaletteTownPagination = {
  page: 1,
  pageSize: 12,
  totalItems: 0,
  totalPages: 0,
};

async function readJsonResponse(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

type PaletteCardProps = Readonly<{
  palette: Palette;
  active: boolean;
  onSelect: () => void;
  onSave?: () => void;
  saved?: boolean;
}>;

function PaletteCard({
  palette,
  active,
  onSelect,
  onSave,
  saved = false,
}: PaletteCardProps) {
  return (
    <div
      className={cn(
        "group min-w-0 border transition-colors hover:bg-muted/60",
        active && "border-foreground",
      )}
    >
      <button
        type="button"
        className="block w-full p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={`Use ${palette.name} and close palette workshop`}
        aria-pressed={active}
        onClick={onSelect}
      >
        <span className="mb-3 flex items-center justify-between text-sm font-medium">
          <span className="truncate">{palette.name}</span>
          {active ? (
            <Check aria-label="Current palette" className="size-4 shrink-0" />
          ) : null}
        </span>
        <span className="flex h-8 overflow-hidden border border-white/10">
          {palette.colors.map((swatch) => (
            <span
              key={swatch.id}
              className="h-full min-w-2 flex-1"
              style={{ backgroundColor: swatch.hex }}
            />
          ))}
        </span>
        <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {palette.colors.length} colors
          {palette.tags?.length
            ? ` · ${palette.tags.slice(0, 2).join(" · ")}`
            : ""}
        </span>
        <span className="mt-3 flex items-center justify-between text-xs font-medium">
          Use palette <ArrowRight aria-hidden="true" className="size-4" />
        </span>
      </button>
      {palette.author || palette.attribution?.license ? (
        <div className="flex min-w-0 gap-1 px-3 pb-3 text-[11px] text-muted-foreground">
          {palette.author?.url ? (
            <a
              href={palette.author.url}
              target="_blank"
              rel="noreferrer"
              className="truncate underline-offset-2 hover:underline"
            >
              By {palette.author.name}
            </a>
          ) : palette.author ? (
            <span className="truncate">By {palette.author.name}</span>
          ) : null}
          {palette.attribution?.license ? <span>·</span> : null}
          {palette.attribution?.url ? (
            <a
              href={palette.attribution.url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 underline-offset-2 hover:underline"
            >
              {palette.attribution.license}
            </a>
          ) : palette.attribution?.license ? (
            <span>{palette.attribution.license}</span>
          ) : null}
        </div>
      ) : null}
      {onSave ? (
        <div className="border-t border-border">
          <Button
            variant={saved ? "secondary" : "outline"}
            size="sm"
            className="w-full border-0"
            aria-label={
              saved
                ? `${palette.name} is saved in library`
                : `Save ${palette.name} to library`
            }
            disabled={saved}
            onClick={onSave}
          >
            {saved ? "Saved to library" : "Save to library"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function PaletteDialog({
  open,
  onOpenChange,
  activePalette,
  customPalettes,
  onSelect,
  onChange,
  onCreate,
  onDuplicate,
  onSaveToLibrary,
  onDelete,
  onImport,
}: PaletteDialogProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const colorErrorId = useId();
  const [editColor, setEditColor] = useState("#ef6a47");
  const [selectedSwatch, setSelectedSwatch] = useState<number | null>(null);
  const [colorCount, setColorCount] = useState(16);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remotePalettes, setRemotePalettes] = useState<readonly Palette[]>([]);
  const [remotePagination, setRemotePagination] =
    useState<PaletteTownPagination>(EMPTY_PAGINATION);
  const [remoteMinColors, setRemoteMinColors] = useState("");
  const [remoteMaxColors, setRemoteMaxColors] = useState("");
  const [remoteColor, setRemoteColor] = useState("");
  const [remoteColorTolerance, setRemoteColorTolerance] = useState("3");
  const [remoteHue, setRemoteHue] = useState("");
  const [remoteHueTolerance, setRemoteHueTolerance] = useState("15");
  const [remotePage, setRemotePage] = useState(1);
  const [remoteFiltersOpen, setRemoteFiltersOpen] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteRequest, setRemoteRequest] = useState(0);
  const [activeTab, setActiveTab] = useState("library");

  useEffect(() => {
    if (!open || activeTab !== "browse") return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setRemoteLoading(true);
      setRemoteError(null);
      const params = serializePaletteTownQuery({
        ...(remoteMinColors ? { minColors: Number(remoteMinColors) } : {}),
        ...(remoteMaxColors ? { maxColors: Number(remoteMaxColors) } : {}),
        ...(remoteColor ? { color: remoteColor } : {}),
        ...(remoteColor
          ? { colorTolerance: Number(remoteColorTolerance) }
          : {}),
        ...(remoteHue ? { hue: Number(remoteHue) } : {}),
        ...(remoteHue ? { hueTolerance: Number(remoteHueTolerance) } : {}),
        sort: "name",
        page: remotePage,
        pageSize: 12,
      });
      void fetch(`/api/palettes?${params}`, { signal: controller.signal })
        .then(async (response) => {
          const body = await readJsonResponse(response);
          if (!response.ok) {
            throw new Error(
              typeof body === "object" &&
                body !== null &&
                "error" in body &&
                typeof body.error === "string"
                ? body.error
                : "The palette archive is unavailable. Try again.",
            );
          }
          if (body === null) {
            throw new Error(
              "The palette archive returned an invalid response. Try again.",
            );
          }
          const parsed = parsePaletteTownList(body);
          if (!parsed.ok) throw new Error(parsed.error);
          setRemotePalettes(parsed.value.palettes);
          setRemotePagination(parsed.value.pagination);
        })
        .catch((fetchError: unknown) => {
          if (controller.signal.aborted) return;
          setRemoteError(
            fetchError instanceof Error
              ? fetchError.message
              : "The palette archive is unavailable.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setRemoteLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    activeTab,
    open,
    remoteColor,
    remoteColorTolerance,
    remoteHue,
    remoteHueTolerance,
    remoteMaxColors,
    remoteMinColors,
    remotePage,
    remoteRequest,
  ]);

  const advancedFilterCount =
    Number(Boolean(remoteMinColors || remoteMaxColors)) +
    Number(Boolean(remoteColor)) +
    Number(Boolean(remoteHue));

  const clearRemoteFilters = () => {
    setRemoteMinColors("");
    setRemoteMaxColors("");
    setRemoteColor("");
    setRemoteColorTolerance("3");
    setRemoteHue("");
    setRemoteHueTolerance("15");
    setRemotePage(1);
  };

  const updateSelected = () => {
    const result =
      selectedSwatch === null
        ? appendSwatch(activePalette, editColor)
        : replaceSwatch(activePalette, selectedSwatch, editColor);
    if (result.ok) {
      setError(null);
      onChange(result.value);
    } else setError(result.error);
  };

  const palettes = [...DEFAULT_PALETTES, ...customPalettes];
  const colorPickerValue = /^#[\da-f]{6}$/i.test(editColor.slice(0, 7))
    ? editColor.slice(0, 7)
    : "#ef6a47";

  const choosePalette = (palette: Palette) => {
    setSelectedSwatch(null);
    setEditColor("#ef6a47");
    setError(null);
    onSelect(palette);
    onOpenChange(false);
  };

  const importFile = async (file: File) => {
    if (importing) return;
    setImporting(true);
    setError(null);
    try {
      await onImport(file, colorCount);
      setSelectedSwatch(null);
      setEditColor("#ef6a47");
      onOpenChange(false);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Palette import failed.",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-6xl">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14">
          <DialogTitle>Palette workshop</DialogTitle>
          <DialogDescription>
            Choose, import, or tune the colors used by every pixel.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            setActiveTab(tab);
            setError(null);
          }}
          className="min-h-0 flex-1 gap-0 overflow-hidden"
        >
          <TabsList
            variant="line"
            aria-label="Palette workshop"
            className="mx-3 mt-2 grid w-auto shrink-0 grid-cols-4 sm:mx-5 [&>button]:h-11 [&>button]:min-w-0 [&>button]:px-1 [&>button]:text-[11px] sm:[&>button]:px-4 sm:[&>button]:text-xs"
          >
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="edit" aria-label="Edit current palette">
              Edit
            </TabsTrigger>
            <TabsTrigger value="import" aria-label="Import palette file">
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="library"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="space-y-6 p-5">
              <section>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-medium">Choose a palette</h3>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Built-in and local
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {palettes.map((palette) => (
                    <PaletteCard
                      key={paletteIdentity(palette)}
                      palette={palette}
                      active={
                        paletteIdentity(activePalette) ===
                        paletteIdentity(palette)
                      }
                      onSelect={() => choosePalette(palette)}
                    />
                  ))}
                  <button
                    type="button"
                    className="grid min-h-28 place-items-center border border-dashed text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    onClick={() => {
                      setSelectedSwatch(null);
                      setEditColor("#ef6a47");
                      setError(null);
                      onCreate();
                      setActiveTab("edit");
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="size-4" /> New palette
                    </span>
                  </button>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent
            value="browse"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium">Discover palettes</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Filter by color count, a matching color, or hue.
                  </p>
                </div>
                <Button
                  variant="outline"
                  aria-expanded={remoteFiltersOpen}
                  onClick={() => setRemoteFiltersOpen((current) => !current)}
                >
                  <SlidersHorizontal data-icon="inline-start" />
                  Filters
                  {advancedFilterCount ? ` (${advancedFilterCount})` : ""}
                </Button>
              </div>

              {remoteFiltersOpen ? (
                <div className="mt-3 space-y-3 border bg-muted/20 p-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <fieldset>
                      <legend className="mb-2 text-xs font-medium">
                        Color count
                      </legend>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={64}
                          value={remoteMinColors}
                          placeholder="Min"
                          aria-label="Minimum colors"
                          onChange={(event) => {
                            const nextMin = event.target.value;
                            setRemoteMinColors(nextMin);
                            if (
                              nextMin &&
                              (!remoteMaxColors ||
                                Number(remoteMaxColors) < Number(nextMin))
                            ) {
                              setRemoteMaxColors(nextMin);
                            }
                            setRemotePage(1);
                          }}
                        />
                        <Input
                          type="number"
                          min={2}
                          max={64}
                          value={remoteMaxColors}
                          placeholder="Max"
                          aria-label="Maximum colors"
                          onChange={(event) => {
                            const nextMax = event.target.value;
                            setRemoteMaxColors(nextMax);
                            if (
                              nextMax &&
                              (!remoteMinColors ||
                                Number(remoteMinColors) > Number(nextMax))
                            ) {
                              setRemoteMinColors(nextMax);
                            }
                            setRemotePage(1);
                          }}
                        />
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="mb-2 text-xs font-medium">
                        Matching color
                      </legend>
                      <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                        <Input
                          value={remoteColor}
                          placeholder="#ff6b4a"
                          aria-label="Matching color"
                          onChange={(event) => {
                            setRemoteColor(event.target.value);
                            setRemotePage(1);
                          }}
                        />
                        <Input
                          type="number"
                          min={0}
                          max={25}
                          step={0.5}
                          disabled={!remoteColor}
                          value={remoteColorTolerance}
                          aria-label="Color tolerance"
                          title="Color tolerance"
                          onChange={(event) => {
                            setRemoteColorTolerance(event.target.value);
                            setRemotePage(1);
                          }}
                        />
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="mb-2 text-xs font-medium">
                        Hue in degrees
                      </legend>
                      <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={359.9}
                          step={1}
                          value={remoteHue}
                          placeholder="0–359"
                          aria-label="Hue"
                          onChange={(event) => {
                            setRemoteHue(event.target.value);
                            setRemotePage(1);
                          }}
                        />
                        <Input
                          type="number"
                          min={0}
                          max={180}
                          step={1}
                          disabled={!remoteHue}
                          value={remoteHueTolerance}
                          aria-label="Hue tolerance"
                          title="Hue tolerance"
                          onChange={(event) => {
                            setRemoteHueTolerance(event.target.value);
                            setRemotePage(1);
                          }}
                        />
                      </div>
                    </fieldset>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <p className="text-[10px] text-muted-foreground">
                      Tolerances use perceptual color distance and circular hue
                      distance.
                    </p>
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={advancedFilterCount === 0}
                      onClick={clearRemoteFilters}
                    >
                      <X data-icon="inline-start" /> Clear filters
                    </Button>
                  </div>
                </div>
              ) : null}

              {remoteError ? (
                <div
                  className="mt-3 border border-destructive/40 p-4 text-sm"
                  role="alert"
                >
                  <p>{remoteError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setRemoteRequest((request) => request + 1)}
                  >
                    Retry
                  </Button>
                </div>
              ) : remoteLoading && remotePalettes.length === 0 ? (
                <div className="grid min-h-40 place-items-center text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                    Loading palette archive
                  </span>
                </div>
              ) : remotePalettes.length === 0 ? (
                <div className="grid min-h-40 place-items-center text-sm text-muted-foreground">
                  No palettes match these filters.
                </div>
              ) : (
                <div
                  className={cn(
                    "mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
                    remoteLoading && "opacity-60",
                  )}
                >
                  {remotePalettes.map((palette) => {
                    const saved = customPalettes.some(
                      (savedPalette) =>
                        savedPalette.colors
                          .map((color) => color.hex)
                          .join(",") ===
                        palette.colors.map((color) => color.hex).join(","),
                    );
                    return (
                      <PaletteCard
                        key={paletteIdentity(palette)}
                        palette={palette}
                        active={
                          paletteIdentity(activePalette) ===
                          paletteIdentity(palette)
                        }
                        onSelect={() => choosePalette(palette)}
                        onSave={() => onSaveToLibrary(palette)}
                        saved={saved}
                      />
                    );
                  })}
                </div>
              )}

              {remotePagination.totalPages > 1 ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={remoteLoading || remotePage <= 1}
                    onClick={() =>
                      setRemotePage((page) => Math.max(1, page - 1))
                    }
                  >
                    <ArrowLeft data-icon="inline-start" /> Previous
                  </Button>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Page {remotePagination.page} of{" "}
                    {remotePagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      remoteLoading || remotePage >= remotePagination.totalPages
                    }
                    onClick={() => setRemotePage((page) => page + 1)}
                  >
                    Next <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent
            value="edit"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="space-y-6 p-5">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onDuplicate}>
                  <Copy data-icon="inline-start" /> Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={activePalette.source !== "local"}
                  onClick={onDelete}
                >
                  <Trash2 data-icon="inline-start" /> Delete
                </Button>
              </div>
              <label className="block">
                <Label asChild className="mb-2">
                  <span>Name</span>
                </Label>
                <Input
                  value={activePalette.name}
                  onChange={(event) =>
                    onChange({
                      ...activePalette,
                      name: event.target.value,
                      source: "local",
                    })
                  }
                />
              </label>

              <div>
                <Label className="mb-2">Swatches</Label>
                <div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
                  {activePalette.colors.map((swatch) => (
                    <button
                      type="button"
                      key={swatch.id}
                      className={cn(
                        "aspect-square border border-white/15 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring",
                        selectedSwatch === swatch.id &&
                          "outline-2 outline-foreground",
                      )}
                      style={{ backgroundColor: swatch.hex }}
                      aria-label={`Edit ${swatch.hex}`}
                      aria-pressed={selectedSwatch === swatch.id}
                      onClick={() => {
                        setSelectedSwatch(swatch.id);
                        setEditColor(swatch.hex.slice(0, 7));
                        setError(null);
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    className="grid aspect-square place-items-center border border-dashed text-muted-foreground"
                    aria-label="Add a color"
                    onClick={() => {
                      setSelectedSwatch(null);
                      setError(null);
                    }}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              <div className="border bg-muted/30 p-3">
                <form
                  className="flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateSelected();
                  }}
                >
                  <label className="block">
                    <Label asChild className="mb-2">
                      <span>Color</span>
                    </Label>
                    <input
                      type="color"
                      value={colorPickerValue}
                      className="block size-8 cursor-pointer border bg-transparent p-0"
                      onChange={(event) => {
                        setEditColor(event.target.value);
                        setError(null);
                      }}
                    />
                  </label>
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Hex or CSS color</span>
                    <Input
                      value={editColor}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? colorErrorId : undefined}
                      onChange={(event) => {
                        setEditColor(event.target.value);
                        setError(null);
                      }}
                    />
                  </label>
                  <Button type="submit">
                    {selectedSwatch === null ? "Add" : "Update"}
                  </Button>
                </form>
                {selectedSwatch !== null ? (
                  <div className="mt-3 flex gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        onChange(moveSwatch(activePalette, selectedSwatch, -1))
                      }
                    >
                      <ArrowLeft />
                      <span className="sr-only">Move color left</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        onChange(moveSwatch(activePalette, selectedSwatch, 1))
                      }
                    >
                      <ArrowRight />
                      <span className="sr-only">Move color right</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => {
                        const result = removeSwatch(
                          activePalette,
                          selectedSwatch,
                        );
                        if (result.ok) {
                          onChange(result.value);
                          setSelectedSwatch(null);
                          setError(null);
                        } else setError(result.error);
                      }}
                    >
                      <Trash2 />
                      <span className="sr-only">Remove color</span>
                    </Button>
                  </div>
                ) : null}
                {error ? (
                  <p
                    id={colorErrorId}
                    role="alert"
                    className="mt-3 text-xs text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="import"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="space-y-6 p-5">
              <div
                className={cn(
                  "border border-dashed p-6 text-center transition-colors",
                  dragActive && "border-[#ef6a47] bg-[#ef6a47]/8",
                )}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (event.dataTransfer.types.includes("Files"))
                    setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  if (event.dataTransfer.types.includes("Files"))
                    setDragActive(true);
                }}
                onDragLeave={(event) => {
                  const nextTarget = event.relatedTarget;
                  if (
                    !(nextTarget instanceof Node) ||
                    !event.currentTarget.contains(nextTarget)
                  ) {
                    setDragActive(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  const file = event.dataTransfer.files[0];
                  if (file) void importFile(file);
                }}
              >
                <ImageIcon className="mx-auto mb-3 size-6 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {dragActive
                    ? "Drop to import palette"
                    : "Drop an image, JSON, or text palette"}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  JSON should be an array. Text files use one CSS color per
                  line. Images import exact swatches or extract a palette
                  automatically.
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  disabled={importing}
                  onClick={() => importInputRef.current?.click()}
                >
                  <FileUp data-icon="inline-start" />
                  {importing ? "Reading…" : "Choose palette file"}
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  className="sr-only"
                  accept="image/png,image/jpeg,image/webp,.json,.txt,.hex,.palette"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    event.target.value = "";
                    void importFile(file);
                  }}
                />
              </div>
              <label className="block">
                <span className="mb-2 flex justify-between text-xs">
                  <span>Colors extracted from photos</span>
                  <span className="font-mono text-muted-foreground">
                    {colorCount}
                  </span>
                </span>
                <Slider
                  aria-label="Colors extracted from photos"
                  min={4}
                  max={32}
                  step={1}
                  value={[colorCount]}
                  onValueChange={([value]: number[]) => setColorCount(value)}
                />
              </label>
              {error ? (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
