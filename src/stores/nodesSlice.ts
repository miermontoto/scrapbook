import type { StateCreator } from "zustand";
import type { AppStore } from "./index";
import type { NodeData, NodeType } from "../types/node";

export interface NodesSlice {
  nodes: Map<string, NodeData>;
  nodeOrder: string[];

  addNode: (
    type: NodeType,
    x: number,
    y: number,
    meta?: Record<string, unknown>,
  ) => string;
  removeNode: (id: string) => void;
  updateNode: (id: string, partial: Partial<NodeData>) => void;
  moveNode: (id: string, x: number, y: number) => void;
  resizeNode: (id: string, width: number, height: number) => void;
  bringToFront: (id: string) => void;
}

const DEFAULT_TERMINAL_WIDTH = 720;
const DEFAULT_TERMINAL_HEIGHT = 480;

export const createNodesSlice: StateCreator<AppStore, [], [], NodesSlice> = (
  set,
  get,
) => ({
  nodes: new Map(),
  nodeOrder: [],

  addNode: (type, x, y, meta = {}) => {
    const id = crypto.randomUUID();
    const { nodeOrder } = get();
    const zIndex = nodeOrder.length;

    const node: NodeData = {
      id,
      type,
      x,
      y,
      width: DEFAULT_TERMINAL_WIDTH,
      height: DEFAULT_TERMINAL_HEIGHT,
      zIndex,
      meta,
    };

    set((s) => {
      const next = new Map(s.nodes);
      next.set(id, node);
      return { nodes: next, nodeOrder: [...s.nodeOrder, id], isDirty: true };
    });

    return id;
  },

  removeNode: (id) =>
    set((s) => {
      const next = new Map(s.nodes);
      next.delete(id);
      return {
        nodes: next,
        nodeOrder: s.nodeOrder.filter((nid) => nid !== id),
        isDirty: true,
      };
    }),

  updateNode: (id, partial) =>
    set((s) => {
      const existing = s.nodes.get(id);
      if (!existing) return s;
      const next = new Map(s.nodes);
      next.set(id, { ...existing, ...partial });
      return { nodes: next };
    }),

  moveNode: (id, x, y) => get().updateNode(id, { x, y }),

  resizeNode: (id, width, height) => get().updateNode(id, { width, height }),

  bringToFront: (id) =>
    set((s) => {
      const order = s.nodeOrder.filter((nid) => nid !== id);
      order.push(id);
      const next = new Map(s.nodes);
      order.forEach((nid, i) => {
        const node = next.get(nid);
        if (node) next.set(nid, { ...node, zIndex: i });
      });
      return { nodes: next, nodeOrder: order };
    }),
});
