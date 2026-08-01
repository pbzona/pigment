"use client";

import * as React from "react";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { DropdownMenu as Primitive } from "radix-ui";
import { cn } from "./utils";

const itemStyles =
  "relative flex cursor-default select-none items-center gap-2 px-2 py-1.5 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8";

function DropdownMenu(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="dropdown-menu" {...props} />;
}
function DropdownMenuPortal(
  props: React.ComponentProps<typeof Primitive.Portal>,
) {
  return <Primitive.Portal {...props} />;
}
function DropdownMenuTrigger(
  props: React.ComponentProps<typeof Primitive.Trigger>,
) {
  return <Primitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}
function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-40 overflow-hidden border-2 border-border bg-popover p-1 text-popover-foreground",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
function DropdownMenuGroup(
  props: React.ComponentProps<typeof Primitive.Group>,
) {
  return <Primitive.Group {...props} />;
}
function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof Primitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <Primitive.Item
      data-inset={inset}
      data-variant={variant}
      className={cn(
        itemStyles,
        "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive data-[variant=destructive]:focus:text-destructive-foreground",
        className,
      )}
      {...props}
    />
  );
}
function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof Primitive.CheckboxItem>) {
  return (
    <Primitive.CheckboxItem
      checked={checked}
      className={cn(itemStyles, "pr-8", className)}
      {...props}
    >
      {children}
      <span className="absolute right-2">
        <Primitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </Primitive.ItemIndicator>
      </span>
    </Primitive.CheckboxItem>
  );
}
function DropdownMenuRadioGroup(
  props: React.ComponentProps<typeof Primitive.RadioGroup>,
) {
  return <Primitive.RadioGroup {...props} />;
}
function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.RadioItem>) {
  return (
    <Primitive.RadioItem
      className={cn(itemStyles, "pr-8", className)}
      {...props}
    >
      {children}
      <span className="absolute right-2">
        <Primitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </Primitive.ItemIndicator>
      </span>
    </Primitive.RadioItem>
  );
}
function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof Primitive.Label> & { inset?: boolean }) {
  return (
    <Primitive.Label
      data-inset={inset}
      className={cn(
        "px-2 py-1 font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground data-inset:pl-8",
        className,
      )}
      {...props}
    />
  );
}
function DropdownMenuSeparator({
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
function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "ml-auto font-mono text-xs tracking-widest text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
function DropdownMenuSub(props: React.ComponentProps<typeof Primitive.Sub>) {
  return <Primitive.Sub {...props} />;
}
function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.SubTrigger> & { inset?: boolean }) {
  return (
    <Primitive.SubTrigger
      data-inset={inset}
      className={cn(itemStyles, className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </Primitive.SubTrigger>
  );
}
function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.SubContent>) {
  return (
    <Primitive.SubContent
      className={cn(
        "z-50 min-w-40 border-2 border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_var(--shadow)]",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
