import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CanvasFrame,
  PixelPaletteColor,
  PixelPreview,
} from "@pigment/quantization";

const { actions, dismissal, scaleSlider } = vi.hoisted(() => ({
  actions: new Map<string, () => void>(),
  dismissal: {
    onOpenChange: undefined as ((open: boolean) => void) | undefined,
  },
  scaleSlider: {
    ref: undefined as
      | ((element: HTMLSpanElement | null) => unknown)
      | undefined,
  },
}));

// Render portal contents in Node; Radix owns the actual focus/escape behavior.
vi.mock("@pigment/ui/dialog", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  const content = ({ children, ...props }: ComponentProps<"div">) =>
    createElement("div", props, children);
  return {
    Dialog: ({
      open,
      onOpenChange,
      children,
    }: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      children: React.ReactNode;
    }) => {
      dismissal.onOpenChange = onOpenChange;
      return open ? children : null;
    },
    DialogContent: content,
    DialogHeader: content,
    DialogFooter: content,
    DialogTitle: content,
    DialogDescription: content,
  };
});

vi.mock("@pigment/ui/button", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  const actual =
    await vi.importActual<typeof import("@pigment/ui/button")>(
      "@pigment/ui/button",
    );
  return {
    ...actual,
    Button: (props: ComponentProps<typeof actual.Button>) => {
      if (typeof props.children === "string" && props.onClick) {
        actions.set(props.children, () =>
          props.onClick?.({} as React.MouseEvent<HTMLButtonElement>),
        );
      }
      return createElement(actual.Button, props);
    },
  };
});

vi.mock("@pigment/ui/toggle-group", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  return {
    ToggleGroup: ({ children, "aria-label": label }: ComponentProps<"div">) =>
      createElement("div", { "aria-label": label }, children),
    ToggleGroupItem: ({
      children,
      value,
      ...props
    }: ComponentProps<"button"> & { value: string }) =>
      createElement("button", { ...props, value }, children),
  };
});
vi.mock("@pigment/ui/label", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  return {
    Label: (props: ComponentProps<"label">) => createElement("label", props),
  };
});
vi.mock("@pigment/ui/slider", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  return {
    Slider: ({ "aria-label": label, ref }: ComponentProps<"span">) => {
      scaleSlider.ref = typeof ref === "function" ? ref : undefined;
      return createElement("input", { type: "range", "aria-label": label });
    },
  };
});

import {
  CanvasFrameDialog,
  type CanvasFrameDialogProps,
} from "@/components/studio/canvas-frame-dialog";

const palette: readonly PixelPaletteColor[] = [
  { id: 7, color: { r: 240, g: 106, b: 50, alpha: 1 } },
  { id: 42, color: { r: 77, g: 124, b: 255, alpha: 1 } },
];
const source: PixelPreview = {
  width: 4,
  height: 3,
  pixels: new Uint8ClampedArray(4 * 3 * 4),
};
const defaultFrame: CanvasFrame = {
  columns: 4,
  rows: 4,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  backgroundColorId: 7,
};

function renderDialog(overrides: Partial<CanvasFrameDialogProps> = {}) {
  const props: CanvasFrameDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    source,
    sourceWidth: 800,
    sourceHeight: 600,
    frame: null,
    palette,
    onApply: vi.fn(),
    ...overrides,
  };
  return {
    props,
    markup: renderToStaticMarkup(createElement(CanvasFrameDialog, props)),
  };
}

beforeEach(() => {
  actions.clear();
  dismissal.onOpenChange = undefined;
  scaleSlider.ref = undefined;
});

describe("canvas framing dialog", () => {
  it("labels the focusable slider thumb rather than just its wrapper", () => {
    renderDialog();
    const setAttribute = vi.fn();
    const querySelector = vi.fn(() => ({ setAttribute }));
    expect(scaleSlider.ref).toBeTypeOf("function");

    scaleSlider.ref?.({ querySelector } as unknown as HTMLSpanElement);
    expect(querySelector).toHaveBeenCalledExactlyOnceWith('[role="slider"]');
    expect(setAttribute).toHaveBeenCalledExactlyOnceWith(
      "aria-label",
      "Image scale (%)",
    );
    expect(() => scaleSlider.ref?.(null)).not.toThrow();
  });
  it("starts with a square canvas, the whole image centered, and the first palette color", () => {
    const { markup, props } = renderDialog();

    expect(markup).toContain('style="left:0%;top:12.5%;width:100%;height:75%"');
    // Transparency checkerboard belongs to the image rectangle, not its padding.
    expect(markup).toMatch(/<canvas[^>]*bg-\[#17191c\][^>]*>/);
    expect(markup).toContain("background-color:#f06a32");
    expect(markup).toContain(
      'aria-label="Background color 1, #f06a32" aria-pressed="true"',
    );
    expect(markup).toContain('aria-label="Move image in canvas"');
    expect(markup).toContain('aria-label="Image scale"');
    expect(markup.match(/min="2" max="32"/g)).toHaveLength(2);
    for (const preset of [
      "Square 4:4",
      "Portrait 4:5",
      "Landscape 5:4",
      "Tall portrait 2:3",
      "Wide landscape 3:2",
    ]) {
      expect(markup).toContain(`aria-label="${preset}"`);
    }
    expect(
      markup.match(/<button[^>]*aria-label="Square 4:4"[^>]*>/)?.[0],
    ).toContain("bg-primary text-primary-foreground underline");
    expect(
      markup.match(/<button[^>]*aria-label="Portrait 4:5"[^>]*>/)?.[0],
    ).not.toContain("bg-primary");
    expect(markup).toContain("Fit whole image");
    expect(markup).toContain("Center");
    expect(props.onApply).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalled();

    actions.get("Apply frame")?.();
    expect(props.onApply).toHaveBeenCalledExactlyOnceWith(defaultFrame);
    expect(props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("initializes placement and the background from an applied frame", () => {
    const frame: CanvasFrame = {
      columns: 4,
      rows: 5,
      scale: 0.5,
      offsetX: 0.25,
      offsetY: -0.1,
      backgroundColorId: 42,
    };
    const { markup, props } = renderDialog({ frame });

    expect(markup).toContain('style="left:50%;top:25%;width:50%;height:30%"');
    expect(markup).toContain(
      'aria-label="Background color 2, #4d7cff" aria-pressed="true"',
    );
    expect(markup).toContain("Canvas 800 × 1000");
    expect(
      markup.match(/<button[^>]*aria-label="Portrait 4:5"[^>]*>/)?.[0],
    ).toContain("bg-primary text-primary-foreground underline");
    expect(
      markup.match(/<button[^>]*aria-label="Square 4:4"[^>]*>/)?.[0],
    ).not.toContain("bg-primary");
    actions.get("Apply frame")?.();
    expect(props.onApply).toHaveBeenCalledExactlyOnceWith(frame);
  });

  it("cancels or forwards dialog dismissal without applying", () => {
    const { props } = renderDialog();

    actions.get("Cancel")?.();
    expect(props.onApply).not.toHaveBeenCalled();
    expect(props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);

    vi.mocked(props.onOpenChange).mockClear();
    dismissal.onOpenChange?.(false);
    expect(props.onApply).not.toHaveBeenCalled();
    expect(props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("removes framing only through the original-bounds action", () => {
    const { props } = renderDialog({ frame: defaultFrame });
    actions.get("Use original bounds")?.();

    expect(props.onApply).toHaveBeenCalledExactlyOnceWith(null);
    expect(props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("uses an available color when an applied background is no longer in the palette", () => {
    const { props } = renderDialog({
      frame: { ...defaultFrame, backgroundColorId: 99 },
    });
    actions.get("Apply frame")?.();

    expect(props.onApply).toHaveBeenCalledExactlyOnceWith(defaultFrame);
  });

  it("handles an empty palette without crashing or enabling Apply", () => {
    const { markup, props } = renderDialog({ palette: [] });

    expect(markup).toContain("Add a palette color before applying a frame.");
    expect(markup).toMatch(
      /<button[^>]*disabled=""[^>]*>Apply frame<\/button>/,
    );
    actions.get("Apply frame")?.();
    expect(props.onApply).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalled();
  });
});
