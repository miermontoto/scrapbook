export interface ActionDef {
  id: string;
  label: string;
  category: "keyboard" | "mouse" | "modifier";
  defaultBinding: string;
}

export const ACTION_DEFS: ActionDef[] = [
  // teclado
  { id: "newTerminal", label: "New Terminal", category: "keyboard", defaultBinding: "ctrl+t" },
  { id: "closeTerminal", label: "Close Terminal", category: "keyboard", defaultBinding: "ctrl+q" },
  { id: "toggleSettings", label: "Toggle Settings", category: "keyboard", defaultBinding: "ctrl+," },
  { id: "deselect", label: "Deselect / Close", category: "keyboard", defaultBinding: "escape" },
  { id: "deleteSelected", label: "Delete Selected", category: "keyboard", defaultBinding: "delete" },
  { id: "panHold", label: "Pan (hold key)", category: "keyboard", defaultBinding: "space" },
  // mouse
  { id: "panDrag", label: "Pan (mouse button)", category: "mouse", defaultBinding: "middle" },
  { id: "panDragAlt", label: "Pan (alt combo)", category: "mouse", defaultBinding: "space+left" },
  { id: "zoomWheel", label: "Zoom (wheel)", category: "mouse", defaultBinding: "wheel" },
  { id: "deselectClick", label: "Deselect (click)", category: "mouse", defaultBinding: "left" },
  // modificador
  { id: "multiSelectMod", label: "Multi-select modifier", category: "modifier", defaultBinding: "shift" },
];

export const DEFAULT_BINDINGS: Record<string, string> = Object.fromEntries(
  ACTION_DEFS.map((a) => [a.id, a.defaultBinding]),
);
