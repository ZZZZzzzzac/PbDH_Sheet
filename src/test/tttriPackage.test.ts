import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { createEmptyCharacterData, updateResourceSelectionSnapshot } from "../domain/characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies, rebuildDerivedDependencies } from "../domain/dependencyEngine";
import { resolveCardPresentation } from "../domain/cardPresentation";
import { runValidationChecksInProcess } from "../domain/validationScript";
import { getHtmlTemplateModuleReferences } from "../domain/systemPackage";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import { createCardInstancesFromSelection } from "../store/runtimeHelpers";

const packageRoot = join(process.cwd(), "public", "system-packages", "tttri");
let loadedResult: Awaited<ReturnType<typeof loadSystemPackageFromZipFile>>;

describe("TTTRI System Package", () => {
  beforeAll(async () => {
    loadedResult = await loadSystemPackageFromZipFile(createPackageZip());
  });

  it("loads through the normal pipeline as a plain package", () => {
    expect(loadedResult.ok, loadedResult.ok ? undefined : JSON.stringify(loadedResult.issues, null, 2)).toBe(true);
    if (!loadedResult.ok) return;

    expect(loadedResult.issues.filter((issue) => issue.level === "fatal" || issue.level === "error")).toEqual([]);
    expect(loadedResult.package.manifest.ID).toBe("tttri");
    expect(loadedResult.package.skins).toBeUndefined();
    expect(loadedResult.package.resourceLibraries).toHaveLength(7);
  });

  it("mounts every declared Sheet Module exactly once", () => {
    expect(loadedResult.ok).toBe(true);
    if (!loadedResult.ok) return;
    const references = [
      ...loadedResult.package.pages.flatMap((page) => getHtmlTemplateModuleReferences(page.layout.htmlContent)),
      ...getHtmlTemplateModuleReferences(loadedResult.package.shell?.htmlContent ?? ""),
    ];

    expect(references.sort()).toEqual(loadedResult.package.modules.map((module) => module.ID).sort());
    expect(loadedResult.package.pages.map((page) => page.ID)).toEqual(["character-main", "character-story"]);
    expect(loadedResult.package.pages.map((page) => page.ID)).not.toContain("character-cards");
    expect(loadedResult.package.shell?.htmlContent).toContain('class="tttri-sheet-pane"');
    expect(loadedResult.package.shell?.htmlContent).toContain('class="tttri-card-pane"');
  });

  it("uses the three Daggerheart gold Countable Resources", () => {
    expect(loadedResult.ok).toBe(true);
    if (!loadedResult.ok) return;
    const gold = loadedResult.package.modules.filter((module) => ["handful-gold", "bag-gold", "chest-gold"].includes(module.ID));

    expect(gold).toEqual([
      expect.objectContaining({ ID: "handful-gold", 类型: "countableResource", 标签: "把", 最大值: 9, 默认值: 1 }),
      expect.objectContaining({ ID: "bag-gold", 类型: "countableResource", 标签: "袋", 最大值: 9, 默认值: 0 }),
      expect.objectContaining({ ID: "chest-gold", 类型: "countableResource", 标签: "箱", 默认值: 0 }),
    ]);
    expect(loadedResult.package.modules).not.toContainEqual(expect.objectContaining({ ID: "currency" }));
  });

  it("shows only the approved Class, Subclass and Ancestry Browser fields", () => {
    expect(loadedResult.ok).toBe(true);
    if (!loadedResult.ok) return;
    const systemPackage = loadedResult.package;
    const cases = [
      { moduleIds: ["pick-class"], libraryId: "classes", visible: ["名称", "生命点", "闪避值", "希望特性", "职业特性", "主领域"] },
      { moduleIds: ["pick-subclass-t1"], libraryId: "subclasses", visible: ["主职", "名称", "等级", "推荐领域", "武器原型", "子职提升"] },
      { moduleIds: ["pick-ancestry"], libraryId: "ancestries", visible: ["名称", "简介", "推荐经历"] },
    ];

    for (const testCase of cases) {
      const library = systemPackage.resourceLibraries.find((candidate) => candidate.ID === testCase.libraryId)!;
      const libraryFields = [...new Set(library.entries.flatMap((entry) => Object.keys(entry.fields)))].filter((field) => field !== "ID");
      for (const moduleId of testCase.moduleIds) {
        const module = systemPackage.modules.find((candidate) => candidate.ID === moduleId);
        expect(module?.类型, moduleId).toBe("resourcePicker");
        if (module?.类型 !== "resourcePicker" || module.资源库 === "其他") continue;
        const template = module.资源库.find((link) => link.ID === testCase.libraryId)?.字段模板 ?? [];
        const fieldConfig = new Map(template.map((field) => [field.键, field]));
        expect([...fieldConfig.keys()].sort(), `${moduleId} 未显式配置全部资源字段`).toEqual([...libraryFields].sort());
        expect(libraryFields.filter((field) => fieldConfig.get(field)?.默认显示 !== false), moduleId).toEqual(testCase.visible);
      }
    }
  });

  it("applies only non-empty Subclass update fields across all five stages without creating Cards", () => {
    expect(loadedResult.ok).toBe(true);
    if (!loadedResult.ok) return;
    const systemPackage = loadedResult.package;
    const classes = systemPackage.resourceLibraries.find((library) => library.ID === "classes")!;
    const subclasses = systemPackage.resourceLibraries.find((library) => library.ID === "subclasses")!;
    const selectedClass = classes.entries.find((entry) => entry.fields.名称 === "辅助")!;
    const t1 = subclasses.entries.find((entry) => entry.fields.主职 === "辅助" && entry.fields.名称 === "医师" && entry.fields.阶段 === "T1")!;
    const t2 = subclasses.entries.find((entry) => entry.fields.主职 === "辅助" && entry.fields.名称 === "医师" && entry.fields.阶段 === "T2")!;
    const t3 = subclasses.entries.find((entry) => entry.fields.主职 === "辅助" && entry.fields.名称 === "医师" && entry.fields.阶段 === "T3")!;
    const t4x = subclasses.entries.find((entry) => entry.fields.主职 === "辅助" && entry.fields.名称 === "医师" && entry.fields.阶段 === "T4X")!;
    const t4y = subclasses.entries.find((entry) => entry.fields.主职 === "辅助" && entry.fields.名称 === "医师" && entry.fields.阶段 === "T4Y")!;
    expect(t1.fields.武器原型).toBe("医疗单元 远距离/双手 d8/法术");
    expect(t2.fields.武器原型).toBe("医疗单元 远距离/双手 d8+3/法术");
    expect(t3.fields.武器原型).toBe("医疗单元 远距离/双手 d8+6/法术");
    expect(t4x.fields.武器原型).toBe("医疗单元 远距离/双手 d8+9/法术");
    expect([t1.fields.等级, t2.fields.等级, t3.fields.等级, t4x.fields.等级, t4y.fields.等级]).toEqual(["预备", "正式", "资深", "精英", "精英"]);
    expect(t1.fields).not.toHaveProperty("武器伤害骰");
    expect(systemPackage.modules).not.toContainEqual(expect.objectContaining({ ID: "weapon-attack-attribute" }));
    expect(systemPackage.modules).toContainEqual(expect.objectContaining({ ID: "subclass-name", 标签: "干员类型" }));
    expect(systemPackage.modules).toContainEqual(expect.objectContaining({ ID: "subclass-stage", 标签: "等级" }));
    expect(systemPackage.modules).toContainEqual(expect.objectContaining({ ID: "subclass-current", 标签: "干员特性" }));
    expect(t1.fields.子职提升).toBe("子职特性获得：紧急维生：花费 3 希望点，启动医疗单元，为攻击范围内一名未标记生命点为 1-3 的友方自愿角色恢复 2 生命点。");
    expect(t2.fields.子职提升).toBe("子职特性增强：紧急维生+：花费 3 希望点，启动医疗单元，为攻击范围内一名:red[**未标记生命点为 1-4**] 的友方自愿角色恢复 2 生命点。");
    expect(t3.fields.子职提升).toContain("职业特性增强：状态分析-医师：");
    expect(t3.fields.子职提升).toContain(":orange[**每场景限一次**]");
    expect(t3.fields.子职提升).toContain("子职特性增强：紧急维生++：");
    expect(t3.fields.子职提升).toContain(":red[**花费 2 希望点**]");
    expect(t4x.fields.子职提升).toContain("希望特性增强：共勉前路-医师：");
    expect(t4x.fields.子职提升).toContain(":green[**，且你清除 1 压力点**]");
    expect(t4y.fields.子职提升).toContain("职业特性追加：仁慈之创：");
    let data = createEmptyCharacterData(systemPackage);

    const classResult = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected", sourceModuleId: "pick-class", libraryId: "classes", selectedEntries: [selectedClass],
    });
    data = applyDependencyResultToCharacterData(data, classResult);
    expect(data.character.values["class-name"]).toBe("辅助");
    expect(data.character.values["primary-domain"]).toBe(selectedClass.fields.主领域);
    expect(data.character.values["class-hope-feature"]).toBe(selectedClass.fields.希望特性);
    expect(data.character.values["class-feature"]).toBe(selectedClass.fields.职业特性);
    expect(data.character.values.hp).toEqual({ current: 0, max: Number(selectedClass.fields.生命点) });
    expect(classResult.resourcePickerDefaultQueries["pick-subclass-t1"].filters).toEqual({ 主职: ["辅助"] });
    const initialSubclassPicker = systemPackage.modules.find((module) => module.ID === "pick-subclass-t1");
    expect(initialSubclassPicker?.类型).toBe("resourcePicker");
    if (initialSubclassPicker?.类型 === "resourcePicker" && initialSubclassPicker.资源库 !== "其他") {
      expect(initialSubclassPicker.资源库[0]?.默认查询?.filters).toBeUndefined();
    }
    expect(classResult.cardCreationInstructions).toEqual([]);

    const t1Result = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected", sourceModuleId: "pick-subclass-t1", libraryId: "subclasses", selectedEntries: [t1],
    });
    data = applyDependencyResultToCharacterData(data, t1Result);
    expect(data.character.values["subclass-stage"]).toBe("预备");
    expect(data.character.values["subclass-current"]).toBe(t1.fields.子职特性);
    expect(data.character.values["weapon-summary"]).toBe(t1.fields.武器原型);
    expect(data.character.values["weapon-feature"]).toBe("");
    expect(t1Result.dataPatches).not.toHaveProperty("class-feature");
    expect(t1Result.dataPatches).not.toHaveProperty("class-hope-feature");
    expect(t1Result.cardCreationInstructions).toEqual([]);

    const t3Result = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected", sourceModuleId: "pick-subclass-t1", libraryId: "subclasses", selectedEntries: [t3],
    });
    expect(t3Result.dataPatches["class-feature"]).toBe(t3.fields.职业特性);
    data = applyDependencyResultToCharacterData(data, t3Result);
    expect(data.character.values["subclass-stage"]).toBe("资深");
    expect(data.character.values["subclass-current"]).toBe(t3.fields.子职特性);
    expect(data.character.values["class-feature"]).toBe(t3.fields.职业特性);
    const t3SubclassText = data.character.values["subclass-current"];
    const t3Data = JSON.parse(JSON.stringify(data));

    const xResult = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected", sourceModuleId: "pick-subclass-t1", libraryId: "subclasses", selectedEntries: [t4x],
    });
    expect(xResult.dataPatches).not.toHaveProperty("class-feature");
    expect(xResult.dataPatches).not.toHaveProperty("subclass-current");
    data = applyDependencyResultToCharacterData(data, xResult);
    expect(data.character.values["subclass-stage"]).toBe("精英");
    expect(data.character.values["class-hope-feature"]).toBe(t4x.fields.希望特性);
    expect(data.character.values["class-feature"]).toBe(t3.fields.职业特性);
    expect(data.character.values["weapon-summary"]).toBe(t4x.fields.武器原型);
    expect(data.character.values["subclass-current"]).toBe(t3SubclassText);
    expect(xResult.cardCreationInstructions).toEqual([]);

    const yResult = evaluateDependencies(t3Data, systemPackage, {
      type: "resourceSelected", sourceModuleId: "pick-subclass-t1", libraryId: "subclasses", selectedEntries: [t4y],
    });
    expect(yResult.dataPatches).not.toHaveProperty("class-hope-feature");
    expect(yResult.dataPatches).not.toHaveProperty("subclass-current");
    const yData = applyDependencyResultToCharacterData(t3Data, yResult);
    expect(yData.character.values["subclass-stage"]).toBe("精英");
    expect(yData.character.values["class-hope-feature"]).toBe(selectedClass.fields.希望特性);
    expect(yData.character.values["class-feature"]).toBe(t4y.fields.职业特性);
    expect(yData.character.values["subclass-current"]).toBe(t3SubclassText);
  });

  it("derives the ancestry experience placeholder and appends Ancestry and Community text Cards", () => {
    expect(loadedResult.ok).toBe(true);
    if (!loadedResult.ok) return;
    const systemPackage = loadedResult.package;
    const ancestry = systemPackage.resourceLibraries.find((library) => library.ID === "ancestries")!.entries[0]!;
    const community = systemPackage.resourceLibraries.find((library) => library.ID === "communities")!.entries[0]!;
    const cardTable = systemPackage.modules.find((module) => module.ID === "character-card-table");
    expect(cardTable?.类型).toBe("cardTable");
    if (cardTable?.类型 !== "cardTable") return;
    let data = createEmptyCharacterData(systemPackage);

    const ancestryResult = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected", sourceModuleId: "pick-ancestry", libraryId: "ancestries", selectedEntries: [ancestry],
    });
    data = applyDependencyResultToCharacterData(data, ancestryResult);
    data = createCardInstancesFromSelection(data, systemPackage, "pick-ancestry", "ancestries", [ancestry]);
    data = createCardInstancesFromSelection(data, systemPackage, "pick-ancestry", "ancestries", [ancestry]);
    expect(data.character.values["ancestry-name"]).toBe(ancestry.fields.名称);
    expect(data.character.values["ancestry-experience"]).toBe("");
    expect(data.character.values["ancestry-experience-modifier"]).toBe("");
    expect(ancestryResult.textPlaceholders["ancestry-experience"]).toBe(ancestry.fields.默认种族经历);
    expect(ancestryResult.textPlaceholders["ancestry-experience-modifier"]).toBe(ancestry.fields.默认种族经历修正);
    expect(ancestry.fields.默认种族经历).not.toMatch(/[+-]\d+$/);
    expect(ancestry.fields.默认种族经历修正).toBe("+2");
    expect(data.cards.instances).toHaveLength(2);

    const ancestrySource = cardTable.资源来源.find((source) => source.类型 === "resourceLibrary" && source.ID === "ancestries");
    const ancestryPresentation = resolveCardPresentation(ancestry, ancestrySource?.卡牌展示);
    expect(ancestryPresentation.description).toContain(ancestry.fields.简介);
    expect(ancestryPresentation.description).toContain(ancestry.fields.推荐经历);

    const communitySource = cardTable.资源来源.find((source) => source.类型 === "resourceLibrary" && source.ID === "communities");
    const communityPresentation = resolveCardPresentation(community, communitySource?.卡牌展示);
    expect(communityPresentation.description).toContain(community.fields.简介);
    expect(communityPresentation.description).toContain(community.fields.描述);
    expect(communityPresentation.description).toContain(community.fields.参考出身);

    const withSnapshot = updateResourceSelectionSnapshot(data, "pick-ancestry", "ancestries", [ancestry.ID]);
    expect(rebuildDerivedDependencies(withSnapshot, systemPackage).textPlaceholders["ancestry-experience"]).toBe(ancestry.fields.默认种族经历);
    expect(rebuildDerivedDependencies(withSnapshot, systemPackage).textPlaceholders["ancestry-experience-modifier"]).toBe(ancestry.fields.默认种族经历修正);

    const experienceModuleIds = systemPackage.modules
      .map((module) => module.ID)
      .filter((id) => /^experience-(?:modifier-)?[1-5]$/.test(id));
    expect(experienceModuleIds).toHaveLength(10);
  });

  it("derives two-domain defaults while keeping all Domain Cards selectable", () => {
    expect(loadedResult.ok).toBe(true);
    if (!loadedResult.ok) return;
    const systemPackage = loadedResult.package;
    const cards = systemPackage.resourceLibraries.find((library) => library.ID === "domain-cards")!;
    const imageCards = cards.entries.filter((entry) => entry.fields.显示方式 === "image");
    const textCards = cards.entries.filter((entry) => entry.fields.显示方式 === "text");
    const backedCards = cards.entries.filter((entry) => entry.fields.卡背);
    expect(cards.entries).toHaveLength(231);
    expect(imageCards).toHaveLength(231);
    expect(textCards).toHaveLength(0);
    expect(backedCards).toHaveLength(5);
    expect(cards.entries.find((entry) => entry.fields.名称 === "反击炮火")?.fields.卡背).toBe("assets/cards/domain-cards/工业/召唤：炮台.webp");
    expect(cards.entries.find((entry) => entry.fields.名称 === "号令巨兵")?.fields.卡背).toBe("assets/cards/domain-cards/工业/召唤：巨兵.webp");
    expect(cards.entries.some((entry) => entry.fields.名称 === "掎角之锋")).toBe(true);
    expect(cards.entries.some((entry) => entry.fields.名称 === "治愈苦痛")).toBe(true);

    const data = createEmptyCharacterData(systemPackage);
    data.character.values["primary-domain"] = "奥术";
    data.character.values["secondary-domain"] = "奇迹";
    const filterResult = evaluateDependencies(data, systemPackage, {
      type: "freeTextChanged", sourceModuleId: "secondary-domain", value: "奇迹",
    });
    expect(filterResult.resourcePickerDefaultQueries["pick-domain-card"].filters).toEqual({ 领域: ["奥术", "奇迹"] });
    expect(rebuildDerivedDependencies(data, systemPackage).resourcePickerDefaultQueries["pick-domain-card"].filters).toEqual({ 领域: ["奥术", "奇迹"] });

    const offDefaultCard = cards.entries.find((entry) => entry.fields.领域 === "工业")!;
    const selectionResult = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected", sourceModuleId: "pick-domain-card", libraryId: "domain-cards", selectedEntries: [offDefaultCard],
    });
    expect(selectionResult.cardCreationInstructions).toEqual([expect.objectContaining({ cardTableModuleId: "character-card-table", entries: [offDefaultCard] })]);
  });

  it("fills provisional Armor/Loot and records TTTRI advancement choices", () => {
    expect(loadedResult.ok).toBe(true);
    if (!loadedResult.ok) return;
    const systemPackage = loadedResult.package;
    const armor = systemPackage.resourceLibraries.find((library) => library.ID === "armor")!.entries[0]!;
    const loot = systemPackage.resourceLibraries.find((library) => library.ID === "loot")!.entries[0]!;
    let data = createEmptyCharacterData(systemPackage);

    const armorResult = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected", sourceModuleId: "pick-armor", libraryId: "armor", selectedEntries: [armor],
    });
    data = applyDependencyResultToCharacterData(data, armorResult);
    expect(data.character.values["armor-summary"]).toBe(
      `${armor.fields.名称} | 阈值 ${armor.fields.重度阈值}/${armor.fields.严重阈值} | 护甲值 ${armor.fields.护甲值}`,
    );
    expect(data.character.values["armor-feature"]).toBe(armor.fields.描述);
    expect(systemPackage.modules).toContainEqual(expect.objectContaining({ ID: "armor-summary", 类型: "freeText" }));
    expect(systemPackage.modules).toContainEqual(expect.objectContaining({ ID: "weapon-feature", 类型: "longText", 标签: "" }));
    expect(systemPackage.modules).toContainEqual(expect.objectContaining({ ID: "armor-feature", 类型: "longText", 标签: "" }));
    expect(data.character.values["armor-slots"]).toEqual({ current: 0, max: Number(armor.fields.护甲值) });

    const lootResult = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected", sourceModuleId: "pick-inventory-item", libraryId: "loot", selectedEntries: [loot],
    });
    data = applyDependencyResultToCharacterData(data, lootResult);
    expect(data.character.values.inventory).toContain(loot.fields.名称);
    expect(data.character.values.inventory).toContain(loot.fields.描述);

    const t2 = systemPackage.modules.find((module) => module.ID === "advancement-tier-2");
    const t3 = systemPackage.modules.find((module) => module.ID === "advancement-tier-3");
    const t4 = systemPackage.modules.find((module) => module.ID === "advancement-tier-4");
    expect(t2?.类型).toBe("checkboxResource");
    expect(t3?.类型).toBe("checkboxResource");
    expect(t4?.类型).toBe("checkboxResource");
    if (t2?.类型 !== "checkboxResource" || t3?.类型 !== "checkboxResource" || t4?.类型 !== "checkboxResource") return;
    expect(t2.选项.some((option) => option.ID === "subclass")).toBe(true);
    expect(t3.选项.some((option) => option.ID === "subclass")).toBe(true);
    expect(t4.选项.some((option) => option.ID === "subclass")).toBe(false);
    expect(t4.选项.some((option) => option.ID === "subclass-elite")).toBe(true);
    expect(t2.选项.find((option) => option.ID === "subclass")?.标签).toBe("升级干员");
    expect(t3.选项.find((option) => option.ID === "subclass")?.标签).toBe("升级干员");
    expect(t4.选项.find((option) => option.ID === "subclass-elite")?.标签).toBe("升级干员");
    for (const tier of [t2, t3, t4]) {
      expect(tier.选项.filter((option) => option.分组 === "multiclass")).toHaveLength(2);
    }
    expect(systemPackage.modules.some((module) => ["pick-subclass-t2", "pick-subclass-t3", "pick-class-module", "class-module-name"].includes(module.ID))).toBe(false);
    expect(systemPackage.resourceLibraries.some((library) => library.ID === "class-modules")).toBe(false);
    expect(systemPackage.characterCreationGuide?.步骤.length).toBeGreaterThan(0);
  });

  it("reports objective creation/progression issues without mutating Character Data", async () => {
    expect(loadedResult.ok).toBe(true);
    if (!loadedResult.ok) return;
    const systemPackage = loadedResult.package;
    const empty = createEmptyCharacterData(systemPackage);
    const before = JSON.stringify(empty);
    const missingIssues = await runValidationChecksInProcess({
      characterData: empty,
      resourceLibraries: systemPackage.resourceLibraries,
      packageMetadata: { id: "tttri", version: "0.1.0" },
      checks: systemPackage.validationChecks,
    });
    expect(missingIssues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "CLASS_MISSING", "SUBCLASS_MISSING",
    ]));
    expect(JSON.stringify(empty)).toBe(before);

    empty.character.values["armor-summary"] = "**填充布甲** · 重度 5 / 严重 11 · 护甲值 3";
    const missingCurrentArmorIssues = await runValidationChecksInProcess({
      characterData: empty,
      resourceLibraries: systemPackage.resourceLibraries,
      packageMetadata: { id: "tttri", version: "0.1.0" },
      checks: systemPackage.validationChecks,
    });
    expect(missingCurrentArmorIssues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "CURRENT_THRESHOLDS_INVALID", "CURRENT_ARMOR_VALUE_INVALID",
    ]));
    empty.character.values.thresholds = "6 / 12";
    empty.character.values["armor-value"] = "4";

    empty.character.values.level = "8";
    const t4MissingIssues = await runValidationChecksInProcess({
      characterData: empty,
      resourceLibraries: systemPackage.resourceLibraries,
      packageMetadata: { id: "tttri", version: "0.1.0" },
      checks: systemPackage.validationChecks,
    });
    expect(t4MissingIssues.map((issue) => issue.code)).toContain("T4_ELITE_SUBCLASS_MISSING");

    const selectedClass = systemPackage.resourceLibraries.find((library) => library.ID === "classes")!.entries[0]!;
    const selectedSubclass = systemPackage.resourceLibraries.find((library) => library.ID === "subclasses")!.entries.find((entry) => entry.fields.主职 === selectedClass.fields.名称 && entry.fields.阶段 === "T4X")!;
    empty.character.values.level = "8";
    empty.character.values["class-name"] = selectedClass.fields.名称;
    empty.character.values["subclass-name"] = selectedSubclass.fields.名称;
    empty.character.values["subclass-stage"] = selectedSubclass.fields.等级;
    const validIssues = await runValidationChecksInProcess({
      characterData: empty,
      resourceLibraries: systemPackage.resourceLibraries,
      packageMetadata: { id: "tttri", version: "0.1.0" },
      checks: systemPackage.validationChecks,
    });
    expect(validIssues.filter((issue) => ["CLASS_MISSING", "SUBCLASS_MISSING", "SUBCLASS_STAGE_INVALID", "SUBCLASS_UNKNOWN", "CURRENT_THRESHOLDS_INVALID", "CURRENT_ARMOR_VALUE_INVALID", "T4_ELITE_SUBCLASS_MISSING"].includes(issue.code ?? ""))).toEqual([]);
  });

  it("restores persistent values and pure filters/placeholders from a Character Save round trip", () => {
    expect(loadedResult.ok).toBe(true);
    if (!loadedResult.ok) return;
    const systemPackage = loadedResult.package;
    const ancestry = systemPackage.resourceLibraries.find((library) => library.ID === "ancestries")!.entries[0]!;
    let data = createEmptyCharacterData(systemPackage);
    data.character.values["primary-domain"] = "奥术";
    data.character.values["secondary-domain"] = "奇迹";
    data.character.values["ancestry-experience"] = "Player 自定义经历";
    data.character.values["ancestry-experience-modifier"] = "+3";
    data = updateResourceSelectionSnapshot(data, "pick-ancestry", "ancestries", [ancestry.ID]);
    data = createCardInstancesFromSelection(data, systemPackage, "pick-ancestry", "ancestries", [ancestry]);

    const restored = JSON.parse(JSON.stringify(data));
    const derived = rebuildDerivedDependencies(restored, systemPackage);
    expect(restored.character.values["ancestry-experience"]).toBe("Player 自定义经历");
    expect(restored.character.values["ancestry-experience-modifier"]).toBe("+3");
    expect(restored.cards.instances).toHaveLength(1);
    expect(derived.textPlaceholders["ancestry-experience"]).toBe(ancestry.fields.默认种族经历);
    expect(derived.textPlaceholders["ancestry-experience-modifier"]).toBe(ancestry.fields.默认种族经历修正);
    expect(derived.resourcePickerDefaultQueries["pick-domain-card"].filters).toEqual({ 领域: ["奥术", "奇迹"] });
  });
});

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
