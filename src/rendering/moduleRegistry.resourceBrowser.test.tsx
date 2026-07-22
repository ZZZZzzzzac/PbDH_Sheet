import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCardInstance } from "../domain/cardEngine";
import { applyEffectiveResourceCatalog, createEffectiveResourceCatalog } from "../domain/effectiveResourceCatalog";
import { loadResourceExtensionJson } from "../domain/resourceExtension";
import { resourceAssetUrlKey } from "../loaders/assetResolver";
import { createEmptyCharacterData, updatePlayerImage } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";
import { moduleDemoSystemPackage } from "../test/fixtures";
import { useRuntimeStore } from "../store/runtimeStore";
import { SheetRenderer } from "./SheetRenderer";
import { createCardTablePackage, createMultiResourcePickerPackage, createResourcePickerPackage, renderModuleDemo, resetModuleRegistryTestState } from "./moduleRegistry.testSupport";

describe("Resource Browser rendering", () => {
  beforeEach(() => {
    resetModuleRegistryTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens Resource Picker browser and fills target text modules without storing a selection value", () => {
    renderModuleDemo(createResourcePickerPackage());

    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));
    const dialog = screen.getByRole("dialog", { name: "领域资源库" });
    expect(dialog).toBeVisible();
    expect(dialog.querySelector(".resource-table-col-compact")).not.toBeNull();
    expect(dialog.querySelector(".resource-table-col-fill")).not.toBeNull();
    expect(screen.queryByRole("columnheader", { name: "ID" })).not.toBeInTheDocument();
    expect(screen.getByText("assets/cards/flame.png")).toBeVisible();
    expect(screen.queryByText("选择领域后显示")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("选择 烈焰"));

    const values = useRuntimeStore.getState().characterData?.character.values;
    expect(values?.["domain-name"]).toBe("烈焰");
    expect(values?.["domain-level"]).toBe("1");
    expect(values?.["domain-display"]).toBeUndefined();
    expect(values?.["domain-choice"]).toBeUndefined();
    expect(JSON.stringify(values)).not.toContain("resource-selection");
    expect(JSON.stringify(values)).not.toContain("data:image");
    expect(screen.getByRole("button", { name: "领域名" })).toHaveTextContent("烈焰");
    expect(screen.getAllByText("烈焰")).toHaveLength(2);
    expect(screen.getByText("选择领域后显示")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "领域页" }));
    expect(screen.getByText("隐藏页面已显示")).toBeVisible();
  });

  it("renders Restricted Markdown in Resource Library table values", () => {
    const systemPackage = createResourcePickerPackage();
    systemPackage.resourceLibraries[0].entries[0].fields.名称 = "**烈焰**";
    systemPackage.resourceLibraries[0].entries[0].fields.领域 = ":red[利刃]";
    renderModuleDemo(systemPackage);

    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));

    expect(screen.getByText("烈焰").tagName).toBe("STRONG");
    expect(screen.getByText("利刃")).toHaveAttribute("data-markdown-color", "red");
  });

  it("places each Resource Library column's sort and filter controls before its field label", () => {
    renderModuleDemo(createResourcePickerPackage());
    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));

    const filterButton = screen.getByRole("button", { name: "筛选领域" });
    const header = filterButton.closest(".resource-column-header");
    const label = header?.querySelector(":scope > span");
    expect(header?.firstElementChild).toHaveClass("resource-column-tools");
    expect(label).toHaveTextContent("领域");
    expect(filterButton.compareDocumentPosition(label!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

  });

  it("centers columns whose complete Library values are at most ten Unicode characters", () => {
    const systemPackage = createResourcePickerPackage({ defaultFilters: { 领域: ["利刃"] } });
    systemPackage.resourceLibraries[0].entries[0].fields.名称 = "1234567890";
    systemPackage.resourceLibraries[0].entries[1].fields.领域 = "12345678901";
    renderModuleDemo(systemPackage);

    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));

    const shortHeader = screen.getByRole("columnheader", { name: "卡名" });
    const longHeader = screen.getByRole("columnheader", { name: "领域" });
    expect(shortHeader).toHaveClass("resource-table-cell-centered");
    expect(within(shortHeader.closest("table")!).getByText("1234567890").closest("td")).toHaveClass("resource-table-cell-centered");
    expect(longHeader).not.toHaveClass("resource-table-cell-centered");
    expect(screen.queryByText("12345678901")).not.toBeInTheDocument();
  });

  it("supports Resource Picker multi-select and default Resource Library filters", () => {
    renderModuleDemo(createResourcePickerPackage({ multiSelect: true, defaultFilters: { 领域: ["骸骨"] } }));

    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));

    expect(screen.queryByLabelText("选择 烈焰")).not.toBeInTheDocument();
    expect(screen.getByLabelText("选择 幽影")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "筛选领域" }));
    fireEvent.click(screen.getByLabelText("骸骨"));
    fireEvent.click(screen.getByLabelText("选择 幽影"));
    fireEvent.click(screen.getByLabelText("选择 烈焰"));
    fireEvent.click(screen.getByRole("button", { name: "确认选择" }));

    const values = useRuntimeStore.getState().characterData?.character.values;
    expect(values?.["domain-name"]).toBe("幽影、烈焰");
    expect(screen.getByRole("button", { name: "领域名" })).toHaveTextContent("幽影、烈焰");
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
    fireEvent.click(screen.getByRole("button", { name: "筛选领域" }));
    fireEvent.click(screen.getByLabelText("利刃"));
    expect(screen.getByLabelText("选择 幽影")).toBeVisible();
  });

  it("switches linked Resource Libraries with independent fields and transient queries", () => {
    const systemPackage = createMultiResourcePickerPackage();
    renderModuleDemo(systemPackage);

    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));
    const librarySelect = screen.getByRole("combobox", { name: "选择资源库" });
    const search = screen.getByRole("searchbox", { name: "搜索资源库" });

    expect(librarySelect).toHaveValue("domains");
    expect(screen.getByRole("columnheader", { name: "卡名" })).toBeVisible();
    expect(screen.getByLabelText("选择 烈焰")).toBeVisible();
    expect(screen.queryByLabelText("选择 幽影")).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "烈" } });

    fireEvent.change(librarySelect, { target: { value: "weapons" } });
    expect(screen.getByRole("columnheader", { name: "武器名" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "类型" })).toBeVisible();
    expect(screen.queryByRole("columnheader", { name: "等级" })).not.toBeInTheDocument();
    expect(search).toHaveValue("");
    expect(screen.getByLabelText("选择 长弓")).toBeVisible();
    expect(screen.queryByLabelText("选择 长剑")).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "长" } });

    fireEvent.change(librarySelect, { target: { value: "domains" } });
    expect(search).toHaveValue("烈");
    fireEvent.change(librarySelect, { target: { value: "weapons" } });
    expect(search).toHaveValue("长");
    fireEvent.click(screen.getByLabelText("选择 长弓"));

    expect(useRuntimeStore.getState().characterData?.resourceSelections?.["domain-picker"]).toEqual({
      libraryId: "weapons",
      entryIds: ["bow-1"],
    });
    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));
    expect(screen.getByRole("searchbox", { name: "搜索资源库" })).toHaveValue("");
  });

  it("lets an Author-defined Other Resources Picker expose only standalone unlinked Extension Libraries", () => {
    const systemPackage = createMultiResourcePickerPackage();
    systemPackage.resourceLibraries?.push({
      ID: "transformations", 名称: "转变", 路径: "resource-extension:test/transformations",
      fields: [
        { key: "ID", label: "ID", visible: false, filterable: false, sortable: false, searchable: false },
        { key: "名称", label: "名称", visible: true, filterable: true, sortable: true, searchable: true },
      ],
      entries: [{ ID: "void-form", fields: { ID: "void-form", 名称: "虚空化" } }],
    });
    systemPackage.modules.push({
      ID: "pick-other",
      类型: "resourcePicker",
      按钮文本: "选择其他资源",
      资源库: "其他",
      创建卡牌: { 卡牌桌面模块ID: "other-card-table", 默认状态: "配置" },
    });
    systemPackage.modules.push({
      ID: "other-card-table",
      类型: "cardTable",
      标签: "其他资源卡牌",
      资源来源: [{ 类型: "otherResourceLibraries", ID: "其他" }],
      状态选项: ["配置"],
      显示方式: "text",
    });
    systemPackage.pages[0].layout.htmlContent += '<pb-module id="pick-other"></pb-module><pb-module id="other-card-table"></pb-module>';
    renderModuleDemo(systemPackage);

    fireEvent.click(screen.getByRole("button", { name: "选择其他资源" }));
    expect(screen.getByRole("dialog", { name: "转变资源库" })).toBeVisible();
    expect(screen.getByLabelText("选择 虚空化")).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "选择资源库" })).not.toBeInTheDocument();
    expect(screen.queryByText("烈焰")).not.toBeInTheDocument();
    expect(screen.queryByText("长弓")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("选择 虚空化"));
    expect(screen.getByRole("article", { name: "虚空化" })).toBeVisible();
    expect(useRuntimeStore.getState().characterData?.cards.instances[0]).toMatchObject({
      tableModuleId: "other-card-table",
      definitionRef: { type: "resourceLibrary", libraryId: "transformations", entryId: "void-form" },
    });
  });
});
