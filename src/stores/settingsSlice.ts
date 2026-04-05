import type { StateCreator } from "zustand";
import type { AppStore } from "./index";

export interface AppSettings {
  // terminal
  terminalFontFamily: string;
  terminalFontSize: number;
  terminalScrollback: number;
  terminalCursorStyle: "block" | "underline" | "bar";
  defaultShell: string;
  // comportamiento
  focusOnHover: boolean;
  spawnAtMouse: boolean;
  // apariencia
  canvasBackground: string;
  gridDotColor: string;
  gridMajorDotColor: string;
  gridSize: number;
  nodeBorderColor: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  terminalFontFamily:
    "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro', 'Hack', 'IBM Plex Mono', 'Inconsolata', 'DejaVu Sans Mono', 'Liberation Mono', 'Noto Sans Mono', monospace",
  terminalFontSize: 14,
  terminalScrollback: 1000,
  terminalCursorStyle: "block",
  defaultShell: "",
  focusOnHover: true,
  spawnAtMouse: true,
  canvasBackground: "#11111b",
  gridDotColor: "#313244",
  gridMajorDotColor: "#45475a",
  gridSize: 40,
  nodeBorderColor: "#313244",
};

export interface SettingsSlice {
  settings: AppSettings;
  settingsOpen: boolean;
  updateSettings: (partial: Partial<AppSettings>) => void;
  toggleSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
}

export const createSettingsSlice: StateCreator<
  AppStore,
  [],
  [],
  SettingsSlice
> = (set) => ({
  settings: { ...DEFAULT_SETTINGS },
  settingsOpen: false,

  updateSettings: (partial) =>
    set((s) => ({
      settings: { ...s.settings, ...partial },
    })),

  toggleSettings: () =>
    set((s) => ({ settingsOpen: !s.settingsOpen })),

  setSettingsOpen: (open) => set({ settingsOpen: open }),
});
