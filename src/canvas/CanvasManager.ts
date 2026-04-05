import { Application } from "pixi.js";
import { LayerManager } from "./layers/LayerManager";
import { GridRenderer } from "./GridRenderer";
import { AlignmentGuideRenderer } from "./AlignmentGuideRenderer";
import { ViewportController } from "./ViewportController";
import { InputRouter } from "./interactions/InputRouter";
import { DragCoordinator } from "./interactions/DragInteraction";
import { createNode } from "./nodes/NodeFactory";
import { useAppStore } from "../stores";
import { km } from "../keybindings/KeybindingManager";
import type { BaseNode } from "./nodes/BaseNode";
import type { NodeData } from "../types/node";

export class CanvasManager {
  private app: Application | null = null;
  private layers: LayerManager | null = null;
  private grid: GridRenderer | null = null;
  private viewport: ViewportController | null = null;
  private inputRouter: InputRouter | null = null;
  private nodeViews = new Map<string, BaseNode>();
  private unsubscribers: Array<() => void> = [];
  private resizeObserver: ResizeObserver | null = null;
  private guideRenderer: AlignmentGuideRenderer | null = null;
  private _isReady = false;

  get isReady() {
    return this._isReady;
  }

  async init(container: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      resizeTo: container,
      background: 0x11111b,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
      preference: "webgl",
    });

    // desbloquear framerate para monitores de alta frecuencia (144/240hz)
    this.app.ticker.maxFPS = 0;

    container.appendChild(this.app.canvas as HTMLCanvasElement);

    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.tabIndex = -1;

    this.layers = new LayerManager(this.app.stage);
    this.layers.nodeLayer.sortableChildren = true;
    this.grid = new GridRenderer(this.layers.gridLayer);
    this.guideRenderer = new AlignmentGuideRenderer(this.layers.overlayLayer);
    this.viewport = new ViewportController(canvas);
    this.inputRouter = new InputRouter();

    // conectar coordinator de drag con el renderer de guias
    DragCoordinator.getInstance().setGuidesCallback((guides) => {
      const { viewportX, viewportY, zoom } = useAppStore.getState();
      this.guideRenderer?.update(guides, viewportX, viewportY, zoom);
    });

    // tamano inicial
    const { width, height } = container.getBoundingClientRect();
    useAppStore.getState().setCanvasSize(width, height);
    this.grid.setScreenSize(width, height);

    // observer de resize
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width: w, height: h } = entry.contentRect;
        useAppStore.getState().setCanvasSize(w, h);
        this.grid?.setScreenSize(w, h);
        this.app?.resize();
        // redibujar grid con las nuevas dimensiones
        const { viewportX, viewportY, zoom } = useAppStore.getState();
        this.grid?.update(viewportX, viewportY, zoom);
      }
    });
    this.resizeObserver.observe(container);

    // suscripciones al store
    this.subscribeToStore();

    // dibujar grid inicial (la suscripcion solo reacciona a cambios)
    const { viewportX, viewportY, zoom } = useAppStore.getState();
    this.grid.update(viewportX, viewportY, zoom);

    // ticker principal
    this.app.ticker.add(this.tick, this);

    // click en el fondo para deseleccionar
    canvas.addEventListener("pointerdown", (e) => {
      if (km.matchesMouse("deselectClick", e) && !km.matchesModifier("multiSelectMod", e)) {
        // verificar si el click fue en un nodo via PixiJS hit test
        const point = { x: e.offsetX, y: e.offsetY };
        const hit = this.app?.stage.children.some((layer) => {
          if (layer === this.layers?.nodeLayer) {
            return this.layers.nodeLayer.children.some((child) => {
              const bounds = child.getBounds();
              return bounds.containsPoint(point.x, point.y);
            });
          }
          return false;
        });

        if (!hit) {
          useAppStore.getState().clearSelection();
          useAppStore.getState().setFocusedTerminal(null);
          // blur todos los terminales
          for (const nodeView of this.nodeViews.values()) {
            nodeView.onBlur();
          }
        }
      }
    });

    // eventos globales de puntero para drag/resize
    window.addEventListener("pointermove", this.onGlobalPointerMove);
    window.addEventListener("pointerup", this.onGlobalPointerUp);

    this._isReady = true;
  }

  private onGlobalPointerMove = (e: PointerEvent) => {
    if (!this.layers || !this.app) return;
    // usar coordenadas relativas al canvas de pixi para evitar desfase del toolbar
    const rect = (this.app.canvas as HTMLCanvasElement).getBoundingClientRect();
    const pixiGlobalX = e.clientX - rect.left;
    const pixiGlobalY = e.clientY - rect.top;
    for (const nodeView of this.nodeViews.values()) {
      nodeView.onGlobalPointerMove(pixiGlobalX, pixiGlobalY);
    }
  };

  private onGlobalPointerUp = () => {
    for (const nodeView of this.nodeViews.values()) {
      nodeView.onGlobalPointerUp();
    }
  };

  private subscribeToStore() {
    // viewport changes
    this.unsubscribers.push(
      useAppStore.subscribe(
        (s) => ({ x: s.viewportX, y: s.viewportY, z: s.zoom }),
        ({ x, y, z }) => {
          this.layers?.setViewport(x, y, z);
          this.grid?.update(x, y, z);
        },
        { equalityFn: (a, b) => a.x === b.x && a.y === b.y && a.z === b.z },
      ),
    );

    // nodos: reconciliar
    this.unsubscribers.push(
      useAppStore.subscribe(
        (s) => s.nodes,
        (nodes) => this.reconcileNodes(nodes),
      ),
    );

    // settings: redibujar grid cuando cambian los ajustes de apariencia
    this.unsubscribers.push(
      useAppStore.subscribe(
        (s) => s.settings,
        () => {
          const { viewportX, viewportY, zoom } = useAppStore.getState();
          this.grid?.update(viewportX, viewportY, zoom);
        },
      ),
    );

    // seleccion
    this.unsubscribers.push(
      useAppStore.subscribe(
        (s) => s.selectedNodeIds,
        (selected) => {
          for (const [id, view] of this.nodeViews) {
            view.setSelected(selected.has(id));
          }
        },
      ),
    );
  }

  private async reconcileNodes(nodes: Map<string, NodeData>) {
    // detectar nodos eliminados
    for (const [id, view] of this.nodeViews) {
      if (!nodes.has(id)) {
        await view.onContentDestroy();
        this.layers?.nodeLayer.removeChild(view);
        view.destroy();
        this.nodeViews.delete(id);
      }
    }

    // detectar nodos nuevos o actualizados
    for (const [id, data] of nodes) {
      const existing = this.nodeViews.get(id);
      if (!existing) {
        const node = createNode(data);
        this.nodeViews.set(id, node);
        this.layers?.nodeLayer.addChild(node);
        await node.onContentInit();
      } else {
        existing.updateFromData(data);
      }
    }
  }

  private tick = () => {
    // actualizar texturas de terminales que han cambiado
    for (const nodeView of this.nodeViews.values()) {
      nodeView.onContentUpdate();
    }
  };

  destroy() {
    window.removeEventListener("pointermove", this.onGlobalPointerMove);
    window.removeEventListener("pointerup", this.onGlobalPointerUp);
    this.resizeObserver?.disconnect();
    this.unsubscribers.forEach((fn) => fn());

    for (const view of this.nodeViews.values()) {
      view.onContentDestroy();
    }
    this.nodeViews.clear();

    this.inputRouter?.destroy();
    this.viewport?.destroy();
    this.guideRenderer?.destroy();
    this.grid?.destroy();
    this.app?.destroy(true);
  }
}
