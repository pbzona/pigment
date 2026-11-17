"use client";

import * as React from "react";
import { Tabs as Primitive } from "radix-ui";
import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  );
}
function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof Primitive.List> & {
  variant?: "default" | "line";
}) {
  return (
    <Primitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "inline-flex w-fit items-center border-2 border-border bg-muted",
        variant === "line" && "border-x-0 border-t-0 bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "h-9 border-r-2 border-border px-4 font-mono text-xs font-bold uppercase tracking-wide outline-none last:border-r-0 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}
function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      data-slot="tabs-content"
      className={cn(
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
