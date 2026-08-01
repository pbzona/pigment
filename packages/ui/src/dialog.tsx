"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as Primitive } from "radix-ui";
import { Button } from "./button";
import { cn } from "./utils";

function Dialog(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="dialog" {...props} />;
}
function DialogTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="dialog-trigger" {...props} />;
}
function DialogPortal(props: React.ComponentProps<typeof Primitive.Portal>) {
  return <Primitive.Portal data-slot="dialog-portal" {...props} />;
}
function DialogClose(props: React.ComponentProps<typeof Primitive.Close>) {
  return <Primitive.Close data-slot="dialog-close" {...props} />;
}
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Overlay>) {
  return (
    <Primitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/75 data-open:animate-in data-closed:animate-out",
        className,
      )}
      {...props}
    />
  );
}
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Primitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <Primitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border-2 border-border bg-popover p-5 text-popover-foreground outline-none",
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
              className="absolute right-2 top-2"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </Primitive.Close>
        )}
      </Primitive.Content>
    </DialogPortal>
  );
}
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t-2 border-border pt-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-xl font-bold", className)}
      {...props}
    />
  );
}
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
