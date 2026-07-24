import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import { loadResourceExtensionFromFile } from "../loaders/resourceExtensionLoader";
import type { SystemPackage } from "./systemPackage";
import { convertExternalResourceSource } from "./resourceFormatAdapter";
import type { ResourceFormatAdapter } from "./formatAdapter";

const packageRoot = join(process.cwd(), "public", "system-packages", "daggerheart-core");
const migrationRoot = join(process.cwd(), "docs", "migration", "save");
let daggerheartPackage: SystemPackage;

describe("Resource Format Adapter", () => {
  beforeAll(async () => {
    const loaded = await loadSystemPackageFromZipFile(new Blob([createPackageZip()]));
    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) throw new Error("daggerheart-core failed to load");
    daggerheartPackage = loaded.package;
  });

  it("converts the real 159-entry ZZZ JSON fixture through the native extension contract", async () => {
    const bytes = readFileSync(join(migrationRoot, "与龙同行战役框架卡牌包_zzz.json"));
    const loaded = await loadResourceExtensionFromFile(
      new File([bytes], "与龙同行战役框架卡牌包_zzz.json", { type: "application/json" }),
      daggerheartPackage,
    );

    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.conversion).toEqual(expect.objectContaining({ adapterId: "zzz-resource-json", counts: expect.objectContaining({ sourceEntries: 159, convertedEntries: 159 }) }));
    expect(loaded.extension.resourceLibraries.map((library) => [library.ID, library.entries.length])).toEqual([
      ["classes", 4],
      ["communities", 3],
      ["subclasses", 51],
      ["domain-cards", 101],
    ]);
    expect(loaded.extension.resourceLibraries.find((library) => library.ID === "classes")?.entries[0]).toEqual(expect.objectContaining({ 名称: "机械师", 领域: "机械+机械" }));
    expect(loaded.assets).toHaveLength(0);
  });

  it("converts the packaged DHCB fixture, retains bound images, and reports orphan images", async () => {
    const bytes = readFileSync(join(migrationRoot, "与龙同行战役框架卡牌包.dhcb"));
    const loaded = await loadResourceExtensionFromFile(
      new File([bytes], "与龙同行战役框架卡牌包.dhcb", { type: "application/zip" }),
      daggerheartPackage,
    );

    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.conversion).toEqual(expect.objectContaining({ adapterId: "dhsheet-dhcb", counts: expect.objectContaining({ sourceEntries: 159, convertedEntries: 159, boundImages: 159, orphanImages: 16 }) }));
    expect(loaded.assets).toHaveLength(159);
    expect(loaded.issues).toContainEqual(expect.objectContaining({ code: "RESOURCE_ADAPTER_ORPHAN_IMAGES", level: "warning" }));
    expect(loaded.normalizedArtifact.mimeType).toBe("application/zip");
  });

  it("creates standalone Libraries for unknown types without runtime-only fields", () => {
    const adapter = {
      ID: "generic",
      名称: "Generic",
      载体: [{ 类型: "json", 根类型: "array", 检测: [{ 路径: [0, "kind"], 存在: true }] }],
      包名: { 类型: "文件名" },
      记录路径: [],
      类型路径: ["kind"],
      EntryID路径: ["id"],
      已知类型: [],
      未知类型: { 启用: true, LibraryID前缀: "custom:", 运行时字段: ["id", "imageUrl"] },
    } satisfies ResourceFormatAdapter;
    const converted = convertExternalResourceSource({ document: [{ id: "one", kind: "Homebrew", 名称: "Card", extra: "kept", imageUrl: "removed" }], fileName: "pack.json", assets: new Map(), sourceType: "json" }, adapter, daggerheartPackage);

    expect("error" in converted).toBe(false);
    if ("error" in converted) return;
    expect(converted.extensionDocument.resourceLibraries).toEqual([{ ID: "custom:Homebrew", 名称: "Homebrew", entries: [{ ID: "one", kind: "Homebrew", 名称: "Card", extra: "kept" }] }]);
  });

  it("groups named slots, keeps an incomplete group, and skips duplicate slots", () => {
    const adapter = {
      ID: "grouped",
      名称: "Grouped",
      载体: [{ 类型: "json", 根类型: "array", 检测: [{ 路径: [0, "type"], 存在: true }] }],
      包名: { 类型: "常量", 值: "Grouped pack" },
      记录路径: [],
      类型路径: ["type"],
      EntryID路径: ["id"],
      已知类型: [],
      未知类型: { 启用: false, LibraryID前缀: "custom:", 运行时字段: [] },
      图片: { 来源路径: ["id"], 目标字段: "卡图", 资产目录: "images" },
      分组: {
        适用类型: "ancestry",
        分组键路径: ["group"],
        Slot路径: ["slot"],
        Slots: [{ 名称: "A", 值: 1 }, { 名称: "B", 值: 2 }],
        资源库ID: "ancestries",
        公共字段映射: [],
        Slot字段映射: [{ Slot: "A", 字段: "特性A", 来源路径: ["description"], 转换: "text" }, { Slot: "B", 字段: "特性B", 来源路径: ["description"], 转换: "text" }],
        图片Slot优先级: ["A", "B"],
      },
    } satisfies ResourceFormatAdapter;
    const document = [
      { id: "a1", type: "ancestry", group: "Complete", slot: 1, description: "A" },
      { id: "a2", type: "ancestry", group: "Complete", slot: 2, description: "B" },
      { id: "b1", type: "ancestry", group: "Partial", slot: 1, description: "Only" },
      { id: "c1", type: "ancestry", group: "Duplicate", slot: 1, description: "One" },
      { id: "c2", type: "ancestry", group: "Duplicate", slot: 1, description: "Two" },
    ];
    const converted = convertExternalResourceSource({ document, fileName: "groups.json", assets: new Map([["images/a1.webp", new Uint8Array([1])], ["images/a2.webp", new Uint8Array([2])]]), sourceType: "zip" }, adapter, daggerheartPackage);

    expect("error" in converted).toBe(false);
    if ("error" in converted) return;
    const libraries = converted.extensionDocument.resourceLibraries as Array<{ entries: Array<Record<string, unknown>> }>;
    expect(libraries[0].entries).toEqual([
      expect.objectContaining({ 名称: "Complete", 特性A: "A", 特性B: "B", 卡图: "assets/external/a1.webp" }),
      expect.objectContaining({ 名称: "Partial", 特性A: "Only" }),
    ]);
    expect(converted.diagnostics.map((issue) => issue.code)).toEqual(expect.arrayContaining(["RESOURCE_ADAPTER_GROUP_SLOT_MISSING", "RESOURCE_ADAPTER_GROUP_AMBIGUOUS"]));
    expect(converted.counts.orphanImages).toBe(1);
  });

  it("warns and discards a corrupt external image without blocking valid records", async () => {
    const bytes = zipSync({
      "manifest.json": new TextEncoder().encode(JSON.stringify({ format: "DaggerHeart Card Batch" })),
      "cards.json": new TextEncoder().encode(JSON.stringify({ name: "Corrupt image", version: "1", profession: [], ancestry: [], community: [], subclass: [], domain: [{ id: "bad", 名称: "Valid card" }], variant: [] })),
      "images/bad.png": new Uint8Array([1, 2, 3, 4]),
    });
    const loaded = await loadResourceExtensionFromFile(new File([bytes], "corrupt.dhcb", { type: "application/zip" }), daggerheartPackage);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.assets).toEqual([]);
    expect(loaded.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["RESOURCE_ADAPTER_IMAGE_INVALID", "RESOURCE_ADAPTER_IMAGE_MISSING"]));
    expect(loaded.conversion?.counts.convertedEntries).toBe(1);
  });
});

function createPackageZip(): Uint8Array {
  return zipSync(Object.fromEntries(walkFiles(packageRoot).map((path) => [relative(packageRoot, path).replaceAll("\\", "/"), new Uint8Array(readFileSync(path))])), { level: 0 });
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walkFiles(join(directory, entry.name)) : [join(directory, entry.name)]);
}
