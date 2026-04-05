import { useAppStore } from "../stores";

export function StatusBar() {
  const zoom = useAppStore((s) => Math.round(s.zoom * 100));
  const nodeCount = useAppStore((s) => s.nodes.size);
  const vaultName = useAppStore((s) => s.vaultName);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 24,
        background: "#181825",
        borderTop: "1px solid #313244",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 16,
        zIndex: 100,
        fontSize: 11,
        color: "#6c7086",
      }}
    >
      {vaultName && <span>{vaultName}</span>}
      <span>{nodeCount} node{nodeCount !== 1 ? "s" : ""}</span>
      <span style={{ marginLeft: "auto" }}>{zoom}%</span>
      <button
        onClick={() => useAppStore.getState().toggleSettings()}
        style={gearStyle}
        title="Settings (Ctrl+,)"
      >
        &#x2699;
      </button>
    </div>
  );
}

const gearStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#6c7086",
  fontSize: 14,
  cursor: "pointer",
  padding: "0 2px",
  lineHeight: 1,
};
