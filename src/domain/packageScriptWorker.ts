/// <reference lib="webworker" />
import { deepFreeze, executePackageScriptInContext } from "./packageScript";

interface PackageScriptWorkerRequest {
  scriptContent: string;
  scriptLabel: string;
  input: unknown;
}

self.onmessage = async (event: MessageEvent<PackageScriptWorkerRequest>) => {
  const { scriptContent, scriptLabel, input } = event.data;
  try {
    blockAmbientCapabilities();
    const value = await executePackageScriptInContext(scriptContent, deepFreeze(input), scriptLabel);
    (self as unknown as Worker).postMessage({ ok: true, value });
  } catch (error) {
    (self as unknown as Worker).postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

function blockAmbientCapabilities() {
  for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "BroadcastChannel", "indexedDB", "caches", "importScripts"]) {
    try { Object.defineProperty(self, name, { value: undefined, configurable: false, writable: false }); } catch { /* Capability is absent or already non-configurable. */ }
  }
}
