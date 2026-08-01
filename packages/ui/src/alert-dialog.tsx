"use client";

import * as React from "react";
import { AlertDialog as Primitive } from "radix-ui";
import { buttonVariants, type Button } from "./button";
import { cn } from "./utils";

function AlertDialog(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="alert-dialog" {...props} />;
}
function AlertDialogTrigger(
  props: React.ComponentProps<typeof Primitive.Trigger>,
) {
  return <Primitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}
function AlertDialogPortal(
  props: React.ComponentProps<typeof Primitive.Portal>,
) {
  return <Primitive.Portal {...props} />;
}
function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Overlay>) {
  return (
    <Primitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-black/75", className)}
      {...props}
    />
  );
}
function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <Primitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border-2 border-border bg-popover p-5 text-popover-foreground outline-none",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-2", className)} {...props} />;
}
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t-2 border-border pt-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
function AlertDialogTitle({
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
function AlertDialogDescription({
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
type ButtonOptions = Pick<
  React.ComponentProps<typeof Button>,
  "variant" | "size"
>;
function AlertDialogAction({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof Primitive.Action> & ButtonOptions) {
  return (
    <Primitive.Action
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
function AlertDialogCancel({
  className,
  variant = "outline",
  size,
  ...props
}: React.ComponentProps<typeof Primitive.Cancel> & ButtonOptions) {
  return (
    <Primitive.Cancel
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
