import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { StorageService } from "./storage/storageService";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./store/runtimeStore";
import { minimalSystemPackage } from "./test/fixtures";
import type { SystemPackage } from "./domain/systemPackage";

function createEmptyStorage(): StorageService {
  const saves = new Map<string, Parameters<StorageService["saveCharacterSave"]>[0]>();
  const active = new Map<string, string>();

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
    async savePlayerImageBlob() {},
    async loadPlayerImageBlob() {
      return null;
    },
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

  it("invokes the browser print boundary after clean pre-output checks", async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({
        ok: true,
        package: {
          ...minimalSystemPackage,
          validationChecks: [{ ID: "clean-check", 脚本: "checks/clean.js", scriptContent: "module.exports = () => [];" }],
        },
        issues: [],
      }),
      storage: createEmptyStorage(),
      runValidationChecks: async () => [],
    });
    const printSpy = vi.fn();
    Object.defineProperty(window, "print", { value: printSpy, configurable: true });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    await user.click(screen.getByRole("button", { name: "浏览器打印" }));

    await waitFor(() => expect(printSpy).toHaveBeenCalled());
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
    const printSpy = vi.fn();
    Object.defineProperty(window, "print", { value: printSpy, configurable: true });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("card-table-surface")) {
        return document.querySelector(".app-shell.print-mode") ? 600 : 1000;
      }
      return 0;
    });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });
    const tidySpy = vi.fn();
    act(() => {
      useRuntimeStore.setState({ tidyCardTable: tidySpy });
    });

    await user.click(screen.getByRole("button", { name: "浏览器打印" }));

    await waitFor(() => expect(printSpy).toHaveBeenCalled());
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
        资源库IDs: ["print-cards"],
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
