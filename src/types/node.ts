export type NodeType = "terminal" | "note" | "diagram";

export interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  meta: Record<string, unknown>;
}

export interface TerminalMeta {
  shell: string;
  cwd: string;
  title: string;
  env: Record<string, string>;
}
