import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import type { StorageService } from "./storage/storageService";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./store/runtimeStore";

const emptyStorage: StorageService = {
  async loadCurrentCharacterData() {
    return null;
  },
  async saveCurrentCharacterData() {},
};

describe("App package error state", () => {
  beforeEach(async () => {
    configureRuntimeDependencies({
      loadSystemPackage: async () => ({
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
      characterData: null,
      packageIssues: [],
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

    expect(await screen.findByRole("alert", { name: "System Package error" })).toHaveTextContent("PACKAGE_SHAPE_INVALID");
    expect(screen.queryByLabelText("Sheet Tool")).not.toBeInTheDocument();
  });
});
