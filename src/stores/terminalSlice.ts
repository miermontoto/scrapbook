import type { StateCreator } from "zustand";
import type { AppStore } from "./index";
import type { TerminalState } from "../types/terminal";

export interface TerminalSlice {
  terminals: Map<string, TerminalState>;
  focusedTerminalId: string | null;

  registerTerminal: (nodeId: string, state: TerminalState) => void;
  unregisterTerminal: (nodeId: string) => void;
  setFocusedTerminal: (nodeId: string | null) => void;
  updateTerminalMeta: (
    nodeId: string,
    partial: Partial<TerminalState>,
  ) => void;
}

export const createTerminalSlice: StateCreator<
  AppStore,
  [],
  [],
  TerminalSlice
> = (set) => ({
  terminals: new Map(),
  focusedTerminalId: null,

  registerTerminal: (nodeId, state) =>
    set((s) => {
      const next = new Map(s.terminals);
      next.set(nodeId, state);
      return { terminals: next };
    }),

  unregisterTerminal: (nodeId) =>
    set((s) => {
      const next = new Map(s.terminals);
      next.delete(nodeId);
      const focused =
        s.focusedTerminalId === nodeId ? null : s.focusedTerminalId;
      return { terminals: next, focusedTerminalId: focused };
    }),

  setFocusedTerminal: (nodeId) => set({ focusedTerminalId: nodeId }),

  updateTerminalMeta: (nodeId, partial) =>
    set((s) => {
      const existing = s.terminals.get(nodeId);
      if (!existing) return s;
      const next = new Map(s.terminals);
      next.set(nodeId, { ...existing, ...partial });
      return { terminals: next };
    }),
});
