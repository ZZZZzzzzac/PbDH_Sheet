import { render } from "@testing-library/react";
import { applyEffectiveResourceCatalog, createEffectiveResourceCatalog } from "../domain/effectiveResourceCatalog";
import { loadResourceExtensionJson } from "../domain/resourceExtension";
import { createEmptyCharacterData } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";
import { moduleDemoSystemPackage } from "../test/fixtures";
import { useRuntimeStore } from "../store/runtimeStore";
import { SheetRenderer } from "./SheetRenderer";

export function renderModuleDemo(systemPackage: SystemPackage = moduleDemoSystemPackage, packageAssetUrls: Record<string, string> = {}) {
  useRuntimeStore.setState({
    currentPackage: systemPackage,
    packageAssetUrls,
    characterData: createEmptyCharacterData(systemPackage),
    packageIssues: [],
    derivedReadOnlyDisplayContent: {},
    moduleVisibility: {},
    pageVisibility: {},
    resourcePickerDefaultQueries: {},
    cardTableCardWidths: {},
    bootStatus: "ready",
    storageStatus: "idle",
    importError: null,
    importNotice: null,
  });

  return render(<SheetRenderer systemPackage={systemPackage} />);
}

export function resetModuleRegistryTestState() {
  useRuntimeStore.setState({
    currentPackage: null,
    packageAssetUrls: {},
    characterData: null,
    packageIssues: [],
    derivedReadOnlyDisplayContent: {},
    moduleVisibility: {},
    pageVisibility: {},
    resourcePickerDefaultQueries: {},
    cardTableCardWidths: {},
    bootStatus: "idle",
    storageStatus: "idle",
    importError: null,
    importNotice: null,
  });
}

export function createResourcePickerPackage(options: { multiSelect?: boolean; defaultFilters?: Record<string, string[]> } = {}): SystemPackage {
  return {
    ...moduleDemoSystemPackage,
    resourceLibraries: [
      {
        ID: "domains",
        名称: "领域",
        路径: "resources/domains.json",
        fields: [
          { key: "ID", label: "ID", visible: false, filterable: false, sortable: false, searchable: false },
          { key: "名称", label: "名称", visible: true, filterable: true, sortable: true, searchable: true },
          { key: "领域", label: "领域", visible: true, filterable: true, sortable: true, searchable: true },
          { key: "等级", label: "等级", visible: true, filterable: true, sortable: true, searchable: true },
          { key: "卡图", label: "卡图", visible: true, filterable: false, sortable: false, searchable: false },
        ],
        entries: [
          {
            ID: "flame-1",
            fields: {
              ID: "flame-1",
              名称: "烈焰",
              领域: "利刃",
              等级: "1",
              卡图: "assets/cards/flame.png",
            },
          },
          {
            ID: "shadow-1",
            fields: {
              ID: "shadow-1",
              名称: "幽影",
              领域: "骸骨",
              等级: "1",
              卡图: "assets/cards/shadow.png",
            },
          },
        ],
      },
    ],
    modules: [
      ...moduleDemoSystemPackage.modules,
      {
        ID: "domain-picker",
        类型: "resourcePicker",
        按钮文本: "选择领域",
        资源库: [{
          ID: "domains",
          字段模板: [
            { 键: "名称", 标签: "卡名", 默认显示: true, 可筛选: false, 可排序: true, 列宽: "fill" },
            { 键: "领域", 标签: "领域", 默认显示: true, 可筛选: true, 可排序: true, 列宽: "compact" },
            { 键: "等级", 标签: "等级", 默认显示: true, 可筛选: true, 可排序: true, 列宽: "compact" },
          ],
          默认查询: options.defaultFilters ? { filters: options.defaultFilters } : undefined,
        }],
        多选: options.multiSelect,
      },
      {
        ID: "domain-name",
        类型: "freeText",
        标签: "领域名",
      },
      {
        ID: "domain-level",
        类型: "freeText",
        标签: "等级",
      },
      {
        ID: "domain-display",
        类型: "readOnlyDisplay",
        标签: "领域展示",
        内容: "等待选择",
      },
      {
        ID: "domain-hidden",
        类型: "readOnlyDisplay",
        标签: "隐藏领域提示",
        内容: "选择领域后显示",
        默认隐藏: true,
      },
      {
        ID: "domain-page-note",
        类型: "readOnlyDisplay",
        标签: "隐藏页面提示",
        内容: "隐藏页面已显示",
      },
    ],
    dependencies: [
      {
        ID: "fill-domain",
        sources: [{ 类型: "resourcePicker", 模块ID: "domain-picker" }],
        targets: [
          { 类型: "module", 模块ID: "domain-name" },
          { 类型: "module", 模块ID: "domain-level" },
          { 类型: "module", 模块ID: "domain-display" },
          { 类型: "module", 模块ID: "domain-hidden" },
          { 类型: "page", 页面ID: "domain-page" },
        ],
        触发: { 类型: "resourceSelected", 来源模块ID: "domain-picker" },
        条件: { 类型: "always" },
        动作: [
          { 类型: "fillText", 目标模块ID: "domain-name", 内容: { 类型: "selectedResourceField", 字段: "名称", 分隔符: "、" } },
          { 类型: "fillText", 目标模块ID: "domain-level", 内容: { 类型: "selectedResourceField", 字段: "等级", 分隔符: "、" } },
          { 类型: "fillText", 目标模块ID: "domain-display", 内容: { 类型: "selectedResourceField", 字段: "名称", 分隔符: "、" } },
          { 类型: "setVisibility", 目标类型: "module", 目标ID: "domain-hidden", 显示: true },
          { 类型: "setVisibility", 目标类型: "page", 目标ID: "domain-page", 显示: true },
        ],
      },
    ],
    pages: [
      {
        ...moduleDemoSystemPackage.pages[0],
        layout: {
          ...moduleDemoSystemPackage.pages[0].layout,
          htmlContent: `${moduleDemoSystemPackage.pages[0].layout.htmlContent}<pb-module id="domain-picker"></pb-module><pb-module id="domain-name"></pb-module><pb-module id="domain-level"></pb-module><pb-module id="domain-display"></pb-module><pb-module id="domain-hidden"></pb-module>`,
        },
      },
      {
        ID: "domain-page",
        名称: "领域页",
        默认隐藏: true,
        layout: {
          类型: "htmlTemplate",
          htmlContent: '<main><pb-module id="domain-page-note"></pb-module></main>',
        },
      },
    ],
  };
}

export function createMultiResourcePickerPackage(): SystemPackage {
  const systemPackage = createResourcePickerPackage({ defaultFilters: { 领域: ["利刃"] } });
  const picker = systemPackage.modules.find((module) => module.ID === "domain-picker");
  if (picker?.类型 !== "resourcePicker") throw new Error("domain-picker fixture missing");

  picker.资源库 = [
    ...picker.资源库 === "其他" ? [] : picker.资源库,
    {
      ID: "weapons",
      字段模板: [
        { 键: "名称", 标签: "武器名", 默认显示: true, 可筛选: false, 可排序: true, 列宽: "fill" },
        { 键: "类型", 标签: "类型", 默认显示: true, 可筛选: true, 可排序: true, 列宽: "compact" },
      ],
      默认查询: { filters: { 类型: ["远程"] } },
    },
  ];
  systemPackage.resourceLibraries?.push({
    ID: "weapons",
    名称: "武器",
    路径: "resources/weapons.json",
    fields: [
      { key: "ID", label: "ID", visible: false, filterable: false, sortable: false, searchable: false },
      { key: "名称", label: "名称", visible: true, filterable: true, sortable: true, searchable: true },
      { key: "类型", label: "类型", visible: true, filterable: true, sortable: true, searchable: true },
    ],
    entries: [
      { ID: "sword-1", fields: { ID: "sword-1", 名称: "长剑", 类型: "近战" } },
      { ID: "bow-1", fields: { ID: "bow-1", 名称: "长弓", 类型: "远程" } },
    ],
  });
  return systemPackage;
}

export function createCardTablePackage(): SystemPackage {
  return {
    ...moduleDemoSystemPackage,
    resourceLibraries: [
      {
        ID: "domain-cards",
        名称: "领域卡",
        路径: "resources/domain-cards.json",
        fields: [
          { key: "ID", label: "ID", visible: true, filterable: true, sortable: true, searchable: true },
          { key: "名称", label: "名称", visible: true, filterable: true, sortable: true, searchable: true },
          { key: "领域", label: "领域", visible: true, filterable: true, sortable: true, searchable: true },
          { key: "等级", label: "等级", visible: true, filterable: true, sortable: true, searchable: true },
          { key: "回想", label: "回想", visible: true, filterable: true, sortable: true, searchable: true },
          { key: "描述", label: "描述", visible: true, filterable: false, sortable: false, searchable: true },
        ],
        entries: [
          {
            ID: "domain-card:recall-test",
            fields: {
              ID: "domain-card:recall-test",
              名称: "回想测试",
              领域: "贤者",
              等级: "1",
              回想: "1",
              描述: "描述应该独立显示。",
              背面卡牌ID: "domain-card:back",
            },
          },
          {
            ID: "domain-card:back",
            fields: {
              ID: "domain-card:back",
              名称: "卡牌背面",
              描述: "这是独立的背面 Card Definition。",
            },
          },
        ],
      },
      {
        ID: "ancestry-cards",
        名称: "种族卡",
        路径: "resources/ancestry-cards.json",
        fields: [
          { key: "ID", label: "ID", visible: true, filterable: true, sortable: true, searchable: true },
          { key: "名称", label: "名称", visible: true, filterable: true, sortable: true, searchable: true },
          { key: "描述", label: "描述", visible: true, filterable: false, sortable: false, searchable: true },
        ],
        entries: [
          {
            ID: "domain-card:recall-test",
            fields: { ID: "domain-card:recall-test", 名称: "种族能力", 描述: "来自另一个资源库。" },
          },
        ],
      },
    ],
    modules: [
      {
        ID: "domain-card-table",
        类型: "cardTable",
        标签: "领域卡牌桌面",
        资源来源: [
          { 类型: "resourceLibrary", ID: "domain-cards" },
          { 类型: "resourceLibrary", ID: "ancestry-cards" },
        ],
        状态选项: ["configured", "vault"],
        状态背景色: { vault: "#abcdef" },
      },
    ],
    pages: [
      {
        ID: "main",
        名称: "Main",
        layout: {
          类型: "htmlTemplate",
          htmlContent: '<main><pb-module id="domain-card-table"></pb-module></main>',
        },
      },
    ],
  };
}
