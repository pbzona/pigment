"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FlaskConical, Layers3 } from "lucide-react";

import { Button } from "@pigment/ui/button";
import { CONVERSION_METHODS } from "@pigment/quantization";
import {
  PROJECT_SNAPSHOT_EVENT,
  readProjectSnapshot,
  type ProjectSnapshot,
} from "@/lib/browser/project-snapshot";

export function CurrentProjectPanel() {
  const [project, setProject] = useState<ProjectSnapshot | null>(null);

  useEffect(() => {
    const sync = () => setProject(readProjectSnapshot());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(PROJECT_SNAPSHOT_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(PROJECT_SNAPSHOT_EVENT, sync);
    };
  }, []);

  if (!project) {
    return (
      <aside className="border-2 border-border bg-card p-5 shadow-[6px_6px_0_var(--shadow)]">
        <FlaskConical className="size-5 text-primary" aria-hidden="true" />
        <h2 className="mt-5 text-xl font-medium">No shared project yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Start in Studio, then return here to inspect the same procedure alongside the experiments.
        </p>
        <Button asChild className="mt-5">
          <Link href="/studio">Start in Studio <ArrowRight data-icon="inline-end" /></Link>
        </Button>
      </aside>
    );
  }

  const method = CONVERSION_METHODS.find((entry) => entry.value === project.method)?.label ?? project.method;
  const displayName = /^[a-f\d]{24,}\.[a-z\d]+$/iu.test(project.name)
    ? "Current image"
    : project.name;

  return (
    <aside className="overflow-hidden border-2 border-border bg-card shadow-[6px_6px_0_var(--shadow)]">
      {project.thumbnail ? (
        // A local data URL is deliberately used: project images never leave the browser.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={project.thumbnail} alt="Current project source preview" className="aspect-[4/3] w-full object-cover" />
      ) : null}
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-primary">Current in Studio</span>
          <Layers3 className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="mt-3 truncate text-xl font-medium">{displayName}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-px border bg-foreground/10 text-[10px]">
          <div className="bg-background p-3"><dt className="text-muted-foreground">Partition</dt><dd className="mt-1 font-mono">{project.gridWidth}×{project.gridHeight} {project.partition ?? "square"}</dd></div>
          <div className="bg-background p-3"><dt className="text-muted-foreground">Sample</dt><dd className="mt-1 font-mono">{method}</dd></div>
          <div className="bg-background p-3"><dt className="text-muted-foreground">Palette</dt><dd className="mt-1 truncate font-mono">{project.paletteName}</dd></div>
          <div className="bg-background p-3"><dt className="text-muted-foreground">Interventions</dt><dd className="mt-1 font-mono">{project.interventionCount}</dd></div>
        </dl>
        <Button asChild variant="outline" className="mt-5 w-full">
          <Link href="/studio">Open in Studio <ArrowRight data-icon="inline-end" /></Link>
        </Button>
      </div>
    </aside>
  );
}
