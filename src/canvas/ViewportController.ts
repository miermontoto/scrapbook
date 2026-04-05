import { useAppStore } from "../stores";

const ZOOM_SPEED = 0.001;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;

export class ViewportController {
  private canvas: HTMLCanvasElement;
  private isPanning = false;
  private lastX = 0;
  private lastY = 0;
  private spaceHeld = false;

  // handlers con bind para poder removerlos
  private onWheel: (e: WheelEvent) => void;
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.onWheel = this.handleWheel.bind(this);
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);

    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const store = useAppStore.getState();
    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, store.zoom * (1 - e.deltaY * ZOOM_SPEED)),
    );
    store.zoomTo(newZoom, e.offsetX, e.offsetY);
  }

  private handlePointerDown(e: PointerEvent) {
    // boton central o space + click izquierdo
    if (e.button === 1 || (e.button === 0 && this.spaceHeld)) {
      this.isPanning = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.canvas.style.cursor = "grabbing";
      e.preventDefault();
    }
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isPanning) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    useAppStore.getState().panBy(dx, dy);
  }

  private handlePointerUp(_e: PointerEvent) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.spaceHeld ? "grab" : "default";
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.code === "Space" && !e.repeat) {
      this.spaceHeld = true;
      this.canvas.style.cursor = "grab";
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (e.code === "Space") {
      this.spaceHeld = false;
      if (!this.isPanning) {
        this.canvas.style.cursor = "default";
      }
    }
  }

  destroy() {
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
