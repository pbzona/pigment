"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      <aside className="border border-foreground/20 bg-card p-5">
        <h2 className="text-lg font-medium">Start with a sample.</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Make something in Studio, then bring its image and settings here to
          compare methods. Or explore the teaching examples below.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/studio">
            Open Studio <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </aside>
    );
  }

  const method =
    CONVERSION_METHODS.find((entry) => entry.value === project.method)?.label ??
    project.method;
  const displayName = /^[a-f\d]{24,}\.[a-z\d]+$/iu.test(project.name)
    ? "Current image"
    : project.name;

  return (
    <aside
      className="border border-foreground/20 bg-card p-4 sm:p-5"
      aria-label="Current Studio project"
    >
      <div className="flex items-start gap-4">
        {project.thumbnail ? (
          // Local source thumbnail: this is not the finished Studio artwork.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.thumbnail}
            alt="Studio source image"
            className="size-20 shrink-0 border border-foreground/15 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-medium">{displayName}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Current in Studio · {project.gridWidth}×{project.gridHeight}{" "}
            {project.partition === "hex"
              ? "hexagonal"
              : (project.partition ?? "square")}{" "}
            cells
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {method} · {project.paletteName}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-3">
        <p className="text-xs leading-5 text-muted-foreground">
          Lab experiments leave this project unchanged.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/studio">
            Back to Studio <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
