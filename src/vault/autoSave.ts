/**
 * inicializa el vault por defecto y configura auto-save
 * para canvas y settings.
 */

import { useAppStore } from "../stores";
import * as vaultIpc from "../ipc/vault";
import type { AppSettings } from "../stores/settingsSlice";

const AUTOSAVE_DELAY = 2000;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let settingsSaveTimer: ReturnType<typeof setTimeout> | null = null;

export async function initVault(): Promise<void> {
  try {
    const vaults = await vaultIpc.listVaults();

    if (vaults.length === 0) {
      const defaultPath = await vaultIpc.getDefaultVaultPath();
      console.log("[vault] creando vault por defecto en:", defaultPath);
      await vaultIpc.createVault(defaultPath, "Default");
      await useAppStore.getState().openVault(defaultPath);
    } else {
      console.log("[vault] abriendo vault:", vaults[0].path);
      await useAppStore.getState().openVault(vaults[0].path);
    }

    const { activeCanvasId } = useAppStore.getState();
    if (!activeCanvasId) {
      await useAppStore.getState().loadCanvas("default");
    }

    // cargar settings del vault
    await loadSettings();

    console.log("[vault] inicializado, canvas:", useAppStore.getState().activeCanvasId);
  } catch (err) {
    console.error("[vault] error inicializando:", err);
  }
}

async function loadSettings(): Promise<void> {
  const { vaultPath } = useAppStore.getState();
  if (!vaultPath) return;

  try {
    const raw = await vaultIpc.loadSettings(vaultPath);
    const saved: Partial<AppSettings> = JSON.parse(raw);
    if (Object.keys(saved).length > 0) {
      useAppStore.getState().updateSettings(saved);
      console.log("[vault] settings cargados");
    }
  } catch (err) {
    console.warn("[vault] no se pudieron cargar settings:", err);
  }
}

export function startAutoSave(): () => void {
  // auto-save canvas
  const unsubNodes = useAppStore.subscribe(
    (s) => s.nodes,
    () => scheduleCanvasSave(),
  );

  const unsubDirty = useAppStore.subscribe(
    (s) => s.isDirty,
    (dirty) => {
      if (dirty) scheduleCanvasSave();
    },
  );

  // auto-save settings
  const unsubSettings = useAppStore.subscribe(
    (s) => s.settings,
    () => scheduleSettingsSave(),
  );

  return () => {
    unsubNodes();
    unsubDirty();
    unsubSettings();
    if (saveTimer) clearTimeout(saveTimer);
    if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
  };
}

function scheduleCanvasSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { vaultPath, activeCanvasId } = useAppStore.getState();
    if (!vaultPath || !activeCanvasId) return;
    try {
      await useAppStore.getState().saveCanvas();
      console.log("[vault] canvas guardado");
    } catch (err) {
      console.error("[vault] error guardando canvas:", err);
    }
  }, AUTOSAVE_DELAY);
}

function scheduleSettingsSave() {
  if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(async () => {
    const { vaultPath, settings } = useAppStore.getState();
    if (!vaultPath) return;
    try {
      await vaultIpc.saveSettings(vaultPath, JSON.stringify(settings));
      console.log("[vault] settings guardados");
    } catch (err) {
      console.error("[vault] error guardando settings:", err);
    }
  }, AUTOSAVE_DELAY);
}
