import type { StateCreator } from "zustand";
import type { AppStore } from "./index";

export interface CanvasSlice {
  viewportX: number;
  viewportY: number;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;

  panBy: (dx: number, dy: number) => void;
  panTo: (x: number, y: number) => void;
  zoomTo: (level: number, pivotX: number, pivotY: number) => void;
  setCanvasSize: (w: number, h: number) => void;
  screenToWorld: (sx: number, sy: number) => { x: number; y: number };
  worldToScreen: (wx: number, wy: number) => { x: number; y: number };
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;

export const createCanvasSlice: StateCreator<AppStore, [], [], CanvasSlice> = (
  set,
  get,
) => ({
  viewportX: 0,
  viewportY: 0,
  zoom: 1,
  canvasWidth: 0,
  canvasHeight: 0,

  panBy: (dx, dy) =>
    set((s) => ({ viewportX: s.viewportX + dx, viewportY: s.viewportY + dy })),

  panTo: (x, y) => set({ viewportX: x, viewportY: y }),

  zoomTo: (level, pivotX, pivotY) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    const { zoom, viewportX, viewportY } = get();
    const ratio = clamped / zoom;
    set({
      zoom: clamped,
      viewportX: pivotX - (pivotX - viewportX) * ratio,
      viewportY: pivotY - (pivotY - viewportY) * ratio,
    });
  },

  setCanvasSize: (w, h) => set({ canvasWidth: w, canvasHeight: h }),

  screenToWorld: (sx, sy) => {
    const { viewportX, viewportY, zoom } = get();
    return {
      x: (sx - viewportX) / zoom,
      y: (sy - viewportY) / zoom,
    };
  },

  worldToScreen: (wx, wy) => {
    const { viewportX, viewportY, zoom } = get();
    return {
      x: wx * zoom + viewportX,
      y: wy * zoom + viewportY,
    };
  },
});
