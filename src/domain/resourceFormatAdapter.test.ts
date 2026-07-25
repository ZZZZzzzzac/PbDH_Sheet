import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { loadResourceExtensionFromFile } from "../loaders/resourceExtensionLoader";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import type { SystemPackage } from "./systemPackage";
import { convertExternalResourceSource, detectResourceFormatAdapter } from "./resourceFormatAdapter";

const packageRoot = join(process.cwd(), "public", "system-packages", "daggerheart-core");
const migrationRoot = join(process.cwd(), "docs", "migration", "save");
let daggerheartPackage: SystemPackage;

describe("Resource Format Adapter scripts", () => {
  beforeAll(async () => {
    const loaded = await loadSystemPackageFromZipFile(new Blob([createPackageZip()]));
    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) throw new Error("daggerheart-core failed to load");
    daggerheartPackage = loaded.package;
  });

  it("converts the real 159-entry ZZZ fixture through the native extension contract", async () => {
    const bytes = readFileSync(join(migrationRoot, "与龙同行战役框架卡牌包_zzz.json"));
    const loaded = await loadResourceExtensionFromFile(new File([bytes], "与龙同行战役框架卡牌包_zzz.json", { type: "application/json" }), daggerheartPackage);
    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.conversion).toEqual(expect.objectContaining({ adapterId: "zzz-resource-json", counts: expect.objectContaining({ sourceEntries: 159, convertedEntries: 159 }) }));
    expect(loaded.extension.resourceLibraries.map((library) => [library.ID, library.entries.length])).toEqual([["classes", 4], ["communities", 3], ["subclasses", 51], ["domain-cards", 101]]);
    expect(loaded.extension).toMatchObject({ 名称: "与龙同行战役框架卡牌包_zzz", 版本: "未声明" });
    const domainCards = loaded.extension.resourceLibraries.find((library) => library.ID === "domain-cards")?.entries ?? [];
    expect(domainCards).not.toHaveLength(0);
    for (const card of domainCards) {
      expect(card.等级, `${card.名称}.等级`).toMatch(/^(?:[1-9]|10)级$/u);
      expect(card.回想, `${card.名称}.回想`).toMatch(/^\d+⚡$/u);
    }
    expect(loaded.assets).toHaveLength(0);
  });

  it("routes a ZZZ ancestry into the native ancestry library and splits its two features", async () => {
    const source = [
      {
        名称: "艾露猫", 类型: "种族", 简介: "艾露猫的外形与现实中的猫几乎一致。",
        描述: "小巧灵活：在创建角色时，闪避值获得永久 +1 加值。\n\n钻地回血：当你执行死亡动作并选择“回避死亡”时，你钻入地面并昏迷。",
      },
      {
        名称: "土裔 EARTHKIN", 类型: "种族",
        描述: "土裔是土元素的后裔。他们是身体由血肉和土构成的类人生物。\n\n石肤 Stoneskin: 你在护甲值和伤害阈值上获得+1加值。\n\n坚定难移 Immoveable: 当你的脚接触地面时，你不能被违背意愿地移动。",
      },
      {
        名称: "吸血鬼 Vampire", 类型: "种族",
        描述: "獠牙 Fang：进行一次力量掷骰以啃咬一个目标。\n\n饱餐 Feed：攻击成功时，你可以标记1压力点以饱餐。",
      },
    ];
    const loaded = await loadResourceExtensionFromFile(new File([JSON.stringify(source)], "怪物猎人_zzz.json", { type: "application/json" }), daggerheartPackage);
    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.extension.resourceLibraries.map((library) => library.ID)).toEqual(["ancestries"]);
    expect(loaded.extension.resourceLibraries[0].entries).toContainEqual(expect.objectContaining({
      ID: "种族:艾露猫",
      名称: "艾露猫",
      类型: "种族",
      简介: source[0].简介,
      特性A: "小巧灵活：在创建角色时，闪避值获得永久 +1 加值。",
      特性B: "钻地回血：当你执行死亡动作并选择“回避死亡”时，你钻入地面并昏迷。",
    }));
    expect(loaded.extension.resourceLibraries[0].entries).toContainEqual(expect.objectContaining({
      ID: "种族:土裔 EARTHKIN", 简介: "土裔是土元素的后裔。他们是身体由血肉和土构成的类人生物。",
      特性A: "石肤 Stoneskin: 你在护甲值和伤害阈值上获得+1加值。", 特性B: "坚定难移 Immoveable: 当你的脚接触地面时，你不能被违背意愿地移动。",
    }));
    expect(loaded.extension.resourceLibraries[0].entries).toContainEqual(expect.objectContaining({
      ID: "种族:吸血鬼 Vampire", 特性A: "獠牙 Fang：进行一次力量掷骰以啃咬一个目标。", 特性B: "饱餐 Feed：攻击成功时，你可以标记1压力点以饱餐。",
    }));
    expect(loaded.extension.resourceLibraries.some((library) => library.ID === "外部类型:种族")).toBe(false);
  });

  it("keeps an ambiguously structured ZZZ ancestry as other resources without losing its description", async () => {
    const source = [{ 名称: "未知种族", 类型: "种族", 简介: "简介", 描述: "只有一段，无法确认两个特性的边界。" }];
    const loaded = await loadResourceExtensionFromFile(new File([JSON.stringify(source)], "ambiguous-zzz.json", { type: "application/json" }), daggerheartPackage);
    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.extension.resourceLibraries.map((library) => library.ID)).toEqual(["外部类型:种族"]);
    expect(loaded.extension.resourceLibraries[0].entries[0]).toEqual(expect.objectContaining({ 名称: "未知种族", 类型: "种族", 简介: "简介", 描述: source[0].描述 }));
    expect(loaded.issues).toContainEqual(expect.objectContaining({ code: "RESOURCE_ADAPTER_ANCESTRY_AMBIGUOUS", level: "warning" }));
  });

  it("converts the real DHCB fixture as text-only resources without retaining card images", async () => {
    const bytes = readFileSync(join(migrationRoot, "与龙同行战役框架卡牌包.dhcb"));
    const loaded = await loadResourceExtensionFromFile(new File([bytes], "与龙同行战役框架卡牌包.dhcb", { type: "application/zip" }), daggerheartPackage);
    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.conversion).toEqual(expect.objectContaining({ adapterId: "dhsheet-dhcb", counts: expect.objectContaining({ sourceEntries: 159, convertedEntries: 159, boundImages: 0, orphanImages: 0 }) }));
    expect(loaded.assets).toHaveLength(0);
    expect(loaded.extension.resourceLibraries.flatMap((library) => library.entries).every((entry) => !("卡图" in entry))).toBe(true);
    expect(loaded.issues).not.toContainEqual(expect.objectContaining({ code: "RESOURCE_ADAPTER_ORPHAN_IMAGES" }));
    expect(loaded.normalizedArtifact.mimeType).toBe("application/json");
  });

  it("requires the declared root shape and explicit selection for ambiguous matches", () => {
    const adapter = daggerheartPackage.resourceFormatAdapters?.find((candidate) => candidate.ID === "zzz-resource-json");
    if (!adapter) throw new Error("missing adapter");
    const objectSource = { document: { 类型: "主职", 名称: "Wrong root" }, fileName: "wrong.json", assets: new Map<string, Uint8Array>(), sourceType: "json" as const };
    expect(detectResourceFormatAdapter(objectSource, [adapter]).status).toBe("none");
    const arraySource = { ...objectSource, document: [{ 类型: "主职", 名称: "Match" }] };
    expect(detectResourceFormatAdapter(arraySource, [adapter, { ...adapter, ID: "second" }])).toEqual(expect.objectContaining({ status: "ambiguous" }));
  });

  it("reports thrown and invalid script output", async () => {
    const base = daggerheartPackage.resourceFormatAdapters?.[0];
    if (!base) throw new Error("missing adapter");
    const source = { document: [], fileName: "x.json", assets: new Map<string, Uint8Array>(), sourceType: "json" as const };
    const thrown = await convertExternalResourceSource(source, { ...base, importScriptContent: "module.exports=()=>{throw new Error('boom')}" }, daggerheartPackage);
    expect(thrown).toEqual({ error: expect.objectContaining({ code: "RESOURCE_ADAPTER_IMPORT_SCRIPT_ERROR", text: expect.stringContaining("boom") }) });
    const invalid = await convertExternalResourceSource(source, { ...base, importScriptContent: "module.exports=()=>({})" }, daggerheartPackage);
    expect(invalid).toEqual({ error: expect.objectContaining({ code: "RESOURCE_ADAPTER_SCRIPT_OUTPUT_INVALID" }) });
  });
});

function createPackageZip(): Uint8Array { return zipSync(Object.fromEntries(walkFiles(packageRoot).map((path) => [relative(packageRoot, path).replaceAll("\\", "/"), new Uint8Array(readFileSync(path))])), { level: 0 }); }
function walkFiles(directory: string): string[] { return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walkFiles(join(directory, entry.name)) : [join(directory, entry.name)]); }
