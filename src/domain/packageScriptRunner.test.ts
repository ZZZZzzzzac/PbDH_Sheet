import { afterEach, describe, expect, it, vi } from "vitest";
import { cloneAndFreeze } from "./packageScript";
import { executePackageScriptInWorker } from "./packageScriptRunner";

describe("Package Script Runner", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("times out and terminates a non-responsive Worker", async () => {
    const terminate = vi.fn();
    class SilentWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage() { /* intentionally never responds */ }
      terminate = terminate;
    }
    vi.stubGlobal("Worker", SilentWorker);
    await expect(executePackageScriptInWorker("module.exports=()=>{}", {}, "Format Adapter Script", 10)).rejects.toThrow("timed out");
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("clones binary input without trying to freeze a non-empty typed array", () => {
    const original = { assets: [{ path: "a.webp", bytes: new Uint8Array([1, 2, 3]) }] };
    const cloned = cloneAndFreeze(original);
    expect(cloned).not.toBe(original);
    expect(Array.from(cloned.assets[0].bytes)).toEqual([1, 2, 3]);
    expect(() => { cloned.assets[0].bytes[0] = 9; }).not.toThrow();
    expect(original.assets[0].bytes[0]).toBe(1);
  });
});
