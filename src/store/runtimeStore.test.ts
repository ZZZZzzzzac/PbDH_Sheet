import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageService } from "../storage/storageService";
import { minimalSystemPackage } from "../test/fixtures";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./runtimeStore";

function createMemoryStorage(cachedPackage: unknown = null): StorageService & {
  getCachedPackage: () => unknown;
} {
  let savedData: Awaited<ReturnType<StorageService["loadCurrentCharacterData"]>> = null;
  let savedPackage = cachedPackage;
  let savedPackageAssets: Awaited<ReturnType<StorageService["loadCurrentPackageAssets"]>> = [];
  const playerImages = new Map<string, Awaited<ReturnType<StorageService["loadPlayerImageBlob"]>>>();

  return {
    async loadCurrentSystemPackage() {
      return savedPackage as typeof minimalSystemPackage | null;
    },
    async saveCurrentSystemPackage(systemPackage, packageAssets = []) {
      savedPackage = systemPackage;
      savedPackageAssets = packageAssets;
    },
    async clearCurrentSystemPackage() {
      savedPackage = null;
      savedPackageAssets = [];
    },
    async loadCurrentPackageAssets(packageId) {
      const packageIdFromCache =
        typeof savedPackage === "object" && savedPackage !== null && "manifest" in savedPackage
          ? (savedPackage as typeof minimalSystemPackage).manifest.ID
          : undefined;
      return packageIdFromCache === packageId ? savedPackageAssets : [];
    },
    async loadCurrentCharacterData(packageId) {
      if (savedData?.systemPackage.id !== packageId) {
        return null;
      }
      return savedData;
    },
    async saveCurrentCharacterData(data) {
      savedData = data;
    },
    async savePlayerImageBlob(image) {
      playerImages.set(image.id, image);
    },
    async loadPlayerImageBlob(imageId) {
      return playerImages.get(imageId) ?? null;
    },
    getCachedPackage() {
      return savedPackage;
    },
  };
}

describe("runtime store", () => {
  let memoryStorage: ReturnType<typeof createMemoryStorage>;

  beforeEach(async () => {
    memoryStorage = createMemoryStorage();
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: memoryStorage,
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
      bootStatus: "idle",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });
    await useRuntimeStore.getState().initialize();
  });

  afterEach(() => {
    resetRuntimeDependencies();
    vi.restoreAllMocks();
  });

  it("starts without a default System Package", () => {
    expect(useRuntimeStore.getState().bootStatus).toBe("ready");
    expect(useRuntimeStore.getState().currentPackage).toBeNull();
    expect(useRuntimeStore.getState().characterData).toBeNull();
  });

  it("updates Character Data through updateModuleValue and autosaves", async () => {
    renderHook(() => useRuntimeStore());

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    act(() => {
      useRuntimeStore.getState().updateModuleValue("character-name", "阿青");
    });

    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("阿青");
    expect(useRuntimeStore.getState().storageStatus).toBe("saving");

    await waitFor(() => {
      expect(useRuntimeStore.getState().storageStatus).toBe("saved");
    });

    const characterData = useRuntimeStore.getState().characterData;
    expect(characterData).not.toBeNull();
    useRuntimeStore.setState({ characterData: characterData ? { ...characterData, character: { id: "current-character", values: {} } } : null });
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());

    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("阿青");
  });

  it("loads an uploaded System Package without exposing zip details to runtime state", async () => {
    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("demo-minimal");
    expect(useRuntimeStore.getState().bootStatus).toBe("ready");
    expect(memoryStorage.getCachedPackage()?.manifest.ID).toBe("demo-minimal");
  });

  it("restores cached System Package on initialize", async () => {
    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
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
      bootStatus: "idle",
      storageStatus: "idle",
    });

    await useRuntimeStore.getState().initialize();

    expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("demo-minimal");
    expect(useRuntimeStore.getState().characterData?.systemPackage.id).toBe("demo-minimal");
  });

  it("clears an invalid cached System Package and starts blank", async () => {
    const staleCachedPackage = {
      ...minimalSystemPackage,
      modules: [
        {
          ID: "legacy-selection",
          类型: "selectionText",
          标签: "旧选择文本",
        },
      ],
    };
    memoryStorage = createMemoryStorage(staleCachedPackage);
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: memoryStorage,
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
      bootStatus: "idle",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });

    await useRuntimeStore.getState().initialize();

    expect(useRuntimeStore.getState().bootStatus).toBe("ready");
    expect(useRuntimeStore.getState().currentPackage).toBeNull();
    expect(useRuntimeStore.getState().characterData).toBeNull();
    expect(useRuntimeStore.getState().packageIssues).toEqual([]);
    expect(useRuntimeStore.getState().importNotice).toContain("缓存的 System Package 已失效");
    expect(memoryStorage.getCachedPackage()).toBeNull();
  });
});
