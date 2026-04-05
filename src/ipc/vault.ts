import { invoke } from "@tauri-apps/api/core";
import type { VaultEntry, CanvasEntry } from "../types/vault";

export async function listVaults(): Promise<VaultEntry[]> {
  return invoke<VaultEntry[]>("list_vaults");
}

export async function createVault(
  path: string,
  name: string,
): Promise<VaultEntry> {
  return invoke<VaultEntry>("create_vault", { path, name });
}

export async function openVault(
  path: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("open_vault", { path });
}

export async function saveCanvas(
  vaultPath: string,
  canvasId: string,
  data: string,
): Promise<void> {
  return invoke("save_canvas", { vaultPath, canvasId, data });
}

export async function loadCanvas(
  vaultPath: string,
  canvasId: string,
): Promise<string> {
  return invoke<string>("load_canvas", { vaultPath, canvasId });
}

export async function saveSettings(vaultPath: string, settings: string): Promise<void> {
  return invoke("save_settings", { vaultPath, settings });
}

export async function loadSettings(vaultPath: string): Promise<string> {
  return invoke<string>("load_settings", { vaultPath });
}

export async function getDefaultVaultPath(): Promise<string> {
  return invoke<string>("get_default_vault_path");
}

export async function listCanvases(
  vaultPath: string,
): Promise<CanvasEntry[]> {
  return invoke<CanvasEntry[]>("list_canvases", { vaultPath });
}
