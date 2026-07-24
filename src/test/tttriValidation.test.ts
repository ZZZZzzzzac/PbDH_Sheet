import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { CharacterData } from "../domain/characterData";
import type { ResourceLibrary } from "../domain/resourceLibrary";
import { runValidationChecksInProcess } from "../domain/validationScript";

const packageRoot = resolve(process.cwd(), "public/system-packages/tttri");
const scriptContent = readFileSync(resolve(packageRoot, "checks/character-consistency.js"), "utf8");
const libraryFiles = {
  ancestries: "ancestries.json",
  communities: "communities.json",
  classes: "classes.json",
  subclasses: "subclasses.json",
  armor: "armor.json",
  "domain-cards": "domain-cards.json",
} as const;
const resourceLibraries = Object.entries(libraryFiles).map(([id, file]) => normalizeLibrary(id, file));
const libraries = new Map(resourceLibraries.map((library) => [library.ID, library]));

describe("TTTRI character consistency validation", () => {
  it("accepts a valid level-one character", async () => {
    expect(await validate()).toEqual([]);
  });

  it("accepts decorated trait integers and checks legal trait upgrades", async () => {
    const valid = await validate({
      level: "2",
      "advancement-tier-2": { "traits-1": true },
      agility: ":blue[**3**]",
      strength: "*2*",
      finesse: "1",
      instinct: "0",
      presence: "0",
      knowledge: "-1",
    });
    expect(issueCodes(valid)).not.toContain("TRAIT_VALUE_INVALID");
    expect(issueCodes(valid)).not.toContain("TRAIT_DISTRIBUTION_MISMATCH");

    const invalid = await validate({
      level: "2",
      "advancement-tier-2": { "traits-1": true },
      agility: ":blue[**4**]",
      strength: "2",
    });
    expect(issueCodes(invalid)).toContain("TRAIT_DISTRIBUTION_MISMATCH");
  });

  it("counts the default ancestry experience and checks experience upgrades", async () => {
    const tier1 = await validate();
    expect(experienceIssues(tier1)).toEqual([]);

    const tier2Values = {
      level: "2",
      "advancement-tier-2": { experiences: true },
      "experience-modifier-1": "+3",
      "experience-modifier-2": "+3",
      "experience-3": "位阶经历",
      "experience-modifier-3": "+2",
    };
    const tier2 = await validate(tier2Values);
    expect(experienceIssues(tier2)).toEqual([]);

    const invalid = await validate({ ...tier2Values, "experience-modifier-1": "+4" });
    expect(issueCodes(invalid)).toContain("EXPERIENCE_MODIFIER_MISMATCH");
  });

  it("checks required ancestry/community selections and owned Cards", async () => {
    const valid = await validate();
    const relevantCodes = [
      "ANCESTRY_MISSING", "ANCESTRY_UNKNOWN", "COMMUNITY_MISSING", "COMMUNITY_UNKNOWN",
      "ANCESTRY_CARD_COUNT_MISMATCH", "COMMUNITY_CARD_COUNT_MISMATCH", "DOMAIN_CARD_COUNT_MISMATCH",
      "DOMAIN_CARD_LEVEL_INVALID", "DOMAIN_CARD_LEVEL_MISMATCH", "DOMAIN_CARD_AFFILIATION_MISMATCH",
    ];
    expect(valid.filter((issue) => relevantCodes.includes(issue.code ?? ""))).toEqual([]);

    const invalid = await validate({
      "ancestry-name": "不存在的种族",
      "primary-domain": "工业",
      "secondary-domain": "精准",
    });
    expect(issueCodes(invalid)).toEqual(expect.arrayContaining([
      "ANCESTRY_UNKNOWN", "DOMAIN_CARD_AFFILIATION_MISMATCH",
    ]));
  });

  it("allows one half-level arbitrary Domain Card for a paired multiclass advancement", async () => {
    const normalDomains = [domainEntry("奥术", 1, 0), domainEntry("奥术", 1, 1), domainEntry("奥术", 2, 0)];
    const multiclassValues = {
      level: "2",
      "advancement-tier-2": { "multiclass-1": true, "multiclass-2": true },
    };
    const validCards = characterCardsWithDomains([...normalDomains, domainEntry("工业", 1, 0)]);
    const valid = await validate(multiclassValues, validCards);
    expect(issueCodes(valid)).not.toContain("DOMAIN_CARD_COUNT_MISMATCH");
    expect(issueCodes(valid)).not.toContain("DOMAIN_CARD_LEVEL_MISMATCH");
    expect(issueCodes(valid)).not.toContain("DOMAIN_CARD_AFFILIATION_MISMATCH");

    const overLevelCards = characterCardsWithDomains([...normalDomains, domainEntry("工业", 2, 0)]);
    const overLevel = await validate(multiclassValues, overLevelCards);
    expect(issueCodes(overLevel)).toContain("DOMAIN_CARD_LEVEL_MISMATCH");

    const tooManyForeignCards = characterCardsWithDomains([
      domainEntry("奥术", 1, 0),
      domainEntry("奥术", 2, 0),
      domainEntry("工业", 1, 0),
      domainEntry("工业", 1, 1),
    ]);
    const tooManyForeign = await validate(multiclassValues, tooManyForeignCards);
    expect(issueCodes(tooManyForeign)).not.toContain("DOMAIN_CARD_LEVEL_MISMATCH");
    expect(issueCodes(tooManyForeign)).toContain("DOMAIN_CARD_AFFILIATION_MISMATCH");
  });

  it("checks advancement-based health, stress, evasion and armor maxima", async () => {
    const selectedClass = entryByName("classes", "辅助");
    const selectedArmor = entryByLibrary("armor");
    const valid = await validate({
      level: "2",
      "advancement-tier-2": { "hp-1": true, "stress-1": true, evasion: true },
      hp: { current: 0, max: numberField(selectedClass, "生命点") + 1 },
      stress: { current: 0, max: 7 },
      evasion: String(numberField(selectedClass, "闪避值") + 1),
      thresholds: `${numberField(selectedArmor, "重度阈值") + 2} / ${numberField(selectedArmor, "严重阈值") + 2}`,
    });
    expect(derivedIssues(valid)).toEqual([]);

    const invalid = await validate({ stress: { current: 0, max: 5 } });
    expect(issueCodes(invalid)).toContain("STRESS_MAX_MISMATCH");
  });

  it("requires an armor value", async () => {
    const issues = await validate({ "armor-value": "" });
    expect(issueCodes(issues)).toContain("ARMOR_VALUE_MISSING");
    expect(issueCodes(issues)).not.toContain("ARMOR_VALUE_MISMATCH");
  });

  it.each([
    { name: "无畏者", stage: "精英Y", level: 8, hp: 2, evasion: 0, armor: 0, heavy: 0 },
    { name: "斗士", stage: "资深", level: 5, hp: 0, evasion: 2, armor: 0, heavy: 0 },
    { name: "铁卫", stage: "精英Y", level: 8, hp: 0, evasion: 0, armor: 3, heavy: 2 },
  ])("applies permanent $name $stage derived-value modifiers", async ({ name, stage, level, hp, evasion, armor, heavy }) => {
    const selectedSubclass = entryByNameAndStage("subclasses", name, stage);
    const selectedClass = entryByName("classes", selectedSubclass.fields["主职"]);
    const selectedArmor = entryByLibrary("armor");
    const issues = await validate({
      level: String(level),
      "class-name": selectedClass.fields["名称"],
      "subclass-name": name,
      "subclass-stage": stage,
      "advancement-tier-4": stage.startsWith("精英") ? { "subclass-elite": true } : {},
      hp: { current: 0, max: numberField(selectedClass, "生命点") + hp },
      evasion: String(numberField(selectedClass, "闪避值") + evasion),
      "armor-value": String(numberField(selectedArmor, "护甲值") + armor),
      "armor-slots": { current: 0, max: numberField(selectedArmor, "护甲值") + armor },
      thresholds: `${numberField(selectedArmor, "重度阈值") + level + heavy} / ${numberField(selectedArmor, "严重阈值") + level}`,
    });
    expect(derivedIssues(issues)).toEqual([]);
  });
});

async function validate(overrides: Record<string, unknown> = {}, cards = baseCards()) {
  const characterData = {
    kind: "pbdh-character-data",
    schemaVersion: "0.1.0",
    systemPackage: { id: "tttri", version: "0.1.0" },
    character: { id: "test-character", values: { ...baseValues(), ...overrides } },
    cards: { instances: cards },
    compositeResources: {},
    playerImages: {},
    updatedAt: "2026-07-24T00:00:00.000Z",
  } as unknown as CharacterData;

  return runValidationChecksInProcess({
    characterData,
    resourceLibraries,
    packageMetadata: { id: "tttri", version: "0.1.0" },
    checks: [{ ID: "character-consistency", 脚本: "checks/character-consistency.js", scriptContent }],
  });
}

function baseValues(): Record<string, unknown> {
  const selectedClass = entryByName("classes", "辅助");
  const selectedSubclass = entryByNameAndStage("subclasses", "医师", "预备");
  const selectedAncestry = entryByLibrary("ancestries");
  const selectedCommunity = entryByLibrary("communities");
  const selectedArmor = entryByLibrary("armor");
  return {
    level: "1",
    "class-name": selectedClass.fields["名称"],
    "subclass-name": selectedSubclass.fields["名称"],
    "subclass-stage": selectedSubclass.fields["等级"],
    "ancestry-name": selectedAncestry.fields["名称"],
    "community-name": selectedCommunity.fields["名称"],
    "primary-domain": "奥术",
    "secondary-domain": "奇迹",
    agility: "2",
    strength: "1",
    finesse: "1",
    instinct: "0",
    presence: "0",
    knowledge: "-1",
    "experience-1": "个人经历一",
    "experience-modifier-1": "+2",
    "experience-2": "个人经历二",
    "experience-modifier-2": "+2",
    "experience-3": "",
    "experience-modifier-3": "",
    "experience-4": "",
    "experience-modifier-4": "",
    "experience-5": "",
    "experience-modifier-5": "",
    "advancement-tier-2": {},
    "advancement-tier-3": {},
    "advancement-tier-4": {},
    hp: { current: 0, max: numberField(selectedClass, "生命点") },
    stress: { current: 0, max: 6 },
    evasion: selectedClass.fields["闪避值"],
    "armor-summary": armorSummary(selectedArmor),
    "armor-value": selectedArmor.fields["护甲值"],
    "armor-slots": { current: 0, max: numberField(selectedArmor, "护甲值") },
    thresholds: `${numberField(selectedArmor, "重度阈值") + 1} / ${numberField(selectedArmor, "严重阈值") + 1}`,
  };
}

function baseCards() {
  const domains = library("domain-cards").entries
    .filter((entry) => entry.fields["领域"] === "奥术" && entry.fields["等级"] === "1级")
    .slice(0, 2);
  if (domains.length !== 2) throw new Error("找不到两张奥术 1 级领域卡测试数据。");
  return characterCardsWithDomains(domains);
}

function characterCardsWithDomains(domains: ResourceLibrary["entries"]) {
  const ancestry = entryByLibrary("ancestries");
  const community = entryByLibrary("communities");
  return [resourceCard("ancestries", ancestry), resourceCard("communities", community), ...domains.map((entry) => resourceCard("domain-cards", entry))];
}

function domainEntry(domain: string, level: number, index: number) {
  const entries = library("domain-cards").entries.filter((entry) => entry.fields["领域"] === domain && entry.fields["等级"] === `${level}级`);
  const entry = entries[index];
  if (!entry) throw new Error(`找不到第 ${index + 1} 张 ${domain} ${level} 级领域卡测试数据。`);
  return entry;
}

function resourceCard(libraryId: string, entry: ResourceLibrary["entries"][number]) {
  return {
    instanceId: `instance-${libraryId}-${entry.ID}`,
    tableModuleId: "character-card-table",
    definitionRef: { type: "resourceLibrary", libraryId, entryId: entry.ID },
    state: "配置",
  };
}

function normalizeLibrary(id: string, file: string): ResourceLibrary {
  const raw = JSON.parse(readFileSync(resolve(packageRoot, "resources", file), "utf8")) as Array<Record<string, unknown>>;
  return {
    ID: id,
    名称: id,
    路径: `resources/${file}`,
    fields: [],
    entries: raw.map((entry) => ({
      ID: String(entry.ID),
      fields: Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "ID").map(([key, value]) => [key, value == null ? "" : String(value)])),
    })),
  };
}

function library(id: string) {
  const result = libraries.get(id);
  if (!result) throw new Error(`找不到资源库 ${id}。`);
  return result;
}

function entryByLibrary(id: string) {
  const entry = library(id).entries[0];
  if (!entry) throw new Error(`资源库 ${id} 为空。`);
  return entry;
}

function entryByName(id: string, name: string) {
  const entry = library(id).entries.find((candidate) => candidate.fields["名称"] === name);
  if (!entry) throw new Error(`找不到资源 ${id}/${name}。`);
  return entry;
}

function entryByNameAndStage(id: string, name: string, stage: string) {
  const entry = library(id).entries.find((candidate) => candidate.fields["名称"] === name && candidate.fields["等级"] === stage);
  if (!entry) throw new Error(`找不到资源 ${id}/${name}/${stage}。`);
  return entry;
}

function armorSummary(entry: ResourceLibrary["entries"][number]) {
  return `${entry.fields["名称"]} | 阈值 ${entry.fields["重度阈值"]}/${entry.fields["严重阈值"]} | 护甲值 ${entry.fields["护甲值"]}`;
}

function numberField(entry: ResourceLibrary["entries"][number], key: string) {
  return Number(entry.fields[key]);
}

function issueCodes(issues: Awaited<ReturnType<typeof validate>>) {
  return issues.map((issue) => issue.code);
}

function experienceIssues(issues: Awaited<ReturnType<typeof validate>>) {
  return issues.filter((issue) => issue.code?.startsWith("EXPERIENCE_") || issue.code === "ORPHAN_EXPERIENCE_MODIFIER");
}

function derivedIssues(issues: Awaited<ReturnType<typeof validate>>) {
  const codes = ["HP_MAX_MISMATCH", "STRESS_MAX_MISMATCH", "EVASION_MISMATCH", "ARMOR_VALUE_MISMATCH", "ARMOR_MAX_MISMATCH", "CURRENT_THRESHOLDS_MISMATCH"];
  return issues.filter((issue) => codes.includes(issue.code ?? ""));
}
