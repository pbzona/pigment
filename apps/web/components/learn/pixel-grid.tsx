"use client";

import { cn } from "@/lib/utils";

export type LearningPixel = Readonly<{
  color: string;
  label: string;
  marker?: string;
  state?: "default" | "muted" | "current" | "target" | "complete";
}>;

type PixelGridProps = Readonly<{
  width: number;
  height: number;
  pixels: readonly LearningPixel[];
  label: string;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  compact?: boolean;
  className?: string;
}>;

const checkerboard = {
  backgroundColor: "#27231f",
  backgroundImage:
    "linear-gradient(45deg, #39332d 25%, transparent 25%), linear-gradient(-45deg, #39332d 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #39332d 75%), linear-gradient(-45deg, transparent 75%, #39332d 75%)",
  backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
  backgroundSize: "10px 10px",
};

export function pixelGridKeyboardTarget(
  index: number,
  key: string,
  width: number,
  count: number,
  controlKey = false,
): number | null {
  if (width < 1 || count < 1) return null;
  const rowStart = Math.floor(index / width) * width;
  const rowEnd = Math.min(rowStart + width - 1, count - 1);
  switch (key) {
    case "ArrowLeft":
      return Math.max(rowStart, index - 1);
    case "ArrowRight":
      return Math.min(rowEnd, index + 1);
    case "ArrowUp":
      return Math.max(index % width, index - width);
    case "ArrowDown":
      return index + width < count ? index + width : index;
    case "Home":
      return controlKey ? 0 : rowStart;
    case "End":
      return controlKey ? count - 1 : rowEnd;
    default:
      return null;
  }
}

export function PixelGrid({
  width,
  height,
  pixels,
  label,
  selectedIndex,
  onSelect,
  compact = false,
  className,
}: PixelGridProps) {
  const activeIndex =
    selectedIndex !== undefined &&
    selectedIndex >= 0 &&
    selectedIndex < pixels.length
      ? selectedIndex
      : 0;

  return (
    <div
      role="grid"
      aria-label={label}
      aria-readonly={!onSelect}
      aria-rowcount={height}
      aria-colcount={width}
      className={cn(
        "grid w-fit max-w-full gap-px overflow-hidden border border-foreground/15 bg-foreground/15 p-px shadow-[4px_4px_0_0_color-mix(in_oklab,var(--foreground)_10%,transparent)]",
        className,
      )}
    >
      {Array.from({ length: height }, (_, rowIndex) => (
        <div
          key={rowIndex}
          role="row"
          className="grid gap-px"
          style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
        >
          {pixels
            .slice(rowIndex * width, (rowIndex + 1) * width)
            .map((pixel, columnIndex) => {
              const index = rowIndex * width + columnIndex;
              const selected = selectedIndex === index;
              const cellClassName = cn(
                "relative grid aspect-square place-items-center overflow-hidden outline-none",
                compact ? "size-6" : "size-7 sm:size-9",
                onSelect &&
                  "transition-[filter,box-shadow] hover:brightness-110 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                selected && "z-10 ring-2 ring-primary ring-inset",
                pixel.state === "muted" && "opacity-35 saturate-50",
                pixel.state === "current" &&
                  "z-10 ring-2 ring-foreground ring-inset",
                pixel.state === "target" &&
                  "after:absolute after:inset-1 after:border after:border-dashed after:border-foreground/80",
                pixel.state === "complete" &&
                  "after:absolute after:inset-0 after:bg-background/10",
              );
              const style =
                pixel.color === "transparent"
                  ? checkerboard
                  : { backgroundColor: pixel.color };
              const marker = pixel.marker ? (
                <span className="relative z-10 font-mono text-[11px] font-semibold leading-none text-white mix-blend-difference">
                  {pixel.marker}
                </span>
              ) : null;

              return onSelect ? (
                <button
                  key={index}
                  type="button"
                  role="gridcell"
                  aria-rowindex={rowIndex + 1}
                  aria-colindex={columnIndex + 1}
                  aria-selected={selected}
                  aria-label={pixel.label}
                  data-cell-index={index}
                  tabIndex={activeIndex === index ? 0 : -1}
                  className={cellClassName}
                  style={style}
                  onClick={() => onSelect(index)}
                  onKeyDown={(event) => {
                    const next = pixelGridKeyboardTarget(
                      index,
                      event.key,
                      width,
                      pixels.length,
                      event.ctrlKey,
                    );
                    if (next === null || event.altKey || event.metaKey) return;
                    event.preventDefault();
                    event.currentTarget
                      .closest('[role="grid"]')
                      ?.querySelector<HTMLButtonElement>(
                        `[data-cell-index="${next}"]`,
                      )
                      ?.focus();
                    onSelect(next);
                  }}
                >
                  {marker}
                </button>
              ) : (
                <span
                  key={index}
                  role="gridcell"
                  aria-rowindex={rowIndex + 1}
                  aria-colindex={columnIndex + 1}
                  aria-label={pixel.label}
                  className={cellClassName}
                  style={style}
                >
                  {marker}
                </span>
              );
            })}
        </div>
      ))}
    </div>
  );
}
