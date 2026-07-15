import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { CharacterData } from "../domain/characterData";
import type { ResourceLibrary } from "../domain/resourceLibrary";
import { runValidationChecksInProcess } from "../domain/validationScript";

const packageRoot = resolve(process.cwd(), "public/system-packages/daggerheart-core");
const scriptContent = readFileSync(resolve(packageRoot, "checks/character-consistency.js"), "utf8");
const libraryFiles = {
  ancestries: "ancestries.json",
  communities: "communities.json",
  classes: "classes.json",
  subclasses: "subclasses.json",
  weapons: "weapons.json",
  armor: "armor.json",
  loot: "loot.json",
  "domain-cards": "domain-cards.json",
  "beast-forms": "beast-forms.json",
} as const;

const resourceLibraries = Object.entries(libraryFiles).map(([id, file]) => normalizeLibrary(id, file));
const libraries = new Map(resourceLibraries.map((library) => [library.ID, library]));

describe("daggerheart-core character consistency validation", () => {
  it("accepts a valid level-one character", async () => {
    const issues = await validate();
    expect(issues).toEqual([]);
  });

  it("requires exactly one ancestry and community card, plus at least one subclass card", async () => {
    const domainCards = baseDomainCards();
    const missing = await validate({}, domainCards, {});
    expect(issueCodes(missing)).toEqual(expect.arrayContaining([
      "ANCESTRY_CARD_COUNT_MISMATCH",
      "COMMUNITY_CARD_COUNT_MISMATCH",
      "SUBCLASS_CARD_COUNT_MISMATCH",
    ]));

    const duplicateCommunity = resourceCard("communities", entryByLibrary("communities").fields["名称"]);
    const duplicated = await validate({}, [...baseCharacterCards(), duplicateCommunity]);
    expect(issueCodes(duplicated)).toContain("COMMUNITY_CARD_COUNT_MISMATCH");
  });

  it("requires the armor text value to equal the countable armor maximum", async () => {
    const issues = await validate({ "armor-value": "2" });
    expect(issueCodes(issues)).toContain("ARMOR_VALUE_MAX_MISMATCH");
  });

  it("reports advancement totals, paired options, subclass conflicts, and derived progression", async () => {
    const issues = await validate({
      level: "3",
      proficiency: { current: 1, max: 6 },
      "advancement-tier-2": {
        "proficiency-1": true,
        "multiclass-1": true,
        "multiclass-2": true,
        subclass: true,
      },
    });
    const codes = issueCodes(issues);
    expect(codes).toContain("PAIRED_ADVANCEMENT_INCOMPLETE");
    expect(codes).toContain("SUBCLASS_MULTICLASS_CONFLICT");
    expect(codes).toContain("PROFICIENCY_MISMATCH");
    expect(codes).toContain("EXPERIENCE_COUNT_MISMATCH");
  });

  it("checks domain-card count and level distribution, including knowledge-school cards", async () => {
    const levelOneCards = domainCardsAtLevel(1, 3);
    const knowledgeBase = resourceCard("subclasses", "知识学派", "配置", "基础");
    const legal = await validate({}, [...levelOneCards, knowledgeBase]);
    expect(issueCodes(legal)).not.toContain("DOMAIN_CARD_COUNT_MISMATCH");
    expect(issueCodes(legal)).not.toContain("DOMAIN_CARD_LEVEL_MISMATCH");

    const illegal = await validate({}, [
      ...levelOneCards.slice(0, 2),
      resourceCard("domain-cards", domainEntryAtLevel(2).fields["名称"], "配置"),
      knowledgeBase,
    ]);
    expect(issueCodes(illegal)).toContain("DOMAIN_CARD_LEVEL_MISMATCH");
  });

  it("checks primary and multiclass domain-card affiliation", async () => {
    const primaryCards = baseDomainCards();
    const foreignCard = resourceCardByEntry("domain-cards", domainEntry("贤者", 1));
    const noMulticlass = await validate({}, [...primaryCards.slice(0, 1), foreignCard]);
    expect(issueCodes(noMulticlass)).toContain("DOMAIN_CARD_AFFILIATION_MISMATCH");

    const druidSubclass = resourceCard("subclasses", "元素结社", "配置", "基础");
    const oneMulticlassDomain = await validate({}, [...primaryCards.slice(0, 1), foreignCard, druidSubclass]);
    expect(issueCodes(oneMulticlassDomain)).not.toContain("DOMAIN_CARD_AFFILIATION_MISMATCH");

    const secondMulticlassDomain = resourceCardByEntry("domain-cards", domainEntry("奥术", 1));
    const twoMulticlassDomains = await validate({}, [foreignCard, secondMulticlassDomain, druidSubclass]);
    expect(issueCodes(twoMulticlassDomains)).toContain("DOMAIN_CARD_AFFILIATION_MISMATCH");
  });

  it("applies persistent threshold, evasion, armor, ancestry, subclass, and configured-domain effects", async () => {
    const fighter = entryByName("classes", "战士");
    const padded = entryByName("armor", "填充布甲");
    const bladeCards = domainEntries("利刃", 4, ["利刃恩泽"]);
    const radianceCards = domainEntries("辉耀", 4, ["辉耀恩泽"]);
    const cards = [
      ...bladeCards.map((entry) => resourceCardByEntry("domain-cards", entry)),
      ...radianceCards.map((entry) => resourceCardByEntry("domain-cards", entry)),
      resourceCard("domain-cards", "强化护甲"),
      resourceCard("domain-cards", "奋起直追"),
      resourceCard("domain-cards", "不可侵犯"),
      resourceCard("subclasses", "坚毅铁卫", "配置", "基础"),
      resourceCard("subclasses", "黑夜行者", "配置", "精通"),
      resourceCard("subclasses", "翔翼哨兵", "配置", "精通"),
      resourceCard("subclasses", "战争学派", "配置", "进阶"),
      resourceCard("beast-forms", entryByLibrary("beast-forms").fields["名称"]),
      compositeAncestryCard(),
    ];
    const bothBonus = 1 + 2 + 1;
    const severeOnlyBonus = 4 + 3 + 1 + 3 + 4;
    const expectedMajor = numberField(padded, "重度阈值") + 1 + bothBonus;
    const expectedSevere = numberField(padded, "严重阈值") + 1 + bothBonus + severeOnlyBonus;
    const expectedEvasion = numberField(fighter, "闪避值") + 1 - 1 + 1 + 1;

    const issues = await validate({
      "major-threshold": String(expectedMajor),
      "severe-threshold": String(expectedSevere),
      evasion: String(expectedEvasion),
      "primary-weapon-name": "**勇气之剑**｜力量｜近战｜d10 物理｜双手",
      "primary-weapon-description": "",
      "secondary-weapon-name": "**塔盾**｜力量｜近战｜d4 物理｜单手",
      "secondary-weapon-description": "",
      "armor-slots": { current: 0, max: 5 },
      "armor-value": "5",
    }, cards, ancestryCompositeResources());

    const codes = issueCodes(issues);
    expect(codes).not.toContain("MAJOR_THRESHOLD_MISMATCH");
    expect(codes).not.toContain("SEVERE_THRESHOLD_MISMATCH");
    expect(codes).not.toContain("EVASION_MISMATCH");
    expect(codes).not.toContain("ARMOR_MAX_MISMATCH");
  });

  it("accepts legal Flourishing Life choices and rejects an impossible three-benefit result", async () => {
    const flourishing = resourceCard("domain-cards", "蓬勃生命", "宝库");
    const base = baseValues();
    const legal = await validate({
      hp: { current: 0, max: (base.hp as { max: number }).max + 1 },
      "major-threshold": String(Number(base["major-threshold"]) + 2),
      "severe-threshold": String(Number(base["severe-threshold"]) + 2),
    }, [...baseDomainCards(), flourishing]);
    expect(issueCodes(legal)).not.toContain("FLOURISHING_LIFE_SELECTION_MISMATCH");

    const illegal = await validate({
      hp: { current: 0, max: (base.hp as { max: number }).max + 1 },
      stress: { current: 0, max: 7 },
      "major-threshold": String(Number(base["major-threshold"]) + 2),
      "severe-threshold": String(Number(base["severe-threshold"]) + 2),
    }, [...baseDomainCards(), flourishing]);
    expect(issueCodes(illegal)).toContain("FLOURISHING_LIFE_SELECTION_MISMATCH");
  });

  it("includes permanent equipment, standard inventory, ancestry, and Master of Craft modifiers", async () => {
    const cards = [
      ...baseDomainCards(),
      resourceCard("domain-cards", "技艺大师", "宝库"),
      compositeAncestryCard("械灵", "猿族"),
    ];
    const issues = await validate({
      agility: "1",
      finesse: "0",
      knowledge: "0",
      "armor-name": "全板甲",
      "primary-weapon-name": "**戟**｜力量｜近战｜d10 物理｜双手",
      inventory: "**启迪遗宝**\n知识+1，你不能同时持有其他遗宝。",
      "experience-modifier-1": "6",
    }, cards, ancestryCompositeResources("械灵", "猿族"));
    const codes = issueCodes(issues);
    expect(codes).not.toContain("TRAIT_DISTRIBUTION_MISMATCH");
    expect(codes).not.toContain("EXPERIENCE_MODIFIER_MISMATCH");
  });
});

async function validate(
  overrides: Record<string, unknown> = {},
  cards = baseCharacterCards(),
  compositeResources: Record<string, unknown> = ancestryCompositeResources("龙人", "矮人"),
) {
  const characterData = {
    kind: "pbdh-character-data",
    schemaVersion: "0.1.0",
    systemPackage: { id: "daggerheart-core", version: "0.1.0" },
    character: { id: "test-character", values: { ...baseValues(), ...overrides } },
    cards: { instances: cards },
    compositeResources,
    playerImages: {},
    updatedAt: "2026-07-15T00:00:00.000Z",
  } as unknown as CharacterData;

  return runValidationChecksInProcess({
    characterData,
    resourceLibraries,
    packageMetadata: { id: "daggerheart-core", version: "0.1.0" },
    checks: [{ ID: "character-consistency", 脚本: "checks/character-consistency.js", scriptContent }],
  });
}

function baseValues(): Record<string, unknown> {
  const fighter = entryByName("classes", "战士");
  const padded = entryByName("armor", "填充布甲");
  return {
    level: "1",
    "class-name": "战士",
    "armor-name": "填充布甲",
    agility: "2",
    strength: "1",
    finesse: "1",
    instinct: "0",
    presence: "0",
    knowledge: "-1",
    proficiency: { current: 1, max: 6 },
    hp: { current: 0, max: numberField(fighter, "生命点") },
    stress: { current: 0, max: 6 },
    "armor-slots": { current: 0, max: numberField(padded, "护甲值") },
    "armor-value": padded.fields["护甲值"],
    "major-threshold": String(numberField(padded, "重度阈值") + 1),
    "severe-threshold": String(numberField(padded, "严重阈值") + 1),
    evasion: String(numberField(fighter, "闪避值") + 1),
    "experience-1": "老兵",
    "experience-modifier-1": "2",
    "experience-2": "铁匠",
    "experience-modifier-2": "2",
    "experience-3": "",
    "experience-modifier-3": "",
    "experience-4": "",
    "experience-modifier-4": "",
    "experience-5": "",
    "experience-modifier-5": "",
    "advancement-tier-2": {},
    "advancement-tier-3": {},
    "advancement-tier-4": {},
    "primary-weapon-name": "",
    "secondary-weapon-name": "",
    inventory: "",
  };
}

function baseDomainCards() {
  return [domainEntry("利刃", 1), domainEntry("骸骨", 1)].map((entry) => resourceCardByEntry("domain-cards", entry));
}

function baseCharacterCards() {
  return [
    ...baseDomainCards(),
    compositeAncestryCard("龙人", "矮人"),
    resourceCard("communities", entryByLibrary("communities").fields["名称"]),
    resourceCard("subclasses", "屠戮呼唤", "配置", "基础"),
  ];
}

function domainCardsAtLevel(level: number, count: number) {
  return domainEntriesAtLevel(level).slice(0, count).map((entry) => resourceCardByEntry("domain-cards", entry));
}

function domainEntryAtLevel(level: number) {
  const entry = domainEntriesAtLevel(level)[0];
  if (!entry) throw new Error(`找不到 ${level} 级领域卡测试数据。`);
  return entry;
}

function domainEntry(domain: string, level: number) {
  const entry = library("domain-cards").entries.find((candidate) => candidate.fields["领域"] === domain && candidate.fields["等级"] === `${level}级`);
  if (!entry) throw new Error(`找不到 ${domain} ${level} 级领域卡测试数据。`);
  return entry;
}

function domainEntriesAtLevel(level: number) {
  return library("domain-cards").entries.filter((entry) => entry.fields["等级"] === `${level}级`);
}

function domainEntries(domain: string, count: number, requiredNames: string[]) {
  const required = requiredNames.map((name) => entryByName("domain-cards", name));
  const others = library("domain-cards").entries.filter((entry) => entry.fields["领域"] === domain && !requiredNames.includes(entry.fields["名称"]));
  return [...required, ...others].slice(0, count);
}

function resourceCard(libraryId: string, name: string, state = "配置", stage?: string) {
  const entry = library(libraryId).entries.find((candidate) => candidate.fields["名称"] === name && (!stage || candidate.fields["等级"] === stage));
  if (!entry) throw new Error(`找不到测试资源 ${libraryId}/${name}/${stage ?? ""}。`);
  return resourceCardByEntry(libraryId, entry, state);
}

function resourceCardByEntry(libraryId: string, entry: ResourceLibrary["entries"][number], state = "配置") {
  return {
    instanceId: `instance-${libraryId}-${entry.ID}-${state}`,
    tableModuleId: "character-card-table",
    definitionRef: { type: "resourceLibrary", libraryId, entryId: entry.ID },
    state,
  };
}

function compositeAncestryCard(ancestryA = "龟人", ancestryB = "猿族") {
  return {
    instanceId: `instance-composite-${ancestryA}-${ancestryB}`,
    tableModuleId: "character-card-table",
    definitionRef: { type: "compositeResource", compositeResourceId: "ancestry-composite" },
    state: "配置",
  };
}

function ancestryCompositeResources(ancestryA = "龟人", ancestryB = "猿族") {
  return {
    "ancestry-composite": {
      ID: "ancestry-composite",
      composerModuleId: "pick-ancestry",
      fields: { 种族A名称: ancestryA, 种族B名称: ancestryB, 特性A: "", 特性B: "" },
    },
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

function entryByName(libraryId: string, name: string) {
  const entry = library(libraryId).entries.find((candidate) => candidate.fields["名称"] === name);
  if (!entry) throw new Error(`找不到资源 ${libraryId}/${name}。`);
  return entry;
}

function entryByLibrary(libraryId: string) {
  const entry = library(libraryId).entries[0];
  if (!entry) throw new Error(`资源库 ${libraryId} 为空。`);
  return entry;
}

function numberField(entry: ResourceLibrary["entries"][number], key: string) {
  return Number(entry.fields[key]);
}

function issueCodes(issues: Awaited<ReturnType<typeof validate>>) {
  return issues.map((issue) => issue.code);
}
