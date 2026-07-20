import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import { getHtmlTemplateModuleReferences } from "../domain/systemPackage";
import { composeResource } from "../domain/resourceComposer";
import { createEmptyCharacterData, updateResourceSelectionSnapshot } from "../domain/characterData";
import { rebuildDerivedDependencies } from "../domain/dependencyEngine";
import { getResourceLibraryFields } from "../domain/resourceLibrary";
import { getResourcePickerLinks } from "../domain/systemPackage";

const packageRoot = join(process.cwd(), "public", "system-packages", "daggerheart-core");
let loadedResult: Awaited<ReturnType<typeof loadSystemPackageFromZipFile>>;

describe("Daggerheart core System Package", () => {
  beforeAll(async () => {
    // Shared immutable fixture: behavioral tests create fresh Character Data instead of mutating the package.
    loadedResult = await loadSystemPackageFromZipFile(createPackageZip());
  });

  it("loads through the normal package pipeline without fatal or error diagnostics", async () => {
    const result = await loadDaggerheartPackage();

    expect(result.ok, result.ok ? undefined : JSON.stringify(result.issues, null, 2)).toBe(true);
    if (!result.ok) return;

    expect(result.issues.filter((issue) => issue.level === "fatal" || issue.level === "error")).toEqual([]);
    expect(result.package.defaultSkin).toBe("plain");
    expect(result.package.skins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ID: "plain", 推荐框架配色: "light" }),
        expect.objectContaining({ ID: "skin-gpt-5.6sol", 推荐框架配色: "dark" }),
      ]),
    );
    expect(result.package.skins?.length).toBeGreaterThanOrEqual(2);
    expect(result.package.skins?.find((skin) => skin.ID === "plain")).not.toHaveProperty("layoutOverrides");
    const astralSkin = result.package.skins?.find((skin) => skin.ID === "skin-gpt-5.6sol");
    expect(astralSkin?.layoutOverrides?.shell?.htmlContent).toContain("astral-workspace");
    expect(astralSkin?.layoutOverrides?.pages.map((page) => page.ID)).toEqual([
      "character-main",
      "character-story",
      "ranger-companion",
    ]);
    expect(astralSkin?.layoutOverrides?.pages.every((page) => page.htmlContent.includes("astral-"))).toBe(true);
  });

  it("ships skin-KimiK3 with thread-bound HTML overrides that preserve module ownership and Guide regions", async () => {
    const result = await loadDaggerheartPackage();
    expect(result.ok, result.ok ? undefined : JSON.stringify(result.issues, null, 2)).toBe(true);
    if (!result.ok) return;

    const skin = result.package.skins?.find((candidate) => candidate.ID === "skin-KimiK3");
    expect(skin).toBeTruthy();
    if (!skin?.layoutOverrides?.shell) return;
    expect(skin.推荐框架配色).toBe("light");
    expect(skin.layoutOverrides.pages?.map((page) => page.ID)).toEqual(["character-main", "character-story"]);

    for (const override of skin.layoutOverrides.pages ?? []) {
      const basePage = result.package.pages.find((page) => page.ID === override.ID);
      expect(basePage, override.ID).toBeTruthy();
      if (!basePage) continue;
      expect(getHtmlTemplateModuleReferences(override.htmlContent).sort(), override.ID)
        .toEqual(getHtmlTemplateModuleReferences(basePage.layout.htmlContent).sort());
      expect(override.htmlContent).toContain("book-fold-edge");
    }

    expect(result.package.shell).toBeTruthy();
    if (!result.package.shell) return;
    expect(getHtmlTemplateModuleReferences(skin.layoutOverrides.shell.htmlContent).sort())
      .toEqual(getHtmlTemplateModuleReferences(result.package.shell.htmlContent).sort());
    expect(skin.layoutOverrides.shell.htmlContent.match(/<pb-page-outlet\b/gi)).toHaveLength(1);
    expect(skin.layoutOverrides.shell.htmlContent.match(/\bdata-print-page\s*=\s*["']true["']/gi)).toHaveLength(1);

    const effectiveHtml = [
      ...result.package.pages.map(
        (page) => skin.layoutOverrides?.pages?.find((override) => override.ID === page.ID)?.htmlContent ?? page.layout.htmlContent,
      ),
      skin.layoutOverrides.shell.htmlContent,
    ].join("\n");
    const guideRegions = [
      "guide-class", "guide-ancestry", "guide-community", "guide-traits",
      "guide-resources", "guide-equipment", "guide-inventory", "guide-experiences",
      "guide-background-questions", "guide-connection-questions", "guide-domain-cards",
    ];
    for (const regionId of guideRegions) {
      expect(effectiveHtml, regionId).toContain(`data-guide-region-id="${regionId}"`);
    }

    expect(skin.cssContent).toContain(":scope");
    expect(skin.cssContent).toContain("@media print");
    expect(skin.cssContent).toContain('url("assets/skins/skin-KimiK3/ink-wash-mountains.svg")');
    expect(skin.cssContent).not.toMatch(/@import|@font-face/i);
  });

  it("loads the complete 18-step Character Creation Guide with stable targets", async () => {
    const result = await loadDaggerheartPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const steps = result.package.characterCreationGuide?.步骤;
    expect(steps).toHaveLength(18);
    expect(steps?.[0]).toMatchObject({ 标题: "车卡器功能介绍" });
    expect(steps?.[17]).toMatchObject({ 标题: "人际关系" });
    expect(steps?.map((step) => step.目标)).toEqual([
      undefined,
      undefined,
      { 类型: "region", 区域ID: "guide-class" },
      { 类型: "module", 模块ID: "pick-subclass" },
      { 类型: "region", 区域ID: "guide-ancestry" },
      { 类型: "region", 区域ID: "guide-community" },
      { 类型: "region", 区域ID: "guide-traits" },
      { 类型: "region", 区域ID: "guide-resources" },
      { 类型: "region", 区域ID: "guide-resources" },
      { 类型: "region", 区域ID: "guide-equipment" },
      { 类型: "region", 区域ID: "guide-equipment" },
      { 类型: "module", 模块ID: "armor-value" },
      { 类型: "module", 模块ID: "evasion" },
      { 类型: "region", 区域ID: "guide-inventory" },
      { 类型: "region", 区域ID: "guide-background-questions" },
      { 类型: "region", 区域ID: "guide-experiences" },
      { 类型: "region", 区域ID: "guide-domain-cards" },
      { 类型: "region", 区域ID: "guide-connection-questions" },
    ]);
    expect(steps?.[3].说明).toContain(":red[**基础**]");
    expect(steps?.[2].说明).toContain("每个职业都始于一个或多个独特的职业特性");
  });

  it("routes pure and mixed ancestry features through one Resource Composer", async () => {
    const result = await loadDaggerheartPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const composer = result.package.modules.find((module) => module.ID === "pick-ancestry");
    const library = result.package.resourceLibraries?.find((candidate) => candidate.ID === "ancestries");
    expect(composer?.类型).toBe("resourceComposer");
    if (composer?.类型 !== "resourceComposer" || !library) return;
    const elf = library.entries.find((entry) => entry.fields.名称 === "精灵")!;
    const human = library.entries.find((entry) => entry.fields.名称 === "人类")!;

    expect(composeResource(composer, { "ancestry-a": elf, "ancestry-b": elf })?.fields).toMatchObject({
      特性A: elf.fields.特性A,
      特性B: elf.fields.特性B,
      卡牌显示方式: "image",
    });
    expect(composeResource(composer, { "ancestry-a": elf, "ancestry-b": human })?.fields).toMatchObject({
      特性A: elf.fields.特性A,
      特性B: human.fields.特性B,
      卡牌显示方式: "text",
    });
    const cardTable = result.package.modules.find((module) => module.ID === "character-card-table");
    expect(cardTable?.类型).toBe("cardTable");
    if (cardTable?.类型 === "cardTable") expect(cardTable.显示方式字段).toBe("卡牌显示方式");
  });

  it("keeps every core class on the complete shared class field contract", async () => {
    const result = await loadDaggerheartPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const classes = result.package.resourceLibraries?.find((library) => library.ID === "classes");
    expect(classes).toBeTruthy();
    const sharedFields = ["原名", "描述", "推荐初始属性", "推荐初始武器", "推荐初始护甲", "职业物品"];
    for (const entry of classes?.entries ?? []) {
      for (const field of sharedFields) {
        expect(entry.fields[field], `${entry.fields.名称}.${field}`).toEqual(expect.any(String));
        expect(entry.fields[field].trim(), `${entry.fields.名称}.${field}`).not.toBe("");
      }
    }
  });

  it("hides authoring-only class and domain-card fields from their Pickers", async () => {
    const result = await loadDaggerheartPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cases: Array<{ moduleId: string; libraryId: string; hidden: string[]; visible?: string[] }> = [
      { moduleId: "pick-class", libraryId: "classes", hidden: ["推荐初始属性", "推荐初始武器", "推荐初始护甲", "职业物品", "类型"], visible: ["原名"] },
      { moduleId: "pick-subclass", libraryId: "subclasses", hidden: ["类型"] },
      { moduleId: "pick-community", libraryId: "communities", hidden: ["类型"] },
      { moduleId: "pick-domain-card", libraryId: "domain-cards", hidden: ["背面卡牌ID", "原名", "类型"] },
    ];
    for (const item of cases) {
      const module = result.package.modules.find((candidate) => candidate.ID === item.moduleId);
      const library = result.package.resourceLibraries?.find((candidate) => candidate.ID === item.libraryId);
      expect(module?.类型).toBe("resourcePicker");
      expect(library).toBeTruthy();
      if (module?.类型 !== "resourcePicker" || !library) continue;
      const link = getResourcePickerLinks(module).find((candidate) => candidate.ID === item.libraryId);
      const fields = getResourceLibraryFields(library, link?.字段模板);
      for (const field of item.hidden) {
        expect(fields.find((candidate) => candidate.key === field), `${item.moduleId}.${field}`).toMatchObject({
          visible: false,
          filterable: false,
          sortable: false,
          searchable: false,
        });
      }
      for (const field of item.visible ?? []) {
        expect(fields.find((candidate) => candidate.key === field)?.visible, `${item.moduleId}.${field}`).not.toBe(false);
      }
    }

    const composer = result.package.modules.find((module) => module.ID === "pick-ancestry");
    const ancestries = result.package.resourceLibraries?.find((library) => library.ID === "ancestries");
    expect(composer?.类型).toBe("resourceComposer");
    expect(ancestries).toBeTruthy();
    if (composer?.类型 === "resourceComposer" && ancestries) {
      for (const slot of composer.来源槽位) {
        const fields = getResourceLibraryFields(ancestries, slot.字段模板);
        for (const key of ["类型"]) {
          expect(fields.find((field) => field.key === key), `${slot.ID}.${key}`).toMatchObject({
            visible: false,
            filterable: false,
            sortable: false,
            searchable: false,
          });
        }
      }
    }
  });

  it("maps every core Card resource to a front image and the correct back image", async () => {
    const result = await loadDaggerheartPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const assetPaths = new Set(result.package.assets?.map((asset) => asset.路径));
    const expectedCounts: Record<string, number> = {
      "domain-cards": 189,
      subclasses: 54,
      communities: 9,
      ancestries: 18,
    };
    const frontPaths = new Set<string>();
    for (const [libraryId, expectedCount] of Object.entries(expectedCounts)) {
      const library = result.package.resourceLibraries?.find((candidate) => candidate.ID === libraryId);
      expect(library?.entries, libraryId).toHaveLength(expectedCount);
      for (const entry of library?.entries ?? []) {
        expect(entry.ID, `${libraryId}/${entry.fields.名称}.ID`).toBe(expectedReadableCoreId(libraryId, entry.fields));
        expect(entry.aliases, `${entry.ID}.旧ID`).toHaveLength(1);
        expect(entry.aliases?.[0], `${entry.ID}.旧ID`).toMatch(/^[a-z-]+-[0-9a-f]{12}$/u);
        expect(entry.fields.卡图, `${libraryId}/${entry.fields.名称}.卡图`).toMatch(/^assets\/cards\/.+\.webp$/u);
        expect(entry.fields.卡图, `${libraryId}/${entry.fields.名称}.卡图`).not.toMatch(/[0-9a-f]{12}/u);
        expect(assetPaths.has(entry.fields.卡图), entry.fields.卡图).toBe(true);
        expect(assetPaths.has(entry.fields.卡背), entry.fields.卡背).toBe(true);
        expect(frontPaths.has(entry.fields.卡图), entry.fields.卡图).toBe(false);
        frontPaths.add(entry.fields.卡图);
        if (libraryId === "domain-cards") {
          expect(entry.fields.卡背).toBe(`assets/cards/backs/${entry.fields.领域}.webp`);
        } else {
          expect(entry.fields.卡背).toBe("assets/cards/backs/通用.webp");
        }
      }
    }
    expect(frontPaths.size).toBe(270);
    expect([...assetPaths].filter((path) => !path.startsWith("assets/skins/"))).toHaveLength(280);
    expect(assetPaths).toContain("assets/skins/skin-gpt-5.6sol/astral-chart.svg");
  });

  it("uses readable Chinese IDs for every core Resource Entry", async () => {
    const result = await loadDaggerheartPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const expectedCounts: Record<string, number> = {
      classes: 9, subclasses: 54, ancestries: 18, communities: 9,
      "domain-cards": 189, weapons: 192, armor: 34, loot: 120,
    };
    for (const [libraryId, expectedCount] of Object.entries(expectedCounts)) {
      const library = result.package.resourceLibraries?.find((candidate) => candidate.ID === libraryId);
      expect(library?.entries, libraryId).toHaveLength(expectedCount);
      for (const entry of library?.entries ?? []) {
        expect(entry.ID, `${libraryId}/${entry.fields.名称}`).toBe(expectedReadableCoreId(libraryId, entry.fields));
        expect(entry.aliases).toHaveLength(1);
      }
      expect(library?.fields.find((field) => field.key === "旧ID")).toBeDefined();
      expect(library?.fields.find((field) => field.key === "旧ID")!.visible).not.toBe(false);
    }
  });

  it("provides two read-only Druid beast-form reference pages instead of beast-form Cards", async () => {
    const result = await loadDaggerheartPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const pageNames = result.package.pages.map((page) => page.名称);
    expect(pageNames).toEqual(expect.arrayContaining(["野兽形态 T1-T2", "野兽形态 T3-T4"]));
    const referencePages = result.package.pages.filter((page) => page.ID.startsWith("beast-forms-"));
    expect(referencePages).toHaveLength(2);
    expect(referencePages.every((page) => page.默认隐藏 === true && page.打印 === undefined)).toBe(true);
    for (const page of referencePages) {
      expect(page.layout.htmlContent.match(/<article class="beast-form/g)).toHaveLength(12);
      expect(page.layout.htmlContent).not.toContain("beast-form-upgrade");
      expect(page.layout.htmlContent).not.toContain("<pb-module");
      expect(page.layout.htmlContent).not.toContain("<button");
      expect(page.layout.htmlContent).not.toContain("<input");
    }
    expect(result.package.resourceLibraries?.some((library) => library.ID === "beast-forms")).toBe(false);
    expect(result.package.modules.some((module) => module.ID === "pick-beast-form")).toBe(false);
    const cardTable = result.package.modules.find((module) => module.ID === "character-card-table");
    expect(cardTable?.类型).toBe("cardTable");
    if (cardTable?.类型 === "cardTable") {
      expect(cardTable.资源来源.some((source) => source.类型 === "resourceLibrary" && source.ID === "beast-forms")).toBe(false);
    }

    const druid = result.package.resourceLibraries?.find((library) => library.ID === "classes")?.entries.find((entry) => entry.fields.名称 === "德鲁伊");
    expect(druid).toBeTruthy();
    if (!druid) return;
    const data = updateResourceSelectionSnapshot(createEmptyCharacterData(result.package), "pick-class", "classes", [druid.ID]);
    expect(rebuildDerivedDependencies(data, result.package).pageVisibility).toMatchObject({
      "beast-forms-t1-t2": true,
      "beast-forms-t3-t4": true,
    });

    const druidSubclass = result.package.resourceLibraries?.find((library) => library.ID === "subclasses")?.entries.find((entry) => entry.fields.主职 === "德鲁伊");
    expect(druidSubclass).toBeTruthy();
    if (!druidSubclass) return;
    const subclassData = updateResourceSelectionSnapshot(createEmptyCharacterData(result.package), "pick-subclass", "subclasses", [druidSubclass.ID]);
    expect(rebuildDerivedDependencies(subclassData, result.package).pageVisibility).toMatchObject({
      "beast-forms-t1-t2": true,
      "beast-forms-t3-t4": true,
    });

    const fighter = result.package.resourceLibraries?.find((library) => library.ID === "classes")?.entries.find((entry) => entry.fields.名称 === "战士");
    expect(fighter).toBeTruthy();
    if (!fighter) return;
    const fighterData = updateResourceSelectionSnapshot(createEmptyCharacterData(result.package), "pick-class", "classes", [fighter.ID]);
    expect(rebuildDerivedDependencies(fighterData, result.package).pageVisibility).toEqual({});
  });

  it("provides one editable Ranger companion page only for Beastbound subclasses", async () => {
    const result = await loadDaggerheartPackage();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const page = result.package.pages.find((candidate) => candidate.ID === "ranger-companion");
    expect(page).toBeTruthy();
    expect(page?.默认隐藏).toBe(true);
    expect(page?.打印).toBeUndefined();

    const expectedModuleIds = [
      "companion-name",
      "companion-evasion",
      "companion-portrait",
      "companion-attack-die",
      "companion-attack-range",
      "companion-stress",
      "companion-upgrades",
      ...Array.from({ length: 5 }, (_, index) => `companion-experience-${index + 1}`),
      ...Array.from({ length: 5 }, (_, index) => `companion-experience-modifier-${index + 1}`),
    ];
    for (const moduleId of expectedModuleIds) {
      expect(result.package.modules.some((module) => module.ID === moduleId), moduleId).toBe(true);
      expect(page?.layout.htmlContent).toContain(`<pb-module id="${moduleId}"></pb-module>`);
    }

    const evasion = result.package.modules.find((module) => module.ID === "companion-evasion");
    expect(evasion?.类型).toBe("freeText");
    if (evasion?.类型 === "freeText") expect(evasion.默认值).toBe("10");
    const attackDie = result.package.modules.find((module) => module.ID === "companion-attack-die");
    expect(attackDie?.类型).toBe("checkboxResource");
    if (attackDie?.类型 === "checkboxResource") {
      expect(attackDie.选项.find((option) => option.ID === "d6")?.默认选中).toBe(true);
    }
    const stress = result.package.modules.find((module) => module.ID === "companion-stress");
    expect(stress?.类型).toBe("countableResource");
    if (stress?.类型 === "countableResource") {
      expect(stress.最大值).toBe(3);
      expect(stress.最大值可改).toBe(true);
    }

    const companionDependencies = result.package.dependencies.filter((dependency) =>
      dependency.targets.some((target) => target.类型 === "page" && target.页面ID === "ranger-companion"),
    );
    expect(companionDependencies).toHaveLength(1);
    expect(companionDependencies[0]?.targets).toEqual([{ 类型: "page", 页面ID: "ranger-companion" }]);

    const subclasses = result.package.resourceLibraries?.find((library) => library.ID === "subclasses");
    expect(subclasses).toBeTruthy();
    if (!subclasses) return;
    for (const stage of ["基础", "进阶", "精通"]) {
      const beastbound = subclasses.entries.find((entry) => entry.fields.名称 === "驯兽大师" && entry.fields.等级 === stage);
      expect(beastbound, stage).toBeTruthy();
      if (!beastbound) continue;
      const data = updateResourceSelectionSnapshot(createEmptyCharacterData(result.package), "pick-subclass", "subclasses", [beastbound.ID]);
      expect(rebuildDerivedDependencies(data, result.package).pageVisibility).toMatchObject({ "ranger-companion": true });
    }

    const pathfinder = subclasses.entries.find((entry) => entry.fields.名称 === "寻路斥候" && entry.fields.等级 === "基础");
    expect(pathfinder).toBeTruthy();
    if (!pathfinder) return;
    const otherData = updateResourceSelectionSnapshot(createEmptyCharacterData(result.package), "pick-subclass", "subclasses", [pathfinder.ID]);
    expect(rebuildDerivedDependencies(otherData, result.package).pageVisibility).toEqual({});
  });
});

function loadDaggerheartPackage() {
  return loadedResult;
}

function expectedReadableCoreId(libraryId: string, fields: Record<string, string>): string {
  switch (libraryId) {
    case "classes": return `职业:${fields.名称}`;
    case "subclasses": return `子职:${fields.主职}:${fields.名称}:${fields.等级}`;
    case "ancestries": return `种族:${fields.名称}`;
    case "communities": return `社群:${fields.名称}`;
    case "domain-cards": return `领域卡:${fields.领域}:${fields.名称}`;
    case "weapons": return `${fields.类型}:${fields.名称}`;
    case "armor": return `护甲:${fields.名称}`;
    case "loot": return `战利品:${fields.名称}`;
    default: throw new Error(`Unknown core Resource Library: ${libraryId}`);
  }
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
