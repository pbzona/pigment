"use client";

import { useState } from "react";

export function CopyColorButton({ color }: { color: string }) {
  const [copied, setCopied] = useState(false);

  async function copyColor() {
    await navigator.clipboard.writeText(color);
    setCopied(true);
  }

  return (
    <button className="copy-button" type="button" onClick={copyColor}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
