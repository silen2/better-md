import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { check } from "@tauri-apps/plugin-updater";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function isDesktopRuntime() {
  return Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}

export function invokeCommand<T>(command: string, payload?: Record<string, unknown>) {
  return invoke<T>(command, payload);
}

export function currentDesktopWindow() {
  return getCurrentWindow();
}

export function checkForDesktopUpdate() {
  return check();
}

export function chooseWorkspaceDirectory(title: string) {
  return open({ directory: true, multiple: false, title });
}

export function createEditorWindow(label: string, url: string, title: string) {
  return new WebviewWindow(label, {
    url,
    title,
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    decorations: false,
    shadow: false,
    transparent: true,
  });
}
