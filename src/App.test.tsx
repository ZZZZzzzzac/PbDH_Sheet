import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { StorageService } from "./storage/storageService";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./store/runtimeStore";
import { minimalSystemPackage } from "./test/fixtures";
import type { SystemPackage } from "./domain/systemPackage";
import presetSystemPackages from "virtual:preset-system-packages";

function createEmptyStorage(): StorageService {
  const saves = new Map<string, Parameters<StorageService["saveCharacterSave"]>[0]>();
  const active = new Map<string, string>();
  const skinPreferences = new Map<string, string>();
  let frameworkColorSchemePreference: "follow-skin" | "light" | "dark" = "follow-skin";

  return {
    async loadCurrentSystemPackage() {
      return null;
    },
    async saveCurrentSystemPackage() {},
    async clearCurrentSystemPackage() {},
    async loadCurrentPackageAssets() {
      return [];
    },
    async loadCurrentCharacterData(packageId) {
      const activeId = active.get(packageId);
      return activeId ? (saves.get(activeId)?.data ?? null) : null;
    },
    async saveCurrentCharacterData(data) {
      const saveId = active.get(data.systemPackage.id) ?? data.character.id;
      saves.set(saveId, {
        id: saveId,
        packageId: data.systemPackage.id,
        name: "未命名角色",
        updatedAt: data.updatedAt,
        data,
      });
      active.set(data.systemPackage.id, saveId);
    },
    async listCharacterSaves(packageId) {
      return [...saves.values()].filter((save) => save.packageId === packageId).map(({ data: _data, ...summary }) => summary);
    },
    async loadCharacterSave(packageId, saveId) {
      const save = saves.get(saveId);
      return save?.packageId === packageId ? save.data : null;
    },
    async saveCharacterSave(record) {
      saves.set(record.id, record);
    },
    async renameCharacterSave(packageId, saveId, name) {
      const save = saves.get(saveId);
      if (save?.packageId === packageId) {
        saves.set(saveId, { ...save, name });
      }
    },
    async deleteCharacterSave(packageId, saveId) {
      const save = saves.get(saveId);
      if (save?.packageId === packageId) {
        saves.delete(saveId);
      }
    },
    async loadActiveCharacterSaveId(packageId) {
      return active.get(packageId) ?? null;
    },
    async setActiveCharacterSaveId(packageId, saveId) {
      active.set(packageId, saveId);
    },
    loadSystemPackageSkinPreference(packageId) {
      return skinPreferences.get(packageId) ?? null;
    },
    setSystemPackageSkinPreference(packageId, skinId) {
      skinPreferences.set(packageId, skinId);
    },
    loadFrameworkColorSchemePreference() {
      return frameworkColorSchemePreference;
    },
    setFrameworkColorSchemePreference(preference) {
      frameworkColorSchemePreference = preference;
    },
    async savePlayerImageBlob() {},
    async deletePlayerImageBlob() {},
    async loadPlayerImageBlob() {
      return null;
    },
    async listResourceExtensions() {
      return [];
    },
    async loadResourceExtensionAssets() {
      return [];
    },
    async saveResourceExtension() {},
    async deleteResourceExtension() {},
  };
}

describe("App package error state", () => {
  beforeEach(async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({
        ok: false,
        issues: [
          {
            level: "fatal",
            code: "PACKAGE_SHAPE_INVALID",
            text: "manifest is required",
          },
        ],
      }),
      storage: createEmptyStorage(),
    });
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
      validationIssues: [],
      validationStatus: "idle",
      bootStatus: "idle",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });
  });

  afterEach(() => {
    resetRuntimeDependencies();
  });

  it("shows package issues instead of rendering a broken Sheet Tool", async () => {
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    expect(await screen.findByRole("alert", { name: "System Package error" })).toHaveTextContent("PACKAGE_SHAPE_INVALID");
    expect(screen.queryByLabelText("Sheet Tool")).not.toBeInTheDocument();
  });
});

describe("App Validation Checks", () => {
  let anchorClickSpy: ReturnType<typeof vi.spyOn>;
  let createObjectUrlSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectUrlSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({
        ok: true,
        package: {
          ...minimalSystemPackage,
          validationChecks: [
            {
              ID: "manual-check",
              脚本: "checks/manual.js",
              scriptContent: "module.exports = () => [];",
            },
          ],
        },
        issues: [],
      }),
      storage: createEmptyStorage(),
      runValidationChecks: async () => [
        {
          level: "error",
          text: "手动检查已运行",
          code: "MANUAL_CHECK_RAN",
          source: "manual-check",
        },
      ],
    });
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
      validationIssues: [],
      validationStatus: "idle",
      bootStatus: "idle",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });
  });

  afterEach(() => {
    resetRuntimeDependencies();
    vi.restoreAllMocks();
  });

  it("runs Validation Checks only after the manual check button is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    expect(screen.queryByLabelText("Validation Report")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "运行 Validation Checks" }));

    const dialog = await screen.findByRole("dialog", { name: "Validation Report" });
    expect(dialog).toHaveTextContent("MANUAL_CHECK_RAN");
    expect(dialog).toHaveTextContent("手动检查已运行");

    await user.click(screen.getByRole("button", { name: "关闭检查报告" }));

    expect(screen.queryByRole("dialog", { name: "Validation Report" })).not.toBeInTheDocument();
  });

  it("merges Framework Check overflow warnings with Author Validation Script issues", async () => {
    const overflowPackage: SystemPackage = {
      ...minimalSystemPackage,
      modules: [
        ...minimalSystemPackage.modules,
        { ID: "overflow-notes", 类型: "longText", 标签: "长文本", 默认值: "无法放入固定区域的长文本。", 行数: 2 },
      ],
      pages: minimalSystemPackage.pages.map((page) => ({
        ...page,
        layout: {
          ...page.layout,
          htmlContent: `${page.layout.htmlContent}<pb-module id="overflow-notes"></pb-module>`,
        },
      })),
      validationChecks: [{ ID: "manual-check", 脚本: "checks/manual.js", scriptContent: "module.exports = () => [];" }],
    };
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: overflowPackage, issues: [] }),
      storage: createEmptyStorage(),
      runValidationChecks: async () => [{ level: "error", text: "系统规则错误", code: "SYSTEM_RULE", source: "manual-check" }],
    });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-module-id="overflow-notes"] [data-markdown-preview]') ? 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-module-id="overflow-notes"] [data-markdown-preview]') ? 200 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-module-id="overflow-notes"] [data-markdown-preview]') ? 200 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-module-id="overflow-notes"] [data-markdown-preview]') ? 200 : 0;
    });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    await user.click(screen.getByRole("button", { name: "运行 Validation Checks" }));

    const dialog = await screen.findByRole("dialog", { name: "Validation Report" });
    expect(dialog).toHaveTextContent("TEXT_CONTENT_OVERFLOW");
    expect(dialog).toHaveTextContent("framework");
    expect(dialog).toHaveTextContent("SYSTEM_RULE");
    expect(dialog).toHaveTextContent("manual-check");
  });

  it("keeps the manual check button clickable when a package has no Validation Checks", async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    const checkButton = screen.getByRole("button", { name: "运行 Validation Checks" });
    expect(checkButton).toBeEnabled();

    await user.click(checkButton);

    expect(await screen.findByRole("dialog", { name: "Validation Report" })).toHaveTextContent("未发现问题");
  });

  it("lets Players cancel output after pre-output Validation Check issues", async () => {
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    await user.click(screen.getByRole("button", { name: "导出 Character JSON" }));

    expect(await screen.findByRole("dialog", { name: "Validation Report" })).toHaveTextContent("MANUAL_CHECK_RAN");
    await user.click(screen.getByRole("button", { name: "取消输出" }));

    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it("continues output after advisory pre-output Validation Check issues", async () => {
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    await user.click(screen.getByRole("button", { name: "导出 Character JSON" }));
    await user.click(await screen.findByRole("button", { name: "继续输出" }));

    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:test");
  });

  it("uses browser printing as the only PDF output path and restores the normal Sheet Tool afterward", async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: createEmptyStorage(),
      runValidationChecks: async () => [],
    });
    const printSpy = vi.fn(() => {
      expect(document.querySelector(".app-shell")).toHaveClass("print-mode");
      expect(screen.queryByLabelText("导出预览")).not.toBeInTheDocument();
    });
    Object.defineProperty(window, "print", { value: printSpy, configurable: true });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    expect(screen.queryByRole("button", { name: "导出页面快照 PDF" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "打开浏览器打印 PDF" }));

    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
    expect(document.querySelector(".app-shell")).not.toHaveClass("print-mode");
  });

  it("restores the normal Sheet Tool after exporting an HTML snapshot", async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: createEmptyStorage(),
      runValidationChecks: async () => [],
    });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    await user.click(screen.getByRole("button", { name: "导出 HTML snapshot" }));

    await waitFor(() => expect(anchorClickSpy).toHaveBeenCalledTimes(1));
    expect(document.querySelector(".app-shell")).not.toHaveClass("print-mode");
    expect(screen.queryByLabelText("导出预览")).not.toBeInTheDocument();
  });

  it("applies the fixed cleared hollow-square Countable Resource policy without changing Character Data", async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: createEmptyStorage(),
      runValidationChecks: async () => [],
    });
    const printSpy = vi.fn(() => {
      expect(screen.getByLabelText("Sheet Tool")).not.toHaveAttribute("data-countable-print-strategy");
    });
    Object.defineProperty(window, "print", { value: printSpy, configurable: true });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    const before = useRuntimeStore.getState().characterData;
    expect(screen.queryByLabelText("打印计数资源策略")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "打开浏览器打印 PDF" }));

    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
    expect(document.querySelector(".app-shell")).not.toHaveClass("print-mode");
    expect(useRuntimeStore.getState().characterData).toBe(before);
  });

  it("retidies Card Tables after print mode changes the table width", async () => {
    const cardTablePackage = createCardTablePackage();
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({
        ok: true,
        package: cardTablePackage,
        issues: [],
      }),
      storage: createEmptyStorage(),
      runValidationChecks: async () => [],
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("card-table-surface")) {
        return document.querySelector(".app-shell.print-mode") ? 600 : 1000;
      }
      return 0;
    });
    const user = userEvent.setup();
    const printSpy = vi.fn();
    Object.defineProperty(window, "print", { value: printSpy, configurable: true });
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    const tidySpy = vi.fn();
    act(() => {
      useRuntimeStore.setState({ tidyCardTable: tidySpy });
    });

    await user.click(screen.getByRole("button", { name: "打开浏览器打印 PDF" }));

    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
    expect(tidySpy).toHaveBeenCalledWith("print-card-table", expect.objectContaining({ surfaceWidthPx: 600 }));
  });
});

describe("App Character Creation Guide", () => {
  beforeEach(() => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: createGuidePackage(), issues: [] }),
      storage: createEmptyStorage(),
    });
    useRuntimeStore.setState({
      currentPackage: null,
      packageAssetUrls: {},
      characterData: null,
      characterSaves: [],
      activeCharacterSaveId: null,
      packageIssues: [],
      derivedReadOnlyDisplayContent: {},
      moduleVisibility: {},
      pageVisibility: {},
      resourcePickerDefaultQueries: {},
      cardTableCardWidths: {},
      validationIssues: [],
      validationStatus: "idle",
      bootStatus: "idle",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: vi.fn(),
      configurable: true,
    });
  });

  afterEach(() => {
    resetRuntimeDependencies();
    vi.restoreAllMocks();
  });

  it("shows a conditional toolbar entry and runs a stateless linear Guide", async () => {
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    const startButton = screen.getByRole("button", { name: "启动车卡指引" });
    await user.click(startButton);
    let guide = await screen.findByRole("dialog", { name: "车卡指引" });
    expect(guide).toHaveTextContent("开始建卡");
    expect(guide).toHaveTextContent("第一行 第二行");
    expect(guide).toHaveTextContent("1 / 2");
    expect(screen.getByRole("button", { name: "上一步" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "下一步" }));
    guide = screen.getByRole("dialog", { name: "车卡指引" });
    expect(guide).toHaveTextContent("填写姓名");
    expect(guide).toHaveTextContent("2 / 2");

    await user.click(screen.getByRole("button", { name: "上一步" }));
    expect(screen.getByRole("dialog", { name: "车卡指引" })).toHaveTextContent("1 / 2");
    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "完成车卡指引" }));
    expect(screen.queryByRole("dialog", { name: "车卡指引" })).not.toBeInTheDocument();

    await user.click(startButton);
    expect(await screen.findByRole("dialog", { name: "车卡指引" })).toHaveTextContent("1 / 2");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "车卡指引" })).not.toBeInTheDocument();
    await waitFor(() => expect(startButton).toHaveFocus());
  });

  it("does not show the Guide entry when the System Package has no Guide", async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    expect(screen.queryByRole("button", { name: "启动车卡指引" })).not.toBeInTheDocument();
  });

  it("renders Guide instructions with Restricted Markdown", async () => {
    const markdownPackage = createGuidePackage([
      { ID: "markdown", 标题: "选择子职", 说明: "拿取 :red[**基础**] 特性卡。" },
    ]);
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: markdownPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    await user.click(screen.getByRole("button", { name: "启动车卡指引" }));

    const emphasis = screen.getByText("基础");
    expect(emphasis.tagName).toBe("STRONG");
    expect(emphasis.closest("span")).toHaveClass("restricted-markdown-color");
    expect(emphasis.closest("span")).toHaveAttribute("data-markdown-color", "red");
  });

  it("keeps Guide actions out of long instruction flow and sizes the panel to content", async () => {
    const longPackage = createGuidePackage([
      { ID: "long", 标题: "长说明", 说明: "很长的说明。\n\n".repeat(100) },
    ]);
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: longPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    await user.click(screen.getByRole("button", { name: "启动车卡指引" }));

    const panel = screen.getByRole("dialog", { name: "车卡指引" });
    const actions = document.querySelector<HTMLElement>(".guide-actions");
    expect(actions).not.toBeNull();
    expect(actions).toHaveStyle({ position: "fixed" });
    expect(panel).toHaveStyle({ width: "fit-content" });
  });

  it("keeps a highlighted Sheet Module interactive while making dimmed content inert", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.dataset.moduleSlotId === "character-name") {
        return { x: 80, y: 120, top: 120, left: 80, right: 380, bottom: 220, width: 300, height: 100, toJSON() {} } as DOMRect;
      }
      return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {} } as DOMRect;
    });
    const targetPackage = createGuidePackage([
      { ID: "name", 标题: "填写姓名", 说明: "输入角色姓名。", 目标: { 类型: "module" as const, 模块ID: "character-name" } },
    ]);
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: targetPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    await user.click(screen.getByRole("button", { name: "启动车卡指引" }));

    const nameInput = screen.getByLabelText("姓名");
    await user.type(nameInput, "阿青");
    expect(nameInput).toHaveValue("阿青");
    expect(document.querySelector(".top-bar")).toHaveProperty("inert", true);
    expect(document.querySelector('[data-module-slot-id="character-name"]')).not.toHaveProperty("inert", true);
    expect(document.querySelector(".guide-target-ring")).toBeInTheDocument();
  });

  it("keeps every Sheet Module inside a highlighted Layout Region interactive", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.dataset.guideRegionId === "identity") {
        return { x: 80, y: 120, top: 120, left: 80, right: 480, bottom: 320, width: 400, height: 200, toJSON() {} } as DOMRect;
      }
      return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {} } as DOMRect;
    });
    const targetPackage = createGuidePackage([
      { ID: "identity", 标题: "填写身份", 说明: "填写角色身份。", 目标: { 类型: "region" as const, 区域ID: "identity" } },
    ]);
    targetPackage.modules = [
      ...targetPackage.modules,
      { ID: "character-title", 类型: "freeText", 标签: "称号", 默认值: "" },
    ];
    targetPackage.pages = [{
      ...targetPackage.pages[0],
      layout: {
        ...targetPackage.pages[0].layout,
        htmlContent: '<main><section data-guide-region-id="identity"><pb-module id="character-name"></pb-module><pb-module id="character-title"></pb-module></section></main>',
      },
    }];
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: targetPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    await user.click(screen.getByRole("button", { name: "启动车卡指引" }));

    const nameInput = screen.getByLabelText("姓名");
    const titleInput = screen.getByLabelText("称号");
    await user.type(nameInput, "阿青");
    await user.type(titleInput, "剑客");
    expect(nameInput).toHaveValue("阿青");
    expect(titleInput).toHaveValue("剑客");
    expect(document.querySelector('[data-guide-region-id="identity"]')).not.toHaveProperty("inert", true);
    expect(document.querySelector(".top-bar")).toHaveProperty("inert", true);
    expect(document.querySelectorAll(".guide-target-ring")).toHaveLength(1);
  });

  it("moves the Guide spotlight to a Resource Library opened from the highlighted Picker", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.matches('[data-module-slot-id="domain-picker"]')) {
        return { x: 80, y: 120, top: 120, left: 80, right: 380, bottom: 220, width: 300, height: 100, toJSON() {} } as DOMRect;
      }
      if (this.matches('.resource-dialog')) {
        return { x: 20, y: 30, top: 30, left: 20, right: 980, bottom: 730, width: 960, height: 700, toJSON() {} } as DOMRect;
      }
      return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {} } as DOMRect;
    });
    const targetPackage = createGuideResourcePickerPackage();
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: targetPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    await user.click(screen.getByRole("button", { name: "启动车卡指引" }));
    await user.click(screen.getByRole("button", { name: "选择职业" }));

    const resourceDialog = screen.getByRole("dialog", { name: "职业资源库" });
    await waitFor(() => expect(document.querySelector(".guide-target-ring")).toHaveStyle({ left: "14px", top: "24px" }));
    expect(resourceDialog.closest("[inert]")).toBeNull();

    await user.click(screen.getByLabelText("选择 德鲁伊"));
    expect(screen.queryByRole("dialog", { name: "职业资源库" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "车卡指引" })).toBeVisible();
    await waitFor(() => expect(document.querySelector(".guide-target-ring")).toHaveStyle({ left: "74px", top: "114px" }));
  });

  it("keeps a two-slot Resource Composer in front of the Guide until composition finishes", async () => {
    const user = userEvent.setup();
    const targetPackage = createGuideResourceComposerPackage();
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: targetPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    await user.click(screen.getByRole("button", { name: "启动车卡指引" }));
    await user.click(screen.getByRole("button", { name: "选择种族" }));

    expect(screen.getByRole("dialog", { name: "请选择特性 A 来源" })).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "车卡指引" })).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("选择 精灵"));
    expect(screen.getByRole("dialog", { name: "请选择特性 B 来源" })).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "车卡指引" })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("选择 人类"));
    expect(screen.queryByRole("dialog", { name: "请选择特性 B 来源" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "车卡指引" })).toBeVisible();
    expect(useRuntimeStore.getState().characterData?.compositeResources["compose-ancestry"].fields).toMatchObject({ 特性A: "敏锐", 特性B: "应变" });
  });

  it("selects the Runtime-Visible Page that owns the current Guide target", async () => {
    const user = userEvent.setup();
    const targetPackage = createGuidePackage([
      { ID: "main", 标题: "人物卡", 说明: "填写人物卡。", 目标: { 类型: "region" as const, 区域ID: "main-region" } },
      { ID: "story", 标题: "背景", 说明: "填写背景。", 目标: { 类型: "region" as const, 区域ID: "story-region" } },
    ]);
    targetPackage.pages = [
      {
        ...targetPackage.pages[0],
        layout: { ...targetPackage.pages[0].layout, htmlContent: '<section data-guide-region-id="main-region"><pb-module id="character-name"></pb-module></section>' },
      },
      {
        ...targetPackage.pages[0],
        ID: "story",
        名称: "背景与关系",
        layout: { ...targetPackage.pages[0].layout, htmlContent: '<section data-guide-region-id="story-region"><pb-module id="character-name"></pb-module></section>' },
      },
    ];
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: targetPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    await user.click(screen.getByRole("button", { name: "启动车卡指引" }));
    expect(document.querySelector('[data-guide-region-id="main-region"]')).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "下一步" }));
    expect(document.querySelector('[data-guide-region-id="story-region"]')).toBeInTheDocument();
    expect(document.querySelector('[data-guide-region-id="main-region"]')).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "上一步" }));
    expect(document.querySelector('[data-guide-region-id="main-region"]')).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "退出车卡指引" }));
    expect(document.querySelector('[data-guide-region-id="story-region"]')).toBeInTheDocument();
  });

  it("falls back to a target-unavailable notice without revealing a hidden target", async () => {
    const hiddenPackage = createGuidePackage([
      { ID: "hidden", 标题: "隐藏字段", 说明: "先完成前置步骤。", 目标: { 类型: "module" as const, 模块ID: "character-name" } },
    ]);
    hiddenPackage.modules = hiddenPackage.modules.map((module) => ({ ...module, 默认隐藏: true }));
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: hiddenPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    await user.click(screen.getByRole("button", { name: "启动车卡指引" }));

    expect(await screen.findByRole("status")).toHaveTextContent("当前目标不可见");
    expect(screen.queryByLabelText("姓名")).not.toBeInTheDocument();
  });

  it("falls back to a target-unavailable notice for a Layout Region on a hidden page", async () => {
    const hiddenPackage = createGuidePackage([
      { ID: "hidden-region", 标题: "隐藏区域", 说明: "先完成前置步骤。", 目标: { 类型: "region" as const, 区域ID: "identity" } },
    ]);
    hiddenPackage.pages = [{
      ...hiddenPackage.pages[0],
      默认隐藏: true,
      layout: {
        ...hiddenPackage.pages[0].layout,
        htmlContent: '<section data-guide-region-id="identity"><pb-module id="character-name"></pb-module></section>',
      },
    }];
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: hiddenPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    await user.click(screen.getByRole("button", { name: "启动车卡指引" }));

    expect(await screen.findByRole("status")).toHaveTextContent("当前目标不可见");
    expect(document.querySelector('[data-guide-region-id="identity"]')).not.toBeInTheDocument();
  });
});

describe("App Resource Manager", () => {
  afterEach(() => resetRuntimeDependencies());

  it("opens from the Player Features toolbar menu", async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    useRuntimeStore.setState({
      basePackage: null,
      currentPackage: null,
      resourceCatalog: null,
      installedResourceExtensions: [],
      resourceExtensionImport: null,
    });
    const user = userEvent.setup();
    render(<App />);
    await act(async () => useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob()));

    const toolbar = screen.getByRole("navigation", { name: "Sheet Tool actions" });
    const triggers = Array.from(toolbar.querySelectorAll(".menu-trigger"));
    expect(triggers.map((trigger) => trigger.textContent?.trim())).toEqual([
      "玩家功能",
      "玩家存档",
      "导入导出",
      "系统包",
    ]);

    const managerButton = screen.getByRole("button", { name: "资源管理器" });
    await user.click(managerButton);
    expect(screen.getByRole("dialog", { name: "Resource Manager" })).toBeVisible();
    expect(screen.getByText("0 个有效资源库")).toBeVisible();
    expect(screen.getByRole("button", { name: "关闭资源管理器" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Resource Manager" })).not.toBeInTheDocument();
    await waitFor(() => expect(managerButton).toHaveFocus());
  });
});

describe("App System Package Skin", () => {
  afterEach(() => resetRuntimeDependencies());

  it("switches among declared Skins from the System Package menu", async () => {
    const skinnedPackage: SystemPackage = {
      ...minimalSystemPackage,
      defaultSkin: "plain",
      skins: [
        { ID: "plain", 名称: "简洁", cssContent: ".demo-sheet { color: black; }", 推荐框架配色: "light" },
        { ID: "night", 名称: "夜间", cssContent: ".demo-sheet { color: white; }", 推荐框架配色: "dark" },
      ],
    };
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: skinnedPackage, issues: [] }),
      storage: createEmptyStorage(),
    });
    useRuntimeStore.setState({ currentPackage: null, selectedSkinId: null, characterData: null, bootStatus: "idle" });
    const user = userEvent.setup();
    render(<App />);
    await act(async () => useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob()));

    await user.selectOptions(screen.getByLabelText("人物卡皮肤"), "night");

    expect(useRuntimeStore.getState().selectedSkinId).toBe("night");
    expect(document.querySelector('style[data-system-package-skin="night"]')).not.toBeNull();
    expect(document.querySelector(".app-shell")).toHaveAttribute("data-framework-color-scheme", "dark");

    await user.selectOptions(screen.getByLabelText("框架配色"), "light");
    expect(document.querySelector(".app-shell")).toHaveAttribute("data-framework-color-scheme", "light");
  });
});

describe("App preset System Packages", () => {
  afterEach(() => resetRuntimeDependencies());

  it("lists every built-in package and switches without an upload", async () => {
    configureRuntimeDependencies({
      storage: createEmptyStorage(),
      loadPresetSystemPackage: async (preset) => ({
        ok: true,
        package: {
          ...minimalSystemPackage,
          manifest: { ...minimalSystemPackage.manifest, ID: preset.id, 名称: preset.name, 版本: preset.version },
        },
        issues: [],
      }),
    });
    useRuntimeStore.setState({ currentPackage: null, characterData: null, bootStatus: "idle", packageIssues: [] });
    const user = userEvent.setup();
    render(<App />);

    const select = await screen.findByRole("combobox", { name: "预制系统包" });
    expect(select.querySelectorAll("option")).toHaveLength(presetSystemPackages.length);
    expect(select).toHaveValue("daggerheart-core");
    expect(screen.queryByRole("option", { name: "选择预制系统包" })).not.toBeInTheDocument();
    await user.selectOptions(select, "daggerheart-core");

    await waitFor(() => expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("daggerheart-core"));
    expect(select).toHaveValue("daggerheart-core");
  });
});

function createGuidePackage(
  steps: NonNullable<SystemPackage["characterCreationGuide"]>["步骤"] = [
    { ID: "intro", 标题: "开始建卡", 说明: "第一行\n第二行" },
    { ID: "name", 标题: "填写姓名", 说明: "输入角色姓名。" },
  ],
): SystemPackage {
  return {
    ...minimalSystemPackage,
    characterCreationGuide: { 步骤: steps },
  };
}

function createGuideResourcePickerPackage(): SystemPackage {
  return {
    ...createGuidePackage([
      { ID: "class", 标题: "选择职业", 说明: "打开职业资源库。", 目标: { 类型: "module", 模块ID: "domain-picker" } },
    ]),
    pages: [{
      ...minimalSystemPackage.pages[0],
      layout: {
        ...minimalSystemPackage.pages[0].layout,
        htmlContent: '<main><pb-module id="domain-picker"></pb-module></main>',
      },
    }],
    modules: [{
      ID: "domain-picker",
      类型: "resourcePicker",
      按钮文本: "选择职业",
      资源库: [{ ID: "classes" }],
    }],
    resourceLibraries: [{
      ID: "classes",
      名称: "职业",
      路径: "resources/classes.json",
      fields: [{ key: "名称", label: "名称", visible: true, filterable: false, sortable: false, searchable: true }],
      entries: [{ ID: "druid", fields: { 名称: "德鲁伊" } }],
    }],
  };
}

function createGuideResourceComposerPackage(): SystemPackage {
  return {
    ...createGuidePackage([
      { ID: "ancestry", 标题: "种族", 说明: "分别选择两个种族特性。", 目标: { 类型: "module", 模块ID: "compose-ancestry" } },
    ]),
    pages: [{
      ...minimalSystemPackage.pages[0],
      layout: {
        ...minimalSystemPackage.pages[0].layout,
        htmlContent: '<main><pb-module id="compose-ancestry"></pb-module></main>',
      },
    }],
    modules: [{
      ID: "compose-ancestry",
      类型: "resourceComposer",
      按钮文本: "选择种族",
      来源槽位: [
        { ID: "a", 标签: "特性 A 来源", 资源库ID: "ancestries" },
        { ID: "b", 标签: "特性 B 来源", 资源库ID: "ancestries" },
      ],
      输出字段: [
        { 字段: "特性A", 来源槽位ID: "a", 来源字段: "特性A" },
        { 字段: "特性B", 来源槽位ID: "b", 来源字段: "特性B" },
      ],
    }],
    resourceLibraries: [{
      ID: "ancestries",
      名称: "种族",
      路径: "resources/ancestries.json",
      fields: [
        { key: "名称", label: "名称", visible: true, filterable: false, sortable: false, searchable: true },
        { key: "特性A", label: "特性 A", visible: true, filterable: false, sortable: false, searchable: true },
        { key: "特性B", label: "特性 B", visible: true, filterable: false, sortable: false, searchable: true },
      ],
      entries: [
        { ID: "elf", fields: { 名称: "精灵", 特性A: "敏锐", 特性B: "冥想" } },
        { ID: "human", fields: { 名称: "人类", 特性A: "活力", 特性B: "应变" } },
      ],
    }],
  };
}

function createCardTablePackage(): SystemPackage {
  return {
    ...minimalSystemPackage,
    pages: [
      {
        ID: "print-card-page",
        名称: "Print Cards",
        layout: {
          类型: "htmlTemplate",
          html: "layouts/print-cards.html",
          htmlContent: '<pb-module id="print-card-table"></pb-module>',
        },
      },
    ],
    modules: [
      {
        ID: "print-card-table",
        类型: "cardTable",
        标签: "打印卡牌桌面",
        资源来源: [{ 类型: "resourceLibrary", ID: "print-cards" }],
      },
    ],
    resourceLibraries: [
      {
        ID: "print-cards",
        名称: "打印卡牌",
        路径: "resources/print-cards.json",
        fields: [],
        entries: [],
      },
    ],
  };
}
