import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { useAppStore } from "../../stores";
import { DragCoordinator } from "../interactions/DragInteraction";
import { km } from "../../keybindings/KeybindingManager";
import type { NodeData } from "../../types/node";

const TITLE_BAR_HEIGHT = 28;
const BORDER_RADIUS = 0;
const RESIZE_HANDLE_SIZE = 16;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

const TITLE_TEXT_STYLE = new TextStyle({
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  fill: 0x6c7086,
});

export abstract class BaseNode extends Container {
  readonly nodeId: string;
  protected background: Graphics;
  protected titleBar: Graphics;
  protected titleText: Text;
  protected contentArea: Container;
  protected resizeHandle: Graphics;

  private isDragging = false;
  private isResizing = false;
  private dragStartGlobalX = 0;
  private dragStartGlobalY = 0;
  private dragStartNodeX = 0;
  private dragStartNodeY = 0;
  private resizeStartW = 0;
  private resizeStartH = 0;
  private resizeStartGlobalX = 0;
  private resizeStartGlobalY = 0;
  private _isSelected = false;
  private nodeWidth: number;
  private nodeHeight: number;

  constructor(data: NodeData) {
    super({ label: `node-${data.id}` });
    this.nodeId = data.id;
    this.nodeWidth = data.width;
    this.nodeHeight = data.height;
    this.position.set(data.x, data.y);

    this.background = new Graphics();
    this.titleBar = new Graphics();
    this.titleText = new Text({ text: "", style: TITLE_TEXT_STYLE });
    this.titleText.position.set(10, 7);
    this.contentArea = new Container({ label: "content", eventMode: "static" });
    this.resizeHandle = new Graphics();

    this.addChild(
      this.background,
      this.titleBar,
      this.titleText,
      this.contentArea,
      this.resizeHandle,
    );

    this.contentArea.position.set(0, TITLE_BAR_HEIGHT);
    this.drawChrome();
    this.setupInteractions();
  }

  private drawChrome() {
    const w = this.nodeWidth;
    const h = this.nodeHeight;

    // fondo
    this.background.clear();
    this.background
      .rect(0, 0, w, h)
      .fill({ color: 0x1e1e2e, alpha: 0.95 });
    this.background
      .rect(0, 0, w, h)
      .stroke({
        color: this._isSelected ? 0x89b4fa : 0x313244,
        width: this._isSelected ? 2 : 1,
      });

    // barra de titulo
    this.titleBar.clear();
    this.titleBar
      .rect(0, 0, w, TITLE_BAR_HEIGHT)
      .fill(0x181825);

    this.titleBar.eventMode = "static";
    this.titleBar.cursor = "move";
    this.titleBar.hitArea = {
      contains: (x: number, y: number) =>
        x >= 0 && x <= w && y >= 0 && y <= TITLE_BAR_HEIGHT,
    };

    // handle de resize (esquina inferior derecha)
    this.resizeHandle.clear();
    this.resizeHandle
      .rect(
        w - RESIZE_HANDLE_SIZE,
        h - RESIZE_HANDLE_SIZE,
        RESIZE_HANDLE_SIZE,
        RESIZE_HANDLE_SIZE,
      )
      .fill({ color: 0x585b70, alpha: 0.5 });
    this.resizeHandle.eventMode = "static";
    this.resizeHandle.cursor = "nwse-resize";
  }

  private setupInteractions() {
    // drag via title bar: usar coordenadas globales de pixi (consistentes)
    this.titleBar.on("pointerdown", (e) => {
      e.stopPropagation();
      this.isDragging = true;
      this.dragStartGlobalX = e.global.x;
      this.dragStartGlobalY = e.global.y;
      this.dragStartNodeX = this.x;
      this.dragStartNodeY = this.y;
      useAppStore.getState().bringToFront(this.nodeId);
      useAppStore.getState().selectNode(this.nodeId);
      this.onFocus();
    });

    // resize via handle: usar coordenadas globales de pixi
    this.resizeHandle.on("pointerdown", (e) => {
      e.stopPropagation();
      this.isResizing = true;
      this.resizeStartW = this.nodeWidth;
      this.resizeStartH = this.nodeHeight;
      this.resizeStartGlobalX = e.global.x;
      this.resizeStartGlobalY = e.global.y;
    });

    // click en contenido para seleccionar + focus
    this.contentArea.on("pointerdown", (e) => {
      e.stopPropagation();
      useAppStore.getState().selectNode(this.nodeId);
      useAppStore.getState().bringToFront(this.nodeId);
      this.onFocus();
    });

    // click en background como fallback
    this.background.eventMode = "static";
    this.background.on("pointerdown", (e) => {
      e.stopPropagation();
      useAppStore.getState().selectNode(this.nodeId, km.matchesModifier("multiSelectMod", e));
      useAppStore.getState().bringToFront(this.nodeId);
      this.onFocus();
    });
  }

  /**
   * llamar desde CanvasManager con coordenadas globales de pixi.
   * usamos pixi global coords (no clientX/Y) para evitar desfases
   * por la posicion del canvas en el viewport.
   */
  onGlobalPointerMove(globalX: number, globalY: number) {
    if (this.isDragging) {
      const zoom = useAppStore.getState().zoom;
      const dx = (globalX - this.dragStartGlobalX) / zoom;
      const dy = (globalY - this.dragStartGlobalY) / zoom;
      const newX = this.dragStartNodeX + dx;
      const newY = this.dragStartNodeY + dy;
      DragCoordinator.getInstance().handleDragMove(this.nodeId, newX, newY);
    }
    if (this.isResizing) {
      const zoom = useAppStore.getState().zoom;
      const dx = (globalX - this.resizeStartGlobalX) / zoom;
      const dy = (globalY - this.resizeStartGlobalY) / zoom;
      const newW = Math.max(MIN_WIDTH, this.resizeStartW + dx);
      const newH = Math.max(MIN_HEIGHT, this.resizeStartH + dy);
      DragCoordinator.getInstance().handleResizeMove(this.nodeId, newW, newH);
    }
  }

  onGlobalPointerUp() {
    if (this.isDragging || this.isResizing) {
      if (this.isDragging) {
        DragCoordinator.getInstance().handleDragEnd();
      }
      this.isDragging = false;
      this.isResizing = false;
      useAppStore.getState().setDirty();
    }
  }

  updateFromData(data: Partial<NodeData>) {
    if (data.x != null && data.y != null) {
      this.position.set(data.x, data.y);
    }
    if (data.width != null && data.height != null) {
      this.nodeWidth = data.width;
      this.nodeHeight = data.height;
      this.drawChrome();
      this.onContentResize(data.width, data.height - TITLE_BAR_HEIGHT);
    }
    if (data.zIndex != null) {
      this.zIndex = data.zIndex;
    }
    if (data.meta?.title != null) {
      this.setTitle(data.meta.title as string);
    }
  }

  setSelected(selected: boolean) {
    if (this._isSelected !== selected) {
      this._isSelected = selected;
      this.drawChrome();
    }
  }

  setTitle(title: string) {
    this.titleText.text = title;
  }

  get contentWidth() {
    return this.nodeWidth;
  }
  get contentHeight() {
    return this.nodeHeight - TITLE_BAR_HEIGHT;
  }

  abstract onContentInit(): Promise<void>;
  abstract onContentUpdate(): void;
  abstract onContentDestroy(): Promise<void>;
  abstract onContentResize(w: number, h: number): void;
  abstract onFocus(): void;
  abstract onBlur(): void;
}
