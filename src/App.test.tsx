import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { StorageService } from "./storage/storageService";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./store/runtimeStore";
import { minimalSystemPackage } from "./test/fixtures";

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
});
