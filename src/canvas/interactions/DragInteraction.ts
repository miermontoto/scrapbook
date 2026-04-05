import { useAppStore } from "../../stores";
import {
  calculateSnap,
  snapResize,
  type AlignmentGuide,
  type Rect,
} from "./snapCalculation";

type GuidesCallback = (guides: AlignmentGuide[]) => void;

/**
 * singleton que centraliza la logica de drag + snap.
 * ambos drag sites (BaseNode pixi y TerminalOverlay dom) llaman aqui
 * en lugar de moveNode directamente.
 */
export class DragCoordinator {
  private static instance: DragCoordinator | null = null;
  private activeGuides: AlignmentGuide[] = [];
  private onGuidesChanged: GuidesCallback | null = null;

  static getInstance(): DragCoordinator {
    if (!DragCoordinator.instance) {
      DragCoordinator.instance = new DragCoordinator();
    }
    return DragCoordinator.instance;
  }

  setGuidesCallback(cb: GuidesCallback): void {
    this.onGuidesChanged = cb;
  }

  handleDragMove(nodeId: string, rawX: number, rawY: number): void {
    const state = useAppStore.getState();
    const node = state.nodes.get(nodeId);
    if (!node) return;

    const { settings, zoom } = state;
    const proposed: Rect = {
      x: rawX,
      y: rawY,
      width: node.width,
      height: node.height,
    };

    // recoger otros nodos como rects
    const others: Rect[] = [];
    for (const [id, n] of state.nodes) {
      if (id !== nodeId) {
        others.push({ x: n.x, y: n.y, width: n.width, height: n.height });
      }
    }

    const worldThreshold = settings.snapThreshold / zoom;
    const result = calculateSnap(proposed, others, {
      magneticSnap: settings.magneticSnap,
      gridSnap: settings.gridSnap,
      gridSize: settings.gridSize,
      threshold: worldThreshold,
    });

    state.moveNode(nodeId, result.x, result.y);

    // actualizar guias solo si cambiaron
    if (!guidesEqual(this.activeGuides, result.guides)) {
      this.activeGuides = result.guides;
      this.onGuidesChanged?.(result.guides);
    }
  }

  handleResizeMove(nodeId: string, rawW: number, rawH: number): void {
    const { settings } = useAppStore.getState();
    if (settings.gridSnap) {
      const snapped = snapResize(rawW, rawH, settings.gridSize);
      useAppStore.getState().resizeNode(nodeId, snapped.width, snapped.height);
    } else {
      useAppStore.getState().resizeNode(nodeId, rawW, rawH);
    }
  }

  handleDragEnd(): void {
    if (this.activeGuides.length > 0) {
      this.activeGuides = [];
      this.onGuidesChanged?.([]);
    }
  }
}

function guidesEqual(a: AlignmentGuide[], b: AlignmentGuide[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ga = a[i];
    const gb = b[i];
    if (
      ga.axis !== gb.axis ||
      ga.position !== gb.position ||
      ga.type !== gb.type
    )
      return false;
  }
  return true;
}
