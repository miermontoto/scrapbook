import { Graphics } from "pixi.js";
import { BaseNode } from "./BaseNode";
import { TerminalManager } from "../../terminal/TerminalManager";
import { useAppStore } from "../../stores";
import type { NodeData } from "../../types/node";

const CELL_WIDTH = 9;
const CELL_HEIGHT = 18;

/**
 * TerminalNode en PixiJS solo dibuja el fondo del area de contenido.
 * el renderizado real de xterm se hace via TerminalOverlay (DOM overlay).
 * esto evita problemas de focus/teclado con elementos offscreen.
 */
export class TerminalNode extends BaseNode {
  private contentBg: Graphics;

  constructor(data: NodeData) {
    super(data);
    this.contentBg = new Graphics();
    this.contentArea.addChild(this.contentBg);
    this.drawContentBg();
  }

  private drawContentBg() {
    this.contentBg.clear();
    this.contentBg
      .rect(0, 0, this.contentWidth, this.contentHeight)
      .fill(0x1e1e2e);
    // hacer interactivo para que los clicks lleguen a BaseNode
    this.contentBg.eventMode = "static";
    this.contentBg.cursor = "text";
  }

  async onContentInit(): Promise<void> {
    const cols = Math.floor(this.contentWidth / CELL_WIDTH);
    const rows = Math.floor(this.contentHeight / CELL_HEIGHT);

    console.log(`[TerminalNode] onContentInit: ${this.nodeId}, cols=${cols}, rows=${rows}, contentW=${this.contentWidth}, contentH=${this.contentHeight}`);

    const meta = useAppStore.getState().nodes.get(this.nodeId)?.meta ?? {};

    try {
      await TerminalManager.createInstance(
        this.nodeId,
        cols,
        rows,
        meta.shell as string | undefined,
        meta.cwd as string | undefined,
      );
      console.log(`[TerminalNode] PTY creado para ${this.nodeId}`);
    } catch (err) {
      console.error(`[TerminalNode] error creando PTY:`, err);
    }

    useAppStore.getState().registerTerminal(this.nodeId, {
      ptyId: "",
      cols,
      rows,
      title: "",
      shell: (meta.shell as string) ?? "",
    });
  }

  onContentUpdate(): void {
    // el rendering lo hace el DOM overlay, nada que hacer aqui
  }

  async onContentDestroy(): Promise<void> {
    useAppStore.getState().unregisterTerminal(this.nodeId);
    await TerminalManager.destroyInstance(this.nodeId);
  }

  onContentResize(_w: number, _h: number): void {
    this.drawContentBg();

    // el fit real lo hace el DOM overlay via fitAddon
    const instance = TerminalManager.getInstance(this.nodeId);
    instance?.fit();
  }

  onFocus(): void {
    useAppStore.getState().setFocusedTerminal(this.nodeId);
    const instance = TerminalManager.getInstance(this.nodeId);
    instance?.focus();
  }

  onBlur(): void {
    const instance = TerminalManager.getInstance(this.nodeId);
    instance?.blur();
    const store = useAppStore.getState();
    if (store.focusedTerminalId === this.nodeId) {
      store.setFocusedTerminal(null);
    }
  }
}
