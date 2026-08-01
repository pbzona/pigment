"use client";

import * as React from "react";
import { Popover as Primitive } from "radix-ui";
import { cn } from "./utils";

function Popover(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="popover" {...props} />;
}
function PopoverTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="popover-trigger" {...props} />;
}
function PopoverAnchor(props: React.ComponentProps<typeof Primitive.Anchor>) {
  return <Primitive.Anchor data-slot="popover-anchor" {...props} />;
}
function PopoverContent({
  className,
  align = "center",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 border-2 border-border bg-popover p-4 text-sm text-popover-foreground outline-none data-open:animate-in data-closed:animate-out",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("grid gap-1.5", className)}
      {...props}
    />
  );
}
function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="popover-title"
      className={cn("font-heading font-bold", className)}
      {...props}
    />
  );
}
function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
};
