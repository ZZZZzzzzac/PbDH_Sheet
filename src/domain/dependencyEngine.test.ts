import { describe, expect, it } from "vitest";
import { createEmptyCharacterData } from "./characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies } from "./dependencyEngine";
import type { SystemPackage } from "./systemPackage";

describe("Dependency Engine v1", () => {
  it("fills text and readOnlyDisplay content from selected Resource Library fields without storing selection refs", () => {
    const systemPackage = createDependencyPackage();
    const data = createEmptyCharacterData(systemPackage);

    const result = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      selectedEntries: [
        {
          ID: "class:德鲁伊",
          fields: {
            ID: "class:德鲁伊",
            名称: "德鲁伊",
            领域: "贤者+奥术",
            背景问题: "你的野生动物伙伴是谁？",
          },
        },
      ],
    });
    const next = applyDependencyResultToCharacterData(data, result);

    expect(next.character.values["class-name"]).toBe("德鲁伊");
    expect(next.character.values["class-domains"]).toBe("贤者+奥术");
    expect(next.character.values["class-background"]).toBeUndefined();
    expect(result.readOnlyDisplayContent["class-background"]).toBe("你的野生动物伙伴是谁？");
    expect(result.pageVisibility["druid-page"]).toBe(true);
    expect(result.moduleVisibility["druid-note"]).toBe(true);
    expect(result.resourcePickerDefaultQueries["pick-subclass"].filters).toEqual({ 主职: ["德鲁伊"] });
    expect(JSON.stringify(next.character.values)).not.toContain("resource-selection");
    expect(JSON.stringify(next.character.values)).not.toContain("class:德鲁伊");
  });

  it("supports selected resource field in and not-equals conditions", () => {
    const systemPackage = createDependencyPackage();
    const data = createEmptyCharacterData(systemPackage);

    const result = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      selectedEntries: [{ ID: "class:战士", fields: { 名称: "战士", 领域: "利刃+骸骨" } }],
    });

    expect(result.dataPatches["martial-note"]).toBe("武斗职业");
    expect(result.pageVisibility["druid-page"]).toBe(false);
    expect(result.moduleVisibility["druid-note"]).toBe(false);
    expect(result.resourcePickerDefaultQueries["pick-subclass"]).toBeUndefined();
  });

  it("joins multi-selected fields with an action separator", () => {
    const systemPackage = createDependencyPackage();
    const data = createEmptyCharacterData(systemPackage);

    const result = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-domain-cards",
      libraryId: "domain-cards",
      selectedEntries: [
        { ID: "card-1", fields: { 名称: "卷土重来" } },
        { ID: "card-2", fields: { 名称: "灵巧机动" } },
      ],
    });
    const next = applyDependencyResultToCharacterData(data, result);

    expect(next.character.values["domain-card-list"]).toBe("卷土重来、灵巧机动");
  });

  it("uses later active writes and reports conflicts", () => {
    const systemPackage = createDependencyPackage({
      dependencies: [
        {
          ID: "first",
          sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
          targets: [{ 类型: "module", 模块ID: "class-name" }],
          触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
          条件: { 类型: "always" },
          动作: [{ 类型: "fillText", 目标模块ID: "class-name", 内容: "先写" }],
        },
        {
          ID: "second",
          sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
          targets: [{ 类型: "module", 模块ID: "class-name" }],
          触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
          条件: { 类型: "always" },
          动作: [{ 类型: "fillText", 目标模块ID: "class-name", 内容: "后写" }],
        },
      ],
    });
    const data = createEmptyCharacterData(systemPackage);

    const result = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      selectedEntries: [{ ID: "class:战士", fields: { 名称: "战士" } }],
    });

    expect(result.dataPatches["class-name"]).toBe("后写");
    expect(result.warnings).toEqual([expect.stringContaining("first overwritten by second")]);
  });

  it("handles checkbox conditions, fixed text fill, and visibility effects", () => {
    const systemPackage = createDependencyPackage();
    const data = createEmptyCharacterData(systemPackage);

    const checkedResult = evaluateDependencies(data, systemPackage, {
      type: "checkboxChanged",
      sourceModuleId: "creation-toggles",
      optionId: "show-helper",
      checked: true,
      checkboxState: { "show-helper": true },
    });

    expect(checkedResult.dataPatches["helper-text"]).toBe("固定提示文本");
    expect(checkedResult.moduleVisibility["helper-text"]).toBe(true);

    const uncheckedResult = evaluateDependencies(data, systemPackage, {
      type: "checkboxChanged",
      sourceModuleId: "creation-toggles",
      optionId: "show-helper",
      checked: false,
      checkboxState: { "show-helper": false },
    });

    expect(uncheckedResult.dataPatches["helper-text"]).toBeUndefined();
    expect(uncheckedResult.moduleVisibility["helper-text"]).toBe(false);
  });
});

function createDependencyPackage(options: { dependencies?: SystemPackage["dependencies"] } = {}): SystemPackage {
  return {
    manifest: {
      ID: "dependency-demo",
      名称: "依赖示例",
      版本: "0.1.0",
      schemaVersion: "0.1.0",
    },
    pages: [
      {
        ID: "main",
        名称: "main",
        layout: {
          类型: "htmlTemplate",
          html: "layouts/main.html",
          htmlContent:
            '<main><pb-module id="pick-class"></pb-module><pb-module id="class-name"></pb-module><pb-module id="class-domains"></pb-module><pb-module id="class-background"></pb-module><pb-module id="druid-note"></pb-module><pb-module id="pick-subclass"></pb-module><pb-module id="pick-domain-cards"></pb-module><pb-module id="domain-card-list"></pb-module><pb-module id="creation-toggles"></pb-module><pb-module id="helper-text"></pb-module></main>',
        },
      },
      {
        ID: "druid-page",
        名称: "德鲁伊",
        默认隐藏: true,
        layout: {
          类型: "htmlTemplate",
          html: "layouts/druid.html",
          htmlContent: '<main><pb-module id="druid-note"></pb-module></main>',
        },
      },
    ],
    modules: [
      { ID: "pick-class", 类型: "resourcePicker", 按钮文本: "选择职业", 资源库ID: "classes" },
      { ID: "class-name", 类型: "freeText", 标签: "职业" },
      { ID: "class-domains", 类型: "freeText", 标签: "领域" },
      { ID: "class-background", 类型: "readOnlyDisplay", 标签: "背景问题", 内容: "待选择职业" },
      { ID: "druid-note", 类型: "readOnlyDisplay", 标签: "德鲁伊提示", 内容: "德鲁伊专属", 默认隐藏: true },
      { ID: "pick-subclass", 类型: "resourcePicker", 按钮文本: "选择子职", 资源库ID: "subclasses" },
      { ID: "martial-note", 类型: "freeText", 标签: "武斗提示" },
      { ID: "pick-domain-cards", 类型: "resourcePicker", 按钮文本: "选择领域卡", 资源库ID: "domain-cards", 多选: true },
      { ID: "domain-card-list", 类型: "longText", 标签: "领域卡" },
      {
        ID: "creation-toggles",
        类型: "checkboxResource",
        标签: "车卡辅助",
        选项: [{ ID: "show-helper", 标签: "显示提示" }],
      },
      { ID: "helper-text", 类型: "longText", 标签: "提示", 默认隐藏: true },
    ],
    resourceLibraries: [
      { ID: "classes", 名称: "职业", 路径: "resources/classes.json", fields: [], entries: [] },
      { ID: "subclasses", 名称: "子职", 路径: "resources/subclasses.json", fields: [], entries: [] },
      { ID: "domain-cards", 名称: "领域卡", 路径: "resources/domain_cards.json", fields: [], entries: [] },
    ],
    dependencies: options.dependencies ?? [
      {
        ID: "fill-class",
        sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
        targets: [
          { 类型: "module", 模块ID: "class-name" },
          { 类型: "module", 模块ID: "class-domains" },
          { 类型: "module", 模块ID: "class-background" },
        ],
        触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
        条件: { 类型: "always" },
        动作: [
          { 类型: "fillText", 目标模块ID: "class-name", 内容: { 类型: "selectedResourceField", 字段: "名称" } },
          { 类型: "fillText", 目标模块ID: "class-domains", 内容: { 类型: "selectedResourceField", 字段: "领域" } },
          { 类型: "fillText", 目标模块ID: "class-background", 内容: { 类型: "selectedResourceField", 字段: "背景问题" } },
        ],
      },
      {
        ID: "show-druid",
        sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
        targets: [
          { 类型: "page", 页面ID: "druid-page" },
          { 类型: "module", 模块ID: "druid-note" },
          { 类型: "module", 模块ID: "pick-subclass" },
        ],
        触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
        条件: { 类型: "selectedResourceFieldEquals", 字段: "名称", 值: "德鲁伊" },
        动作: [
          { 类型: "setVisibility", 目标类型: "page", 目标ID: "druid-page", 显示: true },
          { 类型: "setVisibility", 目标类型: "module", 目标ID: "druid-note", 显示: true },
          { 类型: "setResourceDefaultFilter", 目标模块ID: "pick-subclass", 字段: "主职", 值: ["德鲁伊"] },
        ],
      },
      {
        ID: "hide-druid",
        sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
        targets: [
          { 类型: "page", 页面ID: "druid-page" },
          { 类型: "module", 模块ID: "druid-note" },
        ],
        触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
        条件: { 类型: "selectedResourceFieldNotEquals", 字段: "名称", 值: "德鲁伊" },
        动作: [
          { 类型: "setVisibility", 目标类型: "page", 目标ID: "druid-page", 显示: false },
          { 类型: "setVisibility", 目标类型: "module", 目标ID: "druid-note", 显示: false },
        ],
      },
      {
        ID: "martial-note",
        sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
        targets: [{ 类型: "module", 模块ID: "martial-note" }],
        触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
        条件: { 类型: "selectedResourceFieldIn", 字段: "名称", 值: ["战士", "守护者"] },
        动作: [{ 类型: "fillText", 目标模块ID: "martial-note", 内容: "武斗职业" }],
      },
      {
        ID: "fill-domain-card-list",
        sources: [{ 类型: "resourcePicker", 模块ID: "pick-domain-cards" }],
        targets: [{ 类型: "module", 模块ID: "domain-card-list" }],
        触发: { 类型: "resourceSelected", 来源模块ID: "pick-domain-cards" },
        条件: { 类型: "always" },
        动作: [
          { 类型: "fillText", 目标模块ID: "domain-card-list", 内容: { 类型: "selectedResourceField", 字段: "名称", 分隔符: "、" } },
        ],
      },
      {
        ID: "show-helper",
        sources: [{ 类型: "checkboxResource", 模块ID: "creation-toggles" }],
        targets: [{ 类型: "module", 模块ID: "helper-text" }],
        触发: { 类型: "checkboxChanged", 来源模块ID: "creation-toggles" },
        条件: { 类型: "checkboxOptionChecked", 选项ID: "show-helper" },
        动作: [
          { 类型: "fillText", 目标模块ID: "helper-text", 内容: "固定提示文本" },
          { 类型: "setVisibility", 目标类型: "module", 目标ID: "helper-text", 显示: true },
        ],
      },
      {
        ID: "hide-helper",
        sources: [{ 类型: "checkboxResource", 模块ID: "creation-toggles" }],
        targets: [{ 类型: "module", 模块ID: "helper-text" }],
        触发: { 类型: "checkboxChanged", 来源模块ID: "creation-toggles" },
        条件: { 类型: "checkboxOptionUnchecked", 选项ID: "show-helper" },
        动作: [{ 类型: "setVisibility", 目标类型: "module", 目标ID: "helper-text", 显示: false }],
      },
    ],
  };
}
