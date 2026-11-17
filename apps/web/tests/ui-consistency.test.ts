import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { Button, buttonVariants } from "@pigment/ui/button";
import { Slider } from "@pigment/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@pigment/ui/tabs";
import { Toggle } from "@pigment/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@pigment/ui/toggle-group";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@pigment/ui/tooltip";

// Match the renderer to the UI package's React peer, including in pnpm installs
// where the app and workspace package resolve different compatible React versions.
const requireUi = createRequire(
  new URL("../../../packages/ui/package.json", import.meta.url),
);
const { renderToStaticMarkup } = requireUi(
  "react-dom/server",
) as typeof import("react-dom/server");

function sliderThumbs(markup: string) {
  return markup.match(/<[^>]+\brole="slider"[^>]*>/g) ?? [];
}

describe("shared UI consistency", () => {
  it("keeps catalog aliases from overwriting shared theme colors", () => {
    const catalogCss = readFileSync(
      new URL("../app/catalog.css", import.meta.url),
      "utf8",
    );
    const themeCss = readFileSync(
      new URL("../../../packages/ui/src/styles.css", import.meta.url),
      "utf8",
    );
    const declarations = new Map(
      [...`${themeCss}\n${catalogCss}`.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(
        ([, name, value]) => [name, value?.trim()],
      ),
    );

    expect(declarations.get("--muted")).toBe("#25221f");
    expect(declarations.get("--accent")).toBe("#4d7cff");
    expect(declarations.get("--catalog-muted")).toBe("var(--muted-foreground)");
    expect(declarations.get("--catalog-accent")).toBe("var(--primary)");
    expect(catalogCss).not.toMatch(/--(?:muted|accent):/);
    expect(catalogCss).not.toMatch(/var\(--(?:muted|accent)\)/);
    expect(catalogCss).toContain("var(--catalog-muted)");
    expect(catalogCss).toContain("var(--catalog-accent)");
    expect(catalogCss).toContain("var(--muted-foreground)");
    expect(catalogCss).toContain("var(--accent-blue)");
  });

  it("puts the slider's accessible name and help on the actual thumb", () => {
    const markup = renderToStaticMarkup(
      createElement(Slider, {
        "aria-label": "Image scale",
        "aria-labelledby": "scale-label",
        "aria-describedby": "scale-help",
        defaultValue: [100],
        min: 10,
        max: 300,
      }),
    );
    const thumbs = sliderThumbs(markup);

    expect(thumbs).toHaveLength(1);
    expect(thumbs[0]).toContain('aria-label="Image scale"');
    expect(thumbs[0]).toContain('aria-labelledby="scale-label"');
    expect(thumbs[0]).toContain('aria-describedby="scale-help"');
    expect(thumbs[0]).toContain('aria-valuemin="10"');
    expect(thumbs[0]).toContain('aria-valuemax="300"');
    expect(thumbs[0]).toContain("size-6");
    expect(markup).toContain("min-h-6");
  });

  it("forwards shared ARIA references to every controlled range thumb", () => {
    const thumbs = sliderThumbs(
      renderToStaticMarkup(
        createElement(Slider, {
          "aria-label": "Brightness range",
          "aria-labelledby": "brightness-label",
          "aria-describedby": "brightness-help",
          value: [20, 80],
          disabled: true,
        }),
      ),
    );

    expect(thumbs).toHaveLength(2);
    for (const thumb of thumbs) {
      expect(thumb).toContain('aria-label="Brightness range"');
      expect(thumb).toContain('aria-labelledby="brightness-label"');
      expect(thumb).toContain('aria-describedby="brightness-help"');
      expect(thumb).toContain('data-disabled=""');
      expect(thumb).not.toContain("tabindex");
    }
  });

  it("supports distinct range labels without a shared label overriding them", () => {
    const markup = renderToStaticMarkup(
      createElement(Slider, {
        "aria-label": "Brightness",
        "aria-labelledby": "brightness-label",
        "aria-describedby": "brightness-help",
        defaultValue: [20, 80],
        thumbLabels: ["Minimum brightness", "Maximum brightness"],
      }),
    );
    const thumbs = sliderThumbs(markup);

    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toContain('aria-label="Minimum brightness"');
    expect(thumbs[1]).toContain('aria-label="Maximum brightness"');
    for (const thumb of thumbs) {
      expect(thumb).not.toContain("aria-labelledby");
      expect(thumb).toContain('aria-describedby="brightness-help"');
    }
    expect(markup).not.toContain("thumbLabels");
  });

  it("falls back to the shared name for unspecified range labels", () => {
    const thumbs = sliderThumbs(
      renderToStaticMarkup(
        createElement(Slider, {
          "aria-label": "Brightness",
          defaultValue: [20, 80],
          thumbLabels: ["Minimum brightness"],
        }),
      ),
    );

    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toContain('aria-label="Minimum brightness"');
    expect(thumbs[1]).toContain('aria-label="Brightness"');
  });

  it("retains one thumb when no controlled or default value is supplied", () => {
    const thumbs = sliderThumbs(
      renderToStaticMarkup(
        createElement(Slider, { "aria-label": "Amount", min: 5, max: 50 }),
      ),
    );

    expect(thumbs).toHaveLength(1);
    expect(thumbs[0]).toContain('aria-valuemin="5"');
    expect(thumbs[0]).toContain('aria-valuemax="50"');
  });

  it("styles the data-state attribute emitted by the actual Radix tabs", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Tabs,
        { defaultValue: "first" },
        createElement(
          TabsList,
          null,
          createElement(TabsTrigger, { value: "first" }, "First"),
          createElement(TabsTrigger, { value: "second" }, "Second"),
        ),
      ),
    );
    const triggers = markup.match(/<button[^>]+\brole="tab"[^>]*>/g) ?? [];

    expect(triggers).toHaveLength(2);
    expect(triggers[0]).toContain('data-state="active"');
    expect(triggers[0]).toContain('aria-selected="true"');
    expect(triggers[1]).toContain('data-state="inactive"');
    expect(triggers[1]).toContain('aria-selected="false"');
    for (const trigger of triggers) {
      expect(trigger).toContain("data-[state=active]:bg-primary");
      expect(trigger).toContain("data-[state=active]:text-primary-foreground");
      expect(trigger).not.toContain("data-active:");
    }
  });

  it("styles the pressed state emitted by the actual Radix toggle", () => {
    const markup = renderToStaticMarkup(
      createElement(Toggle, { pressed: true }, "Brush"),
    );

    expect(markup).toContain('data-state="on"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("data-[state=on]:border-border");
    expect(markup).toContain("data-[state=on]:bg-primary");
    expect(markup).toContain("data-[state=on]:text-primary-foreground");
    expect(markup).not.toContain("data-on:");
  });

  it("uses the same visible selected state for grouped tool and export options", () => {
    const markup = renderToStaticMarkup(
      createElement(
        ToggleGroup,
        { type: "single", defaultValue: "artwork" },
        createElement(ToggleGroupItem, { value: "artwork" }, "Artwork"),
        createElement(ToggleGroupItem, { value: "reference" }, "Reference"),
      ),
    );
    const options =
      markup.match(/<button[^>]+\bdata-slot="toggle-group-item"[^>]*>/g) ?? [];

    expect(options).toHaveLength(2);
    expect(options[0]).toContain('data-state="on"');
    expect(options[0]).toContain('aria-checked="true"');
    expect(options[1]).toContain('data-state="off"');
    expect(options[1]).toContain('aria-checked="false"');
    for (const option of options) {
      expect(option).toContain("data-[state=on]:bg-primary");
      expect(option).toContain("data-[state=on]:text-primary-foreground");
      expect(option).not.toContain("data-on:");
    }
  });

  it("keeps a tooltip-wrapped tool visibly selected when the tooltip owns data-state", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(
          ToggleGroup,
          { type: "single", defaultValue: "pencil" },
          createElement(
            Tooltip,
            null,
            createElement(
              TooltipTrigger,
              { asChild: true },
              createElement(ToggleGroupItem, { value: "pencil" }, "Pencil"),
            ),
          ),
        ),
      ),
    );
    expect(markup).toContain('aria-checked="true"');
    expect(markup).toContain('data-state="closed"');
    expect(markup).toContain("aria-checked:bg-primary");
    expect(markup).toContain("aria-checked:text-primary-foreground");
  });

  it.each(["default", "secondary", "outline", "destructive"] as const)(
    "gives the shadowed %s button consistent press feedback",
    (variant) => {
      const classes = buttonVariants({ variant });

      expect(classes).toContain("active:translate-x-0.5");
      expect(classes).toContain("active:translate-y-0.5");
      expect(classes).toContain("active:shadow-none");
    },
  );

  it("keeps button identities and compact desktop dimensions", () => {
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-secondary");
    expect(buttonVariants({ variant: "outline" })).toContain(
      "shadow-[3px_3px_0_var(--primary)]",
    );
    expect(buttonVariants({ variant: "destructive" })).toContain(
      "bg-destructive",
    );
    expect(buttonVariants({ size: "xs" }).split(" ")).toContain("h-6");
    expect(buttonVariants({ size: "icon-xs" }).split(" ")).toContain("size-6");
    const classes = buttonVariants({ size: "icon-xs" }).split(" ");
    expect(classes).toContain("pointer-coarse:min-h-11");
    expect(classes).toContain("pointer-coarse:min-w-11");
    expect(classes).not.toContain("min-h-11");
    expect(classes).not.toContain("min-w-11");
  });

  it("preserves disabled semantics and keyboard focus for shared buttons", () => {
    const markup = renderToStaticMarkup(
      createElement(Button, { variant: "secondary", disabled: true }, "Apply"),
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain("disabled:pointer-events-none");
    expect(markup).toContain("focus-visible:ring-2");
  });
});
