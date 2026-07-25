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

  it("converts the real DHCB fixture, retaining 159 images and reporting 16 orphans", async () => {
    const bytes = readFileSync(join(migrationRoot, "与龙同行战役框架卡牌包.dhcb"));
    const loaded = await loadResourceExtensionFromFile(new File([bytes], "与龙同行战役框架卡牌包.dhcb", { type: "application/zip" }), daggerheartPackage);
    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.conversion).toEqual(expect.objectContaining({ adapterId: "dhsheet-dhcb", counts: expect.objectContaining({ sourceEntries: 159, convertedEntries: 159, boundImages: 159, orphanImages: 16 }) }));
    expect(loaded.assets).toHaveLength(159);
    expect(loaded.issues).toContainEqual(expect.objectContaining({ code: "RESOURCE_ADAPTER_ORPHAN_IMAGES", level: "warning" }));
    expect(loaded.normalizedArtifact.mimeType).toBe("application/zip");
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
