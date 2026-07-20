import { describe, expect, it } from "vitest";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { findAsset, findModule, findResourceLibrary, getHtmlTemplateModuleReferences, validateCachedSystemPackage, validateSystemPackage } from "./systemPackage";

describe("validateSystemPackage Sheet Modules", () => {
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

  it("accepts a Free Text dropdown with unique string options and an in-list default", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: minimalSystemPackage.modules.map((module) => module.ID === "character-name"
        ? { ...module, 选项: ["战士", "法师", "游侠"], 默认值: "法师" }
        : module),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(findModule(result.package, "character-name")).toEqual(expect.objectContaining({
        选项: ["战士", "法师", "游侠"],
        默认值: "法师",
      }));
    }
  });

  it.each([
    ["empty list", { 选项: [] }],
    ["blank option", { 选项: ["战士", " "] }],
    ["duplicate option", { 选项: ["战士", "战士"] }],
    ["non-string option", { 选项: ["战士", 2] }],
    ["out-of-list default", { 选项: ["战士", "法师"], 默认值: "游侠" }],
  ])("rejects a Free Text dropdown with %s", (_case, dropdownConfig) => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: minimalSystemPackage.modules.map((module) => module.ID === "character-name"
        ? { ...module, ...dropdownConfig }
        : module),
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "PACKAGE_SHAPE_INVALID" })]));
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

  it("rejects fillText append targeting a dropdown-backed Free Text", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: [
        { ID: "source", 类型: "checkboxResource", 标签: "来源", 选项: [{ ID: "enabled", 标签: "启用" }] },
        { ID: "target", 类型: "freeText", 标签: "职业", 选项: ["战士", "法师"] },
      ],
      pages: [{
        ...minimalSystemPackage.pages[0],
        layout: { ...minimalSystemPackage.pages[0].layout, htmlContent: '<pb-module id="source"></pb-module><pb-module id="target"></pb-module>' },
      }],
      dependencies: [{
        ID: "append-choice",
        sources: [{ 类型: "checkboxResource", 模块ID: "source" }],
        targets: [{ 类型: "module", 模块ID: "target" }],
        触发: { 类型: "checkboxChanged", 来源模块ID: "source" },
        条件: { 类型: "always" },
        动作: [{ 类型: "fillText", 目标模块ID: "target", 写入方式: "追加", 内容: "游侠" }],
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNSUPPORTED_APPEND_TARGET_MODULE" }),
    ]));
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

  it("accepts the core Sheet Module set", () => {
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

  it.each([5, 96])("accepts Countable Resource font sizes at the %spx boundary", (fontSize) => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: [{
        ID: "character-name",
        类型: "countableResource",
        标签: "生命",
        标识字号: fontSize,
        加减号字号: fontSize,
      }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(findModule(result.package, "character-name")).toEqual(expect.objectContaining({
        标识字号: fontSize,
        加减号字号: fontSize,
      }));
    }
  });

  it.each([
    ["identifier below minimum", { 标识字号: 4.9 }],
    ["identifier above maximum", { 标识字号: 96.1 }],
    ["stepper below minimum", { 加减号字号: 4.9 }],
    ["stepper above maximum", { 加减号字号: 96.1 }],
  ])("rejects Countable Resource font size when %s", (_case, fontConfig) => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      modules: [{
        ID: "character-name",
        类型: "countableResource",
        标签: "生命",
        ...fontConfig,
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "PACKAGE_SHAPE_INVALID" }),
    ]));
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

  it("accepts countableResource dependency triggers", () => {
    const countablePackage = {
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

    const result = validateSystemPackage(countablePackage);

    expect(result.ok).toBe(true);
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
});
