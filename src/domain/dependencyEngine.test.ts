import { describe, expect, it } from "vitest";
import { createEmptyCharacterData } from "./characterData";
import { applyResourceSelectedDependencies } from "./dependencyEngine";
import type { SystemPackage } from "./systemPackage";

describe("Dependency Engine resourceSelected fillText", () => {
  it("fills text modules from selected Resource Library fields without storing selection refs", () => {
    const systemPackage = createDependencyPackage();
    const data = createEmptyCharacterData(systemPackage);

    const next = applyResourceSelectedDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      selectedEntries: [
        {
          ID: "class:战士",
          fields: {
            ID: "class:战士",
            名称: "战士",
            领域: "利刃+骸骨",
            职业特性: "攻击并守护。",
          },
        },
      ],
    });

    expect(next.character.values["class-name"]).toBe("战士");
    expect(next.character.values["class-domains"]).toBe("利刃+骸骨");
    expect(next.character.values["class-feature"]).toBe("攻击并守护。");
    expect(JSON.stringify(next.character.values)).not.toContain("resource-selection");
  });

  it("joins multi-selected fields with an action separator", () => {
    const systemPackage = createDependencyPackage();
    const data = createEmptyCharacterData(systemPackage);

    const next = applyResourceSelectedDependencies(data, systemPackage, {
      type: "resourceSelected",
      sourceModuleId: "pick-domain-cards",
      libraryId: "domain-cards",
      selectedEntries: [
        { ID: "card-1", fields: { 名称: "卷土重来" } },
        { ID: "card-2", fields: { 名称: "灵巧机动" } },
      ],
    });

    expect(next.character.values["domain-card-list"]).toBe("卷土重来、灵巧机动");
  });
});

function createDependencyPackage(): SystemPackage {
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
            '<main><pb-module id="pick-class"></pb-module><pb-module id="class-name"></pb-module><pb-module id="class-domains"></pb-module><pb-module id="class-feature"></pb-module><pb-module id="pick-domain-cards"></pb-module><pb-module id="domain-card-list"></pb-module></main>',
        },
      },
    ],
    modules: [
      { ID: "pick-class", 类型: "resourcePicker", 按钮文本: "选择职业", 资源库ID: "classes" },
      { ID: "class-name", 类型: "freeText", 标签: "职业" },
      { ID: "class-domains", 类型: "freeText", 标签: "领域" },
      { ID: "class-feature", 类型: "longText", 标签: "职业特性" },
      { ID: "pick-domain-cards", 类型: "resourcePicker", 按钮文本: "选择领域卡", 资源库ID: "domain-cards", 多选: true },
      { ID: "domain-card-list", 类型: "longText", 标签: "领域卡" },
    ],
    resourceLibraries: [
      { ID: "classes", 名称: "职业", 路径: "resources/classes.json", fields: [], entries: [] },
      { ID: "domain-cards", 名称: "领域卡", 路径: "resources/domain_cards.json", fields: [], entries: [] },
    ],
    dependencies: [
      {
        ID: "fill-class",
        触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
        动作: [
          { 类型: "fillText", 目标模块ID: "class-name", 资源字段: "名称" },
          { 类型: "fillText", 目标模块ID: "class-domains", 资源字段: "领域" },
          { 类型: "fillText", 目标模块ID: "class-feature", 资源字段: "职业特性" },
        ],
      },
      {
        ID: "fill-domain-card-list",
        触发: { 类型: "resourceSelected", 来源模块ID: "pick-domain-cards" },
        动作: [{ 类型: "fillText", 目标模块ID: "domain-card-list", 资源字段: "名称", 分隔符: "、" }],
      },
    ],
  };
}
