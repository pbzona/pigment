"use client";

import * as React from "react";
import { Slider as Primitive } from "radix-ui";
import { cn } from "./utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels,
  ...props
}: React.ComponentProps<typeof Primitive.Root> & {
  thumbLabels?: readonly string[];
}) {
  const values = value ?? defaultValue ?? [min];
  return (
    <Primitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex min-h-6 w-full touch-none select-none items-center data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <Primitive.Track className="relative h-2 w-full grow overflow-hidden border border-border bg-muted">
        <Primitive.Range className="absolute h-full bg-primary" />
      </Primitive.Track>
      {values.map((_, index) => {
        const thumbLabel = thumbLabels?.[index] ?? props["aria-label"];
        return (
          <Primitive.Thumb
            key={index}
            data-slot="slider-thumb"
            {...(thumbLabel ? { "aria-label": thumbLabel } : {})}
            aria-labelledby={
              thumbLabels?.[index] ? undefined : props["aria-labelledby"]
            }
            aria-describedby={props["aria-describedby"]}
            className="block size-6 border-2 border-border bg-foreground shadow-[2px_2px_0_var(--shadow)] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
          />
        );
      })}
    </Primitive.Root>
  );
}

export { Slider };
