import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import { createVirtualFileSystem, createVirtualFileSystemFromDirectoryFiles, createVirtualFileSystemFromDirectoryHandle, createVirtualFileSystemFromZipBytes, normalizePackagePath, packageArchiveLimits, type PackageDirectoryHandle } from "./packageVfs";

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

  it("builds a VFS directly from directory files and strips the selected root", async () => {
    const manifest = new File(["{}"], "manifest.json");
    Object.defineProperty(manifest, "webkitRelativePath", { value: "demo/manifest.json" });
    const page = new File(["[]"], "pages.json");
    Object.defineProperty(page, "webkitRelativePath", { value: "demo/data/pages.json" });
    const result = await createVirtualFileSystemFromDirectoryFiles([manifest, page]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.vfs.listFiles()).toEqual(["data/pages.json", "manifest.json"]);
  });

  it("re-reads files from a directory handle", async () => {
    let content = "first";
    const handle: PackageDirectoryHandle = {
      kind: "directory", name: "demo",
      async *entries() {
        yield ["manifest.json", { kind: "file" as const, name: "manifest.json", getFile: async () => new File([content], "manifest.json") }];
      },
    };
    const first = await createVirtualFileSystemFromDirectoryHandle(handle);
    expect(first.ok && first.vfs.readText("manifest.json")).toEqual({ ok: true, path: "manifest.json", value: "first" });
    content = "second";
    const second = await createVirtualFileSystemFromDirectoryHandle(handle);
    expect(second.ok && second.vfs.readText("manifest.json")).toEqual({ ok: true, path: "manifest.json", value: "second" });
  });

  it("rejects directory selections with excessive file counts", async () => {
    const files = Array.from({ length: packageArchiveLimits.maxFiles + 1 }, (_, index) => new File([""], `${index}.txt`));
    const result = await createVirtualFileSystemFromDirectoryFiles(files);
    expect(result).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: "PACKAGE_ARCHIVE_FILE_COUNT_LIMIT", level: "fatal" })],
    });
  });

  it("rejects suspicious zip compression ratios", () => {
    const bytes = zipSync({ "assets/huge.svg": new Uint8Array(1024 * 1024) });
    const result = createVirtualFileSystemFromZipBytes(bytes);
    expect(result).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: "PACKAGE_ARCHIVE_COMPRESSION_RATIO_LIMIT", level: "fatal" })],
    });
  });
});
