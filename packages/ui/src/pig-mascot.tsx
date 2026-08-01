import * as React from "react";

import { cn } from "./utils";

type PigMascotProps = React.ComponentProps<"svg"> & {
  title?: string;
};

function PigMascot({
  className,
  title = "Pigment pig mascot",
  ...props
}: PigMascotProps) {
  const titleId = React.useId();
  return (
    <svg
      viewBox="0 0 160 150"
      role="img"
      aria-labelledby={titleId}
      className={cn("text-primary", className)}
      data-slot="pig-mascot"
      {...props}
    >
      <title id={titleId}>{title}</title>
      <path
        d="M27 54 12 18l41 18M133 54l15-36-41 18"
        fill="currentColor"
        stroke="var(--border, #f5f2e8)"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M22 79c0-35 25-57 58-57s58 22 58 57v18c0 29-24 47-58 47S22 126 22 97Z"
        fill="currentColor"
        stroke="var(--border, #f5f2e8)"
        strokeWidth="7"
      />
      <circle cx="56" cy="76" r="7" fill="var(--background, #11100f)" />
      <circle cx="108" cy="76" r="7" fill="var(--background, #11100f)" />
      <circle cx="59" cy="73" r="2.5" fill="var(--foreground, #f5f2e8)" />
      <circle cx="111" cy="73" r="2.5" fill="var(--foreground, #f5f2e8)" />
      <path
        d="M49 106c0-14 13-22 31-22s31 8 31 22-13 23-31 23-31-9-31-23Z"
        fill="var(--accent-yellow, #f2cf45)"
        stroke="var(--background, #11100f)"
        strokeWidth="5"
      />
      <ellipse
        cx="68"
        cy="106"
        rx="5"
        ry="7"
        fill="var(--background, #11100f)"
      />
      <ellipse
        cx="92"
        cy="106"
        rx="5"
        ry="7"
        fill="var(--background, #11100f)"
      />
      <path
        d="M23 89 4 82m133 7 19-7"
        fill="none"
        stroke="var(--accent-blue, #4d7cff)"
        strokeWidth="6"
        strokeLinecap="square"
      />
    </svg>
  );
}

export { PigMascot };
