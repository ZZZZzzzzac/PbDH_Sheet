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

describe("Simple Sheet Module rendering", () => {
  beforeEach(() => {
    resetModuleRegistryTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the core Sheet Module set through SheetRenderer", () => {
    renderModuleDemo(moduleDemoSystemPackage, { "assets/demo-emblem.svg": "data:image/svg+xml;base64,PHN2Zy8+" });

    expect(screen.getByLabelText("姓名")).toBeVisible();
    expect(screen.getByLabelText("背景")).toBeVisible();
    expect(screen.getByRole("group", { name: "标记" })).toBeVisible();
    expect(screen.getByLabelText("气力")).toHaveValue("3");
    expect(screen.getByText("只读展示模块不会写入 Character Data。这里适合放规则提示、检查清单或静态说明。")).toBeVisible();
    expect(screen.getByAltText("Sheet Module 示例徽记")).toBeVisible();
    expect(screen.getByRole("button", { name: "上传头像" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "上传图片" })).not.toBeInTheDocument();
    const freeText = screen.getByLabelText("姓名").closest('[data-module-type="freeText"]');
    expect(freeText).toHaveAttribute("data-module-id", "character-name");
    expect(freeText).toHaveAttribute("data-part", "container");
    expect(screen.getByLabelText("姓名")).toHaveAttribute("data-part", "input");
  });

  it("renders HTML Layout Template content and module slots", () => {
    const result = renderModuleDemo(moduleDemoSystemPackage, { "demo-emblem": "data:image/svg+xml;base64,PHN2Zy8+" });

    expect(result.container.querySelector(".demo-sheet")).not.toBeNull();
    expect(result.container.querySelector(".identity")).not.toBeNull();
    expect(result.container.querySelector('[data-module-slot-id="background"]')).not.toBeNull();
    expect(result.container.querySelector('[data-module-slot-id="character-name"]')).toHaveAttribute("data-module-slot-type", "freeText");
    expect(result.container.querySelector("style")?.textContent).toContain('[data-template-page-id="main"] .identity');
  });

  it("resolves static HTML and CSS image paths through package asset URLs", () => {
    const systemPackage = {
      ...moduleDemoSystemPackage,
      pages: [{
        ...moduleDemoSystemPackage.pages[0],
        layout: {
          ...moduleDemoSystemPackage.pages[0].layout,
          htmlContent: '<main class="art"><img src="assets/demo-emblem.svg" alt="静态徽记"><pb-module id="character-name"></pb-module></main>',
          cssContent: '.art { background-image: url("assets/demo-emblem.svg"); }',
        },
      }],
    };
    renderModuleDemo(systemPackage, { "assets/demo-emblem.svg": "blob:demo-emblem" });
    expect(screen.getByAltText("静态徽记")).toHaveAttribute("src", "blob:demo-emblem");
    expect(document.querySelector("style")?.textContent).toContain('url("blob:demo-emblem")');
  });

  it("applies the default System Package Skin after scoped Base Layout CSS", () => {
    const systemPackage: SystemPackage = {
      ...moduleDemoSystemPackage,
      defaultSkin: "plain",
      skins: [{
        ID: "plain",
        名称: "简洁",
        cssContent: ':is(.demo-sheet, .identity) { background-image: url("assets/demo-emblem.svg"); color: #123456; }',
        推荐框架配色: "light",
      }],
    };

    const result = renderModuleDemo(systemPackage, { "assets/demo-emblem.svg": "blob:skin-emblem" });
    const sheetTool = result.container.querySelector(".sheet-tool");
    const styles = [...result.container.querySelectorAll("style")].map((style) => style.textContent ?? "");

    expect(sheetTool).toHaveAttribute("data-system-package-id", "demo");
    expect(styles.at(-1)).toContain('[data-system-package-id="demo"] :is(.demo-sheet, .identity)');
    expect(styles.at(-1)).toContain('url("blob:skin-emblem")');
  });

  it("uses a default Skin Page override and falls back for omitted Pages", () => {
    const basePage = moduleDemoSystemPackage.pages[0];
    const systemPackage: SystemPackage = {
      ...moduleDemoSystemPackage,
      defaultSkin: "editorial",
      skins: [{
        ID: "editorial",
        名称: "编排版",
        cssContent: ".override-sheet { display: grid; }",
        推荐框架配色: "light",
        layoutOverrides: {
          pages: [{ ID: basePage.ID, htmlContent: basePage.layout.htmlContent.replace("demo-sheet", "override-sheet") }],
        },
      }],
    };

    const result = renderModuleDemo(systemPackage);

    expect(result.container.querySelector(".override-sheet")).not.toBeNull();
    expect(result.container.querySelector(".demo-sheet")).toBeNull();
    expect(screen.getByLabelText("姓名")).toBeVisible();
  });

  it("updates editable module state by module ID and leaves read-only display unstored", () => {
    renderModuleDemo();

    fireEvent.click(screen.getByRole("button", { name: "背景" }));
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

  it("switches Free Text and Long Text between raw editing and rendered Markdown", () => {
    renderModuleDemo();
    const nameInput = screen.getByLabelText("姓名");

    fireEvent.focus(nameInput);
    fireEvent.change(nameInput, { target: { value: "**勇者**" } });
    expect(nameInput).toHaveValue("**勇者**");
    fireEvent.blur(nameInput);
    expect(screen.getByText("勇者").tagName).toBe("STRONG");
    expect(screen.getByRole("button", { name: "姓名" })).toHaveAttribute("data-part", "input");
    expect(screen.queryByDisplayValue("**勇者**")).not.toBeInTheDocument();

    const namePreview = screen.getByRole("button", { name: "姓名" });
    fireEvent.keyDown(namePreview, { key: "Enter" });
    expect(screen.getByLabelText("姓名")).toHaveValue("**勇者**");

    fireEvent.click(screen.getByRole("button", { name: "背景" }));
    const backgroundInput = screen.getByLabelText("背景");
    fireEvent.focus(backgroundInput);
    fireEvent.change(backgroundInput, { target: { value: "- 第一项\n- 第二项" } });
    fireEvent.blur(backgroundInput);
    const backgroundModule = screen.getByRole("button", { name: "背景" });
    expect(backgroundModule.querySelectorAll("li")).toHaveLength(2);
    expect(useRuntimeStore.getState().characterData?.character.values.background).toBe("- 第一项\n- 第二项");
  });

  it("shows an image fallback when the package asset has no resolved URL", () => {
    renderModuleDemo();

    expect(screen.getByRole("img", { name: "Sheet Module 示例徽记" })).toHaveTextContent("图片不可用");
  });

  it("lets the player edit the countable resource max when configured", () => {
    const result = renderModuleDemo();

    const countableModule = result.container.querySelector<HTMLElement>('[data-module-id="vitality"]')!;
    const maxInput = screen.getByLabelText("气力上限");
    expect(maxInput).toHaveValue("6");
    expect(countableModule.style.getPropertyValue("--countable-identifier-font-size")).toBe("18px");
    expect(countableModule.style.getPropertyValue("--countable-stepper-font-size")).toBe("20px");

    fireEvent.change(maxInput, { target: { value: "10" } });
    expect(screen.getByRole("button", { name: "气力增加" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));

    const values = useRuntimeStore.getState().characterData?.character.values;
    expect(values?.vitality).toEqual({ current: 7, max: 10 });
    const counter = result.container.querySelector('[data-module-id="vitality"] [data-part="counter"]');
    expect([...counter!.children].map((child) => child.getAttribute("data-part"))).toEqual([
      "decrement-button",
      "value-group",
      "increment-button",
    ]);
    expect(counter?.querySelector('[data-part="value-group"]')).toContainElement(maxInput);
  });

  it("renders Marker Presentation and changes current by the configured step", () => {
    const markerPackage: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "vitality" && module.类型 === "countableResource"
        ? { ...module, 显示方式: "标记", 当前值标记: "❤️", 剩余值标记: "🖤", 步长: 2 }
        : module),
    };

    const result = renderModuleDemo(markerPackage);
    const markerModule = result.container.querySelector('[data-module-id="vitality"]')!;

    expect(within(markerModule as HTMLElement).queryByLabelText("气力")).not.toBeInTheDocument();
    expect(markerModule.querySelector('[data-part="current-markers"]')).toHaveTextContent("❤️❤️❤️");
    expect(markerModule.querySelector('[data-part="remaining-markers"]')).toHaveTextContent("🖤🖤🖤");
    expect(markerModule.querySelectorAll('[data-part="marker"]')).toHaveLength(6);
    expect(markerModule.querySelector('[data-part="marker-group"]')).toHaveAccessibleName("气力：当前值 3，上限 6");
    expect((markerModule as HTMLElement).style.getPropertyValue("--countable-identifier-font-size")).toBe("18px");
    expect((markerModule as HTMLElement).style.getPropertyValue("--countable-stepper-font-size")).toBe("20px");

    fireEvent.click(within(markerModule as HTMLElement).getByRole("button", { name: "气力增加" }));

    expect(useRuntimeStore.getState().characterData?.character.values.vitality).toEqual({ current: 5, max: 6 });
    expect(markerModule.querySelector('[data-part="current-markers"]')).toHaveTextContent("❤️❤️❤️❤️❤️");
    expect(markerModule.querySelector('[data-part="remaining-markers"]')).toHaveTextContent("🖤");
  });

  it("preserves stylesheet font defaults when Countable Resource sizes are omitted", () => {
    const packageWithoutFontSizes: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "vitality" && module.类型 === "countableResource"
        ? { ...module, 标识字号: undefined, 加减号字号: undefined }
        : module),
    };

    const result = renderModuleDemo(packageWithoutFontSizes);
    const countableModule = result.container.querySelector<HTMLElement>('[data-module-id="vitality"]')!;

    expect(countableModule.style.getPropertyValue("--countable-identifier-font-size")).toBe("");
    expect(countableModule.style.getPropertyValue("--countable-stepper-font-size")).toBe("");
  });

  it("edits a finite Marker Presentation maximum with right-click and keeps state valid", () => {
    const markerPackage: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "vitality" && module.类型 === "countableResource"
        ? { ...module, 显示方式: "标记", 当前值标记: "❤️", 剩余值标记: "🖤", 步长: 2 }
        : module),
    };

    renderModuleDemo(markerPackage);
    const increment = screen.getByRole("button", { name: "气力增加" });
    const decrement = screen.getByRole("button", { name: "气力减少" });

    fireEvent.contextMenu(increment);
    expect(useRuntimeStore.getState().characterData?.character.values.vitality).toEqual({ current: 3, max: 8 });

    fireEvent.contextMenu(decrement);
    fireEvent.contextMenu(decrement);
    fireEvent.contextMenu(decrement);
    expect(useRuntimeStore.getState().characterData?.character.values.vitality).toEqual({ current: 2, max: 2 });
    expect(increment).not.toBeDisabled();
  });

  it("treats touch long-press as maximum editing and suppresses the follow-up click", () => {
    vi.useFakeTimers();
    const markerPackage: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "vitality" && module.类型 === "countableResource"
        ? { ...module, 显示方式: "标记", 当前值标记: "❤️", 剩余值标记: "🖤", 步长: 2 }
        : module),
    };

    renderModuleDemo(markerPackage);
    const increment = screen.getByRole("button", { name: "气力增加" });

    fireEvent.pointerDown(increment, { pointerId: 1, pointerType: "touch", clientX: 10, clientY: 10 });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerUp(increment, { pointerId: 1, pointerType: "touch", clientX: 10, clientY: 10 });
    fireEvent.click(increment);

    expect(useRuntimeStore.getState().characterData?.character.values.vitality).toEqual({ current: 3, max: 8 });
  });

  it("cancels touch maximum editing when the pointer moves before the long-press threshold", () => {
    vi.useFakeTimers();
    const markerPackage: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "vitality" && module.类型 === "countableResource"
        ? { ...module, 显示方式: "标记", 当前值标记: "❤️", 剩余值标记: "🖤", 步长: 2 }
        : module),
    };

    renderModuleDemo(markerPackage);
    const increment = screen.getByRole("button", { name: "气力增加" });
    fireEvent.pointerDown(increment, { pointerId: 1, pointerType: "touch", clientX: 10, clientY: 10 });
    fireEvent.pointerMove(increment, { pointerId: 1, pointerType: "touch", clientX: 30, clientY: 10 });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerUp(increment, { pointerId: 1, pointerType: "touch", clientX: 30, clientY: 10 });
    fireEvent.click(increment);

    expect(useRuntimeStore.getState().characterData?.character.values.vitality).toEqual({ current: 5, max: 6 });
  });

  it("fits Marker Presentation inside a fixed-height region and exposes overflow fallback", async () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.dataset.part === "marker-group" ? 28 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.dataset.part === "marker-group" ? 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.dataset.part === "marker-group" ? 56 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.dataset.part === "marker-group" ? 200 : 0;
    });
    const markerPackage: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "vitality" && module.类型 === "countableResource"
        ? { ...module, 显示方式: "标记", 当前值标记: "❤️", 剩余值标记: "🖤" }
        : module),
    };

    const result = renderModuleDemo(markerPackage);
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

    expect(result.container.querySelector('[data-part="marker-group"]')).toHaveAttribute("data-text-fit", "overflow");
  });

  it("renders grouped checkbox options as multiple independent inputs with one visible description", () => {
    const packageWithGroupedOptions: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "conditions" && module.类型 === "checkboxResource"
        ? {
            ...module,
            选项: [
              { ID: "mark-1", 标签: "共享说明", 分组: "marks" },
              { ID: "mark-2", 标签: "共享说明", 分组: "marks" },
            ],
          }
        : module),
    };
    const result = renderModuleDemo(packageWithGroupedOptions);

    expect(screen.getAllByText("共享说明")).toHaveLength(1);
    expect(screen.getByLabelText("共享说明 1")).not.toBeChecked();
    expect(screen.getByLabelText("共享说明 2")).not.toBeChecked();
    fireEvent.click(screen.getByLabelText("共享说明 1"));
    expect(screen.getByLabelText("共享说明 1")).toBeChecked();
    expect(screen.getByLabelText("共享说明 2")).not.toBeChecked();
    expect(result.container.querySelector('[data-option-group="marks"] [data-part="option-label"]')).toHaveTextContent("共享说明");
  });

  it("uses the image surface for replacement and provides a separate removal control", () => {
    const removePlayerImage = vi.fn(async () => {});
    renderModuleDemo();
    const current = useRuntimeStore.getState().characterData!;
    act(() => {
      useRuntimeStore.setState({
        characterData: updatePlayerImage(current, "portrait", {
          id: "portrait-test", name: "portrait.png", mimeType: "image/png", dataUrl: "data:image/png;base64,AA==",
        }),
        removePlayerImage,
      });
    });

    expect(screen.getByRole("button", { name: "更换头像" })).toBeVisible();
    expect(screen.getByRole("img", { name: "角色头像" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "移除头像" }));
    expect(removePlayerImage).toHaveBeenCalledWith("portrait");

  });

  it("hides text labels and renders placeholders while preserving accessible names", () => {
    const packageWithPresentationOptions: SystemPackage = {
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
    };

    renderModuleDemo(packageWithPresentationOptions);

    const nameInput = screen.getByLabelText("姓名");
    fireEvent.click(screen.getByRole("button", { name: "背景" }));
    const backgroundInput = screen.getByLabelText("背景");
    expect(nameInput).toHaveAttribute("placeholder", "请输入姓名");
    expect(backgroundInput).toHaveAttribute("placeholder", "请输入背景");
    expect(nameInput.closest('[data-module-type="freeText"]')?.querySelector('[data-part="label"]')).toBeNull();
    expect(backgroundInput.closest('[data-module-type="longText"]')?.querySelector('[data-part="label"]')).toBeNull();
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("");
    expect(useRuntimeStore.getState().characterData?.character.values.background).toBe("写下角色的来历。");
  });

  it("treats an empty text label as hidden and lets a freeText input fill the container", () => {
    const packageWithEmptyLabels: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => {
        if (module.ID === "character-name" && module.类型 === "freeText") {
          return { ...module, 标签: "", 占位文本: "请输入姓名" };
        }
        if (module.ID === "background" && module.类型 === "longText") {
          return { ...module, 标签: "", 占位文本: "请输入背景" };
        }
        return module;
      }),
    };

    const result = renderModuleDemo(packageWithEmptyLabels);

    const nameInput = screen.getByLabelText("请输入姓名");
    fireEvent.click(screen.getByRole("button", { name: "请输入背景" }));
    const backgroundInput = screen.getByLabelText("请输入背景");
    const nameContainer = nameInput.closest('[data-module-type="freeText"]');
    expect(nameContainer).toHaveAttribute("data-label-hidden", "true");
    expect(backgroundInput.closest('[data-module-type="longText"]')).toHaveAttribute("data-label-hidden", "true");
    expect(nameContainer?.querySelector('[data-part="label"]')).toBeNull();
    expect(backgroundInput.closest('[data-module-type="longText"]')?.querySelector('[data-part="label"]')).toBeNull();
    expect(result.container.querySelector('[data-module-id="character-name"] input')).toHaveAttribute("placeholder", "请输入姓名");
  });

  it("renders Free Text string options as a dropdown and stores one selected string", () => {
    const dropdownPackage: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "character-name" && module.类型 === "freeText"
        ? { ...module, 选项: ["战士", "法师", "游侠"], 占位文本: "请选择职业" }
        : module),
    };

    const result = renderModuleDemo(dropdownPackage);
    const select = screen.getByRole("combobox", { name: "姓名" });
    const options = within(select).getAllByRole("option");

    expect(select).toHaveValue("");
    expect(options.map((option) => option.textContent)).toEqual(["请选择职业", "战士", "法师", "游侠"]);
    expect(options[0]).toBeDisabled();
    expect(select).toHaveAttribute("data-part", "input");
    expect(select.closest('[data-module-type="freeText"]')).toHaveAttribute("data-free-text-mode", "select");
    expect(result.container.querySelector('[data-module-id="character-name"] [data-markdown-preview]')).toBeNull();

    fireEvent.change(select, { target: { value: "法师" } });

    expect(select).toHaveValue("法师");
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("法师");
  });

  it("uses the Free Text dropdown default and hidden-label accessible fallback", () => {
    const dropdownPackage: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "character-name" && module.类型 === "freeText"
        ? { ...module, 标签: "", 占位文本: "选择职业", 选项: ["战士", "法师"], 默认值: "战士" }
        : module),
    };

    const result = renderModuleDemo(dropdownPackage);
    const select = screen.getByRole("combobox", { name: "选择职业" });

    expect(select).toHaveValue("战士");
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("战士");
    expect(select.closest('[data-module-id="character-name"]')?.querySelector('[data-part="label"]')).toBeNull();
    expect(result.container.querySelector('[data-module-id="character-name"] input')).toBeNull();
  });

  it("preserves and displays a Free Text dropdown value outside the current option list", () => {
    const dropdownPackage: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "character-name" && module.类型 === "freeText"
        ? { ...module, 选项: ["战士", "法师"] }
        : module),
    };

    renderModuleDemo(dropdownPackage);
    act(() => useRuntimeStore.getState().updateModuleValue("character-name", "旧版职业"));
    const select = screen.getByRole("combobox", { name: "姓名" });
    const legacyOption = within(select).getByRole("option", { name: "旧版职业" });

    expect(select).toHaveValue("旧版职业");
    expect(legacyOption).toBeDisabled();
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("旧版职业");

    fireEvent.change(select, { target: { value: "法师" } });
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("法师");
  });

  it("gives Long Text a fixed row height and automatically fits its Markdown preview", async () => {
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ fontSize: "16px" } as CSSStyleDeclaration);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-module-id="background"] [data-markdown-preview]') ? 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-module-id="background"] [data-markdown-preview]') ? 200 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (!this.matches('[data-module-id="background"] [data-markdown-preview]')) return 0;
      return Number.parseFloat(this.style.fontSize || "16") <= 10 ? 80 : 200;
    });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-module-id="background"] [data-markdown-preview]') ? 200 : 0;
    });

    const result = renderModuleDemo();
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

    const container = result.container.querySelector<HTMLElement>('[data-module-id="background"]');
    const preview = container?.querySelector<HTMLElement>('[data-markdown-preview]');
    expect(container?.style.getPropertyValue("--long-text-rows")).toBe("5");
    expect(preview).toHaveAttribute("data-text-fit", "fitted");
    expect(Number.parseFloat(preview?.style.fontSize ?? "0")).toBeLessThanOrEqual(10);
  });

  it("automatically fits a Free Text Markdown preview to its single-line width", async () => {
    const packageWithLongName: SystemPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) => module.ID === "character-name" && module.类型 === "freeText"
        ? { ...module, 默认值: "一个很长很长的角色姓名" }
        : module),
    };
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ fontSize: "16px" } as CSSStyleDeclaration);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-module-id="character-name"] [data-markdown-preview]') ? 30 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-module-id="character-name"] [data-markdown-preview]') ? 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-module-id="character-name"] [data-markdown-preview] p') ? 20 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
      if (!this.matches('[data-module-id="character-name"] [data-markdown-preview] p')) return 0;
      const preview = this.closest<HTMLElement>('[data-markdown-preview]');
      return Number.parseFloat(preview?.style.fontSize || "16") <= 10 ? 90 : 200;
    });

    const result = renderModuleDemo(packageWithLongName);
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

    const preview = result.container.querySelector<HTMLElement>('[data-module-id="character-name"] [data-markdown-preview]');
    expect(preview).toHaveAttribute("data-text-fit", "fitted");
    expect(Number.parseFloat(preview?.style.fontSize ?? "0")).toBeLessThanOrEqual(10);
  });
});
