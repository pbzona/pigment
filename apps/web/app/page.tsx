import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Beaker, Layers3, Palette } from "lucide-react";

import { BrandMark } from "@pigment/ui/brand-mark";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  description:
    "A creative computation playground for transforming images through color, geometry, and inspectable algorithms.",
};

const cells = [
  "#11100f", "#526f74", "#526f74", "#f06a32", "#f06a32", "#f5f2e8",
  "#526f74", "#526f74", "#f06a32", "#f5f2e8", "#f5f2e8", "#11100f",
  "#11100f", "#f06a32", "#f06a32", "#f5f2e8", "#526f74", "#526f74",
  "#526f74", "#f06a32", "#f5f2e8", "#f5f2e8", "#526f74", "#11100f",
] as const;

export default function Home() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader active="home" />
      <main className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize: "32px 32px", maskImage: "linear-gradient(to bottom, black, transparent 92%)" }} aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,.9fr)_minmax(36rem,1.1fr)] lg:px-8">
          <section className="max-w-2xl">
            <Palette className="size-6 text-primary" aria-hidden="true" />
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.94] tracking-[-0.04em] sm:text-7xl">
              Compose the procedure. Inspect the result.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Pigment is a creative computation playground for transforming images through color, geometry, and algorithms you can see and change.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/studio" prefetch={false} className="group flex min-h-24 min-w-56 items-center justify-between border-2 border-border bg-primary p-5 text-primary-foreground shadow-[4px_4px_0_var(--shadow)] transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span><Layers3 className="mb-2 size-5" /><span className="block font-medium">Enter Studio</span><span className="mt-1 block text-xs opacity-70">Compose a transformation</span></span>
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/lab" className="group flex min-h-24 min-w-56 items-center justify-between border-2 border-border bg-card p-5 shadow-[4px_4px_0_var(--shadow)] transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span><Beaker className="mb-2 size-5 text-primary" /><span className="block font-medium">Enter Lab</span><span className="mt-1 block text-xs text-muted-foreground">Understand the machinery</span></span>
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>

          <section className="relative mx-auto w-full max-w-2xl" aria-label="Pigment procedure preview">
            <div className="absolute -left-5 -top-5 size-24 border-l border-t border-primary/55" aria-hidden="true" />
            <div className="grid border-2 border-border bg-card shadow-[10px_10px_0_var(--shadow)] lg:grid-cols-[13rem_1fr]">
              <div className="border-b-2 border-border p-4 lg:border-b-0 lg:border-r-2">
                <div className="flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Procedure</span><Layers3 className="size-4 text-primary" /></div>
                <ol className="mt-4 space-y-1.5 text-xs">
                  {["Source", "Frame", "Square partition", "Geometric median", "Map to palette", "No texture", "2 interventions", "Output"].map((step, index) => (
                    <li key={step} className={`flex items-center gap-2 border p-2 ${index === 3 ? "border-primary bg-primary/10" : "border-foreground/10"}`}><span className="font-mono text-[9px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><span>{step}</span></li>
                  ))}
                </ol>
              </div>
              <div className="p-5 sm:p-7">
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"><span>Image / procedure / output</span><span className="text-primary">Live</span></div>
                <div className="mt-5 grid grid-cols-6 gap-px bg-foreground/15 p-px" aria-hidden="true">
                  {cells.map((color, index) => <span key={index} className="aspect-square" style={{ backgroundColor: color }} />)}
                </div>
                <div className="mt-5 flex gap-2">{["#11100f", "#526f74", "#f06a32", "#f5f2e8"].map((color) => <span key={color} className="h-3 flex-1" style={{ backgroundColor: color }} />)}</div>
                <p className="mt-5 border-t border-foreground/10 pt-4 text-sm leading-6 text-muted-foreground">Studio and Lab are two views of the same local project: one for composing, one for investigation.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <footer className="border-t border-foreground/10"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><BrandMark className="size-5" /><span className="text-xs font-semibold">PIGMENT</span></div><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Studio / Lab · one shared project</p></div></footer>
    </div>
  );
}
