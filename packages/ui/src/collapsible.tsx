"use client";

import * as React from "react";
import { Collapsible as Primitive } from "radix-ui";

function Collapsible(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="collapsible" {...props} />;
}
function CollapsibleTrigger(
  props: React.ComponentProps<typeof Primitive.Trigger>,
) {
  return <Primitive.Trigger data-slot="collapsible-trigger" {...props} />;
}
function CollapsibleContent(
  props: React.ComponentProps<typeof Primitive.Content>,
) {
  return <Primitive.Content data-slot="collapsible-content" {...props} />;
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
