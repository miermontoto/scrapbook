import { invoke, Channel } from "@tauri-apps/api/core";

export async function createPty(
  onOutput: (data: Uint8Array) => void,
  options: { shell?: string; cwd?: string; cols: number; rows: number },
): Promise<string> {
  const channel = new Channel<number[]>();
  channel.onmessage = (data) => onOutput(new Uint8Array(data));

  return invoke<string>("create_pty", {
    onOutput: channel,
    shell: options.shell ?? null,
    cwd: options.cwd ?? null,
    cols: options.cols,
    rows: options.rows,
  });
}

export async function writePty(ptyId: string, data: string): Promise<void> {
  const bytes = Array.from(new TextEncoder().encode(data));
  return invoke("write_pty", { ptyId, data: bytes });
}

export async function resizePty(
  ptyId: string,
  cols: number,
  rows: number,
): Promise<void> {
  return invoke("resize_pty", { ptyId, cols, rows });
}

export async function closePty(ptyId: string): Promise<void> {
  return invoke("close_pty", { ptyId });
}
