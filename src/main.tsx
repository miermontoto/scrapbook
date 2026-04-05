import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@xterm/xterm/css/xterm.css";
import { initDebugConsole } from "./debug";

// activar interceptor de consola en dev
if (import.meta.env.DEV) {
  initDebugConsole();
}

// resetear estilos globales
const style = document.createElement("style");
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
  button:hover { filter: brightness(1.2); }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
