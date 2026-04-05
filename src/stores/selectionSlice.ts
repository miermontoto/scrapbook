import type { StateCreator } from "zustand";
import type { AppStore } from "./index";

export interface SelectionSlice {
  selectedNodeIds: Set<string>;

  selectNode: (id: string, additive?: boolean) => void;
  deselectNode: (id: string) => void;
  clearSelection: () => void;
  selectMultiple: (ids: string[]) => void;
}

export const createSelectionSlice: StateCreator<
  AppStore,
  [],
  [],
  SelectionSlice
> = (set) => ({
  selectedNodeIds: new Set(),

  selectNode: (id, additive = false) =>
    set((s) => {
      if (additive) {
        const next = new Set(s.selectedNodeIds);
        next.add(id);
        return { selectedNodeIds: next };
      }
      return { selectedNodeIds: new Set([id]) };
    }),

  deselectNode: (id) =>
    set((s) => {
      const next = new Set(s.selectedNodeIds);
      next.delete(id);
      return { selectedNodeIds: next };
    }),

  clearSelection: () => set({ selectedNodeIds: new Set() }),

  selectMultiple: (ids) => set({ selectedNodeIds: new Set(ids) }),
});
