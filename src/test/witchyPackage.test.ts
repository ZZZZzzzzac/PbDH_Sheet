import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { createEmptyCharacterData, updateCharacterValue, type CharacterData } from "../domain/characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies } from "../domain/dependencyEngine";
import type { SystemPackage } from "../domain/systemPackage";
import { runValidationChecksInProcess } from "../domain/validationScript";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import { formatCharacterTextExport } from "../domain/characterTextFormatter";

const packageRoot = join(process.cwd(), "public", "system-packages", "witchy");
let loadedResult: Awaited<ReturnType<typeof loadSystemPackageFromZipFile>>;

describe("Witchy System Package", () => {
  beforeAll(async () => {
    // Shared immutable fixture: behavioral tests create fresh Character Data instead of mutating the package.
    loadedResult = await loadSystemPackageFromZipFile(createPackageZip());
  });

  it("loads through the normal package pipeline without fatal or error diagnostics", async () => {
    const result = await loadWitchyPackage();

    expect(result.ok, result.ok ? undefined : JSON.stringify(result.issues, null, 2)).toBe(true);
    if (!result.ok) return;
    expect(result.package.manifest.版本).toBe("1.2.0");
    expect(result.issues.filter((issue) => issue.level === "fatal" || issue.level === "error")).toEqual([]);
    expect(result.package.defaultSkin).toBe("witching-hour");
    expect(result.package.characterCreationGuide?.步骤.length).toBeGreaterThan(0);
    expect(result.package.pages).toHaveLength(1);
  });

  it("uses a single sheet with editable resources and no Card Table", async () => {
    const result = await loadWitchyPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.package.modules.some((module) => module.类型 === "cardTable")).toBe(false);
    expect(result.package.modules.find((module) => module.ID === "pick-archetype")).not.toHaveProperty("创建卡牌");
    expect(result.package.modules.find((module) => module.ID === "magic-points")).toMatchObject({
      类型: "countableResource", 默认值: 3, 最大值: 6, 最大值可改: false,
      显示方式: "标记",
      标记尺寸: 26,
      当前值标记: { 类型: "图片", 资源路径: "assets/icons/resource-magic-marked.svg" },
      剩余值标记: { 类型: "图片", 资源路径: "assets/icons/resource-magic-unmarked.svg" },
    });
    expect(result.package.modules.find((module) => module.ID === "erosion")).toMatchObject({
      类型: "countableResource", 默认值: 0, 最大值: 6,
      显示方式: "标记",
      标记尺寸: 26,
      当前值标记: { 类型: "图片", 资源路径: "assets/icons/resource-erosion-marked.svg" },
      剩余值标记: { 类型: "图片", 资源路径: "assets/icons/resource-erosion-unmarked.svg" },
    });
    expect(result.package.dependencies).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ID: "apply-erosion-to-magic-points",
        触发: { 类型: "countableChanged", 来源模块ID: "erosion" },
      }),
    ]));
    for (const id of ["essence-assiah", "essence-yetzirah", "essence-atziluth"]) {
      expect(result.package.modules.find((module) => module.ID === id)).toMatchObject({ 类型: "freeText", 默认值: "0" });
    }
    for (const id of ["experience-modifier-1", "experience-modifier-2"]) {
      expect(result.package.modules.find((module) => module.ID === id)).toMatchObject({ 类型: "freeText", 默认值: "+3" });
    }
    expect(result.package.modules.find((module) => module.ID === "archetype-description")).toMatchObject({ 类型: "longText", 行数: 10 });
    for (const id of ["omen-past", "omen-present", "omen-future", "inventory", "familiar-name", "familiar-portrait", "familiar-type-name", "familiar-type-description"]) {
      expect(result.package.modules.some((module) => module.ID === id)).toBe(true);
    }
    expect(result.package.modules.some((module) => module.ID === "magic-4-name" || module.ID === "magic-4-description")).toBe(false);
    for (const id of ["omen-past", "omen-present", "omen-future"]) {
      expect(result.package.modules.find((module) => module.ID === id)).toMatchObject({ 类型: "longText", 行数: 6 });
    }
    expect(result.package.modules.some((module) => module.ID === "character-concept" || module.ID === "character-notes")).toBe(false);
    expect(result.package.modules.some((module) => module.ID === "archetype-indicators")).toBe(false);

    const witchingHour = result.package.skins?.find((skin) => skin.ID === "witching-hour");
    expect(witchingHour).toBeDefined();
  });

  it("exports resources and the three Essences to SealDice", () => {
    expect(loadedResult.ok).toBe(true);
    if (!loadedResult.ok) return;
    const definition = loadedResult.package.characterTextExports?.find((candidate) => candidate.ID === "sealdice");
    expect(definition).toBeTruthy();
    if (!definition) return;
    expect(formatCharacterTextExport(definition, createEmptyCharacterData(loadedResult.package))).toBe(
      ".st 魔力3魔力上限6蚀痕0蚀痕上限6物质界0精神界0灵界0",
    );
  });

  it("fills archetype and familiar text from their Resource Libraries", async () => {
    const result = await loadWitchyPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = createEmptyCharacterData(result.package, "witch-test");

    const gardener = result.package.resourceLibraries?.find((library) => library.ID === "archetypes")?.entries
      .find((entry) => entry.ID === "原型:园丁");
    const alarm = result.package.resourceLibraries?.find((library) => library.ID === "familiar-types")?.entries
      .find((entry) => entry.ID === "使魔类型:警铃");
    expect(gardener).toBeTruthy();
    expect(alarm).toBeTruthy();
    if (!gardener || !alarm) return;

    const archetypes = result.package.resourceLibraries?.find((library) => library.ID === "archetypes")?.entries ?? [];
    expect(Object.fromEntries(archetypes.map((entry) => [entry.ID, entry.fields.描述]))).toMatchObject({
      "原型:主宰": expect.stringContaining("还不够好"),
      "原型:园丁": expect.stringContaining("胜利花园"),
      "原型:知心人": expect.stringContaining("苦痛分摊"),
      "原型:隐士": expect.stringContaining("虚无悖论"),
      "原型:巧匠": expect.stringContaining("打破边界"),
      "原型:贤者": expect.stringContaining("记录历史"),
    });
    const familiarEntries = result.package.resourceLibraries?.find((library) => library.ID === "familiar-types")?.entries ?? [];
    expect(familiarEntries.find((entry) => entry.ID === "使魔类型:捣蛋鬼")?.fields.描述).not.toContain("业果");

    const archetypeResult = evaluateDependencies(data, result.package, {
      type: "resourceSelected", sourceModuleId: "pick-archetype", libraryId: "archetypes", selectedEntries: [gardener],
    });
    const withArchetype = applyDependencyResultToCharacterData(data, archetypeResult);
    expect(withArchetype.character.values["archetype-name"]).toBe("园丁");
    expect(withArchetype.character.values["archetype-description"]).toContain("精心培育");

    const familiarResult = evaluateDependencies(withArchetype, result.package, {
      type: "resourceSelected", sourceModuleId: "pick-familiar-type", libraryId: "familiar-types", selectedEntries: [alarm],
    });
    const completed = applyDependencyResultToCharacterData(withArchetype, familiarResult);
    expect(completed.character.values["familiar-type-name"]).toBe("警铃");
    expect(completed.character.values["familiar-type-description"]).toContain("每场景一次");
  });

  it("reports creation constraints plus Crescent Moon and Total Lunar Eclipse states", async () => {
    const result = await loadWitchyPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    let data = createEmptyCharacterData(result.package, "witch-test");
    const validValues: Record<string, string> = {
      "essence-assiah": "+2", "essence-yetzirah": "0", "essence-atziluth": "-2",
      "experience-1": "沼泽鬼婆", "experience-modifier-1": "+3",
      "experience-2": "魔药大师", "experience-modifier-2": "+3",
      "magic-1-name": "荆棘", "magic-2-name": "月光", "magic-3-description": "以装满雨水的银杯施法",
    };
    for (const [id, value] of Object.entries(validValues)) data = updateCharacterValue(data, id, value);

    expect(await validate(result.package, data)).toEqual([]);

    const staleExperience = updateCharacterValue(data, "experience-modifier-1", "+2");
    expect(await validate(result.package, staleExperience)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "WITCH_EXPERIENCE_MODIFIER", level: "warning" }),
    ]));

    const crescent = updateCharacterValue(data, "magic-points", { current: 3, max: 3 });
    expect(await validate(result.package, crescent)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "WITCH_CRESCENT_MOON", level: "warning" }),
    ]));

    const eclipse = updateCharacterValue(data, "magic-points", { current: 0, max: 0 });
    const eclipseIssues = await validate(result.package, eclipse);
    expect(eclipseIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "WITCH_TOTAL_LUNAR_ECLIPSE", level: "warning" }),
    ]));
    expect(eclipseIssues.some((issue) => issue.code === "WITCH_CRESCENT_MOON")).toBe(false);

    const invalid = updateCharacterValue(updateCharacterValue(data, "essence-assiah", "+3"), "magic-2-name", "");
    expect(await validate(result.package, invalid)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "WITCH_ESSENCE_OUT_OF_RANGE", level: "error" }),
      expect.objectContaining({ code: "WITCH_ESSENCE_SUM", level: "error" }),
      expect.objectContaining({ code: "WITCH_MAGIC_MISSING", level: "error" }),
    ]));
  });
});

async function validate(systemPackage: SystemPackage, characterData: CharacterData) {
  return runValidationChecksInProcess({
    characterData, resourceLibraries: systemPackage.resourceLibraries ?? [], cardState: characterData.cards,
    packageMetadata: { id: systemPackage.manifest.ID, version: systemPackage.manifest.版本 }, checks: systemPackage.validationChecks ?? [],
  });
}

function loadWitchyPackage() { return loadedResult; }

function createPackageZip(): Blob {
  const files = Object.fromEntries(walkFiles(packageRoot).map((path) => [relative(packageRoot, path).replaceAll("\\", "/"), readFileSync(path)]));
  return new Blob([zipSync(files)], { type: "application/zip" });
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}
