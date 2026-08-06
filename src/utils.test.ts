import { afterEach, describe, expect, it, vi } from "vitest";
import { generateId, presetIdFromPathname, presetPathname } from "./utils";

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

describe("presetIdFromPathname", () => {
  it("parses the preset id from the path segment below the base", () => {
    expect(presetIdFromPathname("/pbdh/", "/pbdh/tttri")).toBe("tttri");
    expect(presetIdFromPathname("/pbdh/", "/pbdh/tttri/")).toBe("tttri");
    expect(presetIdFromPathname("/pbdh/", "/pbdh/tttri/sub/path")).toBe("tttri");
    expect(presetIdFromPathname("/pbdh", "/pbdh/tttri")).toBe("tttri");
  });

  it("returns null when no preset segment is present", () => {
    expect(presetIdFromPathname("/pbdh/", "/pbdh/")).toBeNull();
    expect(presetIdFromPathname("/pbdh/", "/pbdh")).toBeNull();
    expect(presetIdFromPathname("/pbdh/", "/")).toBeNull();
    expect(presetIdFromPathname("/pbdh/", "/other/tttri")).toBeNull();
    expect(presetIdFromPathname("/", "/")).toBeNull();
  });

  it("supports a root base", () => {
    expect(presetIdFromPathname("/", "/tttri")).toBe("tttri");
  });

  it("decodes an encoded segment", () => {
    expect(presetIdFromPathname("/pbdh/", "/pbdh/my%20package")).toBe("my package");
  });
});

describe("presetPathname", () => {
  it("builds the path for a preset id below the base", () => {
    expect(presetPathname("/pbdh/", "tttri")).toBe("/pbdh/tttri");
    expect(presetPathname("/pbdh", "tttri")).toBe("/pbdh/tttri");
    expect(presetPathname("/", "tttri")).toBe("/tttri");
  });

  it("falls back to the base itself for null", () => {
    expect(presetPathname("/pbdh/", null)).toBe("/pbdh/");
    expect(presetPathname("/", null)).toBe("/");
  });

  it("encodes the preset id", () => {
    expect(presetPathname("/pbdh/", "my package")).toBe("/pbdh/my%20package");
  });
});
