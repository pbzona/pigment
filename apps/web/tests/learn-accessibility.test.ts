import { readFile } from "node:fs/promises";
import { createElement, type ComponentProps, type KeyboardEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CONVERSION_METHODS } from "@pigment/quantization";
import { MethodExplorer } from "@/components/learn/method-explorer";
import { PaletteExtractionExplorer } from "@/components/learn/palette-extraction-explorer";
import { PipelineExplorer } from "@/components/learn/pipeline-explorer";
import {
  PixelGrid,
  pixelGridKeyboardTarget,
} from "@/components/learn/pixel-grid";

const pixels = Array.from({ length: 8 }, (_, index) => ({
  color: "#f06a32",
  label: `Cell ${index + 1}`,
  marker: index === 5 ? "10" : undefined,
}));

function tabsIn(html: string) {
  return [...html.matchAll(/<button\b[^>]*role="tab"[^>]*>/g)].map(
    ([tag]) => tag,
  );
}

function expectLinkedTabs(html: string, count: number) {
  const tabs = tabsIn(html);
  expect(tabs).toHaveLength(count);
  expect(tabs.filter((tag) => tag.includes('tabindex="0"'))).toHaveLength(1);
  expect(
    tabs.filter((tag) => tag.includes('aria-selected="true"')),
  ).toHaveLength(1);
  const panelId = html.match(/<div[^>]*id="([^"]+)" role="tabpanel"/)?.[1];
  expect(panelId).toBeDefined();
  for (const tab of tabs) expect(tab).toContain(`aria-controls="${panelId}"`);
  const activeId = tabs
    .find((tag) => tag.includes('aria-selected="true"'))
    ?.match(/id="([^"]+)"/)?.[1];
  expect(html).toContain(`role="tabpanel" aria-labelledby="${activeId}"`);
}

describe("learning grid keyboard navigation", () => {
  it.each([
    [5, "ArrowLeft", 4],
    [5, "ArrowRight", 6],
    [5, "ArrowUp", 1],
    [1, "ArrowDown", 5],
    [4, "ArrowLeft", 4],
    [3, "ArrowRight", 3],
    [1, "ArrowUp", 1],
    [5, "ArrowDown", 5],
    [5, "Home", 4],
    [5, "End", 7],
  ])("moves from %s with %s to %s", (index, key, expected) => {
    expect(pixelGridKeyboardTarget(Number(index), String(key), 4, 8)).toBe(
      expected,
    );
  });

  it("supports whole-grid Home/End and leaves native activation alone", () => {
    expect(pixelGridKeyboardTarget(5, "Home", 4, 8, true)).toBe(0);
    expect(pixelGridKeyboardTarget(1, "End", 4, 8, true)).toBe(7);
    expect(pixelGridKeyboardTarget(5, "Enter", 4, 8)).toBeNull();
    expect(pixelGridKeyboardTarget(5, " ", 4, 8)).toBeNull();
    expect(pixelGridKeyboardTarget(0, "ArrowRight", 0, 0)).toBeNull();
  });

  it("keeps one tab stop and real row semantics without losing cell names", () => {
    const html = renderToStaticMarkup(
      createElement(PixelGrid, {
        width: 4,
        height: 2,
        pixels,
        label: "Output example",
        selectedIndex: 5,
        onSelect: vi.fn(),
      }),
    );
    expect(html.match(/role="row"/g)).toHaveLength(2);
    expect(html.match(/role="gridcell"/g)).toHaveLength(8);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(7);
    expect(html).toContain(
      'aria-label="Cell 6" data-cell-index="5" tabindex="0"',
    );
    expect(html).toContain('aria-selected="true"');
  });

  it("focuses and selects the keyboard target in the rendered handler", () => {
    const onSelect = vi.fn();
    const grid = PixelGrid({
      width: 4,
      height: 2,
      pixels,
      label: "Output",
      selectedIndex: 5,
      onSelect,
    });
    const cell = grid.props.children[1].props.children[1];
    const focus = vi.fn();
    const querySelector = vi.fn(() => ({ focus }));
    const preventDefault = vi.fn();
    cell.props.onKeyDown({
      key: "ArrowUp",
      preventDefault,
      currentTarget: { closest: () => ({ querySelector }) },
    } as unknown as KeyboardEvent<HTMLButtonElement>);
    expect(querySelector).toHaveBeenCalledWith('[data-cell-index="1"]');
    expect(focus).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it("provides a first-cell tab stop when no selection exists, but not for read-only pixels", () => {
    const selectable: ComponentProps<typeof PixelGrid> = {
      width: 4,
      height: 2,
      pixels,
      label: "Output",
      onSelect: vi.fn(),
    };
    const active = renderToStaticMarkup(createElement(PixelGrid, selectable));
    expect(active).toContain('data-cell-index="0" tabindex="0"');
    const readonly = renderToStaticMarkup(
      createElement(PixelGrid, { ...selectable, onSelect: undefined }),
    );
    expect(readonly).toContain('aria-readonly="true"');
    expect(readonly).not.toContain("tabindex=");
    expect(readonly).not.toContain("<button");
  });
});

describe("learning task controls", () => {
  it("links pipeline stage tabs to a named panel with one tab stop", () => {
    expectLinkedTabs(renderToStaticMarkup(createElement(PipelineExplorer)), 7);
  });

  it.each(CONVERSION_METHODS)(
    "keeps $label examples and linked stage controls renderable",
    ({ value }) => {
      const html = renderToStaticMarkup(
        createElement(MethodExplorer, {
          method: value,
          onMethodChange: vi.fn(),
        }),
      );
      expectLinkedTabs(html, 5);
      expect(html).toContain("Source samples");
      expect(html).toContain("Output cells");
      expect(html).toContain("Calculation details");
      for (const tab of tabsIn(html)) {
        expect(tab).toContain("whitespace-normal");
        expect(tab).not.toContain("whitespace-nowrap");
      }
    },
  );

  it("links palette-path tabs and preserves the extraction explanation", () => {
    const html = renderToStaticMarkup(createElement(PaletteExtractionExplorer));
    expectLinkedTabs(html, 2);
    expect(html).toContain("weighted median cut");
    expect(html).toContain("Requested colors");
    expect(html).toContain("Next split");
  });

  it("keeps assigned functional text at 11px or above", async () => {
    for (const name of [
      "pipeline-explorer",
      "method-explorer",
      "palette-extraction-explorer",
      "pixel-grid",
    ]) {
      const source = await readFile(
        new URL(`../components/learn/${name}.tsx`, import.meta.url),
        "utf8",
      );
      expect(source, name).not.toMatch(/text-\[(?:[0-9]|10)px\]/);
    }
  });
});
