import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { createPty, writePty, resizePty, closePty } from "../ipc/pty";
import { useAppStore } from "../stores";

export class TerminalInstance {
  readonly nodeId: string;
  readonly xterm: Terminal;

  private ptyId: string | null = null;
  private fitAddon: FitAddon;

  constructor(nodeId: string, cols: number, rows: number) {
    this.nodeId = nodeId;
    this.fitAddon = new FitAddon();

    const { settings } = useAppStore.getState();

    this.xterm = new Terminal({
      cols,
      rows,
      allowProposedApi: true,
      scrollback: settings.terminalScrollback,
      fontFamily: settings.terminalFontFamily,
      fontSize: settings.terminalFontSize,
      cursorStyle: settings.terminalCursorStyle,
      theme: {
        background: "#1e1e2e",
        foreground: "#cdd6f4",
        cursor: "#f5e0dc",
        selectionBackground: "#585b70",
        black: "#45475a",
        red: "#f38ba8",
        green: "#a6e3a1",
        yellow: "#f9e2af",
        blue: "#89b4fa",
        magenta: "#f5c2e7",
        cyan: "#94e2d5",
        white: "#bac2de",
        brightBlack: "#585b70",
        brightRed: "#f38ba8",
        brightGreen: "#a6e3a1",
        brightYellow: "#f9e2af",
        brightBlue: "#89b4fa",
        brightMagenta: "#f5c2e7",
        brightCyan: "#94e2d5",
        brightWhite: "#a6adc8",
      },
    });
  }

  async init(shell?: string, cwd?: string): Promise<void> {
    console.log(`[TerminalInstance] init: ${this.nodeId}, shell=${shell}, cwd=${cwd}`);

    // crear un contenedor temporal. el TerminalOverlay lo movera al DOM visible.
    const host = document.getElementById("hidden-terminal-host");
    if (!host) {
      console.error("[TerminalInstance] HiddenTerminalHost no encontrado!");
      throw new Error("HiddenTerminalHost not mounted");
    }
    console.log(`[TerminalInstance] host encontrado, dimensiones: ${host.offsetWidth}x${host.offsetHeight}`);

    const container = document.createElement("div");
    container.id = `term-container-${this.nodeId}`;
    container.style.width = "100%";
    container.style.height = "100%";
    host.appendChild(container);

    this.xterm.loadAddon(this.fitAddon);
    this.xterm.open(container);

    // crear PTY y conectar I/O
    console.log(`[TerminalInstance] creando PTY con cols=${this.xterm.cols}, rows=${this.xterm.rows}`);
    this.ptyId = await createPty(
      (data) => this.xterm.write(data),
      {
        shell,
        cwd,
        cols: this.xterm.cols,
        rows: this.xterm.rows,
      },
    );
    console.log(`[TerminalInstance] PTY creado: ${this.ptyId}`);

    // entrada del usuario -> PTY
    this.xterm.onData((data) => {
      if (this.ptyId) writePty(this.ptyId, data);
    });

    this.xterm.onTitleChange((title) => {
      this._title = title;
      // propagar al store solo si no hay titulo custom
      const node = useAppStore.getState().nodes.get(this.nodeId);
      if (node && !node.meta.customTitle) {
        useAppStore.getState().updateNode(this.nodeId, {
          meta: { ...node.meta, title },
        });
      }
    });
  }

  private _title = "";
  get title() {
    return this._title;
  }

  applySettings() {
    const { settings } = useAppStore.getState();
    this.xterm.options.fontFamily = settings.terminalFontFamily;
    this.xterm.options.fontSize = settings.terminalFontSize;
    this.xterm.options.cursorStyle = settings.terminalCursorStyle;
    this.xterm.options.scrollback = settings.terminalScrollback;
    // forzar re-render despues de cambiar opciones
    this.xterm.refresh(0, this.xterm.rows - 1);
  }

  focus() {
    this.xterm.focus();
  }

  blur() {
    this.xterm.blur();
  }

  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * ajustar xterm al tamano de su contenedor DOM usando FitAddon.
   * esto calcula cols/rows automaticamente segun el font actual.
   */
  fit(): void {
    try {
      this.fitAddon.fit();
    } catch {
      // fitAddon puede fallar si el contenedor no esta visible aun
      return;
    }

    const cols = this.xterm.cols;
    const rows = this.xterm.rows;

    // debounce el resize del PTY
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      if (this.ptyId) resizePty(this.ptyId, cols, rows);
    }, 100);
  }

  /** @deprecated usar fit() en su lugar */
  resize(cols: number, rows: number): void {
    if (cols < 2 || rows < 2) return;
    this.xterm.resize(cols, rows);
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      if (this.ptyId) resizePty(this.ptyId, cols, rows);
    }, 100);
  }

  async destroy(): Promise<void> {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    if (this.ptyId) {
      await closePty(this.ptyId).catch(() => {});
      this.ptyId = null;
    }
    this.xterm.dispose();
  }
}
