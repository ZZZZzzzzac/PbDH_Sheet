import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { createEmptyStorage } from "./App.test";
import type { StorageService } from "./storage/storageService";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./store/runtimeStore";
import { minimalSystemPackage } from "./test/fixtures";

function cachedPackage(id: string, name: string) {
  return { ...minimalSystemPackage, manifest: { ...minimalSystemPackage.manifest, ID: id, 名称: name, 版本: "1.0.0" } };
}

function configurePresetLoader(storage: StorageService = createEmptyStorage()) {
  configureRuntimeDependencies({
    storage,
    loadPresetSystemPackage: async (preset) => ({
      ok: true,
      package: cachedPackage(preset.id, preset.name),
      issues: [],
    }),
  });
  useRuntimeStore.setState({ currentPackage: null, characterData: null, bootStatus: "idle", packageIssues: [] });
}

describe("App preset URL routing", () => {
  afterEach(() => {
    resetRuntimeDependencies();
  });

  it("loads the preset System Package named by the URL path on first visit", async () => {
    const originalHref = window.location.href;
    window.history.replaceState(null, "", `${import.meta.env.BASE_URL}tttri`);
    try {
      configurePresetLoader();
      render(<App />);

      await waitFor(() => expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("tttri"));
      expect(screen.getByRole("combobox", { name: "预制系统包" })).toHaveValue("tttri");
    } finally {
      window.history.replaceState(null, "", originalHref);
    }
  });

  it("loads the default preset through its short URL path alias", async () => {
    const originalHref = window.location.href;
    window.history.replaceState(null, "", `${import.meta.env.BASE_URL}daggerheart`);
    try {
      configurePresetLoader();
      render(<App />);

      await waitFor(() => expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("daggerheart-core"));
      expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}daggerheart`);
    } finally {
      window.history.replaceState(null, "", originalHref);
    }
  });

  it("keeps the default preset when the URL path names no preset", async () => {
    const originalHref = window.location.href;
    window.history.replaceState(null, "", import.meta.env.BASE_URL);
    try {
      configurePresetLoader();
      render(<App />);

      await waitFor(() => expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("daggerheart-core"));
    } finally {
      window.history.replaceState(null, "", originalHref);
    }
  });

  it("returns to the default preset on the root path when the cache holds another preset", async () => {
    const originalHref = window.location.href;
    window.history.replaceState(null, "", import.meta.env.BASE_URL);
    try {
      configurePresetLoader({
        ...createEmptyStorage(),
        loadCurrentSystemPackage: async () => cachedPackage("tttri", "罗德岛旅记"),
      });
      render(<App />);

      await waitFor(() => expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("daggerheart-core"));
    } finally {
      window.history.replaceState(null, "", originalHref);
    }
  });

  it("keeps an imported custom package on the root path", async () => {
    const originalHref = window.location.href;
    window.history.replaceState(null, "", import.meta.env.BASE_URL);
    try {
      configurePresetLoader({
        ...createEmptyStorage(),
        loadCurrentSystemPackage: async () => cachedPackage("custom-house-rules", "自订规则"),
      });
      render(<App />);

      await waitFor(() => expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("custom-house-rules"));
    } finally {
      window.history.replaceState(null, "", originalHref);
    }
  });

  it("syncs the URL path when the Player switches preset System Packages", async () => {
    const originalHref = window.location.href;
    window.history.replaceState(null, "", `${import.meta.env.BASE_URL}tttri`);
    try {
      configurePresetLoader();
      const user = userEvent.setup();
      render(<App />);
      await waitFor(() => expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("tttri"));

      await user.selectOptions(screen.getByRole("combobox", { name: "预制系统包" }), "heart-of-hopefind");

      await waitFor(() => expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("heart-of-hopefind"));
      expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}hopefind`);
    } finally {
      window.history.replaceState(null, "", originalHref);
    }
  });
});
