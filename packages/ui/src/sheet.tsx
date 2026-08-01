"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as Primitive } from "radix-ui";
import { Button } from "./button";
import { cn } from "./utils";

function Sheet(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="sheet" {...props} />;
}
function SheetTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="sheet-trigger" {...props} />;
}
function SheetClose(props: React.ComponentProps<typeof Primitive.Close>) {
  return <Primitive.Close data-slot="sheet-close" {...props} />;
}
function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Overlay>) {
  return (
    <Primitive.Overlay
      className={cn("fixed inset-0 z-50 bg-black/75", className)}
      {...props}
    />
  );
}
function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Primitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  return (
    <Primitive.Portal>
      <SheetOverlay />
      <Primitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 border-border bg-popover text-popover-foreground outline-none data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:border-t-2 data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:w-3/4 data-[side=left]:border-r-2 data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:w-3/4 data-[side=right]:border-l-2 data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:border-b-2 sm:max-w-md",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <Primitive.Close asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-3"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </Primitive.Close>
        )}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid gap-2 border-b-2 border-border p-5", className)}
      {...props}
    />
  );
}
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-auto flex flex-col gap-2 border-t-2 border-border p-5",
        className,
      )}
      {...props}
    />
  );
}
function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      className={cn("font-heading text-xl font-bold", className)}
      {...props}
    />
  );
}
function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
