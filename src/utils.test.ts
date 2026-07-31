import { afterEach, describe, expect, it, vi } from "vitest";
import { generateId } from "./utils";

describe("generateId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to getRandomValues when randomUUID is unavailable", () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set(Array.from({ length: bytes.length }, (_, index) => index));
      return bytes;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    expect(generateId("character-")).toBe("character-00010203-0405-4607-8809-0a0b0c0d0e0f");
    expect(getRandomValues).toHaveBeenCalledOnce();
  });
});
