/**
 * interceptor de consola para debug.
 * captura logs del webview y los reenvia al stdout de rust
 * via IPC, donde aparecen en el terminal de `pnpm tauri dev`.
 */

import { invoke } from "@tauri-apps/api/core";

interface LogEntry {
  level: "log" | "warn" | "error" | "info";
  timestamp: number;
  args: unknown[];
  stack?: string;
}

const MAX_BUFFER = 500;
const buffer: LogEntry[] = [];

const original = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
};

function stringify(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");
}

function intercept(level: LogEntry["level"]) {
  return (...args: unknown[]) => {
    const entry: LogEntry = {
      level,
      timestamp: Date.now(),
      args,
    };

    if (level === "error") {
      entry.stack = new Error().stack;
    }

    buffer.push(entry);
    if (buffer.length > MAX_BUFFER) buffer.shift();

    // pasar al console original (devtools del webview)
    original[level](...args);

    // reenviar al stdout de rust via IPC
    const message = stringify(args);
    invoke("frontend_log", { level, message }).catch(() => {});
  };
}

export function initDebugConsole() {
  console.log = intercept("log");
  console.warn = intercept("warn");
  console.error = intercept("error");
  console.info = intercept("info");

  // exponer buffer en window para acceso desde devtools
  (window as any).__DEBUG_LOGS = buffer;
  (window as any).__DEBUG_DUMP = () =>
    buffer
      .map(
        (e) =>
          `[${new Date(e.timestamp).toISOString()}] [${e.level}] ${stringify(e.args)}${e.stack ? "\n" + e.stack : ""}`,
      )
      .join("\n");

  original.log("[debug] interceptor de consola activo, buffer:", MAX_BUFFER);
}

export function getDebugLogs(): LogEntry[] {
  return buffer;
}
