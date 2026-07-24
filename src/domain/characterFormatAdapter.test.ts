import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import type { SystemPackage } from "./systemPackage";
import { convertExternalCharacterSource, exportExternalCharacterData, parseAndDetectCharacterSource } from "./characterFormatAdapter";

const packageRoot = join(process.cwd(), "public", "system-packages", "daggerheart-core");
const migrationRoot = join(process.cwd(), "docs", "migration", "save");
let daggerheartPackage: SystemPackage;

describe("Character Format Adapter", () => {
  beforeAll(async () => {
    const loaded = await loadSystemPackageFromZipFile(new Blob([createPackageZip()]));
    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) throw new Error("daggerheart-core failed to load");
    daggerheartPackage = loaded.package;
  });

  it("converts the real ZZZ character fixture including tri-state counters and embedded avatar", () => {
    const text = readFileSync(join(migrationRoot, "啄页_匕首之心人物卡_zzz.json"), "utf8");
    const detection = parseAndDetectCharacterSource(text, "啄页_匕首之心人物卡_zzz.json", daggerheartPackage.characterFormatAdapters ?? []);
    expect(detection.status).toBe("match");
    if (detection.status !== "match") return;
    const converted = convertExternalCharacterSource(detection.source, detection.adapter, daggerheartPackage);

    expect(converted.adapter.ID).toBe("zzz-character-json");
    expect(converted.suggestedSaveName).toBe("啄页");
    expect(converted.data.character.values).toEqual(expect.objectContaining({
      "character-name": "啄页",
      "class-name": "法师-知识学派",
      level: "3",
      agility: "3",
      hp: { current: 5, max: 5 },
      stress: { current: 7, max: 7 },
      hope: { current: 2, max: 6 },
      "armor-slots": { current: 6, max: 6 },
      proficiency: { current: 1, max: 5 },
    }));
    expect(Object.values(converted.data.playerImages)).toEqual([expect.objectContaining({ mimeType: "image/jpeg", dataUrl: expect.stringMatching(/^data:image\/jpeg;base64,/u) })]);
    expect(converted.report.convertedImages).toBe(1);
    expect(converted.report).toMatchObject({ matchedCards: 0, skippedCards: 14 });
  });

  it("produces equivalent representative values from real dhSheet JSON and HTML", () => {
    const jsonText = readFileSync(join(migrationRoot, "布罗克-战士-仙灵-龟人-荒野之民-LV1.json"), "utf8");
    const htmlText = readFileSync(join(migrationRoot, "布罗克-战士-仙灵-龟人-荒野之民-LV1.html"), "utf8");
    const jsonDetection = parseAndDetectCharacterSource(jsonText, "布罗克.json", daggerheartPackage.characterFormatAdapters ?? []);
    const htmlDetection = parseAndDetectCharacterSource(htmlText, "布罗克.html", daggerheartPackage.characterFormatAdapters ?? []);
    expect(jsonDetection.status).toBe("match");
    expect(htmlDetection.status).toBe("match");
    if (jsonDetection.status !== "match" || htmlDetection.status !== "match") return;
    const fromJson = convertExternalCharacterSource(jsonDetection.source, jsonDetection.adapter, daggerheartPackage);
    const fromHtml = convertExternalCharacterSource(htmlDetection.source, htmlDetection.adapter, daggerheartPackage);

    for (const moduleId of ["character-name", "class-name", "strength", "background-story", "hp", "stress", "hope", "armor-slots", "handful-gold"]) {
      expect(fromHtml.data.character.values[moduleId], moduleId).toEqual(fromJson.data.character.values[moduleId]);
    }
    expect(fromJson.data.character.values).toEqual(expect.objectContaining({
      "character-name": "布罗克",
      "class-name": "战士  -  利刃&骸骨",
      strength: "4",
      hp: { current: 0, max: 6 },
      stress: { current: 0, max: 9 },
      hope: { current: 0, max: 6 },
      "armor-slots": { current: 0, max: 9 },
      proficiency: { current: 4, max: 6 },
      "handful-gold": { current: 1, max: 9 },
    }));
    expect(fromJson.data.cards.instances.some((card) => card.state === "配置")).toBe(true);
    expect(fromJson.data.cards.instances.some((card) => card.state === "宝库")).toBe(true);
  });

  it("does not execute scripts while extracting embedded JSON", () => {
    let executed = false;
    Object.defineProperty(globalThis, "unsafeAdapterProbe", { configurable: true, set: () => { executed = true; } });
    const text = `<html><script>globalThis.unsafeAdapterProbe = true</script><script>window.characterData = {"ruleSetId":"daggerheart","name":"Safe"\n};</script></html>`;
    const detection = parseAndDetectCharacterSource(text, "safe.html", daggerheartPackage.characterFormatAdapters ?? []);
    expect(detection.status).toBe("match");
    expect(executed).toBe(false);
    delete (globalThis as Record<string, unknown>).unsafeAdapterProbe;
  });

  it("requires explicit selection when multiple adapters match", () => {
    const adapter = daggerheartPackage.characterFormatAdapters?.[0];
    expect(adapter).toBeTruthy();
    if (!adapter) return;
    const text = JSON.stringify({ NameTextbox: "Ambiguous", cards: [] });
    const detection = parseAndDetectCharacterSource(text, "ambiguous.json", [adapter, { ...adapter, ID: "second", 名称: "Second" }]);
    expect(detection).toEqual(expect.objectContaining({ status: "ambiguous", adapters: expect.arrayContaining([expect.objectContaining({ ID: adapter.ID }), expect.objectContaining({ ID: "second" })]) }));
  });

  it.each([
    ["zzz-character-json", "啄页_匕首之心人物卡_zzz.json", "啄页", "class-name", "法师-知识学派"],
    ["dhsheet-character", "布罗克-战士-仙灵-龟人-荒野之民-LV1.json", "布罗克", "strength", "4"],
  ])("round-trips representative values through %s JSON export", (adapterId, fixture, expectedName, moduleId, expectedValue) => {
    const text = readFileSync(join(migrationRoot, fixture), "utf8");
    const detected = parseAndDetectCharacterSource(text, fixture, daggerheartPackage.characterFormatAdapters ?? []);
    expect(detected.status).toBe("match");
    if (detected.status !== "match") return;
    const imported = convertExternalCharacterSource(detected.source, detected.adapter, daggerheartPackage);
    const adapter = daggerheartPackage.characterFormatAdapters?.find((candidate) => candidate.ID === adapterId);
    expect(adapter).toBeTruthy();
    if (!adapter) return;
    const exported = exportExternalCharacterData(imported.data, adapter, daggerheartPackage);
    expect("error" in exported).toBe(false);
    if ("error" in exported) return;
    const redetected = parseAndDetectCharacterSource(JSON.stringify(exported.document), `roundtrip-${adapterId}.json`, [adapter]);
    expect(redetected.status).toBe("match");
    if (redetected.status !== "match") return;
    const roundTrip = convertExternalCharacterSource(redetected.source, adapter, daggerheartPackage);
    expect(roundTrip.data.character.values["character-name"]).toBe(expectedName);
    expect(roundTrip.data.character.values[moduleId]).toBe(expectedValue);
    expect(roundTrip.data.character.values.hp).toEqual(imported.data.character.values.hp);
  });

  it("matches Cards only by declared exact tiers and skips ambiguous matches", () => {
    const base = daggerheartPackage.characterFormatAdapters?.find((adapter) => adapter.ID === "dhsheet-character");
    expect(base).toBeTruthy();
    if (!base) return;
    const adapter = {
      ...base, 字段映射: [], Countable映射: [], 图片映射: [],
      Card映射: [{
        来源路径: ["cards"], 状态: "配置", 目标CardTableID: "character-card-table", ResourceLibraryIDs: ["domain-cards"],
        匹配优先级: [
          { 类型: "externalId", 来源路径: ["id"], Resource字段: "原名" },
          { 类型: "fields", 字段: [{ 来源路径: ["name"], Resource字段: "名称" }, { 来源路径: ["class"], Resource字段: "领域" }] },
          { 类型: "uniqueName", 来源路径: ["name"], Resource字段: "名称" },
          { 类型: "exactDescription", 来源路径: ["description"], Resource字段: "描述" },
        ],
      }],
    } as typeof base;
    const systemPackage = {
      ...daggerheartPackage,
      resourceLibraries: [{ ID: "domain-cards", 名称: "Cards", 路径: "cards.json", fields: [], entries: [
        { ID: "a", fields: { ID: "a", 原名: "external-a", 名称: "Shared", 领域: "Blade", 描述: "Alpha description" } },
        { ID: "b", fields: { ID: "b", 原名: "external-b", 名称: "Shared", 领域: "Bone", 描述: "Beta description" } },
        { ID: "c", fields: { ID: "c", 原名: "external-c", 名称: "Unique", 领域: "Arcana", 描述: "Gamma description" } },
      ] }],
    } as SystemPackage;
    const converted = convertExternalCharacterSource({ document: { cards: [
      { id: "external-a", name: "wrong" },
      { name: "Shared", class: "Bone" },
      { name: "Unique" },
      { description: "  Gamma   description " },
      { name: "Shared" },
      { name: "missing" },
    ] }, fileName: "cards.json", carrier: adapter.载体[0] }, adapter, systemPackage);
    expect(converted.data.cards.instances.map((card) => card.definitionRef)).toEqual([
      expect.objectContaining({ entryId: "a" }), expect.objectContaining({ entryId: "b" }),
      expect.objectContaining({ entryId: "c" }), expect.objectContaining({ entryId: "c" }),
    ]);
    expect(converted.report).toMatchObject({ matchedCards: 4, skippedCards: 2 });
    expect(converted.report.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(["CHARACTER_ADAPTER_CARD_AMBIGUOUS", "CHARACTER_ADAPTER_CARD_NOT_FOUND"]));
  });

  it("does not fabricate an exported Card when external identity and required embedded fields are missing", () => {
    const adapter = daggerheartPackage.characterFormatAdapters?.find((candidate) => candidate.ID === "dhsheet-character");
    expect(adapter).toBeTruthy();
    if (!adapter) return;
    const library = daggerheartPackage.resourceLibraries?.find((candidate) => candidate.ID === "domain-cards");
    expect(library).toBeTruthy();
    if (!library) return;
    const packageWithIncompleteEntry = { ...daggerheartPackage, resourceLibraries: (daggerheartPackage.resourceLibraries ?? []).map((candidate) => candidate.ID === library.ID ? { ...candidate, entries: [{ ID: "incomplete", fields: { 名称: "Incomplete" } }] } : candidate) };
    const source = parseAndDetectCharacterSource(readFileSync(join(migrationRoot, "布罗克-战士-仙灵-龟人-荒野之民-LV1.json"), "utf8"), "source.json", [adapter]);
    expect(source.status).toBe("match");
    if (source.status !== "match") return;
    const data = convertExternalCharacterSource(source.source, adapter, daggerheartPackage).data;
    data.cards.instances = [{ instanceId: "incomplete", tableModuleId: "character-card-table", definitionRef: { type: "resourceLibrary", libraryId: "domain-cards", entryId: "incomplete" }, state: "配置", xPct: 0, yPct: 0, zIndex: 1, face: "front", rotation: 0, scale: 1, indicators: [] }];
    const exported = exportExternalCharacterData(data, adapter, packageWithIncompleteEntry);
    expect("error" in exported).toBe(false);
    if ("error" in exported) return;
    expect(exported.report.skippedCards).toBe(1);
    expect(exported.document.cards).toEqual([]);
  });
});

function createPackageZip(): Uint8Array {
  return zipSync(Object.fromEntries(walkFiles(packageRoot).map((path) => [relative(packageRoot, path).replaceAll("\\", "/"), new Uint8Array(readFileSync(path))])), { level: 0 });
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walkFiles(join(directory, entry.name)) : [join(directory, entry.name)]);
}
