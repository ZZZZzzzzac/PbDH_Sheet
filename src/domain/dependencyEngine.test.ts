import { describe, expect, it } from "vitest";
import { createEmptyCharacterData } from "./characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies, hasRebuildableDependencies, rebuildDerivedDependencies } from "./dependencyEngine";
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

  it("builds and rebuilds one Resource Picker filter from declared non-empty Free Text values", () => {
    const filterAction = {
      类型: "setResourceDefaultFilter" as const,
      目标模块ID: "pick-domain-cards",
      字段: "领域",
      值: { 类型: "freeTextValues" as const, 模块IDs: ["class-name", "class-domains"] },
    };
    const systemPackage = createDependencyPackage({ dependencies: [
      {
        ID: "filter-on-primary-domain",
        sources: [
          { 类型: "freeText", 模块ID: "class-name" },
          { 类型: "freeText", 模块ID: "class-domains" },
        ],
        targets: [{ 类型: "module", 模块ID: "pick-domain-cards" }],
        触发: { 类型: "freeTextChanged", 来源模块ID: "class-name" },
        条件: { 类型: "always" },
        动作: [filterAction],
      },
      {
        ID: "filter-on-secondary-domain",
        sources: [
          { 类型: "freeText", 模块ID: "class-name" },
          { 类型: "freeText", 模块ID: "class-domains" },
        ],
        targets: [{ 类型: "module", 模块ID: "pick-domain-cards" }],
        触发: { 类型: "freeTextChanged", 来源模块ID: "class-domains" },
        条件: { 类型: "always" },
        动作: [filterAction],
      },
    ] });
    const data = createEmptyCharacterData(systemPackage);
    data.character.values["class-name"] = " 奥术 ";
    data.character.values["class-domains"] = "";

    const committed = evaluateDependencies(data, systemPackage, {
      type: "freeTextChanged",
      sourceModuleId: "class-name",
      value: " 奥术 ",
    });
    expect(committed.resourcePickerDefaultQueries["pick-domain-cards"].filters).toEqual({ 领域: ["奥术"] });

    data.character.values["class-domains"] = "奇迹";
    const rebuilt = rebuildDerivedDependencies(data, systemPackage);
    expect(rebuilt.resourcePickerDefaultQueries["pick-domain-cards"].filters).toEqual({ 领域: ["奥术", "奇迹"] });
    expect(rebuilt.dataPatches).toEqual({});
  });

  it("rebuilds only pure derived actions from a persisted Resource Picker snapshot", () => {
    const systemPackage = createDependencyPackage();
    const druid = {
      ID: "class:德鲁伊",
      fields: { ID: "class:德鲁伊", 名称: "德鲁伊", 领域: "贤者+奥术", 背景问题: "荒野如何呼唤你？" },
    };
    systemPackage.resourceLibraries?.find((library) => library.ID === "classes")?.entries.push(druid);
    const data = createEmptyCharacterData(systemPackage);
    data.resourceSelections = { "pick-class": { libraryId: "classes", entryIds: [druid.ID] } };

    const result = rebuildDerivedDependencies(data, systemPackage);

    expect(hasRebuildableDependencies(systemPackage, "pick-class")).toBe(true);
    expect(hasRebuildableDependencies(systemPackage, "pick-domain-cards")).toBe(false);
    expect(result.pageVisibility["druid-page"]).toBe(true);
    expect(result.moduleVisibility["druid-note"]).toBe(true);
    expect(result.resourcePickerDefaultQueries["pick-subclass"].filters).toEqual({ 主职: ["德鲁伊"] });
    expect(result.readOnlyDisplayContent["class-background"]).toBe("荒野如何呼唤你？");
    expect(result.dataPatches).toEqual({});
  });

  it("rebuilds pure Composer output without replaying its Character Data writes", () => {
    const base = createDependencyPackage();
    const systemPackage = {
      ...base,
      modules: [
        ...base.modules,
        {
          ID: "compose-helper", 类型: "resourceComposer", 按钮文本: "组合",
          来源槽位: [{ ID: "source", 标签: "来源", 资源库ID: "classes" }],
          输出字段: [{ 字段: "提示", 来源槽位ID: "source", 来源字段: "背景问题" }],
        },
      ],
      dependencies: [{
        ID: "composer-derived",
        sources: [{ 类型: "resourceComposer", 模块ID: "compose-helper" }],
        targets: [{ 类型: "module", 模块ID: "class-background" }, { 类型: "page", 页面ID: "druid-page" }],
        触发: { 类型: "resourceSelected", 来源模块ID: "compose-helper" },
        条件: { 类型: "always" },
        动作: [
          { 类型: "fillText", 目标模块ID: "class-background", 内容: { 类型: "selectedResourceField", 字段: "提示" } },
          { 类型: "fillText", 目标模块ID: "class-name", 内容: "不应重放" },
          { 类型: "setVisibility", 目标类型: "page", 目标ID: "druid-page", 显示: true },
        ],
      }],
    } as unknown as SystemPackage;
    const data = createEmptyCharacterData(systemPackage);
    data.compositeResources["compose-helper"] = {
      ID: "composite:compose-helper", composerModuleId: "compose-helper", fields: { ID: "composite:compose-helper", 提示: "组合提示" },
    };

    const result = rebuildDerivedDependencies(data, systemPackage);

    expect(result.readOnlyDisplayContent["class-background"]).toBe("组合提示");
    expect(result.pageVisibility["druid-page"]).toBe(true);
    expect(result.dataPatches).toEqual({});
  });

  it("derives and rebuilds a text placeholder without writing Character Data", () => {
    const systemPackage = createDependencyPackage({ dependencies: [{
      ID: "derive-placeholder",
      sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
      targets: [{ 类型: "module", 模块ID: "class-name" }],
      触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
      条件: { 类型: "always" },
      动作: [{ 类型: "setTextPlaceholder", 目标模块ID: "class-name", 内容: { 类型: "selectedResourceField", 字段: "名称" } }],
    }] });
    const selected = { ID: "class:德鲁伊", fields: { ID: "class:德鲁伊", 名称: "德鲁伊" } };
    systemPackage.resourceLibraries.find((library) => library.ID === "classes")?.entries.push(selected);
    const data = createEmptyCharacterData(systemPackage);

    const result = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected", sourceModuleId: "pick-class", libraryId: "classes", selectedEntries: [selected],
    });
    expect(result.textPlaceholders).toEqual({ "class-name": "德鲁伊" });
    expect(result.dataPatches).toEqual({});

    data.resourceSelections = { "pick-class": { libraryId: "classes", entryIds: [selected.ID] } };
    expect(rebuildDerivedDependencies(data, systemPackage).textPlaceholders).toEqual({ "class-name": "德鲁伊" });
    expect(data.character.values["class-name"]).toBe("");
  });

  it("warns and skips an invalid derived Resource Reference", () => {
    const systemPackage = createDependencyPackage();
    const data = createEmptyCharacterData(systemPackage);
    data.resourceSelections = { "pick-class": { libraryId: "classes", entryIds: ["missing"] } };

    const result = rebuildDerivedDependencies(data, systemPackage);

    expect(result.pageVisibility).toEqual({});
    expect(result.warnings).toEqual([expect.stringContaining("missing Resource Entry classes/missing")]);
  });

  it("rebuilds pure checkbox effects from persisted Checkbox State", () => {
    const systemPackage = createDependencyPackage();
    const data = createEmptyCharacterData(systemPackage);
    data.character.values["creation-toggles"] = { "show-helper": true };

    const result = rebuildDerivedDependencies(data, systemPackage);

    expect(result.moduleVisibility["helper-text"]).toBe(true);
    expect(result.dataPatches).toEqual({});
  });

  it("formats selected resources and appends them to existing text", () => {
    const systemPackage = createDependencyPackage({
      dependencies: [{
        ID: "append-items",
        sources: [{ 类型: "resourcePicker", 模块ID: "pick-domain-cards" }],
        targets: [{ 类型: "module", 模块ID: "domain-card-list" }],
        触发: { 类型: "resourceSelected", 来源模块ID: "pick-domain-cards" },
        条件: { 类型: "always" },
        动作: [{
          类型: "fillText",
          目标模块ID: "domain-card-list",
          写入方式: "追加",
          追加分隔符: "\n---\n",
          内容: {
            类型: "selectedResourceTemplate",
            格式: "**{{名称}}**：{{描述}}（{{缺失字段}}）",
            分隔符: "\n",
          },
        }],
      }],
    });
    const data = createEmptyCharacterData(systemPackage);
    data.character.values["domain-card-list"] = "已有条目";

    const result = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-domain-cards",
      libraryId: "domain-cards",
      selectedEntries: [
        { ID: "item-1", fields: { 名称: "治疗药水", 描述: "恢复生命。" } },
        { ID: "item-2", fields: { 名称: "绳索", 描述: "长十米。" } },
      ],
    });
    const next = applyDependencyResultToCharacterData(data, result);

    expect(next.character.values["domain-card-list"]).toBe(
      "已有条目\n---\n**治疗药水**：恢复生命。（）\n**绳索**：长十米。（）",
    );

    data.character.values["domain-card-list"] = "";
    const emptySelectionResult = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-domain-cards",
      libraryId: "domain-cards",
      selectedEntries: [],
    });
    expect(applyDependencyResultToCharacterData(data, emptySelectionResult).character.values["domain-card-list"]).toBe("");
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

  it("fills countable current and maximum values from selected Resource fields", () => {
    const basePackage = createDependencyPackage();
    const systemPackage = {
      ...basePackage,
      modules: [
        ...basePackage.modules,
        { ID: "hp", 类型: "countableResource", 标签: "生命", 最小值: 0, 最大值: 6, 默认值: 1 },
      ],
      dependencies: [
        {
          ID: "fill-hp",
          sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
          targets: [{ 类型: "module", 模块ID: "hp" }],
          触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
          条件: { 类型: "always" },
          动作: [{
            类型: "fillCountable",
            目标模块ID: "hp",
            当前值: { 类型: "selectedResourceField", 字段: "当前生命" },
            最大值: { 类型: "selectedResourceField", 字段: "生命上限" },
          }],
        },
      ],
    } as unknown as SystemPackage;
    const data = createEmptyCharacterData(systemPackage);

    const result = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      selectedEntries: [{ ID: "class:test", fields: { 当前生命: "4", 生命上限: "8" } }],
    });
    const next = applyDependencyResultToCharacterData(data, result);

    expect(next.character.values.hp).toEqual({ current: 4, max: 8 });
  });

  it("preserves partial Countable State, clamps values, and skips invalid integers", () => {
    const basePackage = createDependencyPackage();
    const systemPackage = {
      ...basePackage,
      modules: [...basePackage.modules, { ID: "hope", 类型: "countableResource", 标签: "希望", 最小值: 1, 最大值: 6, 默认值: 3 }],
      dependencies: [{
        ID: "fill-hope",
        sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
        targets: [{ 类型: "module", 模块ID: "hope" }],
        触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
        条件: { 类型: "always" },
        动作: [
          { 类型: "fillCountable", 目标模块ID: "hope", 当前值: 99 },
          { 类型: "fillCountable", 目标模块ID: "hope", 最大值: { 类型: "selectedResourceField", 字段: "上限" } },
        ],
      }],
    } as unknown as SystemPackage;
    const data = createEmptyCharacterData(systemPackage);

    const invalidResult = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      selectedEntries: [{ ID: "class:test", fields: { 上限: "6点" } }],
    });
    expect(applyDependencyResultToCharacterData(data, invalidResult).character.values.hope).toEqual({ current: 6, max: 6 });
    expect(invalidResult.warnings).toEqual([expect.stringContaining("skipped invalid countable maximum integer")]);

    const validResult = evaluateDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      selectedEntries: [{ ID: "class:test", fields: { 上限: "4" } }],
    });
    expect(applyDependencyResultToCharacterData(data, validResult).character.values.hope).toEqual({ current: 4, max: 4 });
  });

  it("calculates a Countable maximum from Countable current and persisted Resource selection count", () => {
    const basePackage = createDependencyPackage();
    const systemPackage = {
      ...basePackage,
      modules: [
        ...basePackage.modules,
        { ID: "erosion", 类型: "countableResource", 标签: "蚀痕", 最小值: 0, 最大值: 6, 默认值: 0 },
        { ID: "magic", 类型: "countableResource", 标签: "魔法点", 最小值: 0, 最大值: 6, 默认值: 6 },
      ],
      dependencies: [{
        ID: "derive-magic-max",
        sources: [
          { 类型: "countableResource", 模块ID: "erosion" },
          { 类型: "resourcePicker", 模块ID: "pick-class" },
        ],
        targets: [{ 类型: "module", 模块ID: "magic" }],
        触发: { 类型: "countableChanged", 来源模块ID: "erosion" },
        条件: { 类型: "always" },
        动作: [{
          类型: "fillCountable", 目标模块ID: "magic", 最大值: {
            类型: "integerCalculation", 初始值: 6, 最小值: 0,
            运算: [
              { 操作: "subtract", 值: { 类型: "countableCurrent", 模块ID: "erosion" } },
              { 操作: "subtract", 值: { 类型: "resourceSelectionCount", 模块ID: "pick-class" } },
            ],
          },
        }],
      }],
    } as unknown as SystemPackage;
    let data = createEmptyCharacterData(systemPackage);
    data.character.values.erosion = { current: 2, max: 6 };
    data.character.values.magic = { current: 6, max: 6 };
    data.resourceSelections = { "pick-class": { libraryId: "classes", entryIds: ["class:test"] } };

    const result = evaluateDependencies(data, systemPackage, {
      type: "countableChanged", sourceModuleId: "erosion", countableState: { current: 2, max: 6 },
    });
    const next = applyDependencyResultToCharacterData(data, result);

    expect(next.character.values.magic).toEqual({ current: 3, max: 3 });
    expect(result.warnings).toEqual([]);
    expect(hasRebuildableDependencies(systemPackage, "pick-class")).toBe(true);
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
      { ID: "pick-class", 类型: "resourcePicker", 按钮文本: "选择职业", 资源库: [{ ID: "classes" }] },
      { ID: "class-name", 类型: "freeText", 标签: "职业" },
      { ID: "class-domains", 类型: "freeText", 标签: "领域" },
      { ID: "class-background", 类型: "readOnlyDisplay", 标签: "背景问题", 内容: "待选择职业" },
      { ID: "druid-note", 类型: "readOnlyDisplay", 标签: "德鲁伊提示", 内容: "德鲁伊专属", 默认隐藏: true },
      { ID: "pick-subclass", 类型: "resourcePicker", 按钮文本: "选择子职", 资源库: [{ ID: "subclasses" }] },
      { ID: "martial-note", 类型: "freeText", 标签: "武斗提示" },
      { ID: "pick-domain-cards", 类型: "resourcePicker", 按钮文本: "选择领域卡", 资源库: [{ ID: "domain-cards" }], 多选: true },
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
