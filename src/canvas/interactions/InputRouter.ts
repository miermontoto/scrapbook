import { useAppStore } from "../../stores";
import { km } from "../../keybindings/KeybindingManager";

/**
 * maneja shortcuts globales. el input de terminal ahora lo maneja
 * el DOM overlay directamente (TerminalOverlay.tsx), asi que aqui
 * solo gestionamos shortcuts y acciones sobre el canvas.
 */
export class InputRouter {
  private handler: (e: KeyboardEvent) => void;
  private mouseX = 0;
  private mouseY = 0;
  private mouseMoveHandler: (e: MouseEvent) => void;

  constructor() {
    this.handler = this.handleKeyDown.bind(this);
    this.mouseMoveHandler = (e: MouseEvent) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    };
    document.addEventListener("keydown", this.handler, true);
    document.addEventListener("mousemove", this.mouseMoveHandler);
  }

  private handleKeyDown(e: KeyboardEvent) {
    const hasFocusedTerminal = !!useAppStore.getState().focusedTerminalId;

    // --- shortcuts globales (funcionan siempre) ---

    if (km.matchesKey("newTerminal", e)) {
      e.preventDefault();
      e.stopPropagation();
      if (useAppStore.getState().settings.spawnAtMouse) {
        this.addTerminalAtMouse();
      } else {
        this.addTerminalAtCenter();
      }
      return;
    }

    if (km.matchesKey("closeTerminal", e)) {
      e.preventDefault();
      e.stopPropagation();
      const focusedId = useAppStore.getState().focusedTerminalId;
      if (focusedId) {
        useAppStore.getState().removeNode(focusedId);
      }
      return;
    }

    if (km.matchesKey("toggleSettings", e)) {
      e.preventDefault();
      e.stopPropagation();
      useAppStore.getState().toggleSettings();
      return;
    }

    if (km.matchesKey("deselect", e)) {
      if (useAppStore.getState().settingsOpen) {
        useAppStore.getState().setSettingsOpen(false);
        return;
      }
      useAppStore.getState().setFocusedTerminal(null);
      useAppStore.getState().clearSelection();
      return;
    }

    // --- shortcuts que solo funcionan cuando NO hay terminal enfocado ---
    if (hasFocusedTerminal) return;

    if (km.matchesKey("deleteSelected", e)) {
      const selected = useAppStore.getState().selectedNodeIds;
      for (const nodeId of selected) {
        useAppStore.getState().removeNode(nodeId);
      }
      useAppStore.getState().clearSelection();
      return;
    }
  }

  private addTerminalAtCenter() {
    const { canvasWidth, canvasHeight, screenToWorld } =
      useAppStore.getState();
    const center = screenToWorld(canvasWidth / 2, canvasHeight / 2);
    useAppStore.getState().addNode("terminal", center.x - 360, center.y - 240);
  }

  private addTerminalAtMouse() {
    const { screenToWorld } = useAppStore.getState();
    const world = screenToWorld(this.mouseX, this.mouseY);
    useAppStore.getState().addNode("terminal", world.x - 360, world.y - 240);
  }

  destroy() {
    document.removeEventListener("keydown", this.handler, true);
    document.removeEventListener("mousemove", this.mouseMoveHandler);
  }
}
