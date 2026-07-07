import { describe, expect, it } from "vitest";
import { createAssetResolver } from "./assetResolver";
import { createVirtualFileSystem } from "./packageVfs";

const encoder = new TextEncoder();

describe("createAssetResolver", () => {
  it("resolves a package-local asset through the VFS boundary", () => {
    const vfs = createVirtualFileSystem(new Map([["assets/readme.txt", encoder.encode("hello")]]));
    const resolver = createAssetResolver(vfs);

    const result = resolver.resolveAsset("assets/readme.txt");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toBe("assets/readme.txt");
      expect(result.mimeType).toBe("text/plain");
      expect(new TextDecoder().decode(result.bytes)).toBe("hello");
    }
  });

  it("returns structured errors for missing and unsafe assets", () => {
    const resolver = createAssetResolver(createVirtualFileSystem(new Map()));

    expect(resolver.resolveAsset("assets/missing.png")).toEqual({
      ok: false,
      issue: expect.objectContaining({
        code: "PACKAGE_FILE_MISSING",
        level: "fatal",
      }),
    });
    expect(resolver.resolveAsset("../secret.png")).toEqual({
      ok: false,
      issue: expect.objectContaining({
        code: "PACKAGE_PATH_UNSAFE",
        level: "fatal",
      }),
    });
  });
});
