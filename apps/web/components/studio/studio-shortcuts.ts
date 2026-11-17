import type { EditorTool } from "./types";

type ShortcutEvent = Readonly<{
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}>;

export type StudioShortcut =
  | Readonly<{ kind: "undo" | "redo" | "select" }>
  | Readonly<{ kind: "paint"; tool: EditorTool }>;

const paintKeys: Readonly<Record<string, EditorTool>> = {
  p: "pencil",
  f: "fill",
  i: "eyedropper",
  e: "restore",
};

export function studioShortcut(event: ShortcutEvent): StudioShortcut | null {
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && !event.altKey && key === "z") {
    return { kind: event.shiftKey ? "redo" : "undo" };
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (key === "s") return { kind: "select" };
  const tool = paintKeys[key];
  return tool ? { kind: "paint", tool } : null;
}
