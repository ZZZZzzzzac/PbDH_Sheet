import { describe, expect, it } from "vitest";
import { createVirtualFileSystem, normalizePackagePath } from "./packageVfs";

const encoder = new TextEncoder();

describe("package VFS", () => {
  it("normalizes package-relative paths", () => {
    expect(normalizePackagePath("./data/pages.json")).toEqual({
      ok: true,
      path: "data/pages.json",
    });
    expect(normalizePackagePath("data\\modules.json")).toEqual({
      ok: true,
      path: "data/modules.json",
    });
  });

  it("rejects absolute, parent traversal and external URL paths", () => {
    expect(normalizePackagePath("/pages.json")).toEqual(expect.objectContaining({ ok: false }));
    expect(normalizePackagePath("../pages.json")).toEqual(expect.objectContaining({ ok: false }));
    expect(normalizePackagePath("https://example.com/pages.json")).toEqual(expect.objectContaining({ ok: false }));
    expect(normalizePackagePath("C:/tmp/pages.json")).toEqual(expect.objectContaining({ ok: false }));
  });

  it("reads text files by normalized path", () => {
    const vfs = createVirtualFileSystem(new Map([["data/pages.json", encoder.encode("[]")]]));

    expect(vfs.readText("./data/pages.json")).toEqual({
      ok: true,
      path: "data/pages.json",
      value: "[]",
    });
  });
});
