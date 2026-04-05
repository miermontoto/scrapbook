/**
 * contenedor offscreen para los elementos DOM de xterm.js.
 * xterm necesita dimensiones de layout reales. usamos left:-9999px
 * en lugar de display:none. el contenedor es grande para que los
 * hijos tengan espacio de layout completo.
 */
export const HIDDEN_HOST_ID = "hidden-terminal-host";

export function HiddenTerminalHost() {
  return (
    <div
      id={HIDDEN_HOST_ID}
      style={{
        position: "fixed",
        left: "-9999px",
        top: "-9999px",
        width: "4096px",
        height: "4096px",
        pointerEvents: "none",
      }}
    />
  );
}
