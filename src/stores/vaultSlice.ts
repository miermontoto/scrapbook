import type { StateCreator } from "zustand";
import type { AppStore } from "./index";
import type { CanvasEntry } from "../types/vault";
import * as vaultIpc from "../ipc/vault";
import type { CanvasFile } from "../types/canvas";

export interface VaultSlice {
  vaultPath: string | null;
  vaultName: string | null;
  activeCanvasId: string | null;
  canvasList: CanvasEntry[];
  isDirty: boolean;

  openVault: (path: string) => Promise<void>;
  createVault: (path: string, name: string) => Promise<void>;
  saveCanvas: () => Promise<void>;
  loadCanvas: (canvasId: string) => Promise<void>;
  setDirty: () => void;
}

export const createVaultSlice: StateCreator<AppStore, [], [], VaultSlice> = (
  set,
  get,
) => ({
  vaultPath: null,
  vaultName: null,
  activeCanvasId: null,
  canvasList: [],
  isDirty: false,

  openVault: async (path) => {
    const config = await vaultIpc.openVault(path);
    const canvases = await vaultIpc.listCanvases(path);
    set({
      vaultPath: path,
      vaultName: (config.name as string) ?? path.split("/").pop(),
      canvasList: canvases,
      activeCanvasId: null,
    });

    // cargar el primer canvas disponible
    if (canvases.length > 0) {
      await get().loadCanvas(canvases[0].id);
    }
  },

  createVault: async (path, name) => {
    await vaultIpc.createVault(path, name);
    await get().openVault(path);
  },

  saveCanvas: async () => {
    const { vaultPath, activeCanvasId, nodes, nodeOrder, viewportX, viewportY, zoom } = get();
    if (!vaultPath || !activeCanvasId) return;

    const canvasData: CanvasFile = {
      version: 1,
      id: activeCanvasId,
      name: activeCanvasId,
      createdAt: "",
      modifiedAt: new Date().toISOString(),
      viewport: { x: viewportX, y: viewportY, zoom },
      nodes: nodeOrder
        .map((id) => nodes.get(id))
        .filter((n): n is NonNullable<typeof n> => n != null),
    };

    await vaultIpc.saveCanvas(
      vaultPath,
      activeCanvasId,
      JSON.stringify(canvasData, null, 2),
    );
    set({ isDirty: false });
  },

  loadCanvas: async (canvasId) => {
    const { vaultPath } = get();
    if (!vaultPath) return;

    const raw = await vaultIpc.loadCanvas(vaultPath, canvasId);
    const data: CanvasFile = JSON.parse(raw);

    const nodesMap = new Map(data.nodes.map((n) => [n.id, n]));
    const order = data.nodes.map((n) => n.id);

    set({
      activeCanvasId: canvasId,
      nodes: nodesMap,
      nodeOrder: order,
      viewportX: data.viewport.x,
      viewportY: data.viewport.y,
      zoom: data.viewport.zoom,
      isDirty: false,
    });
  },

  setDirty: () => set({ isDirty: true }),
});
