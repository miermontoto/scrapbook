import { Container, Graphics } from "pixi.js";
import type { AlignmentGuide } from "./interactions/snapCalculation";

const EDGE_COLOR = 0x89b4fa;
const CENTER_COLOR = 0xf38ba8;
const LINE_ALPHA = 0.8;

/**
 * dibuja lineas guia de alineacion en el overlayLayer.
 * como overlayLayer no tiene transform de viewport, las coordenadas
 * world se proyectan manualmente a screen space.
 */
export class AlignmentGuideRenderer {
  private graphics: Graphics;

  constructor(parent: Container) {
    this.graphics = new Graphics();
    parent.addChild(this.graphics);
  }

  update(
    guides: AlignmentGuide[],
    viewportX: number,
    viewportY: number,
    zoom: number,
  ): void {
    this.graphics.clear();
    if (guides.length === 0) return;

    for (const guide of guides) {
      const color = guide.type === "center" ? CENTER_COLOR : EDGE_COLOR;

      if (guide.axis === "x") {
        // linea vertical en guide.position
        const sx = guide.position * zoom + viewportX;
        const sy1 = guide.from * zoom + viewportY;
        const sy2 = guide.to * zoom + viewportY;
        this.graphics
          .moveTo(sx, sy1)
          .lineTo(sx, sy2)
          .stroke({ width: 1, color, alpha: LINE_ALPHA });
      } else {
        // linea horizontal en guide.position
        const sy = guide.position * zoom + viewportY;
        const sx1 = guide.from * zoom + viewportX;
        const sx2 = guide.to * zoom + viewportX;
        this.graphics
          .moveTo(sx1, sy)
          .lineTo(sx2, sy)
          .stroke({ width: 1, color, alpha: LINE_ALPHA });
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
