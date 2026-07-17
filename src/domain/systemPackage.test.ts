import { describe, expect, it } from "vitest";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { findAsset, findModule, findResourceLibrary, getHtmlTemplateModuleReferences, validateCachedSystemPackage, validateSystemPackage } from "./systemPackage";

describe("validateSystemPackage", () => {
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

  it("accepts Card state background colors and rejects invalid colors or unknown states", () => {
    const cardModule = {
      ID: "cards", 类型: "cardTable", 标签: "卡牌", 资源来源: [{ 类型: "resourceLibrary", ID: "cards" }],
      状态选项: ["current", "vault"], 状态背景色: { vault: "#123456" },
    } as const;
    const base = {
      ...minimalSystemPackage,
      modules: [cardModule],
      pages: [{ ...minimalSystemPackage.pages[0], layout: { ...minimalSystemPackage.pages[0].layout, htmlContent: '<pb-module id="cards"></pb-module>' } }],
      resourceLibraries: [{ ID: "cards", 名称: "卡牌", 路径: "resources/cards.json", entries: [] }],
    };

    const valid = validateSystemPackage(base);
    const invalidColor = validateSystemPackage({ ...base, modules: [{ ...cardModule, 状态背景色: { vault: "blue" } }] });
    const unknownState = validateSystemPackage({ ...base, modules: [{ ...cardModule, 状态背景色: { spent: "#abcdef" } }] });

    expect(valid.ok).toBe(true);
    expect(invalidColor.ok).toBe(false);
    if (!invalidColor.ok) expect(invalidColor.issues.map((issue) => issue.text).join("\n")).toContain("#RRGGBB");
    expect(unknownState.ok).toBe(false);
    if (!unknownState.ok) expect(unknownState.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "CARD_STATE_COLOR_UNKNOWN_STATE" })]));
  });

  it("accepts text module label visibility and placeholder presentation options", () => {
    const result = validateSystemPackage({
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => {
        if (module.ID === "character-name" && module.类型 === "freeText") {
          return { ...module, 隐藏标签: true, 占位文本: "请输入姓名" };
        }
        if (module.ID === "background" && module.类型 === "longText") {
          return { ...module, 隐藏标签: true, 占位文本: "请输入背景" };
        }
        return module;
      }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(findModule(result.package, "character-name")).toEqual(expect.objectContaining({ 隐藏标签: true, 占位文本: "请输入姓名" }));
      expect(findModule(result.package, "background")).toEqual(expect.objectContaining({ 隐藏标签: true, 占位文本: "请输入背景" }));
    }
  });

  it("accepts empty labels for freeText and longText as an implicit hidden-label configuration", () => {
    const result = validateSystemPackage({
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => {
        if (module.类型 === "freeText" || module.类型 === "longText") return { ...module, 标签: "" };
        return module;
      }),
    });

    expect(result.ok).toBe(true);
  });

  it.each([
    ["隐藏标签", "yes"],
    ["占位文本", 123],
  ])("rejects an invalid freeText %s", (field, value) => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: minimalSystemPackage.modules.map((module) => module.ID === "character-name" ? { ...module, [field]: value } : module),
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "PACKAGE_SHAPE_INVALID" })]));
  });

  it.each([
    ["removed singular field", { 资源库ID: "cards" }],
    ["empty plural field", { 资源来源: [] }],
    ["duplicate plural field", { 资源来源: [{ 类型: "resourceLibrary", ID: "cards" }, { 类型: "resourceLibrary", ID: "cards" }] }],
  ])("rejects Card Table %s", (_case, libraryConfig) => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: [{ ID: "table", 类型: "cardTable", 标签: "卡牌", ...libraryConfig }],
    });

    expect(result.ok).toBe(false);
  });

  it.each([
    ["Page", "DUPLICATE_PAGE_ID", { pages: [minimalSystemPackage.pages[0], minimalSystemPackage.pages[0]] }],
    ["Validation Check", "DUPLICATE_VALIDATION_CHECK_ID", { validationChecks: [
      { ID: "same", 脚本: "a.js", scriptContent: "module.exports = () => [];" },
      { ID: "same", 脚本: "b.js", scriptContent: "module.exports = () => [];" },
    ] }],
  ])("reports duplicate %s IDs", (_entity, code, override) => {
    const result = validateSystemPackage({ ...minimalSystemPackage, ...override });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code, level: "error" })]));
  });

  it("normalizes rule findings into one structured diagnostic contract", () => {
    const result = validateSystemPackage({ ...minimalSystemPackage, pages: [minimalSystemPackage.pages[0], minimalSystemPackage.pages[0]] }, { pages: "pages.json" });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "DUPLICATE_PAGE_ID",
        location: { file: "pages.json", pointer: ["pages", 1, "ID"] },
        entities: [{ kind: "page", index: 1 }],
        evidence: expect.arrayContaining([{ label: "duplicateId", value: minimalSystemPackage.pages[0].ID }]),
      }),
    ]));
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
  it("accepts a Sheet Shell with one Page Outlet and persistent module references", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      shell: { 类型: "htmlTemplate", htmlContent: '<main><pb-page-outlet></pb-page-outlet><pb-module id="character-name"></pb-module></main>' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.package.shell?.htmlContent).toContain("pb-page-outlet");
  });

  it("rejects a Sheet Shell without exactly one Page Outlet", () => {
    const result = validateSystemPackage({ ...minimalSystemPackage, shell: { 类型: "htmlTemplate", htmlContent: "<main></main>" } });
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SHELL_PAGE_OUTLET_COUNT_INVALID" })]));
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

  it("accepts the minimal demo System Package", () => {
    const result = validateSystemPackage(minimalSystemPackage);

    expect(result.ok).toBe(true);
  });

  it("does not warn when the schemaVersion matches the framework version", () => {
    const result = validateSystemPackage(minimalSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ code: "SCHEMA_VERSION_MISMATCH" })]),
      );
    }
  });

  it("warns but still renders when the schemaVersion differs from the framework version", () => {
    const mismatchedPackage = {
      ...minimalSystemPackage,
      manifest: { ...minimalSystemPackage.manifest, schemaVersion: "0.2.0" },
    };

    const result = validateSystemPackage(mismatchedPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "SCHEMA_VERSION_MISMATCH", level: "warning" }),
        ]),
      );
    }
  });

  it("accepts a linear Character Creation Guide with no, module, page, and region targets", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      pages: [{
        ...minimalSystemPackage.pages[0],
        layout: {
          ...minimalSystemPackage.pages[0].layout,
          htmlContent: '<section data-guide-region-id="identity"><pb-module id="character-name"></pb-module></section>',
        },
      }],
      characterCreationGuide: {
        步骤: [
          { ID: "intro", 标题: "开始", 说明: "先认识角色卡。" },
          { ID: "name", 标题: "姓名", 说明: "填写姓名。", 目标: { 类型: "module", 模块ID: "character-name" } },
          { ID: "page", 标题: "角色页", 说明: "这是角色页。", 目标: { 类型: "page", 页面ID: "main" } },
          { ID: "identity", 标题: "身份", 说明: "填写身份资料。", 目标: { 类型: "region", 区域ID: "identity" } },
        ],
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.characterCreationGuide?.步骤).toHaveLength(4);
    }
  });

  it("reports invalid Guide structure as an error", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      characterCreationGuide: { 步骤: [] },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "INVALID_CHARACTER_CREATION_GUIDE", level: "error" })]),
    );
  });

  it("reports an empty Layout Region ID", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      pages: [{
        ...minimalSystemPackage.pages[0],
        layout: {
          ...minimalSystemPackage.pages[0].layout,
          htmlContent: '<section data-guide-region-id=""><pb-module id="character-name"></pb-module></section>',
        },
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "GUIDE_REGION_ID_EMPTY", level: "error" })]),
    );
  });

  it("reports duplicate Layout Region IDs across pages", () => {
    const regionLayout = {
      ...minimalSystemPackage.pages[0].layout,
      htmlContent: '<section data-guide-region-id="identity"></section>',
    };
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      pages: [
        { ...minimalSystemPackage.pages[0], layout: regionLayout },
        { ...minimalSystemPackage.pages[0], ID: "second", 名称: "第二页", layout: regionLayout },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "DUPLICATE_GUIDE_REGION_ID", level: "error" })]),
    );
  });

  it("reports duplicate Guide Step IDs and missing targets", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      characterCreationGuide: {
        步骤: [
          { ID: "same", 标题: "一", 说明: "一", 目标: { 类型: "module", 模块ID: "missing-module" } },
          { ID: "same", 标题: "二", 说明: "二", 目标: { 类型: "page", 页面ID: "missing-page" } },
          { ID: "region", 标题: "三", 说明: "三", 目标: { 类型: "region", 区域ID: "missing-region" } },
        ],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_GUIDE_STEP_ID", level: "error" }),
        expect.objectContaining({ code: "MISSING_GUIDE_TARGET_MODULE", level: "error" }),
        expect.objectContaining({ code: "MISSING_GUIDE_TARGET_PAGE", level: "error" }),
        expect.objectContaining({ code: "MISSING_GUIDE_TARGET_REGION", level: "error" }),
      ]),
    );
  });

  it("accepts the phase 5 simple Sheet Module set", () => {
    const result = validateSystemPackage(moduleDemoSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(findModule(result.package, "background")?.类型).toBe("longText");
      expect(findModule(result.package, "conditions")?.类型).toBe("checkboxResource");
      expect(findModule(result.package, "vitality")?.类型).toBe("countableResource");
      expect(findModule(result.package, "rule-note")?.类型).toBe("readOnlyDisplay");
      expect(findModule(result.package, "sect-emblem")?.类型).toBe("readOnlyDisplay");
      expect(findModule(result.package, "portrait")?.类型).toBe("imageField");
      expect(findAsset(result.package, "assets/demo-emblem.svg")?.路径).toBe("assets/demo-emblem.svg");
    }
  });

  it("accepts a Countable Resource Marker Presentation with single visible emoji graphemes", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: [{
        ID: "character-name",
        类型: "countableResource",
        标签: "生命",
        显示方式: "标记",
        当前值标记: "❤️",
        剩余值标记: "🖤",
        最小值: 0,
        最大值: 6,
        默认值: 2,
      }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(findModule(result.package, "character-name")).toEqual(expect.objectContaining({
        显示方式: "标记",
        当前值标记: "❤️",
        剩余值标记: "🖤",
      }));
    }
  });

  it("rejects a Countable Resource Marker Presentation without both marker graphemes", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: [{
        ID: "character-name",
        类型: "countableResource",
        标签: "生命",
        显示方式: "标记",
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "PACKAGE_SHAPE_INVALID" }),
    ]));
  });

  it.each([
    ["multiple graphemes", { 当前值标记: "❤️❤️", 剩余值标记: "🖤", 最小值: 0 }],
    ["whitespace marker", { 当前值标记: " ", 剩余值标记: "🖤", 最小值: 0 }],
    ["format-only marker", { 当前值标记: "\u200d", 剩余值标记: "🖤", 最小值: 0 }],
    ["identical markers", { 当前值标记: "❤️", 剩余值标记: "❤️", 最小值: 0 }],
    ["negative minimum", { 当前值标记: "❤️", 剩余值标记: "🖤", 最小值: -1 }],
  ])("rejects Marker Presentation with %s", (_case, markerConfig) => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: [{
        ID: "character-name",
        类型: "countableResource",
        标签: "生命",
        显示方式: "标记",
        ...markerConfig,
      }],
    });

    expect(result.ok).toBe(false);
  });

  it("accepts HTML Layout Template module placeholders", () => {
    const result = validateSystemPackage(moduleDemoSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const html = result.package.pages[0].layout.htmlContent;
      expect(getHtmlTemplateModuleReferences(html)).toEqual([
        "character-name",
        "portrait",
        "sect-emblem",
        "vitality",
        "conditions",
        "background",
        "rule-note",
      ]);
    }
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

  it("accepts Validation Check declarations with loaded script content", () => {
    const packageWithValidation = {
      ...minimalSystemPackage,
      validationChecks: [
        {
          ID: "demo-check",
          脚本: "checks/demo.js",
          scriptContent: "module.exports = () => [];",
        },
      ],
    };

    const result = validateSystemPackage(packageWithValidation);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.validationChecks?.[0]).toEqual({
        ID: "demo-check",
        脚本: "checks/demo.js",
        scriptContent: "module.exports = () => [];",
      });
    }
  });

  it("rejects Validation Script syntax without executing the script", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      validationChecks: [{ ID: "broken", 脚本: "checks/broken.js", scriptContent: "module.exports = () => {" }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "VALIDATION_SCRIPT_SYNTAX_INVALID", level: "error" }),
    ]));
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

  it("checks Checkbox Resource option IDs and Dependency references", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: [
        { ID: "checks", 类型: "checkboxResource", 标签: "选项", 选项: [{ ID: "same", 标签: "甲" }, { ID: "same", 标签: "乙" }] },
        { ID: "target", 类型: "freeText", 标签: "目标" },
      ],
      pages: [{ ...minimalSystemPackage.pages[0], layout: { ...minimalSystemPackage.pages[0].layout, htmlContent: '<pb-module id="checks"></pb-module><pb-module id="target"></pb-module>' } }],
      dependencies: [{
        ID: "toggle",
        sources: [{ 类型: "checkboxResource", 模块ID: "checks" }],
        targets: [{ 类型: "module", 模块ID: "target" }],
        触发: { 类型: "checkboxChanged", 来源模块ID: "checks" },
        条件: { 类型: "checkboxOptionChecked", 选项ID: "missing" },
        动作: [{ 类型: "setVisibility", 目标类型: "module", 目标ID: "target", 显示: true }],
      }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DUPLICATE_CHECKBOX_OPTION_ID" }),
      expect.objectContaining({ code: "MISSING_CHECKBOX_OPTION_REFERENCE" }),
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

  it("reports unsupported countableResource dependency triggers clearly", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      modules: [
        ...minimalSystemPackage.modules,
        {
          ID: "vitality",
          类型: "countableResource",
          标签: "气力",
        },
        {
          ID: "note",
          类型: "freeText",
          标签: "提示",
        },
      ],
      dependencies: [
        {
          ID: "bad-counter",
          sources: [{ 类型: "countableResource", 模块ID: "vitality" }],
          targets: [{ 类型: "module", 模块ID: "note" }],
          触发: { 类型: "countableChanged", 来源模块ID: "vitality" },
          条件: { 类型: "always" },
          动作: [{ 类型: "fillText", 目标模块ID: "note", 内容: "不支持" }],
        },
      ],
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: `${minimalSystemPackage.pages[0].layout.htmlContent}<pb-module id="vitality"></pb-module><pb-module id="note"></pb-module>`,
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNSUPPORTED_DEPENDENCY_TRIGGER",
          level: "error",
        }),
      ]),
    );
  });

  it("reports a clear error for unsupported Sheet Module types", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      modules: [
        {
          ID: "choice",
          类型: "customWidget",
          标签: "暂不支持",
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNSUPPORTED_MODULE_TYPE",
          level: "error",
          path: "modules.0.类型",
        }),
      ]),
    );
  });

  it("reports a visible error for a missing Sheet Module reference in HTML Layout Template", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: "<main><pb-module id=\"missing-module\"></pb-module></main>",
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_MODULE_REFERENCE",
          level: "error",
        }),
      ]),
    );
  });

  it("rejects custom form controls inside HTML Layout Template", () => {
    const invalidPackage = {
      ...moduleDemoSystemPackage,
      pages: [
        {
          ...moduleDemoSystemPackage.pages[0],
          layout: {
            ...moduleDemoSystemPackage.pages[0].layout,
            htmlContent: "<main><input value=\"bad\" /></main>",
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "HTML_TEMPLATE_FORBIDDEN_TAG",
          level: "error",
        }),
      ]),
    );
  });

  it("rejects event handler attributes inside HTML Layout Template", () => {
    const invalidPackage = {
      ...moduleDemoSystemPackage,
      pages: [
        {
          ...moduleDemoSystemPackage.pages[0],
          layout: {
            ...moduleDemoSystemPackage.pages[0].layout,
            htmlContent: "<main><section onclick=\"bad()\"><pb-module id=\"character-name\"></pb-module></section></main>",
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "HTML_TEMPLATE_FORBIDDEN_EVENT_HANDLER",
          level: "error",
        }),
      ]),
    );
  });

  it("rejects unsupported tags and attributes inside HTML Layout Template", () => {
    const invalidPackage = {
      ...moduleDemoSystemPackage,
      pages: [
        {
          ...moduleDemoSystemPackage.pages[0],
          layout: {
            ...moduleDemoSystemPackage.pages[0].layout,
            htmlContent: "<main><label style=\"display:grid\"><pb-module></pb-module></label></main>",
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "HTML_TEMPLATE_UNSUPPORTED_TAG",
          level: "error",
        }),
        expect.objectContaining({
          code: "HTML_TEMPLATE_UNSUPPORTED_ATTRIBUTE",
          level: "error",
        }),
        expect.objectContaining({
          code: "HTML_TEMPLATE_MODULE_ID_MISSING",
          level: "error",
        }),
      ]),
    );
  });

  it("rejects external resources in HTML Layout Template and CSS", () => {
    const invalidPackage = {
      ...moduleDemoSystemPackage,
      pages: [
        {
          ...moduleDemoSystemPackage.pages[0],
          layout: {
            ...moduleDemoSystemPackage.pages[0].layout,
            htmlContent: "<main><img src=\"https://example.com/bad.png\" alt=\"bad\" /></main>",
            cssContent: "@import url(\"https://example.com/bad.css\"); .demo { background-image: url(/bad.png); }",
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "HTML_TEMPLATE_EXTERNAL_RESOURCE",
          level: "error",
        }),
        expect.objectContaining({
          code: "CSS_TEMPLATE_IMPORT_FORBIDDEN",
          level: "error",
        }),
        expect.objectContaining({
          code: "CSS_TEMPLATE_EXTERNAL_RESOURCE",
          level: "error",
        }),
      ]),
    );
  });
});
