import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createEmptyCharacterData,
  exportCharacterData,
  parseCharacterDataJson,
  updateCharacterValue,
  type CharacterData,
} from "../domain/characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies } from "../domain/dependencyEngine";
import type { ResourceLibraryEntry } from "../domain/resourceLibrary";
import type { SystemPackage } from "../domain/systemPackage";
import { runValidationChecksInProcess } from "../domain/validationScript";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";

const packageRoot = join(process.cwd(), "public", "system-packages", "hows-my-driving");

describe("HOW'S MY DRIVING System Package", () => {
  let systemPackage: SystemPackage;
  let loadResult: Awaited<ReturnType<typeof loadPackage>>;

  beforeAll(async () => {
    loadResult = await loadPackage();
    expect(loadResult.ok, loadResult.ok ? undefined : JSON.stringify(loadResult.issues, null, 2)).toBe(true);
    if (!loadResult.ok) throw new Error(JSON.stringify(loadResult.issues, null, 2));
    systemPackage = loadResult.package;
  });

  it("loads through the normal package pipeline without blocking issues", () => {
    expect(loadResult.ok).toBe(true);
    expect(loadResult.issues.filter((issue) => issue.level === "fatal" || issue.level === "error")).toEqual([]);
    expect(systemPackage.manifest).toMatchObject({
      ID: "hows-my-driving",
      名称: "我的车技如何？ HOW'S MY DRIVING?",
      版本: "0.1.0",
    });
    expect(systemPackage.pages.map((page) => page.ID)).toEqual(["passenger-sheet", "ride-sheet"]);
  });

  it("lays out each Memento with a compact unavailable checkbox and a three-row Experience", async () => {
    const layout = readFileSync(join(packageRoot, "layouts", "passenger-sheet.html"), "utf8");

    for (let index = 1; index <= 3; index += 1) {
      expect(systemPackage.modules.find((module) => module.ID === `memento-${index}`)).toMatchObject({
        类型: "freeText",
        标签: "纪念物",
      });
      expect(systemPackage.modules.find((module) => module.ID === `experience-${index}`)).toMatchObject({
        类型: "longText",
        行数: 3,
      });
      expect(systemPackage.modules.find((module) => module.ID === `memento-status-${index}`)).toMatchObject({
        类型: "checkboxResource",
        选项: [{ ID: "unavailable", 标签: "不可用" }],
      });
      expect(layout).toMatch(new RegExp(`<div class="memento-heading">\\s*<pb-module id="memento-${index}"></pb-module>\\s*<pb-module id="memento-status-${index}"></pb-module>\\s*</div>\\s*<pb-module id="experience-${index}"></pb-module>`));
    }
  });

  it("places Approaches in the left column and Fuel in the right column", () => {
    const layout = readFileSync(join(packageRoot, "layouts", "passenger-sheet.html"), "utf8");
    const firstColumn = layout.indexOf('<div class="page-column">');
    const secondColumn = layout.indexOf('<div class="page-column">', firstColumn + 1);
    const approaches = layout.indexOf('<section class="panel approaches-panel">');
    const fuel = layout.indexOf('<section class="panel fuel-panel">');

    expect(approaches).toBeGreaterThan(firstColumn);
    expect(approaches).toBeLessThan(secondColumn);
    expect(fuel).toBeGreaterThan(secondColumn);
  });

  it("uses three-row Gear fields, compact unavailable checkboxes, and no Ride condition", async () => {
    const layout = readFileSync(join(packageRoot, "layouts", "ride-sheet.html"), "utf8");

    for (let index = 1; index <= 3; index += 1) {
      expect(systemPackage.modules.find((module) => module.ID === `gear-${index}`)).toMatchObject({
        类型: "longText",
        标签: "",
        行数: 3,
      });
      expect(systemPackage.modules.find((module) => module.ID === `gear-status-${index}`)).toMatchObject({
        类型: "checkboxResource",
        选项: [{ ID: "unavailable", 标签: "不可用" }],
      });
      expect(layout).toMatch(new RegExp(`<article>\\s*<div class="gear-heading">\\s*<span>0${index}</span>\\s*<pb-module id="gear-status-${index}"></pb-module>\\s*</div>\\s*<pb-module id="gear-${index}"></pb-module>\\s*</article>`));
    }
    expect(systemPackage.modules.some((module) => module.ID === "ride-condition")).toBe(false);
    expect(layout).not.toContain('<pb-module id="ride-condition"></pb-module>');
  });

  it("provides ten archetypes and twenty-four approaches with readable stable IDs", async () => {
    const archetypes = library(systemPackage, "archetypes").entries;
    const approaches = library(systemPackage, "approaches").entries;

    expect(archetypes).toHaveLength(10);
    expect(approaches).toHaveLength(24);
    expect(new Set(archetypes.map((entry) => entry.ID)).size).toBe(10);
    expect(new Set(approaches.map((entry) => entry.ID)).size).toBe(24);
    expect(archetypes.every((entry) => entry.ID.startsWith("原型:"))).toBe(true);
    expect(approaches.every((entry) => entry.ID.startsWith("行事风格:"))).toBe(true);
    expect(archetypes.map((entry) => entry.fields.名称)).toEqual([
      "肌肉", "小孩", "修理师", "团队之母", "哥们", "雏儿", "夹克酷哥", "情圣", "辣妹", "老家伙",
    ]);
    expect(approaches.map((entry) => entry.fields.名称)).toEqual([
      "诉诸暴力", "机智应对", "展现共情", "编造谎言", "逃跑躲藏", "莽撞行事",
      "忍受疼痛", "施展魅力", "狂飙疾驰", "破坏某物", "不计后果", "制定计划",
      "规避伤害", "优雅移动", "碰碰运气", "保持被动", "布设陷阱", "防御驾驶",
      "装模作样", "修理某物", "干扰牵制", "散发魅力", "小心行事", "搅乱局势",
    ]);
  });

  it("fills and replaces editable archetype values", async () => {
    const entries = library(systemPackage, "archetypes").entries;
    const muscle = entry(entries, "原型:肌肉");
    const fixer = entry(entries, "原型:修理师");
    let data = createEmptyCharacterData(systemPackage, "hmd-test");

    data = selectAndApply(data, systemPackage, "pick-archetype", [muscle]);
    expect(data.character.values["archetype-name"]).toBe("肌肉");
    expect(data.character.values["archetype-abilities"]).toContain("力大无穷");
    expect(data.character.values["archetype-abilities"]).toContain("傲慢混蛋");

    data = selectAndApply(data, systemPackage, "pick-archetype", [fixer]);
    expect(data.character.values["archetype-name"]).toBe("修理师");
    expect(data.character.values["archetype-abilities"]).toContain("巧手匠心");
    expect(data.character.values["archetype-abilities"]).not.toContain("力大无穷");
    expect(systemPackage.modules.find((module) => module.ID === "archetype-abilities")).toMatchObject({ 类型: "longText" });
  });

  it("maps ordered approach selection to four ranks and replaces every rank", async () => {
    const entries = library(systemPackage, "approaches").entries;
    let data = createEmptyCharacterData(systemPackage, "hmd-test");

    data = selectAndApply(data, systemPackage, "pick-approaches", [
      entry(entries, "行事风格:诉诸暴力"),
      entry(entries, "行事风格:机智应对"),
      entry(entries, "行事风格:展现共情"),
      entry(entries, "行事风格:编造谎言"),
    ]);
    expect(data.character.values).toMatchObject({
      "approach-expert": "诉诸暴力",
      "approach-good": "机智应对",
      "approach-practiced": "展现共情",
      "approach-poor": "编造谎言",
    });

    data = selectAndApply(data, systemPackage, "pick-approaches", [
      entry(entries, "行事风格:狂飙疾驰"),
      entry(entries, "行事风格:修理某物"),
      entry(entries, "行事风格:小心行事"),
      entry(entries, "行事风格:搅乱局势"),
    ]);
    expect(data.character.values).toMatchObject({
      "approach-expert": "狂飙疾驰",
      "approach-good": "修理某物",
      "approach-practiced": "小心行事",
      "approach-poor": "搅乱局势",
    });
  });

  it("reports missing and duplicate ranked approaches without mutating Character Data", async () => {
    const initial = createEmptyCharacterData(systemPackage, "hmd-test");
    const missing = await validate(systemPackage, initial);
    expect(missing.filter((issue) => issue.code === "HMD_APPROACH_RANK_MISSING")).toHaveLength(4);

    let duplicate = updateCharacterValue(initial, "approach-expert", "诉诸暴力");
    duplicate = updateCharacterValue(duplicate, "approach-good", "诉诸暴力");
    duplicate = updateCharacterValue(duplicate, "approach-practiced", "机智应对");
    duplicate = updateCharacterValue(duplicate, "approach-poor", "展现共情");
    expect(await validate(systemPackage, duplicate)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "HMD_APPROACH_RANK_DUPLICATE",
        path: "character.values.approach-good",
      }),
    ]));
    expect(duplicate.character.values["approach-good"]).toBe("诉诸暴力");
  });

  it("fills and replaces Ride name, dice, and editable trait", async () => {
    const entries = library(systemPackage, "rides").entries;
    let data = createEmptyCharacterData(systemPackage, "hmd-test");

    data = selectAndApply(data, systemPackage, "pick-ride", [entry(entries, "座驾:轿车")]);
    expect(data.character.values).toMatchObject({
      "ride-name": "轿车",
      "ride-starting-die": "D6",
      "ride-current-die": "D6",
      "ride-trait": "灵活敏捷：驾驶骰投两次取其一。",
    });

    data = updateCharacterValue(data, "ride-current-die", "D4");
    data = selectAndApply(data, systemPackage, "pick-ride", [entry(entries, "座驾:花瓶皮卡")]);
    expect(data.character.values).toMatchObject({
      "ride-name": "花瓶皮卡",
      "ride-starting-die": "D12",
      "ride-current-die": "D12",
      "ride-trait": "油老虎：停车时所有燃料骰额外降低一级。",
    });
  });

  it("round-trips every manual rule-specific state through Character Data", async () => {
    let data = createEmptyCharacterData(systemPackage, "hmd-round-trip");
    const values = {
      "fuel-die": "D8",
      "fuel-points": { current: 3, max: null },
      "memento-1": "旧车钥匙",
      "experience-1": "第一次独自上路",
      "memento-status-1": { unavailable: true },
      "memento-2": "褪色腕带",
      "experience-2": "最后一场演出",
      "memento-status-2": { unavailable: false },
      "memento-3": "母亲的戒指",
      "experience-3": "离家前的承诺",
      "memento-status-3": { unavailable: true },
      "gear-1": "撬棍",
      "gear-status-1": { unavailable: true },
      "gear-2": "手电筒",
      "gear-status-2": { unavailable: false },
      "gear-3": "急救包",
      "gear-status-3": { unavailable: true },
      "ride-current-die": "D6",
      "ride-damage": { current: 2, max: null },
      "finish-line": "海边的旧汽车旅馆",
    };
    for (const [id, value] of Object.entries(values)) data = updateCharacterValue(data, id, value);

    const imported = parseCharacterDataJson(exportCharacterData(data), systemPackage);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.data.character.values).toMatchObject(values);
  });
});

function selectAndApply(
  data: CharacterData,
  systemPackage: SystemPackage,
  sourceModuleId: string,
  selectedEntries: ResourceLibraryEntry[],
): CharacterData {
  const result = evaluateDependencies(data, systemPackage, {
    type: "resourceSelected",
    sourceModuleId,
    selectedEntries,
  });
  return applyDependencyResultToCharacterData(data, result);
}

async function validate(systemPackage: SystemPackage, characterData: CharacterData) {
  return runValidationChecksInProcess({
    characterData,
    resourceLibraries: systemPackage.resourceLibraries ?? [],
    cardState: characterData.cards,
    packageMetadata: { id: systemPackage.manifest.ID, version: systemPackage.manifest.版本 },
    checks: systemPackage.validationChecks ?? [],
  });
}

async function loadPackage() {
  const files = Object.fromEntries(walkFiles(packageRoot).map((path) => [
    relative(packageRoot, path).replaceAll("\\", "/"),
    readFileSync(path),
  ]));
  return loadSystemPackageFromZipFile(new Blob([zipSync(files)], { type: "application/zip" }));
}

function library(systemPackage: SystemPackage, id: string) {
  const found = systemPackage.resourceLibraries?.find((item) => item.ID === id);
  if (!found) throw new Error(`Missing Resource Library: ${id}`);
  return found;
}

function entry(entries: ResourceLibraryEntry[], id: string) {
  const found = entries.find((item) => item.ID === id);
  if (!found) throw new Error(`Missing Resource Entry: ${id}`);
  return found;
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}
