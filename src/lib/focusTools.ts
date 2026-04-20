/**
 * Tools that can be opened as a full-screen overlay inside Modo Foco.
 * The FocusWorkspace listens for the "focus-open-tool" CustomEvent and
 * mounts the corresponding component on top of the chat without leaving
 * Focus mode.
 */
export type FocusToolKey =
  | "mindmap"
  | "mindmap-open"      // detail.mapId
  | "notebook"
  | "notebook-open"     // detail.noteId
  | "reading"
  | "devotional";

export interface FocusOpenToolDetail {
  tool: FocusToolKey;
  mapId?: string;
  noteId?: string;
  /** Free param (e.g. devotional reference) */
  ref?: string;
}

export function openFocusTool(detail: FocusOpenToolDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("focus-open-tool", { detail }));
}
