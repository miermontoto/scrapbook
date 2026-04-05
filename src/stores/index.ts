import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createCanvasSlice, type CanvasSlice } from "./canvasSlice";
import { createNodesSlice, type NodesSlice } from "./nodesSlice";
import { createTerminalSlice, type TerminalSlice } from "./terminalSlice";
import { createVaultSlice, type VaultSlice } from "./vaultSlice";
import { createSelectionSlice, type SelectionSlice } from "./selectionSlice";
import { createSettingsSlice, type SettingsSlice } from "./settingsSlice";

export type AppStore = CanvasSlice &
  NodesSlice &
  TerminalSlice &
  VaultSlice &
  SelectionSlice &
  SettingsSlice;

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((...args) => ({
    ...createCanvasSlice(...args),
    ...createNodesSlice(...args),
    ...createTerminalSlice(...args),
    ...createVaultSlice(...args),
    ...createSelectionSlice(...args),
    ...createSettingsSlice(...args),
  })),
);

// exponer store en dev para debug remoto
if (import.meta.env.DEV) {
  (window as any).__STORE = useAppStore;
  (window as any).__DEBUG_ACTIONS = {
    addTerminal: (x = 100, y = 100) => useAppStore.getState().addNode("terminal", x, y),
    getNodes: () => [...useAppStore.getState().nodes.entries()],
    getState: () => useAppStore.getState(),
  };

}
