import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { useAppStore } from "../stores";
import { TerminalManager } from "./TerminalManager";
import type { NodeData } from "../types/node";

const TITLE_BAR_HEIGHT = 28;
const RESIZE_HANDLE_SIZE = 16;

/**
 * posiciona los elementos DOM reales de xterm sobre el canvas de PixiJS.
 * cada terminal node recibe un div posicionado que contiene xterm,
 * permitiendo input nativo del teclado sin hacks de focus.
 */
export function TerminalOverlay() {
  const nodes = useAppStore((s) => s.nodes);
  const viewportX = useAppStore((s) => s.viewportX);
  const viewportY = useAppStore((s) => s.viewportY);
  const zoom = useAppStore((s) => s.zoom);

  const terminalNodes = useMemo(
    () => [...nodes.values()].filter((n) => n.type === "terminal"),
    [nodes],
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {terminalNodes.map((node) => (
        <OverlayItem
          key={node.id}
          node={node}
          vx={viewportX}
          vy={viewportY}
          zoom={zoom}
        />
      ))}
    </div>
  );
}

function OverlayItem({
  node,
  vx,
  vy,
  zoom,
}: {
  node: NodeData;
  vx: number;
  vy: number;
  zoom: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const attachedRef = useRef(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const screenX = node.x * zoom + vx;
  const screenY = node.y * zoom + vy;
  const screenW = node.width * zoom;
  const titleBarH = TITLE_BAR_HEIGHT * zoom;
  const contentH = (node.height - TITLE_BAR_HEIGHT) * zoom;

  const title = (node.meta.customTitle as string) || (node.meta.title as string) || "";

  useEffect(() => {
    const el = ref.current;
    if (!el || attachedRef.current) return;

    const attach = (container: HTMLElement) => {
      if (!ref.current || attachedRef.current) return;
      ref.current.insertBefore(container, ref.current.firstChild);
      container.style.width = "100%";
      container.style.height = "100%";
      attachedRef.current = true;
      // fit despues de montar en el DOM visible
      requestAnimationFrame(() => {
        TerminalManager.getInstance(node.id)?.fit();
      });
      console.log(`[TerminalOverlay] attached ${node.id}`);
    };

    const instance = TerminalManager.getInstance(node.id);
    const container = document.getElementById(`term-container-${node.id}`);

    if (instance && container) {
      attach(container);
      return;
    }

    // reintentar: el TerminalNode puede no haber terminado init
    const retryTimer = setInterval(() => {
      const inst = TerminalManager.getInstance(node.id);
      const cont = document.getElementById(`term-container-${node.id}`);
      if (inst && cont) {
        clearInterval(retryTimer);
        attach(cont);
      }
    }, 200);
    return () => clearInterval(retryTimer);
  }, [node.id]);

  // re-fit cuando cambian las dimensiones del contenedor
  useEffect(() => {
    if (!attachedRef.current) return;
    const instance = TerminalManager.getInstance(node.id);
    if (instance) {
      requestAnimationFrame(() => instance.fit());
    }
  }, [screenW, contentH, node.id]);

  const handleContentPointerDown = (e: React.PointerEvent) => {
    useAppStore.getState().selectNode(node.id);
    useAppStore.getState().bringToFront(node.id);
    e.stopPropagation();
  };

  const handlePointerEnter = () => {
    if (!useAppStore.getState().settings.focusOnHover) return;
    useAppStore.getState().setFocusedTerminal(node.id);
    const instance = TerminalManager.getInstance(node.id);
    instance?.focus();
  };

  const handlePointerLeave = () => {
    if (!useAppStore.getState().settings.focusOnHover) return;
    const instance = TerminalManager.getInstance(node.id);
    instance?.blur();
    const store = useAppStore.getState();
    if (store.focusedTerminalId === node.id) {
      store.setFocusedTerminal(null);
    }
  };

  const handleTitleBarPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isEditingTitle) return;
      e.stopPropagation();
      e.preventDefault();

      useAppStore.getState().selectNode(node.id);
      useAppStore.getState().bringToFront(node.id);

      const startX = e.clientX;
      const startY = e.clientY;
      const startNodeX = node.x;
      const startNodeY = node.y;

      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - startX) / zoom;
        const dy = (me.clientY - startY) / zoom;
        useAppStore.getState().moveNode(node.id, startNodeX + dx, startNodeY + dy);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        useAppStore.getState().setDirty();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [node.id, node.x, node.y, zoom, isEditingTitle],
  );

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const commitTitle = (value: string) => {
    setIsEditingTitle(false);
    const trimmed = value.trim();
    const nodeCurrent = useAppStore.getState().nodes.get(node.id);
    if (!nodeCurrent) return;
    useAppStore.getState().updateNode(node.id, {
      meta: {
        ...nodeCurrent.meta,
        customTitle: trimmed || undefined,
        title: trimmed || (nodeCurrent.meta.title as string) || "",
      },
    });
  };

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = node.width;
      const startH = node.height;

      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - startX) / zoom;
        const dy = (me.clientY - startY) / zoom;
        const newW = Math.max(200, startW + dx);
        const newH = Math.max(150, startH + dy);
        useAppStore.getState().resizeNode(node.id, newW, newH);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        useAppStore.getState().setDirty();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [node.id, node.width, node.height, zoom],
  );

  return (
    <div
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        width: screenW,
        height: titleBarH + contentH,
        pointerEvents: "none",
        zIndex: node.zIndex,
      }}
    >
      {/* title bar overlay -- captura double-click para editar titulo */}
      <div
        onDoubleClick={handleTitleDoubleClick}
        onPointerDown={handleTitleBarPointerDown}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: titleBarH,
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          paddingLeft: 10 * zoom,
          cursor: "move",
        }}
      >
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            defaultValue={title}
            onBlur={(e) => commitTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle(e.currentTarget.value);
              if (e.key === "Escape") setIsEditingTitle(false);
              e.stopPropagation();
            }}
            style={{
              background: "#313244",
              color: "#cdd6f4",
              border: "1px solid #89b4fa",
              borderRadius: 2,
              padding: "2px 6px",
              fontSize: 12 * zoom,
              fontFamily: "Inter, system-ui, sans-serif",
              outline: "none",
              width: "80%",
            }}
          />
        ) : null}
      </div>
      {/* contenido del terminal */}
      <div
        ref={ref}
        onPointerDown={handleContentPointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{
          position: "absolute",
          left: 0,
          top: titleBarH,
          width: "100%",
          height: contentH,
          overflow: "hidden",
          pointerEvents: "auto",
          transformOrigin: "0 0",
        }}
      >
        {/* resize handle encima del scrollbar */}
        <div
          onPointerDown={handleResizePointerDown}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: RESIZE_HANDLE_SIZE,
            height: RESIZE_HANDLE_SIZE,
            cursor: "nwse-resize",
            zIndex: 10,
            background: "rgba(88, 91, 112, 0.5)",
          }}
        />
      </div>
    </div>
  );
}
