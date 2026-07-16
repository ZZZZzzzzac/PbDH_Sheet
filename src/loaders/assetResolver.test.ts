import { describe, expect, it } from "vitest";
import { createAssetResolver, createRuntimeAssetResolver, resourceAssetUrlKey } from "./assetResolver";
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

describe("createRuntimeAssetResolver", () => {
  it("isolates identical paths by owning Resource Extension", () => {
    const resolver = createRuntimeAssetResolver([
      { 路径: "assets/card.png", 类型: "image/png", bytes: new Uint8Array([1]), sourceType: "resourceExtension", sourceId: "author-a" },
      { 路径: "assets/card.png", 类型: "image/png", bytes: new Uint8Array([2]), sourceType: "resourceExtension", sourceId: "author-b" },
    ]);

    const firstKey = resourceAssetUrlKey("resourceExtension", "author-a", "assets/card.png");
    const secondKey = resourceAssetUrlKey("resourceExtension", "author-b", "assets/card.png");
    expect(Object.keys(resolver.urls)).toEqual([firstKey, secondKey]);
    expect(resolver.urls[firstKey]).not.toBe(resolver.urls[secondKey]);
  });
});
