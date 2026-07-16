import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
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
    cardTableCardWidths: {},
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
      cardTableCardWidths: {},
      bootStatus: "idle",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });
  });

  it("renders the phase 5 simple module set through SheetRenderer", () => {
    renderModuleDemo(moduleDemoSystemPackage, { "assets/demo-emblem.svg": "data:image/svg+xml;base64,PHN2Zy8+" });

    expect(screen.getByLabelText("姓名")).toBeVisible();
    expect(screen.getByLabelText("背景")).toBeVisible();
    expect(screen.getByRole("group", { name: "标记" })).toBeVisible();
    expect(screen.getByLabelText("气力")).toHaveValue("3");
    expect(screen.getByText("只读展示模块不会写入 Character Data。这里适合放规则提示、检查清单或静态说明。")).toBeVisible();
    expect(screen.getByAltText("阶段5示例徽记")).toBeVisible();
    expect(screen.getByRole("button", { name: "上传头像" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "上传图片" })).not.toBeInTheDocument();
    const freeText = screen.getByLabelText("姓名").closest('[data-module-type="freeText"]');
    expect(freeText).toHaveAttribute("data-module-id", "character-name");
    expect(freeText).toHaveAttribute("data-part", "container");
    expect(screen.getByLabelText("姓名")).toHaveAttribute("data-part", "input");
    const compactModuleStyles = readFileSync("src/styles/modules.css", "utf8");
    expect(compactModuleStyles).toMatch(/\.container\s*\{[^}]*min-height:\s*32px/s);
    expect(compactModuleStyles).toMatch(/\.input\s*\{[^}]*min-height:\s*30px[^}]*font-size:\s*0\.92rem/s);
    expect(compactModuleStyles).toMatch(/\.textarea\s*\{[^}]*min-height:\s*48px[^}]*line-height:\s*1\.2/s);
  });

  it("renders HTML Layout Template content and module slots", () => {
    const result = renderModuleDemo(moduleDemoSystemPackage, { "demo-emblem": "data:image/svg+xml;base64,PHN2Zy8+" });

    expect(result.container.querySelector(".demo-sheet")).not.toBeNull();
    expect(result.container.querySelector(".identity")).not.toBeNull();
    expect(result.container.querySelector('[data-module-slot-id="background"]')).not.toBeNull();
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

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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

    expect(screen.getByRole("img", { name: "阶段5示例徽记" })).toHaveTextContent("图片不可用");
  });

  it("lets the player edit the countable resource max when configured", () => {
    const result = renderModuleDemo();

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

    fireEvent.click(within(markerModule as HTMLElement).getByRole("button", { name: "气力增加" }));

    expect(useRuntimeStore.getState().characterData?.character.values.vitality).toEqual({ current: 5, max: 6 });
    expect(markerModule.querySelector('[data-part="current-markers"]')).toHaveTextContent("❤️❤️❤️❤️❤️");
    expect(markerModule.querySelector('[data-part="remaining-markers"]')).toHaveTextContent("🖤");
    const styles = readFileSync("src/styles/countable-resource.css", "utf8");
    expect(styles).toMatch(/\.marker-cell\s*\{[^}]*flex:\s*0 0 1\.25em[^}]*width:\s*1\.25em[^}]*justify-content:\s*center/s);
    expect(styles).toContain('[data-countable-print-strategy="clear-uniform-squares"]');
    expect(styles).not.toContain('[data-countable-print-strategy="clear-current"]');
    expect(styles).not.toContain('[data-countable-print-strategy="uniform-squares"]');
    expect(styles).toMatch(/flex:\s*0 0 5\.8mm[^}]*width:\s*5\.8mm[^}]*height:\s*5\.8mm/s);
    expect(styles).toMatch(/\.marker-glyph\s*\{[^}]*display:\s*none/s);
    expect(styles).toMatch(/\.marker-cell::before\s*\{[^}]*content:\s*"□"[^}]*font-size:\s*5\.5mm[^}]*line-height:\s*1/s);
    expect(styles).not.toMatch(/\.marker-cell::before\s*\{[^}]*border:/s);
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

    expect(result.container.querySelector('[data-part="marker-group"]')).toHaveAttribute("data-marker-fit", "overflow");
    const styles = readFileSync("src/styles/countable-resource.css", "utf8");
    expect(styles).toMatch(/\.marker-group\s*\{[^}]*align-content:\s*center[^}]*align-items:\s*center[^}]*justify-content:\s*center[^}]*height:\s*28px[^}]*overflow:\s*hidden/s);
    expect(styles).toMatch(/\[data-marker-fit="overflow"\]\s*\{[^}]*overflow-x:\s*auto[^}]*white-space:\s*nowrap/s);
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

    const imageStyles = readFileSync("src/styles/image-field.css", "utf8");
    expect(imageStyles).toMatch(/\.image\s*\{[^}]*box-sizing:\s*border-box[^}]*width:\s*100%[^}]*height:\s*100%[^}]*margin:\s*0/s);
    expect(imageStyles).toMatch(/\.image-preview\s*\{[^}]*position:\s*absolute[^}]*height:\s*100%[^}]*object-fit:\s*contain/s);
    expect(imageStyles).not.toMatch(/\.image-preview\s*\{[^}]*(?:min-height|max-height):/s);
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
    const moduleStyles = readFileSync("src/styles/modules.css", "utf8");
    expect(moduleStyles).toMatch(/\.container\[data-label-hidden="true"\]\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
    expect(result.container.querySelector('[data-module-id="character-name"] input')).toHaveAttribute("placeholder", "请输入姓名");
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

  it("supports Resource Picker multi-select and default Resource Library filters", () => {
    renderModuleDemo(createResourcePickerPackage({ multiSelect: true, defaultFilters: { 领域: ["骸骨"] } }));

    fireEvent.click(screen.getByRole("button", { name: "选择领域" }));

    expect(screen.queryByLabelText("选择 烈焰")).not.toBeInTheDocument();
    expect(screen.getByLabelText("选择 幽影")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "筛选领域" }));
    fireEvent.click(screen.getByLabelText("骸骨"));
    fireEvent.click(screen.getByLabelText("选择 烈焰"));
    fireEvent.click(screen.getByLabelText("选择 幽影"));
    fireEvent.click(screen.getByRole("button", { name: "确认选择" }));

    const values = useRuntimeStore.getState().characterData?.character.values;
    expect(values?.["domain-name"]).toBe("烈焰、幽影");
    expect(screen.getByRole("button", { name: "领域名" })).toHaveTextContent("烈焰、幽影");
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

  it("renders text cards with recall in the tag row above the description", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "card-instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
    });
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      packageAssetUrls: {},
      characterData,
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

    const result = render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "回想测试" });
    const tagRow = card.querySelector(".play-card-tags");

    expect(tagRow).not.toBeNull();
    expect(tagRow).toHaveTextContent("贤者");
    expect(tagRow).toHaveTextContent("1");
    expect(card.querySelector(".play-card-recall")).toBeNull();
    expect(result.container.querySelector(".play-card-description")).toHaveTextContent("描述应该独立显示。");
  });

  it("renders Restricted Markdown in Card names, descriptions, inferred tags, and Card Detail", () => {
    const systemPackage = createCardTablePackage();
    const definition = systemPackage.resourceLibraries[0].entries[0];
    definition.fields.名称 = "**回想测试**";
    definition.fields.领域 = ":purple[贤者]";
    definition.fields.描述 = "*描述*\n\n- 第一项\n- 第二项";
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "markdown-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: definition.ID,
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    const result = render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "**回想测试**" });
    expect(within(card).getByText("回想测试").tagName).toBe("STRONG");
    expect(within(card).getByText("贤者")).toHaveAttribute("data-markdown-color", "purple");
    expect(within(card).getByText("描述").tagName).toBe("EM");
    expect(card.querySelectorAll(".play-card-description li")).toHaveLength(2);

    fireEvent.contextMenu(card);
    const contextMenu = screen.getByRole("menu");
    expect(contextMenu.parentElement).toBe(document.body);
    expect(result.container.querySelector(".card-table-surface")?.contains(contextMenu)).toBe(false);
    fireEvent.click(screen.getByRole("menuitem", { name: "查看详情" }));
    const dialog = screen.getByRole("dialog", { name: "**回想测试**详情" });
    expect(within(dialog).getByText("回想测试").tagName).toBe("STRONG");
    expect(result.container.querySelector(".card-context-menu strong")).toBeNull();
  });

  it("uses the same Restricted Markdown output after Card artwork fails", () => {
    const systemPackage = createCardTablePackage();
    const definition = systemPackage.resourceLibraries[0].entries[0];
    definition.fields.名称 = "**故障回退**";
    definition.fields.卡图 = "assets/cards/failure.png";
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "image-fallback-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: definition.ID,
    });
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      packageAssetUrls: { "assets/cards/failure.png": "blob:failure" },
      characterData,
    });

    render(<SheetRenderer systemPackage={systemPackage} />);
    fireEvent.error(screen.getByRole("img", { name: "**故障回退**" }));

    expect(screen.getByText("故障回退").tagName).toBe("STRONG");
  });

  it("resolves Card artwork from the owning Resource Extension namespace", () => {
    const basePackage = createCardTablePackage();
    const loaded = loadResourceExtensionJson(JSON.stringify({
      ID: "void", 名称: "虚空", 版本: "1", 目标系统包ID: basePackage.manifest.ID,
      resourceLibraries: [{ ID: "domain-cards", 名称: "领域卡", entries: [{
        ID: "extension-card", 名称: "扩展卡", 描述: "扩展描述", 卡图: "assets/cards/shared.png",
      }] }],
    }), basePackage.manifest.ID);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    const catalog = createEffectiveResourceCatalog(basePackage, [loaded.extension]);
    const systemPackage = applyEffectiveResourceCatalog(basePackage, catalog);
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "extension-instance",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "extension-card",
    });
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      resourceCatalog: catalog,
      packageAssetUrls: { [resourceAssetUrlKey("resourceExtension", "void", "assets/cards/shared.png")]: "blob:void-card" },
      characterData,
    });

    render(<SheetRenderer systemPackage={systemPackage} />);
    expect(screen.getByRole("img", { name: "扩展卡" })).toHaveAttribute("src", "blob:void-card");
  });

  it("marks descriptions that still overflow at 9px without shrinking names, tags, or Card Detail", async () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("play-card-description") ? 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("play-card-description") ? 200 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("play-card-description") ? 200 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("play-card-description") ? 200 : 0;
    });
    const systemPackage = createCardTablePackage();
    const definition = systemPackage.resourceLibraries[0].entries[0];
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "overflow-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: definition.ID,
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    render(<SheetRenderer systemPackage={systemPackage} />);
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

    const card = screen.getByRole("article", { name: "回想测试" });
    const description = card.querySelector<HTMLElement>(".play-card-description");
    expect(description).toHaveStyle({ fontSize: "9px" });
    expect(description).toHaveAttribute("data-card-description-fit", "overflow");
    expect(card.querySelector<HTMLElement>(".play-card-name")?.style.fontSize).toBe("");
    expect(card.querySelector<HTMLElement>(".play-card-tag")?.style.fontSize).toBe("");
    expect(within(card).getByRole("img", { name: "卡牌描述未完全显示；查看卡牌详情可阅读完整内容" })).toBeVisible();

    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "查看详情" }));
    const dialog = screen.getByRole("dialog", { name: "回想测试详情" });
    expect(dialog.querySelector<HTMLElement>(".play-card-description")?.style.fontSize).toBe("");
    expect(within(dialog).queryByRole("img", { name: "卡牌描述未完全显示；查看卡牌详情可阅读完整内容" })).toBeNull();
  });

  it("resolves colliding Card Definition IDs from each instance's Resource Library", () => {
    const systemPackage = createCardTablePackage();
    const first = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "domain-instance",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
    });
    const characterData = createCardInstance(first, {
      instanceId: "ancestry-instance",
      tableModuleId: "domain-card-table",
      libraryId: "ancestry-cards",
      definitionId: "domain-card:recall-test",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    render(<SheetRenderer systemPackage={systemPackage} />);

    expect(screen.getByRole("article", { name: "回想测试" })).toBeVisible();
    expect(screen.getByRole("article", { name: "种族能力" })).toBeVisible();
  });

  it("flips to a reverse Card Definition and rotates from the Card context menu", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "physical-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
      state: "configured",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    render(<SheetRenderer systemPackage={systemPackage} />);
    let card = screen.getByRole("article", { name: "回想测试" });
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "翻至背面" }));

    card = screen.getByRole("article", { name: "卡牌背面" });
    expect(useRuntimeStore.getState().characterData?.cards.instances[0].face).toBe("back");
    fireEvent.contextMenu(card);
    expect(screen.queryByRole("menuitem", { name: "逆时针旋转 90°" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "顺时针旋转 90°" }));
    expect(card).toHaveStyle({ transform: "rotate(90deg) scale(1)" });

    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "查看详情" }));
    expect(screen.getByRole("dialog", { name: "卡牌背面详情" })).toHaveTextContent("这是独立的背面 Card Definition。");
  });

  it("uses the Card Table state background color after switching state", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "colored-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
      state: "configured",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "回想测试" });
    expect(card.style.getPropertyValue("--play-card-state-background")).toBe("");
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "标记为vault" }));

    expect(card.style.getPropertyValue("--play-card-state-background")).toBe("#abcdef");
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "查看详情" }));
    expect(screen.getByRole("dialog", { name: "回想测试详情" }).querySelector(".card-detail-face"))
      .toHaveStyle({ "--play-card-state-background": "#abcdef" });
  });

  it("does not invent Card states when the Author omits state options", () => {
    const configuredPackage = createCardTablePackage();
    const systemPackage: SystemPackage = {
      ...configuredPackage,
      modules: configuredPackage.modules.map((module) => module.类型 === "cardTable"
        ? { ...module, 状态选项: undefined, 状态背景色: undefined }
        : module),
    };
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "stateless-card", tableModuleId: "domain-card-table", libraryId: "domain-cards", definitionId: "domain-card:recall-test",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    render(<SheetRenderer systemPackage={systemPackage} />);
    fireEvent.contextMenu(screen.getByRole("article", { name: "回想测试" }));

    expect(screen.queryByRole("menuitem", { name: /^标记为/ })).not.toBeInTheDocument();
  });

  it("places persistent edge indicators and removes only when decrementing at zero", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "indicator-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    const result = render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "回想测试" });
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "添加指示物" }));
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "添加指示物" }));

    let badge = screen.getByRole("button", { name: /青色指示物：0/ });
    const secondBadge = screen.getByRole("button", { name: /红色指示物：0/ });
    expect(badge).toHaveClass("card-indicator-badge");
    expect(badge).toHaveAttribute("data-color-index", "0");
    expect(secondBadge).toHaveAttribute("data-color-index", "1");
    expect(card.querySelector(".play-card-text")?.contains(badge)).toBe(false);
    fireEvent.click(badge);
    badge = screen.getByRole("button", { name: /青色指示物：1/ });
    fireEvent.contextMenu(badge);
    expect(screen.getByRole("button", { name: /青色指示物：0/ })).toBeVisible();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    badge = screen.getByRole("button", { name: /青色指示物：0/ });
    fireEvent.keyDown(badge, { key: "+" });
    badge = screen.getByRole("button", { name: /青色指示物：1/ });
    fireEvent.keyDown(badge, { key: "ArrowDown" });
    badge = screen.getByRole("button", { name: /青色指示物：0/ });
    fireEvent.contextMenu(badge);

    expect(screen.queryByRole("button", { name: /青色指示物/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /红色指示物：0/ })).toBeVisible();
    expect(useRuntimeStore.getState().characterData?.cards.instances[0].indicators).toHaveLength(1);
    expect(result.container.querySelectorAll(".card-indicator-badge")).toHaveLength(1);
  });

  it("renders an existing Card Instance saved before indicators were introduced", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "legacy-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
    });
    delete (characterData.cards.instances[0] as Partial<typeof characterData.cards.instances[number]>).indicators;
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    expect(() => render(<SheetRenderer systemPackage={systemPackage} />)).not.toThrow();
    expect(screen.getByRole("article", { name: "回想测试" })).toBeVisible();
  });

  it("lets the player resize Card Table cards from the table toolbar", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "card-instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
    });
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      packageAssetUrls: {},
      characterData,
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

    const result = render(<SheetRenderer systemPackage={systemPackage} />);
    const sizeSlider = screen.getByLabelText("领域卡牌桌面卡牌大小");

    expect(sizeSlider).toHaveValue("250");
    expect(result.container.querySelector(".card-table-surface")).toHaveStyle({ "--play-card-width": "250px" });

    fireEvent.change(sizeSlider, { target: { value: "300" } });

    expect(useRuntimeStore.getState().cardTableCardWidths["domain-card-table"]).toBe(300);
    expect(result.container.querySelector(".card-table-surface")).toHaveStyle({ "--play-card-width": "300px" });
  });

  it("expands the Card Table surface to the height allocated by its container", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("card-table-module") ? 1200 : 0;
    });
    const systemPackage = createCardTablePackage();
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      characterData: createEmptyCharacterData(systemPackage),
    });

    const result = render(<SheetRenderer systemPackage={systemPackage} />);

    expect(result.container.querySelector(".card-table-surface")).toHaveStyle({ height: "1200px", minHeight: "1200px" });
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
          html: "layouts/domain.html",
          htmlContent: '<main><pb-module id="domain-page-note"></pb-module></main>',
        },
      },
    ],
  };
}

function createMultiResourcePickerPackage(): SystemPackage {
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

function createCardTablePackage(): SystemPackage {
  return {
    ...moduleDemoSystemPackage,
    resourceLibraries: [
      {
        ID: "domain-cards",
        名称: "领域卡",
        路径: "resources/domain-cards.json",
        fields: [
          { key: "ID", label: "ID", visible: true, filterable: true, sortable: true },
          { key: "名称", label: "名称", visible: true, filterable: true, sortable: true },
          { key: "领域", label: "领域", visible: true, filterable: true, sortable: true },
          { key: "等级", label: "等级", visible: true, filterable: true, sortable: true },
          { key: "回想", label: "回想", visible: true, filterable: true, sortable: true },
          { key: "描述", label: "描述", visible: true, filterable: false, sortable: false },
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
          { key: "ID", label: "ID", visible: true, filterable: true, sortable: true },
          { key: "名称", label: "名称", visible: true, filterable: true, sortable: true },
          { key: "描述", label: "描述", visible: true, filterable: false, sortable: false },
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
          html: "layouts/main.html",
          htmlContent: '<main><pb-module id="domain-card-table"></pb-module></main>',
        },
      },
    ],
  };
}
