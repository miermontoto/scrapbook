import { useAppStore } from "../stores";

export function Toolbar() {
  const addTerminal = () => {
    const { canvasWidth, canvasHeight, screenToWorld } =
      useAppStore.getState();
    const center = screenToWorld(canvasWidth / 2, canvasHeight / 2);
    useAppStore.getState().addNode("terminal", center.x - 360, center.y - 240);
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        background: "#181825",
        borderBottom: "1px solid #313244",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 8,
        zIndex: 100,
        userSelect: "none",
      }}
    >
      <span
        data-tauri-drag-region
        style={{ color: "#cdd6f4", fontWeight: 600, fontSize: 14, marginRight: 16 }}
      >
        Scrapbook
      </span>
      <button onClick={addTerminal} style={btnStyle}>
        + Terminal
      </button>
      <div data-tauri-drag-region style={{ flex: 1 }} />
      <span style={{ color: "#6c7086", fontSize: 12 }}>
        Ctrl+Shift+T
      </span>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#313244",
  color: "#cdd6f4",
  border: "1px solid #45475a",
  borderRadius: 6,
  padding: "4px 12px",
  cursor: "pointer",
  fontSize: 13,
};
