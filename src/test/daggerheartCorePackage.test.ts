import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import { createEmptyCharacterData, updateCharacterValue } from "../domain/characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies } from "../domain/dependencyEngine";
import { runValidationChecksInProcess } from "../domain/validationScript";
import manifest from "../../public/system-packages/daggerheart-core/manifest.json";
import modules from "../../public/system-packages/daggerheart-core/modules.json";
import pages from "../../public/system-packages/daggerheart-core/pages.json";
import dependencies from "../../public/system-packages/daggerheart-core/dependencies.json";
import baseCss from "../../public/system-packages/daggerheart-core/layouts/base.css?raw";
import mainHtml from "../../public/system-packages/daggerheart-core/layouts/character-main.html?raw";
import shellCss from "../../public/system-packages/daggerheart-core/layouts/shell.css?raw";
import shellHtml from "../../public/system-packages/daggerheart-core/layouts/shell.html?raw";
import storyHtml from "../../public/system-packages/daggerheart-core/layouts/character-story.html?raw";
import ancestriesJson from "../../public/system-packages/daggerheart-core/resources/ancestries.json?raw";
import armorJson from "../../public/system-packages/daggerheart-core/resources/armor.json?raw";
import backupWeaponsJson from "../../public/system-packages/daggerheart-core/resources/backup-weapons.json?raw";
import beastFormsJson from "../../public/system-packages/daggerheart-core/resources/beast-forms.json?raw";
import classesJson from "../../public/system-packages/daggerheart-core/resources/classes.json?raw";
import communitiesJson from "../../public/system-packages/daggerheart-core/resources/communities.json?raw";
import domainCardsJson from "../../public/system-packages/daggerheart-core/resources/domain-cards.json?raw";
import lootJson from "../../public/system-packages/daggerheart-core/resources/loot.json?raw";
import primaryWeaponsJson from "../../public/system-packages/daggerheart-core/resources/primary-weapons.json?raw";
import secondaryWeaponsJson from "../../public/system-packages/daggerheart-core/resources/secondary-weapons.json?raw";
import subclassesJson from "../../public/system-packages/daggerheart-core/resources/subclasses.json?raw";
import consistencyCheck from "../../public/system-packages/daggerheart-core/checks/character-consistency.js?raw";

describe("Daggerheart core System Package", () => {
  it("loads the physical package through the normal zip pipeline", async () => {
    const result = await loadDaggerheartPackage();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.package.manifest.ID).toBe("daggerheart-core");
    expect(result.package.pages.map((page) => page.ID)).toEqual([
      "character-main",
      "character-story",
    ]);
    expect(result.package.shell?.htmlContent).toContain("<pb-page-outlet></pb-page-outlet>");
    expect(result.package.modules).toHaveLength(99);
    expect(new Set(result.package.modules.map((module) => module.ID)).size).toBe(99);
    expect(result.package.resourceLibraries).toHaveLength(11);
    expect(result.issues.filter((issue) => issue.level === "fatal" || issue.level === "error")).toEqual([]);
  });

  it("fills class defaults, HP maximum, and subclass filter without opening UI", async () => {
    const loaded = await loadDaggerheartPackage();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const classes = loaded.package.resourceLibraries?.find((library) => library.ID === "classes");
    const druid = classes?.entries.find((entry) => entry.fields.名称 === "德鲁伊");
    expect(druid).toBeDefined();
    if (!druid) return;

    const data = createEmptyCharacterData(loaded.package);
    const result = evaluateDependencies(data, loaded.package, {
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      selectedEntries: [druid],
    });
    const next = applyDependencyResultToCharacterData(data, result);

    expect(next.character.values["class-name"]).toBe("德鲁伊");
    expect(next.character.values["evasion"]).toBe("10");
    expect(next.character.values.hp).toEqual(expect.objectContaining({ current: 0, max: 6 }));
    expect(next.character.values["background-question-1"]).toBe(druid.fields.背景问题1);
    expect(next.character.values["connection-question-3"]).toBe(druid.fields.关系问题3);
    expect(result.resourcePickerDefaultQueries["pick-subclass"].filters).toEqual({ 主职: ["德鲁伊"] });
  });

  it("fills independent equipment fields and the Armor Counter maximum", async () => {
    const loaded = await loadDaggerheartPackage();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const data = createEmptyCharacterData(loaded.package);
    const armorLibrary = loaded.package.resourceLibraries?.find((library) => library.ID === "armor");
    const armor = armorLibrary?.entries[0];
    expect(armor).toBeDefined();
    if (!armor) return;

    const result = evaluateDependencies(data, loaded.package, {
      type: "resourceSelected",
      sourceModuleId: "pick-armor",
      libraryId: "armor",
      selectedEntries: [armor],
    });
    const next = applyDependencyResultToCharacterData(data, result);

    expect(next.character.values["armor-name"]).toBe(armor.fields.名称);
    expect(next.character.values["armor-base-major"]).toBe(armor.fields.重伤阈值);
    expect(next.character.values["armor-description"]).toBe(armor.fields.描述);
    expect(next.character.values["armor-slots"]).toEqual(expect.objectContaining({ current: 0, max: Number(armor.fields.护甲值) }));
  });

  it("keeps five loot Picker targets independent", () => {
    for (let index = 1; index <= 5; index += 1) {
      expect(modules).toEqual(expect.arrayContaining([
        expect.objectContaining({ ID: `pick-item-${index}`, 资源库ID: "loot" }),
        expect.objectContaining({ ID: `item-${index}`, 类型: "freeText" }),
      ]));
      expect(dependencies).toEqual(expect.arrayContaining([
        expect.objectContaining({ ID: `fill-item-${index}`, targets: [{ 类型: "module", 模块ID: `item-${index}` }] }),
      ]));
    }
  });

  it("connects domain and beast-form Pickers to the shared multi-Library Card Table", () => {
    expect(modules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ID: "character-card-table",
        资源库IDs: expect.arrayContaining(["domain-cards", "beast-forms"]),
      }),
      expect.objectContaining({ ID: "pick-domain-card", 资源库ID: "domain-cards" }),
      expect.objectContaining({ ID: "pick-beast-form", 资源库ID: "beast-forms" }),
    ]));
  });

  it("reports Daggerheart consistency issues without changing Character Data", async () => {
    const loaded = await loadDaggerheartPackage();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const classes = loaded.package.resourceLibraries?.find((library) => library.ID === "classes");
    const armor = loaded.package.resourceLibraries?.find((library) => library.ID === "armor")?.entries[0];
    const druid = classes?.entries.find((entry) => entry.fields.名称 === "德鲁伊");
    expect(druid).toBeDefined();
    expect(armor).toBeDefined();
    if (!druid || !armor) return;

    let data = createEmptyCharacterData(loaded.package);
    data = updateCharacterValue(data, "class-name", "德鲁伊");
    data = updateCharacterValue(data, "armor-name", armor.fields.名称);
    data = updateCharacterValue(data, "level", { current: 2, max: 10 });
    data = updateCharacterValue(data, "hp", { current: 0, max: Number(druid.fields.初始生命点) });
    data = updateCharacterValue(data, "armor-slots", { current: 0, max: Number(armor.fields.护甲值) });
    data = updateCharacterValue(data, "major-threshold", String(Number(armor.fields.重伤阈值) + 2));
    data = updateCharacterValue(data, "severe-threshold", String(Number(armor.fields.严重阈值) + 2));
    const snapshot = JSON.stringify(data);

    const validIssues = await runValidationChecksInProcess({
      characterData: data,
      resourceLibraries: loaded.package.resourceLibraries ?? [],
      packageMetadata: { id: "daggerheart-core", version: "0.1.0" },
      checks: [{ ID: "character-consistency", 脚本: "checks/character-consistency.js", scriptContent: consistencyCheck }],
    });
    expect(validIssues).toEqual([]);
    expect(JSON.stringify(data)).toBe(snapshot);

    const invalidData = updateCharacterValue(updateCharacterValue(data, "major-threshold", "999"), "hp", { current: 0, max: 1 });
    const invalidIssues = await runValidationChecksInProcess({
      characterData: invalidData,
      resourceLibraries: loaded.package.resourceLibraries ?? [],
      packageMetadata: { id: "daggerheart-core", version: "0.1.0" },
      checks: [{ ID: "character-consistency", 脚本: "checks/character-consistency.js", scriptContent: consistencyCheck }],
    });
    expect(invalidIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "CLASS_HP_MAX_MISMATCH", level: "warning" }),
      expect.objectContaining({ code: "MAJOR_THRESHOLD_MISMATCH", level: "warning" }),
    ]));
  });

  it("normalizes ancestry and community resources for one shared Card Table", async () => {
    const ancestryEntries = JSON.parse(ancestriesJson) as Array<Record<string, unknown>>;
    const communityEntries = JSON.parse(communitiesJson) as Array<Record<string, unknown>>;
    const allEntries = [...ancestryEntries, ...communityEntries];

    expect(ancestryEntries).toHaveLength(18);
    expect(communityEntries).toHaveLength(9);
    expect(new Set(allEntries.map((entry) => entry.ID)).size).toBe(allEntries.length);
    expect(allEntries.every((entry) => typeof entry.名称 === "string" && typeof entry.描述 === "string")).toBe(true);
    expect(modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ ID: "pick-ancestry", 资源库ID: "ancestries" }),
      expect.objectContaining({ ID: "pick-community", 资源库ID: "communities" }),
      expect.objectContaining({
        ID: "character-card-table",
        资源库IDs: expect.arrayContaining(["ancestries", "communities"]),
      }),
    ]));
  });

  it("declares the complete Counter set with intentional maximum editing", async () => {
    const countables = modules.filter((module) => module.类型 === "countableResource");

    expect(countables.map((module) => module.ID)).toEqual([
      "level",
      "hp",
      "stress",
      "hope",
      "armor-slots",
      "proficiency",
      "handful-gold",
      "bag-gold",
      "chest-gold",
    ]);
    expect(countables.filter((module) => "最大值可改" in module && module.最大值可改).map((module) => module.ID)).toEqual([
      "hp",
      "stress",
      "hope",
      "armor-slots",
    ]);
    expect(countables.find((module) => module.ID === "hope")).toEqual(expect.objectContaining({ 默认值: 2, 最大值: 6 }));
    expect(countables.find((module) => module.ID === "handful-gold")).toEqual(expect.objectContaining({ 默认值: 1, 最大值: 9 }));
  });

  it("keeps the initial semantic layouts free of absolute positioning", () => {
    expect(baseCss).not.toMatch(/position\s*:\s*absolute/i);
    expect(shellCss).not.toMatch(/position\s*:\s*absolute/i);
    expect(mainHtml).toContain('<section class="module-group" aria-label="角色身份">');
    expect(mainHtml).toContain('<section class="module-group" aria-label="核心属性">');
    expect(mainHtml).toContain('<section class="module-group" aria-label="防御与阈值">');
    expect(mainHtml).toContain('<section class="module-group" aria-label="角色资源">');
    expect(mainHtml).toContain('<section class="module-group" aria-label="金币">');
  });

  it("mounts Pages on the left and the shared Card Table once on the right", () => {
    expect((shellHtml.match(/<pb-page-outlet>/g) ?? [])).toHaveLength(1);
    expect((shellHtml.match(/id="character-card-table"/g) ?? [])).toHaveLength(1);
    expect(shellHtml).toContain('id="pick-domain-card"');
    expect(shellHtml).toContain('id="pick-beast-form"');
    expect(mainHtml).not.toContain('id="character-card-table"');
    expect(storyHtml).not.toContain('id="character-card-table"');
  });
});

async function loadDaggerheartPackage() {
  const bytes = zipSync({
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "pages.json": strToU8(JSON.stringify(pages)),
    "modules.json": strToU8(JSON.stringify(modules)),
    "dependencies.json": strToU8(JSON.stringify(dependencies)),
      "layouts/base.css": strToU8(baseCss),
      "layouts/shell.html": strToU8(shellHtml),
      "layouts/shell.css": strToU8(shellCss),
      "layouts/character-main.html": strToU8(mainHtml),
      "layouts/character-story.html": strToU8(storyHtml),
    "resources/ancestries.json": strToU8(ancestriesJson),
    "resources/communities.json": strToU8(communitiesJson),
    "resources/classes.json": strToU8(classesJson),
    "resources/subclasses.json": strToU8(subclassesJson),
    "resources/primary-weapons.json": strToU8(primaryWeaponsJson),
    "resources/secondary-weapons.json": strToU8(secondaryWeaponsJson),
    "resources/backup-weapons.json": strToU8(backupWeaponsJson),
    "resources/armor.json": strToU8(armorJson),
    "resources/loot.json": strToU8(lootJson),
    "resources/domain-cards.json": strToU8(domainCardsJson),
    "resources/beast-forms.json": strToU8(beastFormsJson),
    "checks/character-consistency.js": strToU8(consistencyCheck),
  });
  return loadSystemPackageFromZipFile(new Blob([bytes], { type: "application/zip" }));
}
