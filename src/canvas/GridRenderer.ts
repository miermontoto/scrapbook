import { Graphics } from "pixi.js";
import { useAppStore } from "../stores";

const DOT_RADIUS = 1.5;
const MAJOR_EVERY = 5;

export class GridRenderer {
  private graphics: Graphics;
  private screenWidth = 0;
  private screenHeight = 0;

  constructor(parent: import("pixi.js").Container) {
    this.graphics = new Graphics();
    parent.addChild(this.graphics);
  }

  setScreenSize(w: number, h: number) {
    this.screenWidth = w;
    this.screenHeight = h;
  }

  update(viewportX: number, viewportY: number, zoom: number) {
    const g = this.graphics;
    g.clear();

    const { settings } = useAppStore.getState();
    const gridSize = settings.gridSize;
    const dotColor = parseInt(settings.gridDotColor.replace("#", ""), 16);
    const majorColor = parseInt(settings.gridMajorDotColor.replace("#", ""), 16);

    const scaledGrid = gridSize * zoom;

    // no dibujar grid si es demasiado pequeno
    if (scaledGrid < 8) return;

    // calcular rango visible en coordenadas del mundo
    const startX = Math.floor(-viewportX / scaledGrid) - 1;
    const startY = Math.floor(-viewportY / scaledGrid) - 1;
    const endX = startX + Math.ceil(this.screenWidth / scaledGrid) + 2;
    const endY = startY + Math.ceil(this.screenHeight / scaledGrid) + 2;

    for (let gx = startX; gx <= endX; gx++) {
      for (let gy = startY; gy <= endY; gy++) {
        const sx = gx * scaledGrid + viewportX;
        const sy = gy * scaledGrid + viewportY;

        const isMajor = gx % MAJOR_EVERY === 0 && gy % MAJOR_EVERY === 0;
        const color = isMajor ? majorColor : dotColor;
        const radius = isMajor ? DOT_RADIUS * 1.5 : DOT_RADIUS;

        g.circle(sx, sy, radius).fill(color);
      }
    }
  }

  destroy() {
    this.graphics.destroy();
  }
}
