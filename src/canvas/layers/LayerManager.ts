import { Container } from "pixi.js";

export class LayerManager {
  readonly gridLayer: Container;
  readonly nodeLayer: Container;
  readonly overlayLayer: Container;

  constructor(stage: Container) {
    this.gridLayer = new Container({ label: "gridLayer" });
    this.nodeLayer = new Container({ label: "nodeLayer", eventMode: "static" });
    this.overlayLayer = new Container({ label: "overlayLayer" });

    stage.addChild(this.gridLayer, this.nodeLayer, this.overlayLayer);
  }

  /** aplica la transformacion de viewport al layer de nodos */
  setViewport(x: number, y: number, zoom: number) {
    this.nodeLayer.position.set(x, y);
    this.nodeLayer.scale.set(zoom);
  }
}
