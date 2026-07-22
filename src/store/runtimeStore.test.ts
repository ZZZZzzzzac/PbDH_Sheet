import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageService } from "../storage/storageService";
import { minimalSystemPackage } from "../test/fixtures";
import type { PackageDirectoryHandle } from "../loaders/packageVfs";
import type { SystemPackage } from "../domain/systemPackage";
import { loadResourceExtensionJson } from "../domain/resourceExtension";
import { createCardInstance } from "../domain/cardEngine";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./runtimeStore";

function createMemoryStorage(cachedPackage: unknown = null): StorageService & {
  getCachedPackage: () => unknown;
} {
  let savedData: Awaited<ReturnType<StorageService["loadCurrentCharacterData"]>> = null;
  const characterSaves = new Map<string, { id: string; packageId: string; name: string; updatedAt: string; data: NonNullable<typeof savedData> }>();
  const activeSaveIds = new Map<string, string>();
  const skinPreferences = new Map<string, string>();
  let frameworkColorSchemePreference: "follow-skin" | "light" | "dark" = "follow-skin";
  let savedPackage = cachedPackage;
  let savedPackageAssets: Awaited<ReturnType<StorageService["loadCurrentPackageAssets"]>> = [];
  const playerImages = new Map<string, Awaited<ReturnType<StorageService["loadPlayerImageBlob"]>>>();
  const resourceExtensions = new Map<string, Awaited<ReturnType<StorageService["listResourceExtensions"]>>[number]>();
  const resourceExtensionAssets = new Map<string, Awaited<ReturnType<StorageService["loadResourceExtensionAssets"]>>>();

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
      const activeId = activeSaveIds.get(packageId);
      return (activeId ? characterSaves.get(activeId)?.data : savedData?.systemPackage.id === packageId ? savedData : null) ?? null;
    },
    async saveCurrentCharacterData(data) {
      savedData = data;
      const activeId = activeSaveIds.get(data.systemPackage.id) ?? data.character.id;
      characterSaves.set(activeId, {
        id: activeId,
        packageId: data.systemPackage.id,
        name: "未命名角色",
        updatedAt: data.updatedAt,
        data: { ...data, character: { ...data.character, id: activeId } },
      });
      activeSaveIds.set(data.systemPackage.id, activeId);
    },
    async listCharacterSaves(packageId) {
      return [...characterSaves.values()]
        .filter((save) => save.packageId === packageId)
        .map(({ data: _data, ...summary }) => summary);
    },
    async loadCharacterSave(packageId, saveId) {
      const save = characterSaves.get(saveId);
      return save?.packageId === packageId ? save.data : null;
    },
    async saveCharacterSave(record) {
      characterSaves.set(record.id, record);
      savedData = record.data;
    },
    async renameCharacterSave(packageId, saveId, name) {
      const save = characterSaves.get(saveId);
      if (save?.packageId === packageId) {
        characterSaves.set(saveId, { ...save, name });
      }
    },
    async deleteCharacterSave(packageId, saveId) {
      const save = characterSaves.get(saveId);
      if (save?.packageId === packageId) {
        characterSaves.delete(saveId);
      }
    },
    async loadActiveCharacterSaveId(packageId) {
      return activeSaveIds.get(packageId) ?? null;
    },
    async setActiveCharacterSaveId(packageId, saveId) {
      activeSaveIds.set(packageId, saveId);
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
    async savePlayerImageBlob(image) {
      playerImages.set(image.id, image);
    },
    async loadPlayerImageBlob(imageId) {
      return playerImages.get(imageId) ?? null;
    },
    async deletePlayerImageBlob(imageId) {
      playerImages.delete(imageId);
    },
    async listResourceExtensions(targetSystemPackageId) {
      return [...resourceExtensions.values()].filter((extension) => extension.目标系统包ID === targetSystemPackageId);
    },
    async loadResourceExtensionAssets(targetSystemPackageId) {
      return [...resourceExtensionAssets.entries()].filter(([key]) => key.startsWith(`${targetSystemPackageId}:`)).flatMap(([, assets]) => assets);
    },
    async saveResourceExtension(extension, assets = []) {
      const key = `${extension.目标系统包ID}:${extension.ID}`;
      resourceExtensions.set(key, extension);
      resourceExtensionAssets.set(key, assets);
    },
    async deleteResourceExtension(targetSystemPackageId, extensionId) {
      const key = `${targetSystemPackageId}:${extensionId}`;
      resourceExtensions.delete(key);
      resourceExtensionAssets.delete(key);
    },
    getCachedPackage() {
      return savedPackage;
    },
  };
}

describe("runtime store", () => {
  let memoryStorage: ReturnType<typeof createMemoryStorage>;

  beforeEach(async () => {
    sessionStorage.clear();
    memoryStorage = createMemoryStorage();
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: memoryStorage,
    });
    useRuntimeStore.setState({
      basePackage: null,
      currentPackage: null,
      selectedSkinId: null,
      frameworkColorSchemePreference: "follow-skin",
      resourceCatalog: null,
      installedResourceExtensions: [],
      resourceExtensionImport: null,
      packageAssetUrls: {},
      characterData: null,
      packageIssues: [],
      derivedReadOnlyDisplayContent: {},
      derivedTextPlaceholders: {},
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
      authorPreviewActive: false,
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

  it("enters and exits Author Preview without restoring the previous package", async () => {
    const handle = { kind: "directory", name: "dev" } as PackageDirectoryHandle;
    const saveHandle = vi.fn(async () => {});
    configureRuntimeDependencies({
      storage: memoryStorage,
      savePreviewDirectoryHandle: saveHandle,
      loadSystemPackageFromDirectoryHandle: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
    });
    await useRuntimeStore.getState().enterAuthorPreview(handle);
    expect(saveHandle).toHaveBeenCalledWith(handle);
    expect(useRuntimeStore.getState().authorPreviewActive).toBe(true);
    expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe(minimalSystemPackage.manifest.ID);
    useRuntimeStore.getState().exitAuthorPreview();
    expect(useRuntimeStore.getState().authorPreviewActive).toBe(false);
    expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe(minimalSystemPackage.manifest.ID);
  });

  it("restores Preview within the tab and blocks stale rendering on reload errors", async () => {
    const handle = { kind: "directory", name: "dev", queryPermission: async () => "granted" as PermissionState } as PackageDirectoryHandle;
    sessionStorage.setItem("pbdh-author-preview", "active");
    configureRuntimeDependencies({
      storage: memoryStorage,
      loadPreviewDirectoryHandle: async () => handle,
      loadSystemPackageFromDirectoryHandle: async () => ({ ok: false, issues: [{ level: "fatal", code: "MANIFEST_MISSING", text: "missing" }] }),
    });
    useRuntimeStore.setState({ currentPackage: minimalSystemPackage });
    await useRuntimeStore.getState().initialize();
    expect(useRuntimeStore.getState().authorPreviewActive).toBe(true);
    expect(useRuntimeStore.getState().bootStatus).toBe("error");
    expect(useRuntimeStore.getState().currentPackage).toBeNull();
    expect(useRuntimeStore.getState().packageIssues[0]?.code).toBe("MANIFEST_MISSING");
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

  it("waits for a committed Free Text change before rebuilding Resource Picker filters", async () => {
    const filterAction = {
      类型: "setResourceDefaultFilter" as const,
      目标模块ID: "pick-domain-cards",
      字段: "领域",
      值: { 类型: "freeTextValues" as const, 模块IDs: ["character-name", "secondary-domain"] },
    };
    const freeTextPackage = {
      ...minimalSystemPackage,
      modules: [
        ...minimalSystemPackage.modules,
        { ID: "secondary-domain", 类型: "freeText", 标签: "次领域" },
        { ID: "pick-domain-cards", 类型: "resourcePicker", 按钮文本: "选择领域卡", 资源库: [{ ID: "domain-cards" }] },
      ],
      dependencies: ["character-name", "secondary-domain"].map((moduleId) => ({
        ID: `filter-${moduleId}`,
        sources: [
          { 类型: "freeText" as const, 模块ID: "character-name" },
          { 类型: "freeText" as const, 模块ID: "secondary-domain" },
        ],
        targets: [{ 类型: "module" as const, 模块ID: "pick-domain-cards" }],
        触发: { 类型: "freeTextChanged" as const, 来源模块ID: moduleId },
        条件: { 类型: "always" as const },
        动作: [filterAction],
      })),
    } as unknown as SystemPackage;
    configureRuntimeDependencies({
      storage: memoryStorage,
      loadSystemPackageFromFile: async () => ({ ok: true, package: freeTextPackage, issues: [] }),
    });
    await act(async () => useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob()));
    const queryBeforeInput = useRuntimeStore.getState().resourcePickerDefaultQueries["pick-domain-cards"];

    act(() => useRuntimeStore.getState().updateModuleValue("character-name", "奥术"));
    act(() => useRuntimeStore.getState().updateModuleValue("secondary-domain", "奇迹"));
    expect(useRuntimeStore.getState().resourcePickerDefaultQueries["pick-domain-cards"]).toEqual(queryBeforeInput);

    act(() => useRuntimeStore.getState().commitFreeTextChange("secondary-domain", "奇迹"));
    expect(useRuntimeStore.getState().resourcePickerDefaultQueries["pick-domain-cards"].filters).toEqual({ 领域: ["奥术", "奇迹"] });
  });

  it("evaluates countableChanged dependencies after updating a Countable Resource", async () => {
    const countablePackage = {
      ...minimalSystemPackage,
      modules: [
        ...minimalSystemPackage.modules,
        { ID: "erosion", 类型: "countableResource", 标签: "蚀痕", 最小值: 0, 最大值: 6, 默认值: 0 },
        { ID: "magic", 类型: "countableResource", 标签: "魔法点", 最小值: 0, 最大值: 6, 默认值: 6 },
      ],
      pages: [{
        ...minimalSystemPackage.pages[0],
        layout: {
          ...minimalSystemPackage.pages[0].layout,
          htmlContent: `${minimalSystemPackage.pages[0].layout.htmlContent}<pb-module id="erosion"></pb-module><pb-module id="magic"></pb-module>`,
        },
      }],
      dependencies: [{
        ID: "derive-magic",
        sources: [{ 类型: "countableResource", 模块ID: "erosion" }],
        targets: [{ 类型: "module", 模块ID: "magic" }],
        触发: { 类型: "countableChanged", 来源模块ID: "erosion" },
        条件: { 类型: "always" },
        动作: [{
          类型: "fillCountable", 目标模块ID: "magic", 最大值: {
            类型: "integerCalculation", 初始值: 6,
            运算: [{ 操作: "subtract", 值: { 类型: "countableCurrent", 模块ID: "erosion" } }],
          },
        }],
      }],
    } as unknown as SystemPackage;
    configureRuntimeDependencies({
      storage: memoryStorage,
      loadSystemPackageFromFile: async () => ({ ok: true, package: countablePackage, issues: [] }),
    });
    await act(async () => useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob()));

    act(() => useRuntimeStore.getState().updateModuleValue("erosion", { current: 2, max: 6 }));

    expect(useRuntimeStore.getState().characterData?.character.values.magic).toEqual({ current: 4, max: 4 });
  });

  it("removes a player image from Character Data", async () => {
    renderHook(() => useRuntimeStore());
    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
      await useRuntimeStore.getState().uploadPlayerImage("portrait", new File(["image"], "portrait.png", { type: "image/png" }));
    });
    const imageId = (useRuntimeStore.getState().characterData?.character.values.portrait as { imageId: string }).imageId;

    await act(async () => useRuntimeStore.getState().removePlayerImage("portrait"));

    expect(useRuntimeStore.getState().characterData?.character.values.portrait).toBeUndefined();
    expect(useRuntimeStore.getState().characterData?.playerImages[imageId]).toBeUndefined();
  });

  it("manages package-scoped Character Saves", async () => {
    renderHook(() => useRuntimeStore());

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    const firstSaveId = useRuntimeStore.getState().activeCharacterSaveId;
    expect(firstSaveId).toBeTruthy();
    expect(useRuntimeStore.getState().characterSaves).toHaveLength(1);

    act(() => {
      useRuntimeStore.getState().updateModuleValue("character-name", "阿青");
    });
    await waitFor(() => expect(useRuntimeStore.getState().storageStatus).toBe("saved"));

    await act(async () => {
      await useRuntimeStore.getState().createCharacterSave("第二角色");
    });

    const secondSaveId = useRuntimeStore.getState().activeCharacterSaveId;
    expect(secondSaveId).not.toBe(firstSaveId);
    expect(useRuntimeStore.getState().characterSaves.map((save) => save.name)).toContain("第二角色");
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("");

    await act(async () => {
      await useRuntimeStore.getState().switchCharacterSave(firstSaveId!);
    });

    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("阿青");

    await act(async () => {
      await useRuntimeStore.getState().renameCharacterSave(firstSaveId!, "阿青本人");
      await useRuntimeStore.getState().duplicateCharacterSave(firstSaveId!, "阿青副本");
    });

    expect(useRuntimeStore.getState().characterSaves.map((save) => save.name)).toEqual(expect.arrayContaining(["阿青本人", "阿青副本"]));

    await act(async () => {
      await useRuntimeStore.getState().deleteCharacterSave(useRuntimeStore.getState().activeCharacterSaveId!);
    });

    expect(useRuntimeStore.getState().characterSaves.map((save) => save.name)).not.toContain("阿青副本");
  });

  it("flushes pending autosave before switching Character Save (#211)", async () => {
    vi.useFakeTimers();
    try {
      renderHook(() => useRuntimeStore());

      await act(async () => {
        await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
      });

      const firstSaveId = useRuntimeStore.getState().activeCharacterSaveId;
      expect(firstSaveId).toBeTruthy();

      await act(async () => {
        await useRuntimeStore.getState().createCharacterSave("第二角色");
      });
      const secondSaveId = useRuntimeStore.getState().activeCharacterSaveId;
      expect(secondSaveId).not.toBe(firstSaveId);

      await act(async () => {
        await useRuntimeStore.getState().switchCharacterSave(firstSaveId!);
      });

      act(() => {
        useRuntimeStore.getState().updateModuleValue("character-name", "未保存的编辑");
      });
      expect(useRuntimeStore.getState().storageStatus).toBe("saving");

      // pending autosave timer still scheduled, has not fired yet
      vi.advanceTimersByTime(0);
      expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("未保存的编辑");

      await act(async () => {
        await useRuntimeStore.getState().switchCharacterSave(secondSaveId!);
      });

      // first save should have been flushed, switching back preserves the edit
      await act(async () => {
        await useRuntimeStore.getState().switchCharacterSave(firstSaveId!);
      });
      expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("未保存的编辑");
    } finally {
      vi.useRealTimers();
    }
  });

  it("loads an uploaded System Package without exposing zip details to runtime state", async () => {
    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("demo-minimal");
    expect(useRuntimeStore.getState().bootStatus).toBe("ready");
    expect(memoryStorage.getCachedPackage()?.manifest.ID).toBe("demo-minimal");
  });

  it("keeps the Current System Package when a preset cannot be loaded", async () => {
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    const previousPackage = useRuntimeStore.getState().currentPackage;
    configureRuntimeDependencies({
      storage: memoryStorage,
      loadPresetSystemPackage: async () => ({
        ok: false,
        issues: [{ level: "fatal", code: "PRESET_PACKAGE_FETCH_FAILED", text: "offline" }],
      }),
    });

    await useRuntimeStore.getState().switchToPresetSystemPackage({
      id: "unavailable",
      name: "不可用预制包",
      version: "1",
      directory: "unavailable",
      files: ["manifest.json"],
    });

    expect(useRuntimeStore.getState().currentPackage).toBe(previousPackage);
    expect(useRuntimeStore.getState().bootStatus).toBe("ready");
    expect(useRuntimeStore.getState().packageIssues[0]?.code).toBe("PRESET_PACKAGE_FETCH_FAILED");
    expect(memoryStorage.getCachedPackage()?.manifest.ID).toBe("demo-minimal");
  });

  it("switches and persists Skin per System Package without changing Character Data", async () => {
    const skinnedPackage: SystemPackage = {
      ...minimalSystemPackage,
      defaultSkin: "plain",
      skins: [
        { ID: "plain", 名称: "简洁", cssContent: ".plain {}", 推荐框架配色: "light" },
        { ID: "night", 名称: "夜间", cssContent: ".night {}", 推荐框架配色: "dark" },
      ],
    };
    configureRuntimeDependencies({ loadSystemPackageFromFile: async () => ({ ok: true, package: skinnedPackage, issues: [] }), storage: memoryStorage });
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    const before = useRuntimeStore.getState().characterData;

    act(() => useRuntimeStore.getState().selectSystemPackageSkin("night"));

    expect(useRuntimeStore.getState().selectedSkinId).toBe("night");
    expect(memoryStorage.loadSystemPackageSkinPreference(skinnedPackage.manifest.ID)).toBe("night");
    expect(useRuntimeStore.getState().characterData).toBe(before);
  });

  it("falls back to the package default when a stored Skin was removed", async () => {
    const twoSkins: SystemPackage = {
      ...minimalSystemPackage,
      defaultSkin: "plain",
      skins: [
        { ID: "plain", 名称: "简洁", cssContent: ".plain {}", 推荐框架配色: "light" },
        { ID: "night", 名称: "夜间", cssContent: ".night {}", 推荐框架配色: "dark" },
      ],
    };
    const upgraded: SystemPackage = { ...twoSkins, skins: [twoSkins.skins![0]] };
    configureRuntimeDependencies({ loadSystemPackageFromFile: async () => ({ ok: true, package: twoSkins, issues: [] }), storage: memoryStorage });
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    useRuntimeStore.getState().selectSystemPackageSkin("night");
    configureRuntimeDependencies({ loadSystemPackageFromFile: async () => ({ ok: true, package: upgraded, issues: [] }), storage: memoryStorage });

    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());

    expect(useRuntimeStore.getState().selectedSkinId).toBe("plain");
    expect(useRuntimeStore.getState().importNotice).toContain("已回退到默认 Skin：plain");
  });

  it("persists the Framework Color Scheme preference outside Character Data", () => {
    const before = useRuntimeStore.getState().characterData;

    act(() => useRuntimeStore.getState().setFrameworkColorSchemePreference("dark"));

    expect(useRuntimeStore.getState().frameworkColorSchemePreference).toBe("dark");
    expect(memoryStorage.loadFrameworkColorSchemePreference()).toBe("dark");
    expect(useRuntimeStore.getState().characterData).toBe(before);
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
      cardTableCardWidths: {},
      validationIssues: [],
      validationStatus: "idle",
      bootStatus: "idle",
      storageStatus: "idle",
    });

    await useRuntimeStore.getState().initialize();

    expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe("demo-minimal");
    expect(useRuntimeStore.getState().characterData?.systemPackage.id).toBe("demo-minimal");
  });

  it("installs a multi-Library JSON Extension atomically without rewriting the cached System Package", async () => {
    const basePackage: SystemPackage = {
      ...minimalSystemPackage,
      resourceLibraries: [
        { ID: "classes", 名称: "职业", 路径: "classes.json", fields: [{ key: "ID", label: "ID", visible: false, filterable: false, sortable: false, searchable: false }], entries: [] },
        { ID: "cards", 名称: "卡牌", 路径: "cards.json", fields: [{ key: "ID", label: "ID", visible: false, filterable: false, sortable: false, searchable: false }], entries: [] },
      ],
    };
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: basePackage, issues: [] }),
      storage: memoryStorage,
    });
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());

    await useRuntimeStore.getState().uploadResourceExtensionFromFile(new Blob([JSON.stringify({
      ID: "void", 名称: "虚空", 版本: "1", 目标系统包ID: basePackage.manifest.ID,
      resourceLibraries: [
        { ID: "classes", 名称: "职业", entries: [{ ID: "void-class", 名称: "刺客" }] },
        { ID: "cards", 名称: "卡牌", entries: [{ ID: "void-card", 名称: "虚空之触" }] },
      ],
    })], { type: "application/json" }));

    const state = useRuntimeStore.getState();
    expect(state.resourceExtensionImport).toMatchObject({ status: "success", extensionId: "void", contributionCount: 2, entryCount: 2 });
    expect(state.currentPackage?.resourceLibraries?.map((library) => [library.ID, library.entries.length])).toEqual([["classes", 1], ["cards", 1]]);
    expect((memoryStorage.getCachedPackage() as SystemPackage).resourceLibraries?.every((library) => library.entries.length === 0)).toBe(true);
    expect(await memoryStorage.listResourceExtensions(basePackage.manifest.ID)).toHaveLength(1);
  });

  it("restores persisted Extensions into the Effective Resource Catalog on initialize", async () => {
    const basePackage: SystemPackage = { ...minimalSystemPackage, resourceLibraries: [] };
    const loaded = loadResourceExtensionJson(JSON.stringify({
      ID: "persisted", 名称: "持久扩展", 版本: "1", 目标系统包ID: basePackage.manifest.ID,
      resourceLibraries: [{ ID: "new-library", 名称: "新库", entries: [{ ID: "entry-1", 名称: "新条目" }] }],
    }), basePackage.manifest.ID);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    memoryStorage = createMemoryStorage(basePackage);
    await memoryStorage.saveResourceExtension(loaded.extension);
    configureRuntimeDependencies({ storage: memoryStorage });

    await useRuntimeStore.getState().initialize();

    expect(useRuntimeStore.getState().currentPackage?.resourceLibraries?.[0].entries[0].ID).toBe("entry-1");
    expect(useRuntimeStore.getState().resourceCatalog?.libraries[0].contributors[0].source).toMatchObject({ type: "resourceExtension", id: "persisted" });
  });

  it("leaves Catalog, repository, and Runtime unchanged when any Extension Entry conflicts", async () => {
    const basePackage: SystemPackage = {
      ...minimalSystemPackage,
      resourceLibraries: [{
        ID: "classes", 名称: "职业", 路径: "classes.json",
        fields: [{ key: "ID", label: "ID", visible: false, filterable: false, sortable: false, searchable: false }],
        entries: [{ ID: "existing", fields: { ID: "existing", 名称: "已有职业" } }],
      }],
    };
    configureRuntimeDependencies({ loadSystemPackageFromFile: async () => ({ ok: true, package: basePackage, issues: [] }), storage: memoryStorage });
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    const packageBefore = useRuntimeStore.getState().currentPackage;

    await useRuntimeStore.getState().uploadResourceExtensionFromFile(new Blob([JSON.stringify({
      ID: "conflict", 名称: "冲突扩展", 版本: "1", 目标系统包ID: basePackage.manifest.ID,
      resourceLibraries: [
        { ID: "classes", 名称: "职业", entries: [{ ID: "existing", 名称: "冲突职业" }] },
        { ID: "new-library", 名称: "新库", entries: [{ ID: "new-entry", 名称: "不能部分安装" }] },
      ],
    })]));

    expect(useRuntimeStore.getState().resourceExtensionImport).toMatchObject({ status: "error" });
    expect(useRuntimeStore.getState().currentPackage).toBe(packageBefore);
    expect(useRuntimeStore.getState().currentPackage?.resourceLibraries).toHaveLength(1);
    expect(await memoryStorage.listResourceExtensions(basePackage.manifest.ID)).toEqual([]);
  });

  it("previews and confirms whole-Extension replacement, then uninstalls without rewriting Character Data", async () => {
    const basePackage: SystemPackage = {
      ...minimalSystemPackage,
      resourceLibraries: [{ ID: "cards", 名称: "卡牌", 路径: "cards.json", fields: [], entries: [] }],
    };
    configureRuntimeDependencies({ loadSystemPackageFromFile: async () => ({ ok: true, package: basePackage, issues: [] }), storage: memoryStorage });
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    const document = (version: string, entries: object[]) => new Blob([JSON.stringify({
      ID: "replace-me", 名称: "可替换", 版本: version, 目标系统包ID: basePackage.manifest.ID,
      resourceLibraries: [{ ID: "cards", 名称: "卡牌", entries }],
    })]);
    await useRuntimeStore.getState().uploadResourceExtensionFromFile(document("1", [{ ID: "a", 名称: "旧 A" }, { ID: "b", 名称: "旧 B" }]));
    const installedPackage = useRuntimeStore.getState().currentPackage!;
    const characterWithCard = createCardInstance(useRuntimeStore.getState().characterData!, {
      instanceId: "stale-card", tableModuleId: "table", libraryId: "cards", definitionId: "a",
    });
    useRuntimeStore.setState({ characterData: characterWithCard });

    await useRuntimeStore.getState().uploadResourceExtensionFromFile(document("2", [{ ID: "b", 名称: "新 B" }, { ID: "c", 名称: "新 C" }]));
    expect(useRuntimeStore.getState().pendingResourceExtensionReplacement?.differences).toEqual([{ libraryId: "cards", added: 1, removed: 1, retained: 1 }]);
    expect(useRuntimeStore.getState().currentPackage).toBe(installedPackage);
    useRuntimeStore.getState().cancelResourceExtensionReplacement();
    expect(useRuntimeStore.getState().currentPackage?.resourceLibraries?.[0].entries.map((entry) => entry.ID)).toEqual(["a", "b"]);

    await useRuntimeStore.getState().uploadResourceExtensionFromFile(document("2", [{ ID: "b", 名称: "新 B" }, { ID: "c", 名称: "新 C" }]));
    await useRuntimeStore.getState().confirmResourceExtensionReplacement();
    expect(useRuntimeStore.getState().currentPackage?.resourceLibraries?.[0].entries.map((entry) => [entry.ID, entry.fields.名称])).toEqual([["b", "新 B"], ["c", "新 C"]]);
    expect(useRuntimeStore.getState().characterData).toBe(characterWithCard);
    expect(useRuntimeStore.getState().resourceReferenceIssues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "STALE_RESOURCE_DEFINITION_REFERENCE" })]));

    useRuntimeStore.getState().requestResourceExtensionRemoval("replace-me");
    expect(useRuntimeStore.getState().pendingResourceExtensionRemoval).toMatchObject({ extensionId: "replace-me", staleReferenceCount: 1 });
    useRuntimeStore.getState().cancelResourceExtensionRemoval();
    expect(useRuntimeStore.getState().installedResourceExtensions).toHaveLength(1);
    useRuntimeStore.getState().requestResourceExtensionRemoval("replace-me");
    await useRuntimeStore.getState().confirmResourceExtensionRemoval();
    expect(useRuntimeStore.getState().installedResourceExtensions).toEqual([]);
    expect(useRuntimeStore.getState().characterData).toBe(characterWithCard);
    expect(await memoryStorage.listResourceExtensions(basePackage.manifest.ID)).toEqual([]);
  });

  it("does not persist Resource Picker provenance without pure derived consumers", async () => {
    const packageWithoutDerivedConsumers = {
      ...minimalSystemPackage,
      modules: [
        ...minimalSystemPackage.modules,
        { ID: "pick-class", 类型: "resourcePicker", 按钮文本: "职业", 资源库: [{ ID: "classes" }] },
      ],
    } as unknown as SystemPackage;
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: packageWithoutDerivedConsumers, issues: [] }),
      storage: memoryStorage,
    });
    await act(async () => useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob()));

    act(() => useRuntimeStore.getState().commitResourceSelection("pick-class", "classes", [
      { ID: "class:druid", fields: { 名称: "德鲁伊" } },
    ]));

    expect(useRuntimeStore.getState().characterData?.resourceSelections).toEqual({});
  });

  it("persists Resource Picker provenance and rebuilds only derived state after reload and Character Save switching", async () => {
    const derivedPackage = {
      ...minimalSystemPackage,
      pages: [
        ...minimalSystemPackage.pages,
        { ID: "druid-page", 名称: "德鲁伊", 默认隐藏: true, layout: { 类型: "htmlTemplate", html: "druid.html", htmlContent: "<main>德鲁伊</main>" } },
      ],
      modules: [
        ...minimalSystemPackage.modules,
        { ID: "pick-class", 类型: "resourcePicker", 按钮文本: "职业", 资源库: [{ ID: "classes" }] },
        { ID: "pick-subclass", 类型: "resourcePicker", 按钮文本: "子职", 资源库: [{ ID: "subclasses" }] },
      ],
      resourceLibraries: [
        {
          ID: "classes", 名称: "职业", 路径: "classes.json",
          fields: [{ key: "名称", label: "名称", visible: true, filterable: true, sortable: true, searchable: true }],
          entries: [{ ID: "class:druid", fields: { 名称: "德鲁伊" } }],
        },
        {
          ID: "subclasses", 名称: "子职", 路径: "subclasses.json",
          fields: [{ key: "主职", label: "主职", visible: true, filterable: true, sortable: true, searchable: true }],
          entries: [],
        },
      ],
      dependencies: [
        {
          ID: "fill-class", sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }], targets: [{ 类型: "module", 模块ID: "character-name" }],
          触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" }, 条件: { 类型: "always" },
          动作: [{ 类型: "fillText", 目标模块ID: "character-name", 内容: { 类型: "selectedResourceField", 字段: "名称" } }],
        },
        {
          ID: "show-druid", sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
          targets: [{ 类型: "page", 页面ID: "druid-page" }, { 类型: "module", 模块ID: "pick-subclass" }],
          触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
          条件: { 类型: "selectedResourceFieldEquals", 字段: "名称", 值: "德鲁伊" },
          动作: [
            { 类型: "setVisibility", 目标类型: "page", 目标ID: "druid-page", 显示: true },
            { 类型: "setResourceDefaultFilter", 目标模块ID: "pick-subclass", 字段: "主职", 值: ["德鲁伊"] },
          ],
        },
      ],
    } as unknown as SystemPackage;
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: derivedPackage, issues: [] }),
      storage: memoryStorage,
    });
    await act(async () => useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob()));

    act(() => useRuntimeStore.getState().commitResourceSelection("pick-class", "classes", [
      { ID: "class:druid", fields: { 名称: "德鲁伊" } },
    ]));
    expect(useRuntimeStore.getState().pageVisibility["druid-page"]).toBe(true);
    expect(useRuntimeStore.getState().resourcePickerDefaultQueries["pick-subclass"].filters).toEqual({ 主职: ["德鲁伊"] });
    expect(useRuntimeStore.getState().characterData?.resourceSelections).toEqual({
      "pick-class": { libraryId: "classes", entryIds: ["class:druid"] },
    });

    act(() => useRuntimeStore.getState().updateModuleValue("character-name", "玩家改写"));
    await waitFor(() => expect(useRuntimeStore.getState().storageStatus).toBe("saved"));
    useRuntimeStore.setState({
      currentPackage: null, characterData: null, pageVisibility: {}, moduleVisibility: {},
      derivedReadOnlyDisplayContent: {}, resourcePickerDefaultQueries: {}, bootStatus: "idle",
    });
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());

    expect(useRuntimeStore.getState().characterData?.resourceSelections).toEqual({
      "pick-class": { libraryId: "classes", entryIds: ["class:druid"] },
    });
    expect(useRuntimeStore.getState().pageVisibility["druid-page"]).toBe(true);
    expect(useRuntimeStore.getState().resourcePickerDefaultQueries["pick-subclass"].filters).toEqual({ 主职: ["德鲁伊"] });
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("玩家改写");

    const druidSaveId = useRuntimeStore.getState().activeCharacterSaveId!;
    await act(async () => useRuntimeStore.getState().createCharacterSave("非德鲁伊角色"));
    expect(useRuntimeStore.getState().pageVisibility["druid-page"]).toBeUndefined();
    expect(useRuntimeStore.getState().resourcePickerDefaultQueries["pick-subclass"]).toBeUndefined();

    await act(async () => useRuntimeStore.getState().switchCharacterSave(druidSaveId));
    expect(useRuntimeStore.getState().characterData?.resourceSelections).toEqual({
      "pick-class": { libraryId: "classes", entryIds: ["class:druid"] },
    });
    expect(useRuntimeStore.getState().pageVisibility["druid-page"]).toBe(true);
    expect(useRuntimeStore.getState().resourcePickerDefaultQueries["pick-subclass"].filters).toEqual({ 主职: ["德鲁伊"] });
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("玩家改写");
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
      cardTableCardWidths: {},
      validationIssues: [],
      validationStatus: "idle",
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

  it("runs Validation Checks through the runtime store", async () => {
    const packageWithChecks = {
      ...minimalSystemPackage,
      validationChecks: [
        {
          ID: "demo-check",
          脚本: "checks/demo.js",
          scriptContent: "module.exports = () => [];",
        },
      ],
    };
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: packageWithChecks, issues: [] }),
      storage: memoryStorage,
      runValidationChecks: async () => [
        {
          level: "warning",
          text: "需要检查职业",
          code: "CLASS_REVIEW",
          source: "demo-check",
        },
      ],
    });

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
      await useRuntimeStore.getState().runValidationChecks();
    });

    expect(useRuntimeStore.getState().validationStatus).toBe("complete");
    expect(useRuntimeStore.getState().validationIssues).toEqual([
      expect.objectContaining({
        level: "warning",
        code: "CLASS_REVIEW",
        source: "demo-check",
      }),
    ]);
  });

  it("completes with no issues when the current package has no Validation Checks", async () => {
    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
      await useRuntimeStore.getState().runValidationChecks();
    });

    expect(useRuntimeStore.getState().validationStatus).toBe("complete");
    expect(useRuntimeStore.getState().validationIssues).toEqual([]);
  });

  it("uses one pre-output Validation Check flow and prompts only when issues exist", async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({
        ok: true,
        package: {
          ...minimalSystemPackage,
          validationChecks: [{ ID: "output-check", 脚本: "checks/output.js", scriptContent: "module.exports = () => [];" }],
        },
        issues: [],
      }),
      storage: memoryStorage,
      runValidationChecks: async () => [
        {
          level: "error",
          text: "输出前检查",
          code: "OUTPUT_CHECK",
          source: "output-check",
        },
      ],
    });

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
      const result = await useRuntimeStore.getState().runPreOutputValidation();
      expect(result).toEqual([expect.objectContaining({ code: "OUTPUT_CHECK" })]);
    });

    configureRuntimeDependencies({
      storage: memoryStorage,
      runValidationChecks: async () => [],
    });

    await act(async () => {
      const result = await useRuntimeStore.getState().runPreOutputValidation();
      expect(result).toEqual([]);
    });
  });

  it("creates a Card Instance when a Resource Picker has a card creation target", async () => {
    const packageWithCards = {
      ...minimalSystemPackage,
      resourceLibraries: [
        {
          ID: "domain-cards",
          名称: "领域卡",
          路径: "resources/domain_cards.json",
          fields: [
            { key: "ID", label: "ID", visible: true, filterable: true, sortable: true },
            { key: "名称", label: "名称", visible: true, filterable: true, sortable: true },
          ],
          entries: [{ ID: "domain-card:符文护符", fields: { ID: "domain-card:符文护符", 名称: "符文护符" } }],
        },
        {
          ID: "bonus-cards",
          名称: "额外卡牌",
          路径: "resources/bonus_cards.json",
          fields: [
            { key: "ID", label: "ID", visible: true, filterable: true, sortable: true },
            { key: "名称", label: "名称", visible: true, filterable: true, sortable: true },
          ],
          entries: [{ ID: "bonus-card:补给", fields: { ID: "bonus-card:补给", 名称: "补给" } }],
        },
      ],
      modules: [
        ...minimalSystemPackage.modules,
        {
          ID: "pick-domain-card",
          类型: "resourcePicker",
          按钮文本: "选择领域卡",
          资源库: [{ ID: "domain-cards" }],
          创建卡牌: { 卡牌桌面模块ID: "domain-card-table", 默认状态: "configured" },
        },
        {
          ID: "domain-card-table",
          类型: "cardTable",
          标签: "领域卡牌桌面",
          资源来源: [
            { 类型: "resourceLibrary", ID: "domain-cards" },
            { 类型: "resourceLibrary", ID: "bonus-cards" },
          ],
        },
        {
          ID: "pick-bonus-card",
          类型: "resourcePicker",
          按钮文本: "选择额外卡牌",
          资源库: [{ ID: "bonus-cards" }],
          创建卡牌: { 卡牌桌面模块ID: "domain-card-table", 默认状态: "vault" },
        },
      ],
    } as typeof minimalSystemPackage;
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: packageWithCards, issues: [] }),
      storage: memoryStorage,
    });

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    act(() => {
      useRuntimeStore.getState().commitResourceSelection("pick-domain-card", "domain-cards", [
        { ID: "domain-card:符文护符", fields: { ID: "domain-card:符文护符", 名称: "符文护符" } },
      ]);
      useRuntimeStore.getState().commitResourceSelection("pick-bonus-card", "bonus-cards", [
        { ID: "bonus-card:补给", fields: { ID: "bonus-card:补给", 名称: "补给" } },
      ]);
    });

    expect(useRuntimeStore.getState().characterData?.cards.instances).toEqual([
      expect.objectContaining({
        tableModuleId: "domain-card-table",
        definitionRef: { type: "resourceLibrary", libraryId: "domain-cards", entryId: "domain-card:符文护符" },
        state: "configured",
      }),
      expect.objectContaining({
        tableModuleId: "domain-card-table",
        definitionRef: { type: "resourceLibrary", libraryId: "bonus-cards", entryId: "bonus-card:补给" },
        state: "vault",
      }),
    ]);

    await waitFor(() => {
      expect(useRuntimeStore.getState().storageStatus).toBe("saved");
    });
  });

  it("persists a replaced Composite Resource immediately and preserves its Card Instance", async () => {
    const composerPackage = {
      ...minimalSystemPackage,
      resourceLibraries: [{
        ID: "ancestries", 名称: "种族", 路径: "ancestries.json",
        fields: [
          { key: "ID", label: "ID", visible: false, filterable: false, sortable: false },
          { key: "名称", label: "名称", visible: true, filterable: true, sortable: true },
          { key: "特性A", label: "特性A", visible: true, filterable: true, sortable: true },
          { key: "特性B", label: "特性B", visible: true, filterable: true, sortable: true },
        ],
        entries: [],
      }],
      modules: [
        ...minimalSystemPackage.modules,
        {
          ID: "compose-ancestry", 类型: "resourceComposer", 按钮文本: "组合种族",
          来源槽位: [
            { ID: "a", 标签: "A", 资源库ID: "ancestries" },
            { ID: "b", 标签: "B", 资源库ID: "ancestries" },
          ],
          输出字段: [
            { 字段: "名称", 来源槽位ID: "a", 来源字段: "名称" },
            { 字段: "特性A", 来源槽位ID: "a", 来源字段: "特性A" },
            { 字段: "特性B", 来源槽位ID: "b", 来源字段: "特性B" },
          ],
          选择关系输出: { 字段: "卡牌显示方式", 全部相同时: "image", 不全相同时: "text" },
          创建卡牌: { 卡牌桌面模块ID: "cards", 默认状态: "配置" },
        },
        { ID: "cards", 类型: "cardTable", 标签: "卡牌", 资源来源: [{ 类型: "resourceComposer", ID: "compose-ancestry" }] },
      ],
      dependencies: [{
        ID: "fill-ancestry", sources: [{ 类型: "resourceComposer", 模块ID: "compose-ancestry" }],
        targets: [{ 类型: "module", 模块ID: "character-name" }],
        触发: { 类型: "resourceSelected", 来源模块ID: "compose-ancestry" },
        条件: { 类型: "always" },
        动作: [{ 类型: "fillText", 目标模块ID: "character-name", 内容: { 类型: "selectedResourceField", 字段: "特性B" } }],
      }],
    } as typeof minimalSystemPackage;
    configureRuntimeDependencies({ loadSystemPackageFromFile: async () => ({ ok: true, package: composerPackage, issues: [] }), storage: memoryStorage });
    await act(async () => { await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob()); });
    const elf = { ID: "elf", fields: { ID: "elf", 名称: "精灵", 特性A: "敏锐", 特性B: "冥想" } };
    const human = { ID: "human", fields: { ID: "human", 名称: "人类", 特性A: "活力", 特性B: "应变" } };

    act(() => useRuntimeStore.getState().commitResourceComposition("compose-ancestry", { a: elf, b: human }));
    const firstCard = useRuntimeStore.getState().characterData?.cards.instances[0];
    expect(useRuntimeStore.getState().characterData?.compositeResources["compose-ancestry"].fields).toMatchObject({ 名称: "精灵", 特性A: "敏锐", 特性B: "应变" });
    expect(useRuntimeStore.getState().characterData?.compositeResources["compose-ancestry"].fields.卡牌显示方式).toBe("text");
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("应变");
    expect(firstCard?.definitionRef).toEqual({ type: "compositeResource", compositeResourceId: "composite:compose-ancestry" });
    await waitFor(() => expect(useRuntimeStore.getState().storageStatus).toBe("saved"));

    act(() => {
      if (firstCard) useRuntimeStore.getState().updateCardInstancePosition(firstCard.instanceId, 41, 29);
      useRuntimeStore.getState().commitResourceComposition("compose-ancestry", { a: elf, b: elf });
    });
    const cards = useRuntimeStore.getState().characterData?.cards.instances ?? [];
    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual(expect.objectContaining({ instanceId: firstCard?.instanceId, xPct: 41, yPct: 29 }));
    expect(useRuntimeStore.getState().characterData?.compositeResources["compose-ancestry"].fields.特性B).toBe("冥想");
    expect(useRuntimeStore.getState().characterData?.compositeResources["compose-ancestry"].fields.卡牌显示方式).toBe("image");

    const saveId = useRuntimeStore.getState().activeCharacterSaveId;
    expect(saveId).toBeTruthy();
    await act(async () => { if (saveId) await useRuntimeStore.getState().switchCharacterSave(saveId); });
    expect(useRuntimeStore.getState().characterData?.compositeResources["compose-ancestry"].fields.卡牌显示方式).toBe("image");
  });
});
