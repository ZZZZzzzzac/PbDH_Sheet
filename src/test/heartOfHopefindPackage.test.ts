import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createEmptyCharacterData, updateCharacterValue, type CharacterData } from "../domain/characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies } from "../domain/dependencyEngine";
import { composeResource } from "../domain/resourceComposer";
import type { SystemPackage } from "../domain/systemPackage";
import { runValidationChecksInProcess } from "../domain/validationScript";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";

const packageRoot = join(process.cwd(), "public", "system-packages", "heart-of-hopefind");

describe("Heart of Hopefind System Package", () => {
  it("loads the main character Page through the normal package pipeline", async () => {
    const result = await loadHeartOfHopefindPackage();

    expect(result.ok, result.ok ? undefined : JSON.stringify(result.issues, null, 2)).toBe(true);
    if (!result.ok) return;

    expect(result.issues.filter((issue) => issue.level === "fatal" || issue.level === "error")).toEqual([]);
    expect(result.package.manifest).toMatchObject({
      ID: "heart-of-hopefind",
      名称: "寻望之心 Heart of Hopefind",
      版本: "0.1.0",
    });
    expect(result.package.defaultSkin).toBe("survivor-notebook");
    expect(result.package.pages.map((page) => page.ID)).toEqual(["character-sheet"]);
    expect(result.package.modules.map((module) => module.ID)).toEqual(expect.arrayContaining([
      "survivor-name",
      "survivor-alias",
      "survivor-portrait",
      "hope-die",
      "hope-points",
      "wounds",
      "noise",
      "fear-die",
      "life",
      "stress",
    ]));
  });

  it("initializes the confirmed core resource values", async () => {
    const result = await loadHeartOfHopefindPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = createEmptyCharacterData(result.package, "hopefind-test");
    expect(data.character.values).toMatchObject({
      "hope-die": "d12",
      "fear-die": "d12",
      "hope-points": { current: 2, max: 6 },
      wounds: { current: 0, max: 5 },
      life: { current: 0, max: 5 },
      stress: { current: 0, max: 5 },
    });
    expect(result.package.modules.find((module) => module.ID === "hope-die")).toMatchObject({
      类型: "freeText",
      默认值: "d12",
      选项: ["d4", "d6", "d8", "d10", "d12", "d20"],
    });
    expect(result.package.modules.find((module) => module.ID === "noise")).toMatchObject({
      标签: "噪音",
      选项: [{ ID: "active", 标签: "噪音" }],
    });
    const countables = result.package.modules.filter((module) => ["hope-points", "wounds", "life", "stress"].includes(module.ID));
    expect(countables).toHaveLength(4);
    const markerPairs = countables.map((module) => {
      expect(module.类型).toBe("countableResource");
      if (module.类型 !== "countableResource") return "";
      expect(module.当前值标记).not.toBe(module.剩余值标记);
      return `${module.当前值标记}/${module.剩余值标记}`;
    });
    expect(new Set(markerPairs).size).toBe(4);
  });

  it("uses independent Free Text dropdowns for both dice", async () => {
    const result = await loadHeartOfHopefindPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const dice = result.package.modules.filter((module) => module.ID === "hope-die" || module.ID === "fear-die");
    expect(dice).toHaveLength(2);
    for (const die of dice) {
      expect(die).toMatchObject({
        类型: "freeText",
        默认值: "d12",
        选项: ["d4", "d6", "d8", "d10", "d12", "d20"],
      });
    }
    expect(result.package.dependencies?.some((dependency) => dependency.触发.类型 === "checkboxChanged")).toBe(false);
  });

  it("reports Life and Stress maxima that do not total ten without changing them", async () => {
    const result = await loadHeartOfHopefindPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const initial = createEmptyCharacterData(result.package, "hopefind-test");

    expect(await validate(result.package, initial)).toEqual([]);

    const invalid = updateCharacterValue(
      updateCharacterValue(initial, "life", { current: 0, max: 6 }),
      "stress",
      { current: 0, max: 5 },
    );
    expect(await validate(result.package, invalid)).toEqual([
      expect.objectContaining({
        level: "error",
        code: "HOPEFIND_LIFE_STRESS_MAX_TOTAL",
        text: expect.stringContaining("当前为 11"),
      }),
    ]);
    expect(invalid.character.values.life).toEqual({ current: 0, max: 6 });
    expect(invalid.character.values.stress).toEqual({ current: 0, max: 5 });
  });

  it("accepts only the dropdown values for both dice", async () => {
    const result = await loadHeartOfHopefindPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const initial = createEmptyCharacterData(result.package, "hopefind-test");

    expect(await validate(result.package, initial)).toEqual([]);
    expect(await validate(result.package, updateCharacterValue(initial, "hope-die", "d8"))).toEqual([]);
    expect(await validate(result.package, updateCharacterValue(initial, "hope-die", "d20"))).toEqual([]);
    expect(await validate(result.package, updateCharacterValue(initial, "hope-die", "d7"))).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HOPEFIND_HOPE_DIE_INVALID" }),
    ]));
    expect(await validate(result.package, updateCharacterValue(initial, "fear-die", "d7"))).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HOPEFIND_FEAR_DIE_INVALID" }),
    ]));
  });

  it("composes standard and mixed survivor styles into editable Sheet Values without cards", async () => {
    const result = await loadHeartOfHopefindPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const composer = result.package.modules.find((module) => module.ID === "pick-survivor-style");
    const styles = result.package.resourceLibraries?.find((library) => library.ID === "survivor-styles");
    expect(composer?.类型).toBe("resourceComposer");
    expect(styles?.entries).toHaveLength(8);
    if (composer?.类型 !== "resourceComposer" || !styles) return;
    expect(composer.按钮文本).toBe("选择求生者风格");
    const characterPage = result.package.pages.find((page) => page.ID === "character-sheet");
    const html = characterPage?.layout.htmlContent ?? "";
    expect(html.indexOf('<pb-module id="survivor-style-name"></pb-module>')).toBeLessThan(
      html.indexOf('<pb-module id="pick-survivor-style"></pb-module>'),
    );
    for (const title of ["求生者风格", "人物特质", "职业", "弧光"]) {
      expect(html).not.toContain(`<h2>${title}</h2>`);
    }
    const loneWolf = styles.entries.find((entry) => entry.fields.名称 === "孤独")!;
    const nightBat = styles.entries.find((entry) => entry.fields.名称 === "夜蝠")!;

    const standard = composeResource(composer, { "first-feature": loneWolf, "second-feature": loneWolf });
    const mixed = composeResource(composer, { "first-feature": loneWolf, "second-feature": nightBat });
    expect(standard?.fields).toMatchObject({
      第一风格: "孤独",
      第二风格: "孤独",
      第一特性名称: "独行智慧",
      第二特性名称: "无依无靠",
    });
    expect(mixed?.fields).toMatchObject({
      第一风格: "孤独",
      第二风格: "夜蝠",
      第一特性名称: "独行智慧",
      第二特性名称: "日倦",
    });
    expect(mixed).toBeTruthy();
    if (!mixed) return;

    const data = createEmptyCharacterData(result.package, "hopefind-test");
    const dependencyResult = evaluateDependencies(data, result.package, {
      type: "resourceSelected",
      sourceModuleId: "pick-survivor-style",
      selectedEntries: [mixed],
    });
    const completed = applyDependencyResultToCharacterData(data, dependencyResult);
    expect(completed.character.values["survivor-style-name"]).toBe("孤独 / 夜蝠");
    expect(completed.character.values["survivor-style-features"]).toContain("独行智慧");
    expect(completed.character.values["survivor-style-features"]).toContain("日倦");
    expect(result.package.modules.some((module) => module.ID === "survivor-style-first-feature")).toBe(false);
    expect(result.package.modules.some((module) => module.ID === "survivor-style-second-feature")).toBe(false);
    expect(dependencyResult.cardCreationInstructions).toEqual([]);
    expect(result.package.modules.some((module) => module.类型 === "cardTable")).toBe(false);
  });

  it("validates the five-line profession and five fixed arc rows without requiring unused arcs", async () => {
    const result = await loadHeartOfHopefindPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    let valid = createEmptyCharacterData(result.package, "hopefind-test");
    const values: Record<string, string> = {
      "profession-name": "警察",
      "profession-keyword-1": "武器训练",
      "profession-modifier-1": "+2",
      "profession-keyword-2": "极端驾驶",
      "profession-modifier-2": "+2",
      "profession-keyword-3": "调查追踪",
      "profession-modifier-3": "+1",
      "profession-keyword-4": "防爆特训",
      "profession-modifier-4": "+1",
      "arc-1-description": "绝不放弃同伴",
      "arc-1-intensity": "1",
    };
    for (const [id, value] of Object.entries(values)) valid = updateCharacterValue(valid, id, value);
    expect(await validate(result.package, valid)).toEqual([]);

    let invalid = updateCharacterValue(valid, "profession-modifier-1", "+4");
    invalid = updateCharacterValue(invalid, "profession-modifier-2", "很强");
    invalid = updateCharacterValue(invalid, "profession-modifier-3", "0");
    invalid = updateCharacterValue(invalid, "arc-2-description", "暗蚀：求生必须踩着他人的死亡");
    invalid = updateCharacterValue(invalid, "arc-2-intensity", "6");
    expect(await validate(result.package, invalid)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HOPEFIND_PROFESSION_MODIFIER_MAX" }),
      expect.objectContaining({ code: "HOPEFIND_PROFESSION_MODIFIER_NOT_INTEGER" }),
      expect.objectContaining({ code: "HOPEFIND_PROFESSION_MODIFIER_TOTAL" }),
      expect.objectContaining({ code: "HOPEFIND_ARC_INTENSITY_RANGE" }),
    ]));
  });

  it("keeps one Core Hurt long text and four manual phase counters on the character Page", async () => {
    const result = await loadHeartOfHopefindPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.package.pages.map((page) => page.ID)).toEqual(["character-sheet"]);
    expect(result.package.modules.find((module) => module.ID === "core-hurt")).toMatchObject({
      类型: "longText",
      标签: "核心伤痛",
      行数: 6,
    });
    for (const [id, label] of [
      ["core-hurt-opening-note", "起·记录"],
      ["core-hurt-development-note", "承·记录"],
      ["core-hurt-turn-note", "转·记录"],
      ["core-hurt-conclusion-note", "合·记录"],
    ]) {
      expect(result.package.modules.find((module) => module.ID === id)).toMatchObject({
        类型: "longText",
        标签: label,
        隐藏标签: true,
        行数: 2,
      });
    }
    const characterPage = result.package.pages[0];
    expect(characterPage.layout.htmlContent.indexOf('<pb-module id="core-hurt"></pb-module>')).toBeLessThan(
      characterPage.layout.htmlContent.indexOf('<pb-module id="core-hurt-phase-opening"></pb-module>'),
    );
    expect(characterPage.layout.htmlContent.indexOf('<pb-module id="core-hurt-phase-opening"></pb-module>')).toBeLessThan(
      characterPage.layout.htmlContent.indexOf('<pb-module id="core-hurt-opening-note"></pb-module>'),
    );
    const data = createEmptyCharacterData(result.package, "hopefind-test");
    expect(data.character.values).toMatchObject({
      "core-hurt-phase-opening": { current: 0, max: 3 },
      "core-hurt-phase-development": { current: 0, max: 3 },
      "core-hurt-phase-turn": { current: 0, max: 3 },
      "core-hurt-phase-conclusion": { current: 0, max: 3 },
    });
    expect(await validate(result.package, data)).toEqual([]);

    const destroyedProgress = updateCharacterValue(data, "core-hurt-phase-opening", { current: 1, max: 2 });
    expect(await validate(result.package, destroyedProgress)).toEqual([]);

    const tooManySlots = updateCharacterValue(data, "core-hurt-phase-opening", { current: 0, max: 4 });
    expect(await validate(result.package, tooManySlots)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HOPEFIND_CORE_HURT_MAX_TOTAL" }),
    ]));

    const impossibleProgress = updateCharacterValue(data, "core-hurt-phase-opening", { current: 4, max: 3 });
    expect(await validate(result.package, impossibleProgress)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HOPEFIND_CORE_HURT_CURRENT_OVER_MAX" }),
    ]));
  });

  it("declares one strict A4 layout contract for both screen and print", () => {
    const skin = readFileSync(join(packageRoot, "skins", "survivor-notebook.css"), "utf8");
    const layout = readFileSync(join(packageRoot, "layouts", "base.css"), "utf8");

    expect(skin).toMatch(/\.sheet-page\s*\{[^}]*width:\s*210mm;[^}]*height:\s*297mm;[^}]*padding:\s*0\s*!important;/s);
    expect(skin).toMatch(/\.character-sheet\s*\{[^}]*padding:\s*0;/s);
    expect(skin).not.toContain("repeating-linear-gradient");
    expect(skin).toMatch(/\.hopefind-page::before\s*\{[^}]*box-shadow:/s);
    expect(skin).not.toContain("@media print");
    expect(layout).not.toContain("@media print");
    expect(layout).not.toContain("@media (max-width");
  });

  it("removes the former second-Page fields", async () => {
    const result = await loadHeartOfHopefindPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const moduleId of ["background-story", "carried-supplies", "core-hurt-story", "core-hurt-goal", "core-hurt-gm-focus"]) {
      expect(result.package.modules.some((module) => module.ID === moduleId)).toBe(false);
    }
  });
});

async function validate(systemPackage: SystemPackage, characterData: CharacterData) {
  return runValidationChecksInProcess({
    characterData,
    resourceLibraries: systemPackage.resourceLibraries ?? [],
    cardState: characterData.cards,
    packageMetadata: { id: systemPackage.manifest.ID, version: systemPackage.manifest.版本 },
    checks: systemPackage.validationChecks ?? [],
  });
}

async function loadHeartOfHopefindPackage() {
  return loadSystemPackageFromZipFile(createPackageZip());
}

function createPackageZip(): Blob {
  const files = Object.fromEntries(walkFiles(packageRoot).map((path) => [
    relative(packageRoot, path).replaceAll("\\", "/"),
    readFileSync(path),
  ]));
  return new Blob([zipSync(files)], { type: "application/zip" });
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}
