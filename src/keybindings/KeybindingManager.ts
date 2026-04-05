import { useAppStore } from "../stores";
import { DEFAULT_BINDINGS } from "./defaults";

const BUTTON_MAP: Record<number, string> = {
  0: "left",
  1: "middle",
  2: "right",
};

const MODIFIER_KEYS = new Set(["ctrl", "shift", "alt", "meta"]);

interface ParsedBinding {
  modifiers: Set<string>;
  key: string; // tecla, boton o "wheel"
}

function parse(binding: string): ParsedBinding {
  const parts = binding.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const modifiers = new Set(parts.slice(0, -1).filter((p) => MODIFIER_KEYS.has(p)));
  // partes que no son modificadores estandar pero tampoco la tecla final
  // (ej: "space" en "space+left") se tratan como hold-keys
  const holdParts = parts.slice(0, -1).filter((p) => !MODIFIER_KEYS.has(p));
  for (const h of holdParts) {
    modifiers.add(`hold:${h}`);
  }
  return { modifiers, key };
}

function eventModifiers(e: KeyboardEvent | PointerEvent | MouseEvent): Set<string> {
  const mods = new Set<string>();
  if (e.ctrlKey) mods.add("ctrl");
  if (e.shiftKey) mods.add("shift");
  if (e.altKey) mods.add("alt");
  if (e.metaKey) mods.add("meta");
  return mods;
}

function normalizeKey(e: KeyboardEvent): string {
  // mapear e.key a nombres consistentes
  const key = e.key.toLowerCase();
  if (key === " ") return "space";
  if (key === ",") return ",";
  return key;
}

class KeybindingManagerSingleton {
  /** obtener el binding string para una accion (custom o default) */
  getBinding(actionId: string): string {
    const overrides = useAppStore.getState().settings.keybindings;
    return overrides[actionId] ?? DEFAULT_BINDINGS[actionId] ?? "";
  }

  /** verificar si un KeyboardEvent coincide con la accion */
  matchesKey(actionId: string, e: KeyboardEvent): boolean {
    const binding = this.getBinding(actionId);
    if (!binding) return false;
    const parsed = parse(binding);
    const key = normalizeKey(e);
    if (key !== parsed.key) return false;
    // verificar modificadores estandar
    const eMods = eventModifiers(e);
    for (const mod of parsed.modifiers) {
      if (mod.startsWith("hold:")) continue; // hold-keys no aplican a keyboard events
      if (!eMods.has(mod)) return false;
    }
    // verificar que no haya modificadores extra no esperados
    for (const mod of eMods) {
      if (!parsed.modifiers.has(mod)) return false;
    }
    return true;
  }

  /** verificar si un PointerEvent coincide con una accion de mouse */
  matchesMouse(
    actionId: string,
    e: PointerEvent | MouseEvent,
    heldKeys?: Set<string>,
  ): boolean {
    const binding = this.getBinding(actionId);
    if (!binding) return false;
    const parsed = parse(binding);

    // verificar boton
    const button = BUTTON_MAP[e.button] ?? "";
    if (button !== parsed.key && parsed.key !== "wheel") return false;

    // verificar modificadores estandar
    const eMods = eventModifiers(e);
    for (const mod of parsed.modifiers) {
      if (mod.startsWith("hold:")) {
        // verificar hold-keys contra el set proporcionado
        const holdKey = mod.slice(5);
        if (!heldKeys?.has(holdKey)) return false;
      } else {
        if (!eMods.has(mod)) return false;
      }
    }
    return true;
  }

  /** verificar si el modificador de una accion esta activo en un evento */
  matchesModifier(
    actionId: string,
    e: PointerEvent | MouseEvent | KeyboardEvent,
  ): boolean {
    const binding = this.getBinding(actionId);
    if (!binding) return false;
    // para modificadores simples como "shift", verificar directamente
    switch (binding.toLowerCase()) {
      case "shift": return e.shiftKey;
      case "ctrl": return e.ctrlKey;
      case "alt": return e.altKey;
      case "meta": return e.metaKey;
    }
    return false;
  }

  /** string para mostrar en UI: "Ctrl+T", "Middle Click", etc. */
  getDisplayString(actionId: string): string {
    const binding = this.getBinding(actionId);
    if (!binding) return "";
    return binding
      .split("+")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("+");
  }

  /** convertir un KeyboardEvent a un binding string (para record mode) */
  eventToBinding(e: KeyboardEvent): string | null {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push("ctrl");
    if (e.shiftKey) parts.push("shift");
    if (e.altKey) parts.push("alt");
    if (e.metaKey) parts.push("meta");

    const key = normalizeKey(e);
    // ignorar eventos de solo modificador
    if (["control", "shift", "alt", "meta"].includes(key)) return null;
    parts.push(key);
    return parts.join("+");
  }

  /** convertir un MouseEvent a un binding string (para record mode) */
  mouseEventToBinding(e: MouseEvent): string | null {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push("ctrl");
    if (e.shiftKey) parts.push("shift");
    if (e.altKey) parts.push("alt");
    if (e.metaKey) parts.push("meta");
    const button = BUTTON_MAP[e.button];
    if (!button) return null;
    parts.push(button);
    return parts.join("+");
  }
}

export const km = new KeybindingManagerSingleton();
