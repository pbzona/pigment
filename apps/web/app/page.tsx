import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Beaker, Grid2X2, Hexagon, Palette } from "lucide-react";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  description: "Tools for transforming images with color, geometry, and inspectable algorithms.",
};

const colors = ["#171513", "#526f74", "#ef6a32", "#f5f2e8"] as const;
const squares = [0, 0, 1, 1, 2, 2, 3, 0, 1, 1, 2, 3, 3, 0, 0, 2, 2, 3, 1, 1, 1, 2, 3, 3] as const;
const voronoi = [
  ["0% 0%, 44% 0%, 36% 38%, 0% 45%", 0],
  ["44% 0%, 100% 0%, 100% 29%, 70% 46%, 36% 38%", 1],
  ["0% 45%, 36% 38%, 53% 65%, 22% 100%, 0% 100%", 2],
  ["36% 38%, 70% 46%, 74% 100%, 22% 100%, 53% 65%", 3],
  ["70% 46%, 100% 29%, 100% 100%, 74% 100%", 0],
] as const;

export default function Home() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader active="home" />
      <main className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize: "32px 32px", maskImage: "linear-gradient(to bottom, black, transparent 92%)" }} aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,.78fr)_minmax(38rem,1.22fr)] lg:px-8">
          <section className="max-w-xl">
            <Palette className="size-6 text-primary" aria-hidden="true" />
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.94] tracking-[-0.04em] sm:text-7xl">Pigment</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Transform images with limited palettes, different cell shapes, and algorithms you can inspect.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/studio" prefetch={false} className="group flex min-h-24 min-w-52 items-center justify-between border-2 border-border bg-primary p-5 text-primary-foreground shadow-[4px_4px_0_var(--shadow)] transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span><Grid2X2 className="mb-2 size-5" /><span className="block font-medium">Studio</span><span className="mt-1 block text-xs opacity-75">Make an image</span></span>
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/lab" className="group flex min-h-24 min-w-52 items-center justify-between border-2 border-border bg-card p-5 shadow-[4px_4px_0_var(--shadow)] transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span><Beaker className="mb-2 size-5 text-primary" /><span className="block font-medium">Lab</span><span className="mt-1 block text-xs text-muted-foreground">Inspect the methods</span></span>
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>

          <section className="mx-auto w-full max-w-3xl border-2 border-border bg-card p-4 shadow-[10px_10px_0_var(--shadow)] sm:p-6" aria-labelledby="partition-demo-heading">
            <div className="flex items-center justify-between gap-4 border-b border-foreground/10 pb-4">
              <div>
                <h2 id="partition-demo-heading" className="text-sm font-medium">One image, three partitions</h2>
                <p className="mt-1 text-xs text-muted-foreground">The same four-color reduction, divided three ways.</p>
              </div>
              <Hexagon className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div className="mt-4 grid gap-px bg-foreground/10 sm:grid-cols-3">
              <article className="bg-background p-3">
                <div className="grid aspect-[4/3] grid-cols-6 gap-px bg-foreground/10" aria-hidden="true">
                  {squares.map((color, index) => <span key={index} style={{ backgroundColor: colors[color] }} />)}
                </div>
                <p className="mt-3 text-sm font-medium">Square</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Regular cells support every method.</p>
              </article>
              <article className="bg-background p-3">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#526f74]" aria-hidden="true">
                  {Array.from({ length: 20 }, (_, index) => {
                    const column = index % 5;
                    const row = Math.floor(index / 5);
                    return <span key={index} className="absolute h-[29%] w-[25%]" style={{ left: `${column * 20 - 2}%`, top: `${row * 26 + (column % 2) * 13 - 7}%`, clipPath: "polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)", backgroundColor: colors[squares[index]] }} />;
                  })}
                </div>
                <p className="mt-3 text-sm font-medium">Hexagonal</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Even geometry without a square grid.</p>
              </article>
              <article className="bg-background p-3">
                <div className="relative aspect-[4/3] overflow-hidden" aria-hidden="true">
                  {voronoi.map(([shape, color], index) => <span key={index} className="absolute inset-0" style={{ clipPath: `polygon(${shape})`, backgroundColor: colors[color] }} />)}
                </div>
                <p className="mt-3 text-sm font-medium">Voronoi</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Stable irregular cells from Poisson points.</p>
              </article>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
