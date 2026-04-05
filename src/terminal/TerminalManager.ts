import { TerminalInstance } from "./TerminalInstance";
import { useAppStore } from "../stores";

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

class TerminalManagerSingleton {
  private instances = new Map<string, TerminalInstance>();

  constructor() {
    // aplicar cambios de settings a todos los terminales existentes
    useAppStore.subscribe(
      (s) => s.settings,
      () => {
        for (const instance of this.instances.values()) {
          instance.applySettings();
        }
      },
    );
  }

  async createInstance(
    nodeId: string,
    cols = DEFAULT_COLS,
    rows = DEFAULT_ROWS,
    shell?: string,
    cwd?: string,
  ): Promise<TerminalInstance> {
    const instance = new TerminalInstance(nodeId, cols, rows);
    await instance.init(shell, cwd);
    this.instances.set(nodeId, instance);
    return instance;
  }

  getInstance(nodeId: string): TerminalInstance | undefined {
    return this.instances.get(nodeId);
  }

  async destroyInstance(nodeId: string): Promise<void> {
    const instance = this.instances.get(nodeId);
    if (instance) {
      await instance.destroy();
      this.instances.delete(nodeId);
    }
  }

  async destroyAll(): Promise<void> {
    const promises = [...this.instances.keys()].map((id) =>
      this.destroyInstance(id),
    );
    await Promise.all(promises);
  }

  getAllInstances(): Map<string, TerminalInstance> {
    return this.instances;
  }
}

export const TerminalManager = new TerminalManagerSingleton();
