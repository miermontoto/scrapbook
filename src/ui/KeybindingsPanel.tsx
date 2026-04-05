import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../stores";
import { ACTION_DEFS, DEFAULT_BINDINGS } from "../keybindings/defaults";
import { km } from "../keybindings/KeybindingManager";

/**
 * panel de keybindings dentro de settings.
 * click en un binding para entrar en modo grabacion,
 * presionar la nueva combo para asignarla.
 */
export function KeybindingsPanel() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const [recordingAction, setRecordingAction] = useState<string | null>(null);

  const setBinding = useCallback(
    (actionId: string, binding: string) => {
      const next = { ...settings.keybindings, [actionId]: binding };
      update({ keybindings: next });
      setRecordingAction(null);
    },
    [settings.keybindings, update],
  );

  const resetBinding = useCallback(
    (actionId: string) => {
      const next = { ...settings.keybindings };
      delete next[actionId];
      update({ keybindings: next });
    },
    [settings.keybindings, update],
  );

  const resetAll = useCallback(() => {
    update({ keybindings: {} });
  }, [update]);

  // listener global para record mode
  useEffect(() => {
    if (!recordingAction) return;

    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // ignorar teclas de solo modificador
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
      const binding = km.eventToBinding(e);
      if (binding) setBinding(recordingAction, binding);
    };

    const onMouse = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const binding = km.mouseEventToBinding(e);
      if (binding) setBinding(recordingAction, binding);
    };

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setRecordingAction(null);
      }
    };

    // escape cancela record mode (prioridad mas alta)
    document.addEventListener("keydown", onEscape, true);
    // timeout para que el click que inicio el record mode no se capture
    const timer = setTimeout(() => {
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("mousedown", onMouse, true);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onEscape, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onMouse, true);
    };
  }, [recordingAction, setBinding]);

  // detectar conflictos
  const findConflict = (actionId: string, binding: string): string | null => {
    for (const def of ACTION_DEFS) {
      if (def.id === actionId) continue;
      const other = settings.keybindings[def.id] ?? DEFAULT_BINDINGS[def.id];
      if (other === binding) return def.label;
    }
    return null;
  };

  const keyboard = ACTION_DEFS.filter((a) => a.category === "keyboard");
  const mouse = ACTION_DEFS.filter((a) => a.category === "mouse");
  const modifiers = ACTION_DEFS.filter((a) => a.category === "modifier");

  return (
    <div>
      <Group label="Keyboard" actions={keyboard} />
      <Group label="Mouse" actions={mouse} />
      <Group label="Modifiers" actions={modifiers} />
      <div style={{ marginTop: 12, textAlign: "right" }}>
        <button onClick={resetAll} style={resetAllBtnStyle}>
          Reset all to defaults
        </button>
      </div>
    </div>
  );

  function Group({
    label,
    actions,
  }: {
    label: string;
    actions: typeof ACTION_DEFS;
  }) {
    if (actions.length === 0) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={groupLabelStyle}>{label}</div>
        {actions.map((def) => {
          const current =
            settings.keybindings[def.id] ?? DEFAULT_BINDINGS[def.id];
          const isRecording = recordingAction === def.id;
          const isCustom = def.id in settings.keybindings;
          const conflict = isCustom
            ? findConflict(def.id, current)
            : null;

          return (
            <div key={def.id} style={rowStyle}>
              <span style={labelStyle}>{def.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {conflict && (
                  <span style={conflictStyle} title={`Conflicts with: ${conflict}`}>
                    !
                  </span>
                )}
                <button
                  onClick={() =>
                    setRecordingAction(isRecording ? null : def.id)
                  }
                  style={{
                    ...bindingBtnStyle,
                    borderColor: isRecording
                      ? "#f9e2af"
                      : isCustom
                        ? "#89b4fa"
                        : "#45475a",
                    color: isRecording ? "#f9e2af" : "#cdd6f4",
                  }}
                >
                  {isRecording
                    ? "press key..."
                    : km.getDisplayString(def.id)}
                </button>
                {isCustom && (
                  <button
                    onClick={() => resetBinding(def.id)}
                    style={resetBtnStyle}
                    title="Reset to default"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}

const groupLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6c7086",
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 6,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#a6adc8",
};

const bindingBtnStyle: React.CSSProperties = {
  background: "#313244",
  border: "1px solid #45475a",
  color: "#cdd6f4",
  padding: "3px 10px",
  fontSize: 12,
  fontFamily: "monospace",
  cursor: "pointer",
  minWidth: 80,
  textAlign: "center",
};

const resetBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#6c7086",
  fontSize: 14,
  cursor: "pointer",
  padding: "0 2px",
};

const conflictStyle: React.CSSProperties = {
  color: "#f38ba8",
  fontSize: 14,
  fontWeight: 700,
  cursor: "help",
};

const resetAllBtnStyle: React.CSSProperties = {
  background: "#313244",
  border: "1px solid #45475a",
  color: "#a6adc8",
  padding: "4px 12px",
  fontSize: 12,
  cursor: "pointer",
};
