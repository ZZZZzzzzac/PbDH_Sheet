import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { loadResourceExtensionFromJsonText, loadResourceExtensionFromZipFile } from "./resourceExtensionLoader";

const encoder = new TextEncoder();

function extensionDocument(overrides: Record<string, unknown> = {}) {
  return {
    ID: "void", 名称: "虚空", 版本: "1", 目标系统包ID: "core",
    resourceLibraries: [{ ID: "cards", 名称: "卡牌", entries: [{ ID: "void-card", 名称: "虚空卡", 卡图: "assets/cards/card.png" }] }],
    ...overrides,
  };
}

describe("Resource Extension file loader", () => {
  it("loads ZIP images with Extension-scoped identity and preserves them in normalized ZIP", async () => {
    const result = await loadResourceExtensionFromZipFile(new Blob([zipSync({
      "extension.json": encoder.encode(JSON.stringify(extensionDocument({ ID: undefined }))),
      "assets/cards/card.png": new Uint8Array([1, 2, 3]),
    })]), "core", { generateId: () => "generated-extension" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assets[0]).toMatchObject({ 路径: "assets/cards/card.png", sourceType: "resourceExtension", sourceId: "generated-extension" });
    expect(result.normalizedArtifact.fileName).toBe("generated-extension.normalized.zip");
    const normalizedFiles = unzipSync(result.normalizedArtifact.bytes);
    expect(normalizedFiles["assets/cards/card.png"]).toEqual(new Uint8Array([1, 2, 3]));
    expect(JSON.parse(new TextDecoder().decode(normalizedFiles["extension.json"])).ID).toBe("generated-extension");
  });

  it("rejects missing images, unsupported files, and unsafe SVG", async () => {
    const missing = await loadResourceExtensionFromZipFile(new Blob([zipSync({
      "extension.json": encoder.encode(JSON.stringify(extensionDocument())),
      "assets/font.woff2": new Uint8Array([1]),
    })]), "core");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["RESOURCE_EXTENSION_FILE_UNSUPPORTED", "RESOURCE_EXTENSION_IMAGE_MISSING"]));

    const unsafeSvg = await loadResourceExtensionFromZipFile(new Blob([zipSync({
      "extension.json": encoder.encode(JSON.stringify(extensionDocument({
        resourceLibraries: [{ ID: "cards", 名称: "卡牌", entries: [{ ID: "svg", 名称: "SVG", 卡图: "assets/card.svg" }] }],
      }))),
      "assets/card.svg": encoder.encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    })]), "core");
    expect(unsafeSvg.ok).toBe(false);
    if (!unsafeSvg.ok) expect(unsafeSvg.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "RESOURCE_EXTENSION_SVG_UNSAFE" })]));
  });

  it("warns for unused images and requires extension.json at ZIP root", async () => {
    const unused = await loadResourceExtensionFromZipFile(new Blob([zipSync({
      "extension.json": encoder.encode(JSON.stringify(extensionDocument({
        resourceLibraries: [{ ID: "cards", 名称: "卡牌", entries: [{ ID: "text", 名称: "纯文字" }] }],
      }))),
      "assets/unused.webp": new Uint8Array([1]),
    })]), "core");
    expect(unused.ok).toBe(true);
    if (unused.ok) expect(unused.issues).toEqual([expect.objectContaining({ code: "RESOURCE_EXTENSION_IMAGE_UNUSED", level: "warning" })]);

    const nested = await loadResourceExtensionFromZipFile(new Blob([zipSync({ "folder/extension.json": encoder.encode("{}") })]), "core");
    expect(nested.ok).toBe(false);
    if (!nested.ok) expect(nested.issues[0].code).toBe("RESOURCE_EXTENSION_MANIFEST_MISSING");
  });

  it("keeps JSON Extensions text-only", () => {
    const path = loadResourceExtensionFromJsonText(JSON.stringify(extensionDocument()), "core");
    expect(path.ok).toBe(false);
    if (!path.ok) expect(path.issues[0].code).toBe("RESOURCE_EXTENSION_IMAGE_REQUIRES_ZIP");

    const inline = loadResourceExtensionFromJsonText(JSON.stringify(extensionDocument({
      resourceLibraries: [{ ID: "cards", 名称: "卡牌", entries: [{ ID: "inline", 名称: "内联", 卡图: "data:image/png;base64,AAAA" }] }],
    })), "core");
    expect(inline.ok).toBe(false);
    if (!inline.ok) expect(inline.issues[0].code).toBe("RESOURCE_EXTENSION_INLINE_IMAGE_UNSUPPORTED");
  });
});
