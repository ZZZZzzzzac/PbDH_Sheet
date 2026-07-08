import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyCharacterData } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";
import { moduleDemoSystemPackage } from "../test/fixtures";
import { useRuntimeStore } from "../store/runtimeStore";
import { SheetRenderer } from "./SheetRenderer";

function renderModuleDemo(systemPackage: SystemPackage = moduleDemoSystemPackage, packageAssetUrls: Record<string, string> = {}) {
  useRuntimeStore.setState({
    currentPackage: systemPackage,
    packageAssetUrls,
    characterData: createEmptyCharacterData(systemPackage),
    packageIssues: [],
    derivedReadOnlyDisplayContent: {},
    moduleVisibility: {},
    pageVisibility: {},
    resourcePickerDefaultQueries: {},
    bootStatus: "ready",
    storageStatus: "idle",
    importError: null,
    importNotice: null,
  });

  return render(<SheetRenderer systemPackage={systemPackage} />);
}

describe("Module Registry rendering", () => {
  beforeEach(() => {
    useRuntimeStore.setState({
      currentPackage: null,
      packageAssetUrls: {},
      characterData: null,
      packageIssues: [],
      derivedReadOnlyDisplayContent: {},
      moduleVisibility: {},
      pageVisibility: {},
      resourcePickerDefaultQueries: {},
      bootStatus: "idle",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });
  });

  it("renders the phase 5 simple module set through SheetRenderer", () => {
    renderModuleDemo(moduleDemoSystemPackage, { "demo-emblem": "data:image/svg+xml;base64,PHN2Zy8+" });

    expect(screen.getByLabelText("姓名")).toBeVisible();
    expect(screen.getByLabelText("背景")).toBeVisible();
    expect(screen.getByRole("group", { name: "标记" })).toBeVisible();
    expect(screen.getByLabelText("气力")).toHaveValue("3");
    expect(screen.getByText("只读展示模块不会写入 Character Data。这里适合放规则提示、检查清单或静态说明。")).toBeVisible();
    expect(screen.getByAltText("阶段5示例徽记")).toBeVisible();
    expect(screen.getByRole("button", { name: "上传图片" })).toBeVisible();
  });

  it("renders HTML Layout Template content and module slots", () => {
    const result = renderModuleDemo(moduleDemoSystemPackage, { "demo-emblem": "data:image/svg+xml;base64,PHN2Zy8+" });

    expect(result.container.querySelector(".demo-sheet")).not.toBeNull();
    expect(result.container.querySelector(".identity")).not.toBeNull();
    expect(result.container.querySelector('[data-module-slot-id="background"]')).not.toBeNull();
    expect(result.container.querySelector("style")?.textContent).toContain('[data-template-page-id="main"] .identity');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates editable module state by module ID and leaves read-only display unstored", () => {
    renderModuleDemo();

    fireEvent.change(screen.getByLabelText("背景"), {
      target: { value: "第一行\n第二行" },
    });
    fireEvent.click(screen.getByLabelText("受伤"));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));

    const values = useRuntimeStore.getState().characterData?.character.values;
    expect(values?.background).toBe("第一行\n第二行");
    expect(values?.conditions).toEqual({
      wounded: true,
      exhausted: false,
      inspired: true,
    });
    expect(values?.vitality).toEqual({ current: 6, max: 6 });
    expect(screen.getByRole("button", { name: "气力增加" })).toBeDisabled();
    expect(values?.["rule-note"]).toBeUndefined();
    expect(values?.["sect-emblem"]).toBeUndefined();
    expect(values?.portrait).toBeUndefined();
  });

  it("shows an image fallback when the package asset has no resolved URL", () => {
    renderModuleDemo();

    expect(screen.getByRole("img", { name: "阶段5示例徽记" })).toHaveTextContent("图片不可用");
  });

  it("lets the player edit the countable resource max when configured", () => {
    renderModuleDemo();

    const maxInput = screen.getByLabelText("气力上限");
    expect(maxInput).toHaveValue("6");

    fireEvent.change(maxInput, { target: { value: "10" } });
    expect(screen.getByRole("button", { name: "气力增加" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));

    const values = useRuntimeStore.getState().characterData?.character.values;
    expect(values?.vitality).toEqual({ current: 7, max: 10 });
  });

  it("opens Resource Picker browser and fills target text modules without storing a selection value", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    renderModuleDemo(createResourcePickerPackage());

    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));
    const dialog = screen.getByRole("dialog", { name: "领域资源库" });
    expect(dialog).toBeVisible();
    expect(dialog.querySelector(".resource-table-col-compact")).not.toBeNull();
    expect(dialog.querySelector(".resource-table-col-fill")).not.toBeNull();
    expect(screen.queryByRole("columnheader", { name: "ID" })).not.toBeInTheDocument();
    expect(screen.queryByText("assets/cards/flame.png")).not.toBeInTheDocument();
    expect(screen.queryByText("选择领域后显示")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("选择 烈焰"));

    const values = useRuntimeStore.getState().characterData?.character.values;
    expect(values?.["domain-name"]).toBe("烈焰");
    expect(values?.["domain-level"]).toBe("1");
    expect(values?.["domain-display"]).toBeUndefined();
    expect(values?.["domain-choice"]).toBeUndefined();
    expect(JSON.stringify(values)).not.toContain("resource-selection");
    expect(JSON.stringify(values)).not.toContain("data:image");
    expect(screen.getByLabelText("领域名")).toHaveValue("烈焰");
    expect(screen.getByText("烈焰")).toBeVisible();
    expect(screen.getByText("选择领域后显示")).toBeVisible();
    expect(screen.getByText("隐藏页面已显示")).toBeVisible();
    expect(logSpy).toHaveBeenCalledWith(
      "resourceSelected",
      expect.objectContaining({
        moduleId: "domain-picker",
        libraryId: "domains",
        selectedItemIds: ["flame-1"],
      }),
    );
  });

  it("supports Resource Picker multi-select and default Resource Library filters", () => {
    renderModuleDemo(createResourcePickerPackage({ multiSelect: true, defaultFilters: { 领域: ["骸骨"] } }));

    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));

    expect(screen.queryByLabelText("选择 烈焰")).not.toBeInTheDocument();
    expect(screen.getByLabelText("选择 幽影")).toBeVisible();
    fireEvent.click(screen.getByLabelText("骸骨"));
    fireEvent.click(screen.getByLabelText("选择 烈焰"));
    fireEvent.click(screen.getByLabelText("选择 幽影"));
    fireEvent.click(screen.getByRole("button", { name: "确认选择" }));

    const values = useRuntimeStore.getState().characterData?.character.values;
    expect(values?.["domain-name"]).toBe("烈焰、幽影");
    expect(screen.getByLabelText("领域名")).toHaveValue("烈焰、幽影");
  });

  it("applies runtime Resource Picker default filters while leaving them editable", () => {
    renderModuleDemo(createResourcePickerPackage({ defaultFilters: { 领域: ["骸骨"] } }));

    useRuntimeStore.setState({
      resourcePickerDefaultQueries: {
        "domain-picker": { filters: { 领域: ["利刃"] } },
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));

    expect(screen.getByLabelText("选择 烈焰")).toBeVisible();
    expect(screen.queryByLabelText("选择 幽影")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("利刃"));
    expect(screen.getByLabelText("选择 幽影")).toBeVisible();
  });
});

function createResourcePickerPackage(options: { multiSelect?: boolean; defaultFilters?: Record<string, string[]> } = {}): SystemPackage {
  return {
    ...moduleDemoSystemPackage,
    resourceLibraries: [
      {
        ID: "domains",
        名称: "领域",
        路径: "resources/domains.json",
        fields: [
          { key: "ID", label: "ID", visible: true, filterable: true, sortable: true },
          { key: "名称", label: "名称", visible: true, filterable: true, sortable: true },
          { key: "领域", label: "领域", visible: true, filterable: true, sortable: true },
          { key: "等级", label: "等级", visible: true, filterable: true, sortable: true },
          { key: "卡图", label: "卡图", visible: true, filterable: false, sortable: false },
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
        资源库ID: "domains",
        字段模板: [
          { 键: "名称", 标签: "卡名", 默认显示: true, 可筛选: false, 可排序: true, 列宽: "fill" },
          { 键: "领域", 标签: "领域", 默认显示: true, 可筛选: true, 可排序: true, 列宽: "compact" },
          { 键: "等级", 标签: "等级", 默认显示: true, 可筛选: true, 可排序: true, 列宽: "compact" },
        ],
        多选: options.multiSelect,
        默认查询: options.defaultFilters ? { filters: options.defaultFilters } : undefined,
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
          html: "layouts/domain.html",
          htmlContent: '<main><pb-module id="domain-page-note"></pb-module></main>',
        },
      },
    ],
  };
}
