import { useEffect, useRef } from "react";
import { CanvasManager } from "./CanvasManager";
import { HiddenTerminalHost } from "../terminal/HiddenTerminalHost";
import { TerminalOverlay } from "../terminal/TerminalOverlay";

export function CanvasRoot() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    const manager = new CanvasManager();

    manager.init(containerRef.current).then(() => {
      if (cancelled) manager.destroy();
    });

    return () => {
      cancelled = true;
      if (manager.isReady) manager.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <HiddenTerminalHost />
      <TerminalOverlay />
    </div>
  );
}
