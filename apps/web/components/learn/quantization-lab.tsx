"use client";

import { useEffect, useState } from "react";
import { ArrowDown, FlaskConical } from "lucide-react";

import { Button } from "@pigment/ui/button";
import { SiteHeader } from "@/components/site-header";
import {
  CONVERSION_METHODS,
  type ConversionMethod,
} from "@pigment/quantization";
import { cn } from "@/lib/utils";

import { CurrentProjectPanel } from "./current-project-panel";
import { ImageComparisonLab } from "./image-comparison-lab";
import { MethodExplorer } from "./method-explorer";
import { PaletteExtractionExplorer } from "./palette-extraction-explorer";
import { PipelineExplorer } from "./pipeline-explorer";

const HERO_PIXELS = [
  0, 0, 1, 1, 1, 0, 0, 0,
  0, 1, 2, 2, 1, 1, 0, 0,
  1, 2, 3, 3, 2, 1, 1, 0,
  1, 2, 3, 3, 2, 2, 1, 0,
  0, 1, 2, 2, 2, 1, 0, 0,
  0, 1, 1, 2, 1, 1, 0, 0,
  0, 0, 1, 1, 1, 0, 0, 0,
  0, 0, 0, 1, 0, 0, 0, 0,
] as const;

const HERO_COLORS = ["#171513", "#48656a", "#ef6a47", "#f1e8d9"] as const;

const methodForHash = (hash: string): ConversionMethod | null => {
  const slug = hash.replace(/^#/u, "");
  return CONVERSION_METHODS.find((entry) => entry.slug === slug)?.value ?? null;
};

type LearningNavProps = Readonly<{
  method: ConversionMethod;
  mobile?: boolean;
}>;

const LAB_SECTIONS = [
  { href: "#pipeline", label: "Procedure", detail: "Follow one cell" },
  { href: "#methods", label: "Methods", detail: "Compare decisions" },
  { href: "#palette-extraction", label: "Palette", detail: "Extract color" },
  { href: "#compare", label: "Your image", detail: "Run an experiment" },
] as const;

function LearningNav({ method, mobile = false }: LearningNavProps) {
  const activeMethod = CONVERSION_METHODS.find((entry) => entry.value === method);

  return (
    <nav
      aria-label="Lab sections"
      className={cn(
        mobile
          ? "grid grid-cols-2 gap-px bg-foreground/10 p-px sm:grid-cols-4"
          : "border-l border-foreground/10",
      )}
    >
      {LAB_SECTIONS.map((section, index) => (
        <a
          key={section.href}
          href={section.href}
          className={cn(
            "group transition-colors hover:text-foreground",
            mobile
              ? "bg-background px-3 py-2.5 text-xs text-muted-foreground"
              : "grid grid-cols-[1.5rem_1fr] gap-2 border-l border-transparent py-3 pl-4 pr-2 text-muted-foreground hover:border-primary/60 hover:bg-primary/5",
          )}
        >
          {!mobile ? <span className="font-mono text-[8px] text-muted-foreground/60">{String(index + 1).padStart(2, "0")}</span> : null}
          <span>
            <span className="block text-xs text-foreground/90">{section.label}</span>
            {!mobile ? <span className="mt-1 block text-[9px] leading-4 text-muted-foreground">{section.detail}</span> : null}
          </span>
        </a>
      ))}
      {!mobile ? (
        <div className="ml-4 mt-5 border-t border-foreground/10 pt-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground/60">On the bench</p>
          <p className="mt-2 text-xs text-primary">{activeMethod?.label}</p>
          <p className="mt-1 text-[9px] leading-4 text-muted-foreground">{activeMethod?.description}</p>
        </div>
      ) : null}
    </nav>
  );
}

export function QuantizationLab() {
  const [method, setMethod] = useState<ConversionMethod>("dominant");

  useEffect(() => {
    const syncHash = () => {
      const nextMethod = methodForHash(window.location.hash);
      if (nextMethod) setMethod(nextMethod);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const changeMethod = (nextMethod: ConversionMethod) => {
    setMethod(nextMethod);
    const slug = CONVERSION_METHODS.find((entry) => entry.value === nextMethod)?.slug;
    if (slug) window.history.replaceState(null, "", `#${slug}`);
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader active="lab" context="Experiment lab" />

      <main>
        <section className="relative overflow-hidden border-b border-foreground/10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "linear-gradient(to bottom, black, transparent 85%)",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.72fr)] lg:px-8">
            <div className="max-w-3xl">
              <FlaskConical className="size-5 text-primary" aria-hidden="true" />
              <h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-7xl lg:text-[5.25rem]">
                Lab
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Inspect the current project, compare image-processing methods, and follow their calculations step by step.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#pipeline">
                    View the image pipeline
                    <ArrowDown data-icon="inline-end" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#dominant-vote" onClick={() => changeMethod("dominant")}>Try the methods</a>
                </Button>
              </div>
              <div className="mt-12 grid max-w-xl grid-cols-3 gap-px border-y border-foreground/10 bg-foreground/10">
                {[
                  ["Cell", "sampling unit"],
                  ["Palette", "color matching"],
                  ["Local", "browser processing"],
                ].map(([value, label]) => (
                  <div key={label} className="bg-background/85 px-4 py-4">
                    <p className="font-mono text-xl tabular-nums">{value}</p>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:mr-0">
              <div className="absolute -left-5 -top-5 size-20 border-l border-t border-primary/55" aria-hidden="true" />
              <CurrentProjectPanel />
              <div className="mt-4 border-2 border-border bg-card p-4 shadow-[6px_6px_0_var(--shadow)] sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Example image / 8×8</span>
                  <span className="font-mono text-[9px] text-primary">RGBA → ID</span>
                </div>
                <div className="grid grid-cols-8 gap-px bg-foreground/10 p-px">
                  {HERO_PIXELS.map((color, index) => (
                    <span
                      key={index}
                      className="aspect-square"
                      style={{ backgroundColor: HERO_COLORS[color] }}
                    />
                  ))}
                </div>
                <div className="mt-6 space-y-px bg-foreground/10">
                  {[
                    ["01", "sample", "Which source pixels are in this cell?"],
                    ["02", "reduce", "How does the method combine these pixels?"],
                    ["03", "match", "Which palette color is nearest?"],
                  ].map(([number, verb, question]) => (
                    <div key={number} className="grid grid-cols-[2rem_4rem_1fr] gap-3 bg-background/85 px-3 py-3 font-mono text-[9px]">
                      <span className="text-primary">{number}</span>
                      <span className="uppercase text-foreground">{verb}</span>
                      <span className="text-muted-foreground">{question}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="sticky top-14 z-40 border-b-2 border-border bg-background lg:hidden">
          <LearningNav method={method} mobile />
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:px-8">
          <aside className="hidden lg:block">
            <div className="sticky top-24 pt-16">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground/65">Lab index</p>
                <span className="size-1.5 bg-primary" aria-hidden="true" />
              </div>
              <LearningNav method={method} />
            </div>
          </aside>
          <div className="min-w-0">
            <PipelineExplorer />
            <MethodExplorer key={method} method={method} onMethodChange={changeMethod} />
            <PaletteExtractionExplorer />
            <ImageComparisonLab />
          </div>
        </div>
      </main>
    </div>
  );
}
