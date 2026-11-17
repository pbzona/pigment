import {
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getColorMetrics } from "@pigment/color/metrics";
import { createPalette, DEFAULT_PALETTES } from "@pigment/palette";
import type { PaletteSummary } from "@pigment/palette-catalog";

const harness = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  push: vi.fn(),
  readSnapshot: vi.fn(),
  writePending: vi.fn(),
}));

// Keep the existing Node/static-render pattern, retaining component state between
// explicit renders so native event callbacks can exercise each interaction.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = harness.cursor++;
      if (!(index in harness.values)) {
        harness.values[index] =
          typeof initial === "function" ? initial() : initial;
      }
      return [
        harness.values[index],
        (next: unknown) => {
          harness.values[index] =
            typeof next === "function" ? next(harness.values[index]) : next;
        },
      ];
    },
    useEffect: vi.fn(),
    useId: () => "palette-color-error",
    useRef: () => ({ current: null }),
  };
});

vi.mock("@pigment/ui/dialog", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  const content = (props: ComponentProps<"div">) => createElement("div", props);
  return {
    Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
      open ? children : null,
    DialogContent: content,
    DialogHeader: content,
    DialogTitle: content,
    DialogDescription: content,
  };
});
vi.mock("@pigment/ui/tabs", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  const content = ({
    children,
    className,
    "aria-label": label,
  }: ComponentProps<"div">) =>
    createElement("div", { className, "aria-label": label }, children);
  return {
    Tabs: content,
    TabsList: content,
    TabsContent: content,
    TabsTrigger: ({ value, children, ...props }: ComponentProps<"button">) =>
      createElement("button", { ...props, value }, children),
  };
});
vi.mock("@pigment/ui/label", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  return {
    Label: ({
      asChild,
      children,
      ...props
    }: ComponentProps<"span"> & { asChild?: boolean }) =>
      asChild ? children : createElement("span", props, children),
  };
});
vi.mock("@pigment/ui/slider", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  return {
    Slider: ({ "aria-label": label }: ComponentProps<"input">) =>
      createElement("input", { type: "range", "aria-label": label }),
  };
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: harness.push }),
}));
vi.mock("@/lib/browser/project-snapshot", () => ({
  readProjectSnapshot: harness.readSnapshot,
  writePendingPalette: harness.writePending,
}));

import { PaletteDialog } from "@/components/palette/palette-dialog";
import { PaletteCard } from "@/components/catalog/palette-card";

type Element = ReactElement<Record<string, unknown>>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join("");
  if (isValidElement<{ children?: ReactNode }>(node))
    return text(node.props.children);
  return typeof node === "string" || typeof node === "number"
    ? String(node)
    : "";
}
function find(
  tree: ReactNode,
  predicate: (element: Element) => boolean,
): Element {
  const element = elements(tree).find(predicate);
  expect(element).toBeDefined();
  return element!;
}
function click(element: Element) {
  (element.props.onClick as () => void)();
}
function change(element: Element, value: string) {
  (element.props.onChange as (event: unknown) => void)({ target: { value } });
}
function submit(tree: ReactNode) {
  const preventDefault = vi.fn();
  (
    find(tree, (element) => element.type === "form").props.onSubmit as (
      event: unknown,
    ) => void
  )({ preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
}
function renderWorkshop(
  overrides: Partial<ComponentProps<typeof PaletteDialog>> = {},
) {
  const props: ComponentProps<typeof PaletteDialog> = {
    open: true,
    activePalette: DEFAULT_PALETTES[0]!,
    customPalettes: [],
    onOpenChange: vi.fn(),
    onSelect: vi.fn(),
    onChange: vi.fn(),
    onCreate: vi.fn(),
    onDuplicate: vi.fn(),
    onSaveToLibrary: vi.fn(),
    onDelete: vi.fn(),
    onImport: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const render = () => {
    harness.cursor = 0;
    const tree = PaletteDialog(props);
    return { tree, markup: renderToStaticMarkup(tree) };
  };
  return { props, render, ...render() };
}
function switchTab(tree: ReactNode, tab: string) {
  (
    find(
      tree,
      (element) =>
        typeof element.props.onValueChange === "function" &&
        "value" in element.props,
    ).props.onValueChange as (value: string) => void
  )(tab);
}
function colorInput(tree: ReactNode) {
  return find(tree, (element) => "aria-invalid" in element.props);
}

beforeEach(() => {
  harness.values = [];
  harness.cursor = 0;
  vi.clearAllMocks();
  harness.readSnapshot.mockReturnValue(null);
});

describe("palette workshop UX", () => {
  it("bounds the workshop, pins its navigation, and gives all four panels their own scroll area", () => {
    const { markup } = renderWorkshop();
    expect(markup).toContain("max-h-[calc(100dvh-1.5rem)]");
    expect(markup).toContain("flex-col gap-0 overflow-hidden");
    expect(markup).toContain("shrink-0 border-b");
    expect(markup).toContain("grid w-auto shrink-0 grid-cols-4");
    expect(markup.match(/overflow-y-auto overscroll-contain/g)).toHaveLength(4);
    expect(markup).toContain('aria-label="Palette workshop"');
    for (const label of ["Library", "Browse", "Edit", "Import"])
      expect(markup).toContain(`>${label}</button>`);
    expect(markup).not.toContain("Your palettes");
    expect(markup).not.toContain(">Archive</button>");
    expect(markup).toContain('aria-label="Edit current palette"');
    expect(markup).toContain('aria-label="Import palette file"');
  });

  it("creates a palette and enters the editor without dismissing the workshop", () => {
    const workshop = renderWorkshop();
    click(
      find(
        workshop.tree,
        (element) =>
          element.type === "button" && text(element) === " New palette",
      ),
    );
    expect(workshop.props.onCreate).toHaveBeenCalledOnce();
    expect(workshop.props.onOpenChange).not.toHaveBeenCalled();
    const { tree } = workshop.render();
    expect(
      find(
        tree,
        (element) =>
          typeof element.props.onValueChange === "function" &&
          "value" in element.props,
      ).props.value,
    ).toBe("edit");
  });

  it("names palette application explicitly and applies before closing", () => {
    const workshop = renderWorkshop();
    const palette = DEFAULT_PALETTES[0]!;
    expect(workshop.markup).toContain(
      `aria-label="Use ${palette.name} and close palette workshop"`,
    );
    expect(workshop.markup).toContain("Use palette");
    const card = find(
      workshop.tree,
      (element) =>
        element.props.palette === palette &&
        typeof element.props.onSelect === "function",
    );
    (card.props.onSelect as () => void)();
    expect(workshop.props.onSelect).toHaveBeenCalledExactlyOnceWith(palette);
    expect(workshop.props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(
      vi.mocked(workshop.props.onSelect).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(workshop.props.onOpenChange).mock.invocationCallOrder[0]!,
    );
  });

  it("submits color changes with the keyboard and clears errors when corrected", () => {
    const workshop = renderWorkshop();
    switchTab(workshop.tree, "edit");
    let { tree } = workshop.render();
    change(colorInput(tree), "not-a-color");
    tree = workshop.render().tree;
    submit(tree);
    let rendered = workshop.render();
    expect(rendered.markup).toContain('role="alert"');
    expect(rendered.markup).toContain('aria-invalid="true"');
    expect(rendered.markup).toContain('aria-describedby="palette-color-error"');
    expect(workshop.props.onChange).not.toHaveBeenCalled();
    change(colorInput(rendered.tree), "#123456");
    rendered = workshop.render();
    expect(rendered.markup).not.toContain('role="alert"');
    expect(rendered.markup).toContain('type="submit"');
    submit(rendered.tree);
    const changed = vi.mocked(workshop.props.onChange).mock.calls[0]![0];
    expect(changed.colors.at(-1)?.hex).toBe("#123456");
    expect(workshop.props.onOpenChange).not.toHaveBeenCalled();
  });

  it("updates a selected swatch, preserving CSS color input and reorder/remove controls", () => {
    const workshop = renderWorkshop();
    const swatch = workshop.props.activePalette.colors[0]!;
    click(
      find(
        workshop.tree,
        (element) => element.props["aria-label"] === `Edit ${swatch.hex}`,
      ),
    );
    let { tree } = workshop.render();
    change(colorInput(tree), "red");
    const rendered = workshop.render();
    tree = rendered.tree;
    expect(rendered.markup).toContain('value="#ef6a47"');
    expect(rendered.markup).toContain("Move color left");
    expect(rendered.markup).toContain("Move color right");
    expect(rendered.markup).toContain("Remove color");
    submit(tree);
    const changed = vi.mocked(workshop.props.onChange).mock.calls[0]![0];
    expect(changed.colors).toHaveLength(
      workshop.props.activePalette.colors.length,
    );
    expect(changed.colors[0]?.hex).toBe("#ff0000");
  });

  it("preserves local palettes, attribution, and every existing import format", () => {
    const result = createPalette("local-test", "Local test", [
      "#123456",
      "#abcdef",
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const palette = {
      ...result.value,
      author: { name: "Artist", url: "https://example.com/artist" },
      attribution: {
        license: "CC0",
        url: "https://example.com/license",
        text: null,
      },
    };
    const { markup } = renderWorkshop({ customPalettes: [palette] });
    expect(markup).toContain("Local test");
    expect(markup).toContain("By Artist");
    expect(markup).toContain('href="https://example.com/artist"');
    expect(markup).toContain('href="https://example.com/license"');
    expect(markup).toContain("CC0");
    expect(markup).toContain(
      'accept="image/png,image/jpeg,image/webp,.json,.txt,.hex,.palette"',
    );
    expect(markup).toContain("Colors extracted from photos");
  });

  it("saves a browsed palette locally without applying it or closing the workshop", () => {
    const palette = DEFAULT_PALETTES[0]!;
    const workshop = renderWorkshop();
    // The only array-valued state is the fetched palette list; leave fetching
    // itself to the API tests and populate the successful browse response here.
    const remoteIndex = harness.values.findIndex(Array.isArray);
    expect(remoteIndex).toBeGreaterThanOrEqual(0);
    harness.values[remoteIndex] = [palette];
    const rendered = workshop.render();
    expect(rendered.markup).toContain(
      `aria-label="Save ${palette.name} to library"`,
    );
    const card = find(
      rendered.tree,
      (element) =>
        element.props.palette === palette &&
        typeof element.props.onSave === "function",
    );
    (card.props.onSave as () => void)();
    expect(workshop.props.onSaveToLibrary).toHaveBeenCalledExactlyOnceWith(
      palette,
    );
    expect(workshop.props.onSelect).not.toHaveBeenCalled();
    expect(workshop.props.onOpenChange).not.toHaveBeenCalled();
    expect(renderWorkshop({ customPalettes: [palette] }).markup).toContain(
      `aria-label="${palette.name} is saved in library" disabled=""`,
    );
  });

  it("imports with the chosen extraction count and closes only after success", async () => {
    const workshop = renderWorkshop();
    const file = new File(["#123456"], "colors.txt", { type: "text/plain" });
    const input = find(
      workshop.tree,
      (element) => element.props.type === "file",
    );
    (input.props.onChange as (event: unknown) => void)({
      target: { files: [file], value: "colors.txt" },
    });
    expect(workshop.props.onImport).toHaveBeenCalledExactlyOnceWith(file, 16);
    expect(workshop.props.onOpenChange).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(workshop.props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("keeps failed imports open and clears their error when switching tasks", async () => {
    const workshop = renderWorkshop({
      onImport: vi
        .fn()
        .mockRejectedValue(
          new Error("Invalid palette file. Choose a JSON array."),
        ),
    });
    const file = new File(["{}"], "colors.json", { type: "application/json" });
    const input = find(
      workshop.tree,
      (element) => element.props.type === "file",
    );
    (input.props.onChange as (event: unknown) => void)({
      target: { files: [file], value: "colors.json" },
    });
    await Promise.resolve();
    let rendered = workshop.render();
    expect(rendered.markup).toContain(
      "Invalid palette file. Choose a JSON array.",
    );
    expect(rendered.markup).toContain('role="alert"');
    expect(workshop.props.onOpenChange).not.toHaveBeenCalled();
    switchTab(rendered.tree, "edit");
    rendered = workshop.render();
    expect(rendered.markup).not.toContain("Invalid palette file.");
  });
});

const catalogPalette: PaletteSummary = {
  id: 1,
  relativePath: "test.png",
  filename: "test.png",
  displayName: "Catalog test",
  mimeType: "image/png",
  width: 2,
  height: 1,
  fileSize: 100,
  mtimeMs: 0,
  sha256: "test",
  colorCount: 2,
  uniqueColorCount: 2,
  averageLightness: 0.5,
  minLightness: 0,
  maxLightness: 1,
  averageChroma: 0,
  createdAt: "",
  updatedAt: "",
  scannedAt: "",
  isFavorite: false,
  distance: null,
  colors: [0, 255].map((channel, position) => ({
    ...getColorMetrics({ red: channel, green: channel, blue: channel }),
    id: position + 1,
    paletteId: 1,
    position,
  })),
};
function renderCatalogCard() {
  harness.cursor = 0;
  const tree = PaletteCard({ palette: catalogPalette });
  return { tree, markup: renderToStaticMarkup(tree) };
}

describe("catalog palette opener", () => {
  it.each([true, false])(
    "refreshes the current-project label on the actual opener (project: %s)",
    (hasProject) => {
      harness.readSnapshot.mockReturnValue(
        hasProject ? { name: "Existing project" } : null,
      );
      const { tree } = renderCatalogCard();
      expect(harness.readSnapshot).not.toHaveBeenCalled();
      click(
        find(
          tree,
          (element) =>
            element.props["aria-label"] === "Inspect Catalog test, 2 colors",
        ),
      );
      expect(harness.readSnapshot).toHaveBeenCalledOnce();
      const opened = renderCatalogCard();
      expect(opened.markup).toContain(
        hasProject ? "Apply to current project" : "Start in Studio",
      );
      const action = find(
        opened.tree,
        (element) =>
          text(element) ===
          (hasProject ? "Apply to current project" : "Start in Studio"),
      );
      click(action);
      expect(harness.writePending).toHaveBeenCalledExactlyOnceWith({
        name: "Catalog test",
        colors: ["#000000", "#FFFFFF"],
      });
      expect(harness.push).toHaveBeenCalledExactlyOnceWith("/studio");
    },
  );
});
