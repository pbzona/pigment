import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pigment/ui/scroll-area", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  return {
    ScrollArea: ({ children, ...props }: React.ComponentProps<"div">) =>
      createElement("div", props, children),
  };
});
vi.mock("@pigment/ui/select", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  const component =
    (tag: "div" | "button" | "span") =>
    ({
      children,
      ...props
    }: React.ComponentProps<"div"> & { onValueChange?: unknown }) => {
      const { onValueChange, ...hostProps } = props;
      void onValueChange;
      return createElement(tag, hostProps, children);
    };
  return {
    Select: component("div"),
    SelectContent: component("div"),
    SelectItem: component("div"),
    SelectTrigger: component("button"),
    SelectValue: component("span"),
  };
});
vi.mock("@pigment/ui/slider", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  return {
    Slider: (props: { onValueChange?: unknown }) => {
      const { onValueChange, ...hostProps } = props;
      void onValueChange;
      return createElement("input", hostProps);
    },
  };
});
vi.mock("@/components/palette/palette-adjustments", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  return {
    PaletteAdjustments: () => createElement("button", null, "Adjust palette"),
  };
});

import { OutputSidebar } from "@/components/studio/output-sidebar";
import { DEFAULT_PALETTE_ADJUSTMENTS } from "@pigment/color";
import { createPalette } from "@pigment/palette";

describe("active palette controls", () => {
  it("keeps swatch editing and midpoint insertion available in the output sidebar", () => {
    const palette = createPalette("test", "Test", ["#000000", "#ffffff"]);
    expect(palette.ok).toBe(true);
    if (!palette.ok) return;

    const markup = renderToStaticMarkup(
      createElement(OutputSidebar, {
        gridWidth: 16,
        gridHeight: 16,
        partition: "square",
        partitionScale: 6,
        aspectLocked: true,
        inputVersion: 0,
        palette: palette.value,
        paletteAdjustments: DEFAULT_PALETTE_ADJUSTMENTS,
        excludedColorIds: new Set<number>(),
        isolatedColorIds: new Set<number>(),
        selectedSwatchId: null,
        processing: false,
        onGridChange: vi.fn(),
        onPartitionChange: vi.fn(),
        onPartitionScaleChange: vi.fn(),
        onGridScale: vi.fn(),
        onAspectLockedChange: vi.fn(),
        onPaletteChange: vi.fn(),
        onOpenPalette: vi.fn(),
        onToggleExcludedColor: vi.fn(),
        onToggleIsolatedColor: vi.fn(),
        onClearIsolation: vi.fn(),
        onSelectedSwatchChange: vi.fn(),
        onPaletteAdjustmentsChange: vi.fn(),
        onRerun: vi.fn(),
      }),
    );

    expect(markup).toContain("Edit color 1 of 2, #000000");
    expect(markup).toContain("Insert a midpoint after color 1");
    expect(markup).toContain(
      "Select a swatch to edit it or insert a midpoint.",
    );
  });
});
