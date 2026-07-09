import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import type { StorageService } from "./storage/storageService";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./store/runtimeStore";
import { minimalSystemPackage } from "./test/fixtures";

const emptyStorage: StorageService = {
  async loadCurrentSystemPackage() {
    return null;
  },
  async saveCurrentSystemPackage() {},
  async clearCurrentSystemPackage() {},
  async loadCurrentPackageAssets() {
    return [];
  },
  async loadCurrentCharacterData() {
    return null;
  },
  async saveCurrentCharacterData() {},
  async savePlayerImageBlob() {},
  async loadPlayerImageBlob() {
    return null;
  },
};

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
      storage: emptyStorage,
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
  beforeEach(() => {
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
      storage: emptyStorage,
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
      storage: emptyStorage,
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
});
