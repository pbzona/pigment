"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as Primitive } from "radix-ui";
import { cn } from "./utils";

function Select(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="select" {...props} />;
}
function SelectGroup(props: React.ComponentProps<typeof Primitive.Group>) {
  return <Primitive.Group data-slot="select-group" {...props} />;
}
function SelectValue(props: React.ComponentProps<typeof Primitive.Value>) {
  return <Primitive.Value data-slot="select-value" {...props} />;
}
function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-10 w-fit min-w-32 items-center justify-between gap-3 border-2 border-input bg-background px-3 text-sm font-bold outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.Icon asChild>
        <ChevronDownIcon className="size-4" />
      </Primitive.Icon>
    </Primitive.Trigger>
  );
}
function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          "z-50 max-h-[var(--radix-select-content-available-height)] min-w-36 overflow-y-auto border-2 border-border bg-popover p-1 text-popover-foreground",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <Primitive.Viewport className="min-w-[var(--radix-select-trigger-width)]">
          {children}
        </Primitive.Viewport>
        <SelectScrollDownButton />
      </Primitive.Content>
    </Primitive.Portal>
  );
}
function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Label>) {
  return (
    <Primitive.Label
      className={cn(
        "px-2 py-1 font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex cursor-default select-none items-center py-2 pl-2 pr-8 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <Primitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </Primitive.ItemIndicator>
      </span>
      <Primitive.ItemText>{children}</Primitive.ItemText>
    </Primitive.Item>
  );
}
function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Separator>) {
  return (
    <Primitive.Separator
      className={cn("-mx-1 my-1 h-0.5 bg-border", className)}
      {...props}
    />
  );
}
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.ScrollUpButton>) {
  return (
    <Primitive.ScrollUpButton
      className={cn("flex items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </Primitive.ScrollUpButton>
  );
}
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.ScrollDownButton>) {
  return (
    <Primitive.ScrollDownButton
      className={cn("flex items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </Primitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
