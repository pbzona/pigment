import * as React from "react";

import { cn } from "./utils";

type BrandMarkProps = React.ComponentProps<"span">;

function BrandMark({ className, ...props }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="brand-mark"
      className={cn(
        "grid size-9 shrink-0 grid-cols-2 border-2 border-border bg-border shadow-[3px_3px_0_var(--primary)]",
        className,
      )}
      {...props}
    >
      <span className="bg-yellow" />
      <span className="bg-primary" />
      <span className="bg-blue" />
      <span className="bg-green" />
    </span>
  );
}

export { BrandMark };
