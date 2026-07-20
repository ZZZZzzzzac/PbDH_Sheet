import { describe, expect, it } from "vitest";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { findAsset, findModule, findResourceLibrary, getHtmlTemplateModuleReferences, validateCachedSystemPackage, validateSystemPackage } from "./systemPackage";

describe("validateSystemPackage Resource Libraries and Cards", () => {
  it("accepts a Composer selection-relation field and rejects collision with a copied output field", () => {
    const composer = {
      ID: "composer",
      类型: "resourceComposer",
      按钮文本: "组合",
      来源槽位: [
        { ID: "a", 标签: "A", 资源库ID: "cards" },
        { ID: "b", 标签: "B", 资源库ID: "cards" },
      ],
      输出字段: [{ 字段: "名称", 来源槽位ID: "a", 来源字段: "名称" }],
      选择关系输出: { 字段: "展示", 全部相同时: "image", 不全相同时: "text" },
    } as const;
    const base = {
      ...minimalSystemPackage,
      modules: [composer],
      pages: [{
        ...minimalSystemPackage.pages[0],
        layout: { ...minimalSystemPackage.pages[0].layout, htmlContent: '<pb-module id="composer"></pb-module>' },
      }],
      resourceLibraries: [{ ID: "cards", 名称: "卡牌", 路径: "resources/cards.json", entries: [{ ID: "one", 名称: "一" }] }],
    };

    expect(validateSystemPackage(base).ok).toBe(true);
    const collision = validateSystemPackage({
      ...base,
      modules: [{ ...composer, 选择关系输出: { ...composer.选择关系输出, 字段: "名称" } }],
    });
    expect(collision.ok).toBe(false);
    if (!collision.ok) {
      expect(collision.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_RESOURCE_COMPOSER_OUTPUT_FIELD" }),
      ]));
    }
  });

  it("validates reverse Card Definition references", () => {
    const cardModule = {
      ID: "cards",
      类型: "cardTable",
      标签: "卡牌",
      资源来源: [{ 类型: "resourceLibrary", ID: "cards" }],
    } as const;
    const library = {
      ID: "cards",
      名称: "卡牌",
      路径: "resources/cards.json",
      fields: [],
      entries: [
        { ID: "front", 名称: "正面", 描述: "正面描述", 背面卡牌ID: "back" },
        { ID: "back", 名称: "背面", 描述: "背面描述" },
      ],
    };
    const pages = [{ ...minimalSystemPackage.pages[0], layout: { ...minimalSystemPackage.pages[0].layout, htmlContent: '<pb-module id="cards"></pb-module>' } }];
    const valid = validateSystemPackage({ ...minimalSystemPackage, modules: [cardModule], pages, resourceLibraries: [library] });
    const missing = validateSystemPackage({
      ...minimalSystemPackage,
      modules: [cardModule],
      pages,
      resourceLibraries: [{ ...library, entries: [{ ...library.entries[0], 背面卡牌ID: "missing" }, library.entries[1]] }],
    });

    expect(valid.ok, valid.ok ? undefined : JSON.stringify(valid.issues)).toBe(true);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "MISSING_CARD_REVERSE_DEFINITION_REFERENCE" })]));
  });

  it("requires configured name and description fields only for Card Definitions", () => {
    const resourceLibraries = [{
      ID: "cards",
      名称: "卡牌",
      路径: "cards.json",
      entries: [{ ID: "card-1", 标题: "火球" }],
    }];
    const ordinaryResult = validateSystemPackage({ ...minimalSystemPackage, resourceLibraries });
    expect(ordinaryResult.ok).toBe(true);

    const cardResult = validateSystemPackage({
      ...minimalSystemPackage,
      resourceLibraries,
      modules: [{ ID: "table", 类型: "cardTable", 标签: "卡牌", 资源来源: [{ 类型: "resourceLibrary", ID: "cards", 卡牌展示: { 名称模板: "{{标题}}", 描述模板: "{{正文}}" } }] }],
      pages: [{
        ...minimalSystemPackage.pages[0],
        layout: { ...minimalSystemPackage.pages[0].layout, htmlContent: '<pb-module id="table"></pb-module>' },
      }],
    });
    expect(cardResult.ok).toBe(false);
    expect(cardResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_RESOURCE_FIELD_REFERENCE", path: "modules.table.资源来源" }),
    ]));
  });

  it("preserves normalized Resource Library fields when validating a cached package", () => {
    const imported = validateSystemPackage({
      ...minimalSystemPackage,
      resourceLibraries: [
        {
          ID: "domain-cards",
          名称: "领域卡",
          路径: "resources/domain-cards.json",
          entries: [{ ID: "domain-card:符文护符", 名称: "符文护符", 描述: "获得护甲。" }],
        },
      ],
    });
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const restored = validateCachedSystemPackage(imported.package);

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(findResourceLibrary(restored.package, "domain-cards")?.entries[0]?.fields).toMatchObject({
      ID: "domain-card:符文护符",
      名称: "符文护符",
      描述: "获得护甲。",
    });
  });

  it("reports missing read-only display asset references", () => {
    const invalidPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) =>
        module.ID === "sect-emblem" ? { ...module, 资源路径: "assets/missing.svg" } : module,
      ),
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_ASSET_REFERENCE",
          level: "error",
        }),
      ]),
    );
  });

  it("accepts Resource Libraries, Resource Picker references, and dependency fill rules", () => {
    const packageWithSelection = {
      ...minimalSystemPackage,
      resourceLibraries: [
        {
          ID: "domains",
          名称: "领域",
          路径: "resources/domains.json",
          entries: [
            { ID: "blade-1", 名称: "利刃一", 领域: "利刃", 等级: "1", 生命: "5" },
            { ID: "bone-1", 名称: "骸骨一", 领域: "骸骨" },
          ],
        },
      ],
      modules: [
        ...minimalSystemPackage.modules,
        {
          ID: "domain-pick",
          类型: "resourcePicker",
          按钮文本: "选择领域",
          资源库: [{
            ID: "domains",
            字段模板: [
              { 键: "名称", 标签: "卡名", 默认显示: true, 可筛选: false, 可排序: true },
              { 键: "领域", 标签: "领域", 默认显示: true, 可筛选: true, 可排序: true },
            ],
          }],
        },
        {
          ID: "domain-name",
          类型: "freeText",
          标签: "领域名",
        },
        {
          ID: "hp",
          类型: "countableResource",
          标签: "生命",
          最大值: 10,
        },
      ],
      dependencies: [
        {
          ID: "fill-domain",
          sources: [{ 类型: "resourcePicker", 模块ID: "domain-pick" }],
          targets: [{ 类型: "module", 模块ID: "domain-name" }, { 类型: "module", 模块ID: "hp" }],
          触发: { 类型: "resourceSelected", 来源模块ID: "domain-pick" },
          条件: { 类型: "always" },
          动作: [
            { 类型: "fillText", 目标模块ID: "domain-name", 内容: { 类型: "selectedResourceField", 字段: "名称" } },
            { 类型: "fillCountable", 目标模块ID: "hp", 当前值: { 类型: "selectedResourceField", 字段: "生命" }, 最大值: 8 },
          ],
        },
      ],
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: `${minimalSystemPackage.pages[0].layout.htmlContent}<pb-module id="domain-pick"></pb-module><pb-module id="domain-name"></pb-module><pb-module id="hp"></pb-module>`,
          },
        },
      ],
    };

    const result = validateSystemPackage(packageWithSelection);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const module = findModule(result.package, "domain-pick");
      expect(module?.类型).toBe("resourcePicker");
      if (module?.类型 === "resourcePicker") {
        expect(module.资源库).not.toBe("其他");
        if (module.资源库 !== "其他") {
          expect(module.资源库[0].字段模板?.map((field) => field.键)).toEqual(["名称", "领域"]);
        }
      }
      expect(findResourceLibrary(result.package, "domains")?.entries[1].fields.等级).toBe("");
      expect(result.package.dependencies?.[0].动作[0].目标模块ID).toBe("domain-name");
      expect(result.package.dependencies?.[0].sources[0]).toEqual({ 类型: "resourcePicker", 模块ID: "domain-pick" });
    }
  });

  it("reports selected resource fields that the source Resource Library cannot provide", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      resourceLibraries: [{ ID: "classes", 名称: "职业", 路径: "classes.json", entries: [{ ID: "wizard", 名称: "法师" }] }],
      modules: [
        { ID: "picker", 类型: "resourcePicker", 按钮文本: "选择", 资源库: [{ ID: "classes" }] },
        { ID: "target", 类型: "freeText", 标签: "结果" },
      ],
      pages: [{ ...minimalSystemPackage.pages[0], layout: { ...minimalSystemPackage.pages[0].layout, htmlContent: '<pb-module id="picker"></pb-module><pb-module id="target"></pb-module>' } }],
      dependencies: [{
        ID: "fill",
        sources: [{ 类型: "resourcePicker", 模块ID: "picker" }],
        targets: [{ 类型: "module", 模块ID: "target" }],
        触发: { 类型: "resourceSelected", 来源模块ID: "picker" },
        条件: { 类型: "selectedResourceFieldEquals", 字段: "不存在", 值: "x" },
        动作: [{ 类型: "fillText", 目标模块ID: "target", 内容: { 类型: "selectedResourceField", 字段: "也不存在" } }],
      }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.filter((issue) => issue.code === "MISSING_RESOURCE_FIELD_REFERENCE")).toHaveLength(2);
  });

  it("validates formatted resource text fields and append targets", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      resourceLibraries: [{ ID: "items", 名称: "物品", 路径: "items.json", entries: [{ ID: "rope", 名称: "绳索", 描述: "长十米。" }] }],
      modules: [
        { ID: "picker", 类型: "resourcePicker", 按钮文本: "选择", 资源库: [{ ID: "items" }] },
        { ID: "display", 类型: "readOnlyDisplay", 标签: "结果", 内容: "初始内容" },
      ],
      pages: [{ ...minimalSystemPackage.pages[0], layout: { ...minimalSystemPackage.pages[0].layout, htmlContent: '<pb-module id="picker"></pb-module><pb-module id="display"></pb-module>' } }],
      dependencies: [{
        ID: "append",
        sources: [{ 类型: "resourcePicker", 模块ID: "picker" }],
        targets: [{ 类型: "module", 模块ID: "display" }],
        触发: { 类型: "resourceSelected", 来源模块ID: "picker" },
        条件: { 类型: "always" },
        动作: [{
          类型: "fillText",
          目标模块ID: "display",
          写入方式: "追加",
          内容: { 类型: "selectedResourceTemplate", 格式: "{{名称}}：{{不存在}}" },
        }],
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_RESOURCE_FIELD_REFERENCE" }),
      expect.objectContaining({ code: "UNSUPPORTED_APPEND_TARGET_MODULE" }),
    ]));
  });

  it("accepts Card Table modules and Resource Picker card creation targets", () => {
    const packageWithCards = {
      ...minimalSystemPackage,
      assets: [{ ID: "assets/card.png", 路径: "assets/card.png", 类型: "image/png" }],
      resourceLibraries: [
        {
          ID: "domain-cards",
          名称: "领域卡",
          路径: "resources/domain_cards.json",
          entries: [{ ID: "domain-card:符文护符", 名称: "符文护符", 描述: "一张示例领域卡。", 等级: "1", 卡图: "assets/card.png" }],
        },
      ],
      modules: [
        ...minimalSystemPackage.modules,
        {
          ID: "pick-domain-card",
          类型: "resourcePicker",
          按钮文本: "选择领域卡",
          资源库: [{ ID: "domain-cards" }],
          创建卡牌: { 卡牌桌面模块ID: "domain-card-table", 默认状态: "configured" },
        },
        {
          ID: "domain-card-table",
          类型: "cardTable",
          标签: "领域卡牌桌面",
          资源来源: [{ 类型: "resourceLibrary", ID: "domain-cards" }],
        },
      ],
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: `${minimalSystemPackage.pages[0].layout.htmlContent}<pb-module id="pick-domain-card"></pb-module><pb-module id="domain-card-table"></pb-module>`,
          },
        },
      ],
    };

    const result = validateSystemPackage(packageWithCards);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(findModule(result.package, "domain-card-table")?.类型).toBe("cardTable");
      const picker = findModule(result.package, "pick-domain-card");
      expect(picker?.类型).toBe("resourcePicker");
      if (picker?.类型 === "resourcePicker") {
        expect(picker.创建卡牌?.卡牌桌面模块ID).toBe("domain-card-table");
      }
    }
  });

it("reports missing Card artwork asset references", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      modules: [
        ...minimalSystemPackage.modules,
        { ID: "domain-card-table", 类型: "cardTable", 标签: "领域卡牌桌面", 资源来源: [{ 类型: "resourceLibrary", ID: "domain-cards" }] },
      ],
      resourceLibraries: [
        {
          ID: "domain-cards",
          名称: "领域卡",
          路径: "resources/domain_cards.json",
          entries: [{ ID: "domain-card:符文护符", 名称: "符文护符", 等级: "1", 卡图: "assets/missing.png" }],
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_CARD_ART_ASSET_REFERENCE",
          level: "error",
          path: "resourceLibraries.domain-cards.entries.0.卡图",
        }),
      ]),
    );
  });

  it("reports missing Resource Library references for Resource Picker", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      modules: [
        {
          ID: "choice",
          类型: "resourcePicker",
          按钮文本: "选择",
          资源库: [{ ID: "missing-library" }],
        },
      ],
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: '<main><pb-module id="choice"></pb-module></main>',
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_RESOURCE_LIBRARY_REFERENCE",
          level: "error",
          path: "modules.choice.资源库.0.ID",
        }),
      ]),
    );
  });

  it("reports invalid Resource Picker dependency references", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      modules: [
        ...minimalSystemPackage.modules,
        {
          ID: "pick",
          类型: "resourcePicker",
          按钮文本: "选择",
          资源库: [{ ID: "domains" }],
        },
        {
          ID: "image-target",
          类型: "imageField",
          标签: "图片",
        },
      ],
      resourceLibraries: [{ ID: "domains", 名称: "领域", 路径: "resources/domains.json", entries: [{ ID: "x" }] }],
      dependencies: [
        {
          ID: "bad-target",
          sources: [{ 类型: "resourcePicker", 模块ID: "pick" }],
          targets: [{ 类型: "module", 模块ID: "image-target" }],
          触发: { 类型: "resourceSelected", 来源模块ID: "pick" },
          条件: { 类型: "always" },
          动作: [{ 类型: "fillText", 目标模块ID: "image-target", 内容: { 类型: "selectedResourceField", 字段: "名称" } }],
        },
      ],
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: `${minimalSystemPackage.pages[0].layout.htmlContent}<pb-module id="pick"></pb-module><pb-module id="image-target"></pb-module>`,
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNSUPPORTED_DEPENDENCY_TARGET_MODULE",
          level: "error",
        }),
      ]),
    );
  });
});
