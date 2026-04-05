import type { NodeData } from "../../types/node";
import { BaseNode } from "./BaseNode";
import { TerminalNode } from "./TerminalNode";

export function createNode(data: NodeData): BaseNode {
  switch (data.type) {
    case "terminal":
      return new TerminalNode(data);
    default:
      throw new Error(`unknown node type: ${data.type}`);
  }
}
