import { useEffect } from "react";
import { CanvasRoot } from "./canvas/CanvasRoot";
import { StatusBar } from "./ui/StatusBar";
import { SettingsPanel } from "./ui/SettingsPanel";
import { initVault, startAutoSave } from "./vault/autoSave";

export default function App() {
  useEffect(() => {
    // inicializar vault y auto-save
    initVault();
    const stopAutoSave = startAutoSave();
    return stopAutoSave;
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        background: "#11111b",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 24,
          left: 0,
          right: 0,
        }}
      >
        <CanvasRoot />
      </div>
      <StatusBar />
      <SettingsPanel />
    </div>
  );
}
