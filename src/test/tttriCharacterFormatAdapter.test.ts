import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import {
  convertExternalCharacterSource,
  exportExternalCharacterData,
  parseAndDetectCharacterSource,
} from "../domain/characterFormatAdapter";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import type { SystemPackage } from "../domain/systemPackage";

const packageRoot = join(process.cwd(), "public", "system-packages", "tttri");
let tttriPackage: SystemPackage;

describe("TTTRI dhSheet Character Format Adapter", () => {
  beforeAll(async () => {
    const loaded = await loadSystemPackageFromZipFile(createPackageZip());
    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) throw new Error("TTTRI failed to load");
    tttriPackage = loaded.package;
  });

  it("imports a Rhodes Island dhSheet character through native TTTRI resources", async () => {
    const text = JSON.stringify(minimalDhSheetCharacter());
    const detection = parseAndDetectCharacterSource(
      text,
      "测试-先锋-瑞柏巴-炉火之民-LV1.json",
      tttriPackage.characterFormatAdapters ?? [],
    );
    expect(detection.status).toBe("match");
    if (detection.status !== "match") return;

    const conversion = await convertExternalCharacterSource(detection.source, detection.adapter, tttriPackage);
    expect("error" in conversion).toBe(false);
    if ("error" in conversion) return;

    expect(conversion.suggestedSaveName).toBe("测试");
    expect(conversion.data.character.values).toEqual(expect.objectContaining({
      "character-name": "测试",
      level: "1",
      "class-name": "先锋",
      "subclass-name": "战术家",
      "subclass-stage": "预备",
      "ancestry-name": "瑞柏巴",
      "community-name": "炉火之民",
      "primary-domain": "迅攻",
      "secondary-domain": "奇迹",
    }));
    expect(conversion.data.cards.instances).toEqual(expect.arrayContaining([
      expect.objectContaining({ definitionRef: { type: "resourceLibrary", libraryId: "ancestries", entryId: "种族:瑞柏巴" } }),
      expect.objectContaining({ definitionRef: { type: "resourceLibrary", libraryId: "communities", entryId: "社群:炉火之民" } }),
      expect.objectContaining({ definitionRef: { type: "resourceLibrary", libraryId: "domain-cards", entryId: "领域卡:迅攻:穿刺阵线" }, state: "配置" }),
    ]));
  });

  it("imports TTTRI values, countables, equipment, story, and inventory without losing a secondary weapon", async () => {
    const document = {
      ...minimalDhSheetCharacter(),
      evasion: "11", minorThreshold: "8", majorThreshold: "16", armorValue: "13",
      agility: { value: "2" }, strength: { value: "1" }, finesse: { value: "1" },
      instinct: { value: "0" }, presence: { value: "0" }, knowledge: { value: "-1" },
      hope: 3, hopeMax: 6, hpMax: 6, stressMax: 6, armorMax: 13,
      hp: [true, true, false, false, false, false],
      stress: [true, true, true, false, false, false],
      armorBoxes: Array.from({ length: 13 }, () => false),
      proficiency: [true, false, false, false, false, false],
      gold: [true, true, true, true, true, ...Array.from({ length: 16 }, () => false)],
      experience: ["咕咕嘎嘎", "嘎嘎咕咕", "", "", ""],
      experienceValues: ["+2", "+1", "", "", ""],
      ancestryExperience: ["荒地生存"], ancestryExperienceValues: ["2"],
      primaryWeaponName: "战术召唤物", primaryWeaponTrait: "物理/单手/远距离",
      primaryWeaponDamage: "d6", primaryWeaponFeature: "咕咕嘎嘎",
      secondaryWeaponName: "备用短刃", secondaryWeaponTrait: "物理/单手/近距离",
      secondaryWeaponDamage: "d4", secondaryWeaponFeature: "便携",
      armorName: "链甲", armorBaseScore: "4", armorThreshold: "7/15", armorFeature: "重型: 闪避值-1",
      inventory: ["一点点东西", "", "", "", ""],
      characterBackground: "咕咕咕咕", characterMotivation: "哈哈哈哈",
    };
    const detection = parseAndDetectCharacterSource(JSON.stringify(document), "values.json", tttriPackage.characterFormatAdapters ?? []);
    if (detection.status !== "match") throw new Error("fixture not detected");
    const conversion = await convertExternalCharacterSource(detection.source, detection.adapter, tttriPackage);
    if ("error" in conversion) throw new Error(conversion.error.text);

    expect(conversion.data.character.values).toEqual(expect.objectContaining({
      evasion: "11", thresholds: "8 / 16", "armor-value": "13",
      agility: "2", strength: "1", finesse: "1", instinct: "0", presence: "0", knowledge: "-1",
      hp: { current: 2, max: 6 }, stress: { current: 3, max: 6 }, hope: { current: 3, max: 6 },
      "armor-slots": { current: 0, max: 13 }, proficiency: { current: 1, max: 6 },
      "handful-gold": { current: 5, max: 9 }, "bag-gold": { current: 0, max: 9 }, "chest-gold": { current: 0, max: null },
      "experience-1": "咕咕嘎嘎", "experience-modifier-1": "+2",
      "ancestry-experience": "荒地生存", "ancestry-experience-modifier": "2",
      "weapon-summary": "战术召唤物｜物理/单手/远距离｜d6", "weapon-feature": "咕咕嘎嘎",
      "armor-summary": "链甲｜4｜7/15", "armor-feature": "重型: 闪避值-1",
      inventory: "一点点东西\n副武器：备用短刃｜物理/单手/近距离｜d4\n副武器特性：便携",
      "background-story": "咕咕咕咕", notes: "哈哈哈哈",
    }));
    expect(conversion.report.diagnostics).toContainEqual(expect.objectContaining({
      code: "TTTRI_DHSHEET_SECONDARY_WEAPON_STORED_IN_INVENTORY",
      text: expect.stringContaining("备用短刃"),
    }));
  });

  it("imports dhSheet checkedUpgrades into the equivalent TTTRI tiers", async () => {
    const document = {
      ...minimalDhSheetCharacter(),
      checkedUpgrades: {
        tier1: {}, tier2: {}, tier3: {},
        "tier1-0-0": { 0: true },
        "tier1-1-0": { 1: true },
        "tier2-6-0": { 6: true },
        "tier2-7": { 7: true },
        "tier2-8": { 8: true },
        "tier3-6-0": { 6: true },
      },
    };
    const detection = parseAndDetectCharacterSource(JSON.stringify(document), "upgrades.json", tttriPackage.characterFormatAdapters ?? []);
    if (detection.status !== "match") throw new Error("fixture not detected");
    const conversion = await convertExternalCharacterSource(detection.source, detection.adapter, tttriPackage);
    if ("error" in conversion) throw new Error(conversion.error.text);

    expect(conversion.data.character.values["advancement-tier-2"]).toEqual(expect.objectContaining({
      "traits-1": true, "hp-1": true, subclass: false, "multiclass-1": false,
    }));
    expect(conversion.data.character.values["advancement-tier-3"]).toEqual(expect.objectContaining({
      subclass: true, "proficiency-1": true, "proficiency-2": true, "multiclass-1": true, "multiclass-2": true,
    }));
    expect(conversion.data.character.values["advancement-tier-4"]).toEqual(expect.objectContaining({
      "subclass-elite": true,
    }));
  });

  it("names every unmatched dhSheet Card in the import diagnostics", async () => {
    const document = minimalDhSheetCharacter();
    document.ancestry1Ref = { id: "ri-ancestry-missing", name: "不存在的种族" };
    document.cards = [
      ...((document.cards as Array<Record<string, unknown>>).filter(Boolean).map((card) =>
        card.type === "ancestry" ? { ...card, id: "ri-ancestry-missing", name: "不存在的种族" } : card)),
      { id: "ri-domain-missing", name: "不存在的领域卡", type: "domain", class: "迅攻" },
    ];
    const detection = parseAndDetectCharacterSource(JSON.stringify(document), "missing-card.json", tttriPackage.characterFormatAdapters ?? []);
    if (detection.status !== "match") throw new Error("fixture not detected");
    const conversion = await convertExternalCharacterSource(detection.source, detection.adapter, tttriPackage);
    if ("error" in conversion) throw new Error(conversion.error.text);

    expect(conversion.report.skippedCards).toBe(2);
    expect(conversion.report.diagnostics).toContainEqual(expect.objectContaining({
      code: "CHARACTER_ADAPTER_CARD_NOT_FOUND",
      text: "Card「不存在的种族」没有匹配的 Resource Entry，已跳过。",
    }));
    expect(conversion.report.diagnostics).toContainEqual(expect.objectContaining({
      code: "CHARACTER_ADAPTER_CARD_NOT_FOUND",
      text: "Card「不存在的领域卡」没有匹配的 Resource Entry，已跳过。",
    }));
  });

  it("exports a source-compatible Rhodes Island dhSheet document and imports it again", async () => {
    const document = {
      ...minimalDhSheetCharacter(),
      evasion: "11", minorThreshold: "8", majorThreshold: "16", armorValue: "13",
      hope: 3, hopeMax: 6, hpMax: 6, stressMax: 6, armorMax: 13,
      hp: [true, true, false, false, false, false], stress: [true, true, true, false, false, false],
      proficiency: [true, false, false, false, false, false],
      primaryWeaponName: "战术召唤物", primaryWeaponTrait: "物理/单手/远距离", primaryWeaponDamage: "d6", primaryWeaponFeature: "咕咕嘎嘎",
      secondaryWeaponName: "备用短刃", secondaryWeaponTrait: "物理/单手/近距离", secondaryWeaponDamage: "d4", secondaryWeaponFeature: "便携",
      armorName: "链甲", armorBaseScore: "4", armorThreshold: "7/15", armorFeature: "重型: 闪避值-1",
      inventory: ["一点点东西", "", "", "", ""], characterBackground: "咕咕咕咕", characterMotivation: "哈哈哈哈",
    };
    const detection = parseAndDetectCharacterSource(JSON.stringify(document), "export-source.json", tttriPackage.characterFormatAdapters ?? []);
    if (detection.status !== "match") throw new Error("fixture not detected");
    const conversion = await convertExternalCharacterSource(detection.source, detection.adapter, tttriPackage);
    if ("error" in conversion) throw new Error(conversion.error.text);
    const exported = await exportExternalCharacterData(conversion.data, detection.adapter, tttriPackage);
    if ("error" in exported) throw new Error(exported.error.text);
    const output = exported.document as Record<string, unknown>;

    expectDhSheetCompatible(output);
    expect(output).toEqual(expect.objectContaining({
      ruleSetId: "rhodes-island", name: "测试", level: "1", rhodesSecondaryDomain: "奇迹",
      profession: "职业:先锋", professionRef: { id: "职业:先锋", name: "先锋" },
      subclass: "子职:先锋:战术家:T1", subclassRef: { id: "子职:先锋:战术家:T1", name: "战术家" },
      ancestry1: "种族:瑞柏巴", ancestry1Ref: { id: "种族:瑞柏巴", name: "瑞柏巴" },
      community: "社群:炉火之民", communityRef: { id: "社群:炉火之民", name: "炉火之民" },
      primaryWeaponName: "战术召唤物", primaryWeaponTrait: "物理/单手/远距离", primaryWeaponDamage: "d6", primaryWeaponFeature: "咕咕嘎嘎",
      secondaryWeaponName: "备用短刃", secondaryWeaponTrait: "物理/单手/近距离", secondaryWeaponDamage: "d4", secondaryWeaponFeature: "便携",
      armorName: "链甲", armorBaseScore: "4", armorThreshold: "7/15", armorFeature: "重型: 闪避值-1",
      inventory: ["一点点东西", "", "", "", ""], characterBackground: "咕咕咕咕", characterMotivation: "哈哈哈哈",
    }));
    expect(output.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "职业:先锋", name: "先锋", type: "profession" }),
      expect.objectContaining({ id: "子职:先锋:战术家:T1", name: "战术家", type: "subclass" }),
      expect.objectContaining({ id: "种族:瑞柏巴", name: "瑞柏巴", type: "ancestry" }),
      expect.objectContaining({ id: "领域卡:迅攻:穿刺阵线", name: "穿刺阵线", type: "domain", class: "迅攻" }),
    ]));

    const roundTripDetection = parseAndDetectCharacterSource(JSON.stringify(output), "round-trip.json", tttriPackage.characterFormatAdapters ?? []);
    if (roundTripDetection.status !== "match") throw new Error("export not detected");
    const roundTrip = await convertExternalCharacterSource(roundTripDetection.source, roundTripDetection.adapter, tttriPackage);
    if ("error" in roundTrip) throw new Error(roundTrip.error.text);
    expect(roundTrip.data.character.values).toEqual(expect.objectContaining({
      "character-name": "测试", "weapon-summary": "战术召唤物｜物理/单手/远距离｜d6", "armor-summary": "链甲｜4｜7/15",
    }));
    expect(roundTrip.data.cards.instances).toEqual(expect.arrayContaining([
      expect.objectContaining({ definitionRef: { type: "resourceLibrary", libraryId: "domain-cards", entryId: "领域卡:迅攻:穿刺阵线" }, state: "配置" }),
    ]));
  });

  it("exports equivalent TTTRI advancement choices and reports TTTRI-only T2 choices", async () => {
    const detection = parseAndDetectCharacterSource(JSON.stringify(minimalDhSheetCharacter()), "advancement-export.json", tttriPackage.characterFormatAdapters ?? []);
    if (detection.status !== "match") throw new Error("fixture not detected");
    const conversion = await convertExternalCharacterSource(detection.source, detection.adapter, tttriPackage);
    if ("error" in conversion) throw new Error(conversion.error.text);
    conversion.data.character.values["advancement-tier-2"] = { "traits-1": true, subclass: true, "multiclass-1": true };
    conversion.data.character.values["advancement-tier-3"] = { subclass: true, "proficiency-1": true, "multiclass-1": true };
    conversion.data.character.values["advancement-tier-4"] = { "subclass-elite": true };

    const exported = await exportExternalCharacterData(conversion.data, detection.adapter, tttriPackage);
    if ("error" in exported) throw new Error(exported.error.text);
    expect((exported.document as Record<string, unknown>).checkedUpgrades).toEqual(expect.objectContaining({
      "tier1-0-0": { 0: true },
      "tier2-6-0": { 6: true }, "tier2-7": { 7: true }, "tier2-8": { 8: true },
      "tier3-6-0": { 6: true },
    }));
    expect((exported.document as Record<string, unknown>).checkedUpgrades).not.toHaveProperty("tier1-6-0");
    expect(exported.report.diagnostics).toContainEqual(expect.objectContaining({
      code: "TTTRI_DHSHEET_ADVANCEMENT_NOT_EQUIVALENT",
    }));
  });
});

function minimalDhSheetCharacter(): Record<string, unknown> {
  const emptyCards = Array.from({ length: 14 }, () => null);
  return {
    ruleSetId: "rhodes-island",
    name: "测试",
    level: "1",
    profession: "ri-profession-foreign",
    professionRef: { id: "ri-profession-foreign", name: "先锋" },
    subclass: "ri-branch-foreign",
    subclassRef: { id: "ri-branch-foreign", name: "战术家" },
    ancestry1: "ri-ancestry-foreign",
    ancestry1Ref: { id: "ri-ancestry-foreign", name: "瑞柏巴" },
    community: "ri-community-foreign",
    communityRef: { id: "ri-community-foreign", name: "炉火之民" },
    rhodesSecondaryDomain: "奇迹",
    cards: [
      { id: "ri-profession-foreign", name: "先锋", type: "profession" },
      { id: "ri-branch-foreign", name: "战术家", type: "subclass", class: "先锋", level: "1" },
      { id: "ri-ancestry-foreign", name: "瑞柏巴", type: "ancestry" },
      { id: "ri-community-foreign", name: "炉火之民", type: "community" },
      { id: "ri-domain-foreign", name: "穿刺阵线", type: "domain", class: "迅攻", level: "1" },
      ...emptyCards,
    ],
    inventory_cards: Array.from({ length: 20 }, () => null),
    inventory: Array.from({ length: 5 }, () => ""),
    gold: Array.from({ length: 21 }, () => false),
    hp: Array.from({ length: 18 }, () => false),
    stress: Array.from({ length: 18 }, () => false),
    armorBoxes: Array.from({ length: 12 }, () => false),
    experience: Array.from({ length: 5 }, () => ""),
    experienceValues: Array.from({ length: 5 }, () => ""),
    checkedUpgrades: { tier1: {}, tier2: {}, tier3: {} },
  };
}

function createPackageZip(): Blob {
  const files = Object.fromEntries(
    walkFiles(packageRoot).map((path) => [relative(packageRoot, path).replaceAll("\\", "/"), readFileSync(path)]),
  );
  return new Blob([zipSync(files)], { type: "application/zip" });
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}

function expectDhSheetCompatible(document: Record<string, unknown>): void {
  for (const field of ["name", "level", "gold", "experience", "hope", "inventory", "cards"]) expect(document).toHaveProperty(field);
  for (const field of ["gold", "experience", "inventory", "cards"]) expect(Array.isArray(document[field]), `${field} must be an array`).toBe(true);
  expect(document.cards).toHaveLength(20);
  expect(document.inventory_cards).toHaveLength(20);
}
