import Link from "next/link";

import { BrandMark } from "@pigment/ui/brand-mark";
import { Button } from "@pigment/ui/button";
import { cn } from "@/lib/utils";

type SiteHeaderProps = Readonly<{
  active?: "home" | "studio" | "lab" | "palettes";
  context?: string;
  className?: string;
}>;

const links = [
  { key: "lab", href: "/lab", label: "Lab" },
  { key: "palettes", href: "/palettes", label: "Palettes" },
] as const;

export function SiteHeader({ active, context, className }: SiteHeaderProps) {
  return (
    <header className={cn("sticky top-0 z-50 border-b-2 border-border bg-background", className)}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-current={active === "home" ? "page" : undefined}
        >
          <BrandMark className="size-7" />
          <span className="text-xs font-semibold tracking-[-0.02em]">PIGMENT</span>
          {context ? (
            <>
              <span className="hidden h-4 w-0.5 bg-border sm:block" aria-hidden="true" />
              <span className="hidden truncate font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground sm:block">
                {context}
              </span>
            </>
          ) : null}
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {links.map((link) => (
            <Button
              key={link.key}
              asChild
              variant={active === link.key ? "secondary" : "ghost"}
              size="sm"
              className={cn(link.key === "lab" && "hidden sm:inline-flex")}
            >
              <Link href={link.href} aria-current={active === link.key ? "page" : undefined}>
                {link.label}
              </Link>
            </Button>
          ))}
          <Button asChild size="sm" variant={active === "studio" ? "secondary" : "default"}>
            <Link href="/studio" prefetch={false} aria-current={active === "studio" ? "page" : undefined}>
              Studio
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
