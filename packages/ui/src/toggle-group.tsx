"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { ToggleGroup as Primitive } from "radix-ui";
import { toggleVariants } from "./toggle";
import { cn } from "./utils";

type ToggleOptions = VariantProps<typeof toggleVariants> & { spacing?: number };
const ToggleGroupContext = React.createContext<ToggleOptions>({});

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Root> & ToggleOptions) {
  return (
    <Primitive.Root
      data-slot="toggle-group"
      data-spacing={spacing}
      style={{ gap: `${spacing * 0.25}rem` }}
      className={cn("flex w-fit items-center", className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>
        {children}
      </ToggleGroupContext.Provider>
    </Primitive.Root>
  );
}

function ToggleGroupItem({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof Primitive.Item> & ToggleOptions) {
  const context = React.useContext(ToggleGroupContext);
  return (
    <Primitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "-ml-0.5 first:ml-0",
        toggleVariants({
          variant: context.variant ?? variant,
          size: context.size ?? size,
        }),
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
