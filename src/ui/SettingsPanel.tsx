import { useEffect, useRef } from "react";
import { useAppStore } from "../stores";
import type { AppSettings } from "../stores/settingsSlice";

export function SettingsPanel() {
  const open = useAppStore((s) => s.settingsOpen);
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const close = () => useAppStore.getState().setSettingsOpen(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

  return (
    <div onClick={handleBackdropClick} style={backdropStyle}>
      <div ref={panelRef} style={panelStyle}>
        <div style={headerStyle}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#cdd6f4" }}>
            Settings
          </span>
          <button onClick={close} style={closeBtnStyle}>
            &times;
          </button>
        </div>

        <div style={scrollStyle}>
          <Section title="Terminal">
            <Field label="Font family">
              <input
                type="text"
                value={settings.terminalFontFamily}
                onChange={(e) => update({ terminalFontFamily: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Font size">
              <NumberInput
                value={settings.terminalFontSize}
                min={8}
                max={32}
                onChange={(v) => update({ terminalFontSize: v })}
              />
            </Field>
            <Field label="Scrollback lines">
              <NumberInput
                value={settings.terminalScrollback}
                min={100}
                max={10000}
                step={100}
                onChange={(v) => update({ terminalScrollback: v })}
              />
            </Field>
            <Field label="Cursor style">
              <Select
                value={settings.terminalCursorStyle}
                options={["block", "underline", "bar"]}
                onChange={(v) =>
                  update({
                    terminalCursorStyle: v as AppSettings["terminalCursorStyle"],
                  })
                }
              />
            </Field>
            <Field label="Default shell">
              <input
                type="text"
                value={settings.defaultShell}
                onChange={(e) => update({ defaultShell: e.target.value })}
                placeholder="(system default)"
                style={inputStyle}
              />
            </Field>
          </Section>

          <Section title="Behavior">
            <Field label="Focus on hover">
              <Toggle
                value={settings.focusOnHover}
                onChange={(v) => update({ focusOnHover: v })}
              />
            </Field>
            <Field label="Spawn at mouse">
              <Toggle
                value={settings.spawnAtMouse}
                onChange={(v) => update({ spawnAtMouse: v })}
              />
            </Field>
          </Section>

          <Section title="Appearance">
            <Field label="Canvas background">
              <ColorInput
                value={settings.canvasBackground}
                onChange={(v) => update({ canvasBackground: v })}
              />
            </Field>
            <Field label="Grid dot color">
              <ColorInput
                value={settings.gridDotColor}
                onChange={(v) => update({ gridDotColor: v })}
              />
            </Field>
            <Field label="Grid major dot color">
              <ColorInput
                value={settings.gridMajorDotColor}
                onChange={(v) => update({ gridMajorDotColor: v })}
              />
            </Field>
            <Field label="Grid spacing">
              <NumberInput
                value={settings.gridSize}
                min={10}
                max={100}
                onChange={(v) => update({ gridSize: v })}
              />
            </Field>
            <Field label="Node border color">
              <ColorInput
                value={settings.nodeBorderColor}
                onChange={(v) => update({ nodeBorderColor: v })}
              />
            </Field>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#89b4fa",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: "none",
        background: value ? "#89b4fa" : "#45475a",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          background: "#cdd6f4",
          position: "absolute",
          top: 3,
          left: value ? 21 : 3,
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function NumberInput({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
      }}
      style={{ ...inputStyle, width: 80 }}
    />
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 32, height: 24, border: "none", cursor: "pointer", background: "none" }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, width: 90, fontFamily: "monospace" }}
      />
    </div>
  );
}

// -- estilos --

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const panelStyle: React.CSSProperties = {
  background: "#1e1e2e",
  border: "1px solid #313244",
  width: 420,
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
  color: "#cdd6f4",
  fontFamily: "Inter, system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid #313244",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#6c7086",
  fontSize: 20,
  cursor: "pointer",
  padding: "0 4px",
};

const scrollStyle: React.CSSProperties = {
  padding: 16,
  overflowY: "auto",
  flex: 1,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#a6adc8",
  flexShrink: 0,
};

const inputStyle: React.CSSProperties = {
  background: "#313244",
  color: "#cdd6f4",
  border: "1px solid #45475a",
  padding: "4px 8px",
  fontSize: 13,
  outline: "none",
  fontFamily: "Inter, system-ui, sans-serif",
};
