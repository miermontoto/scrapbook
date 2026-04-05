import type { NodeData } from "./node";

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasFile {
  version: number;
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  viewport: ViewportState;
  nodes: NodeData[];
}
