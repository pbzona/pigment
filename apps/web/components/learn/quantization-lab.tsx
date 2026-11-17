"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";

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

const methodForHash = (hash: string): ConversionMethod | null => {
  const slug = hash.replace(/^#/u, "");
  return CONVERSION_METHODS.find((entry) => entry.slug === slug)?.value ?? null;
};

const LAB_SECTIONS = [
  { href: "#compare", label: "Your image", detail: "Compare two methods" },
  { href: "#pipeline", label: "Pipeline", detail: "Follow one example cell" },
  { href: "#methods", label: "Methods", detail: "Explore teaching examples" },
  {
    href: "#palette-extraction",
    label: "Palette",
    detail: "See color extraction",
  },
] as const;

type LearningNavProps = Readonly<{
  method: ConversionMethod;
  activeSection: string;
  mobile?: boolean;
}>;

function LearningNav({
  method,
  activeSection,
  mobile = false,
}: LearningNavProps) {
  const activeMethod = CONVERSION_METHODS.find(
    (entry) => entry.value === method,
  );
  return (
    <nav
      aria-label="Lab sections"
      className={mobile ? "grid grid-cols-4" : "border-l border-foreground/15"}
    >
      {LAB_SECTIONS.map((section) => (
        <a
          key={section.href}
          href={section.href}
          aria-current={activeSection === section.href ? "location" : undefined}
          className={cn(
            "transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            mobile
              ? "flex min-h-11 items-center justify-center px-1 py-3 text-xs"
              : "block border-l-2 py-3 pl-4 pr-2",
            activeSection === section.href
              ? "border-primary bg-primary/10 text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span className="block text-xs">{section.label}</span>
          {!mobile ? (
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {section.detail}
            </span>
          ) : null}
        </a>
      ))}
      {!mobile ? (
        <div className="ml-4 mt-5 border-t border-foreground/10 pt-4">
          <p className="text-xs leading-5 text-muted-foreground">
            Teaching example
          </p>
          <p className="mt-2 text-sm text-primary">{activeMethod?.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {activeMethod?.description}
          </p>
        </div>
      ) : null}
    </nav>
  );
}

export function QuantizationLab() {
  const [method, setMethod] = useState<ConversionMethod>("dominant");
  const [activeSection, setActiveSection] = useState("#compare");

  useEffect(() => {
    const syncHash = () => {
      const nextMethod = methodForHash(window.location.hash);
      if (nextMethod) {
        setMethod(nextMethod);
        setActiveSection("#methods");
      } else if (
        LAB_SECTIONS.some((entry) => entry.href === window.location.hash)
      ) {
        setActiveSection(window.location.hash);
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const changeMethod = (nextMethod: ConversionMethod) => {
    setMethod(nextMethod);
    setActiveSection("#methods");
    const slug = CONVERSION_METHODS.find(
      (entry) => entry.value === nextMethod,
    )?.slug;
    if (slug) window.history.replaceState(null, "", `#${slug}`);
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader active="lab" context="Experiment lab" />
      <main>
        <section className="border-b border-foreground/15">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_1fr] lg:px-8">
            <div>
              <h1 className="text-4xl font-semibold leading-none tracking-[-0.04em] sm:text-5xl">
                Lab
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                Try a different method without changing your artwork. Then
                explore the examples to see how each color decision is made.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild>
                  <a href="#compare">
                    Compare your image <ArrowDown data-icon="inline-end" />
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="#methods">Explore the methods</a>
                </Button>
              </div>
            </div>
            <CurrentProjectPanel />
          </div>
        </section>
        <div className="sticky top-14 z-40 border-b-2 border-border bg-background lg:hidden">
          <LearningNav method={method} activeSection={activeSection} mobile />
        </div>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:px-8">
          <aside className="hidden lg:block">
            <div className="sticky top-24 pt-12">
              <LearningNav method={method} activeSection={activeSection} />
            </div>
          </aside>
          <div className="min-w-0 [&_section]:scroll-mt-28">
            <ImageComparisonLab />
            <div className="mt-16 border-t border-foreground/15 pt-8 sm:mt-24">
              <h2 className="text-2xl font-medium tracking-[-0.03em]">
                Small examples. Visible decisions.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                The lessons below use fixed teaching images and palettes, not
                your Studio project. Select cells and step through the
                calculations to learn how the methods work.
              </p>
            </div>
            <PipelineExplorer />
            <MethodExplorer
              key={method}
              method={method}
              onMethodChange={changeMethod}
            />
            <PaletteExtractionExplorer />
          </div>
        </div>
      </main>
    </div>
  );
}
