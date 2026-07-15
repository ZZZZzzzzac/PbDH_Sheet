import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageService } from "../storage/storageService";
import { minimalSystemPackage } from "../test/fixtures";
import type { PackageDirectoryHandle } from "../loaders/packageVfs";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./runtimeStore";

function createMemoryStorage(cachedPackage: unknown = null): StorageService & {
  getCachedPackage: () => unknown;
} {
  let savedData: Awaited<ReturnType<StorageService["loadCurrentCharacterData"]>> = null;
  const characterSaves = new Map<string, { id: string; packageId: string; name: string; updatedAt: string; data: NonNullable<typeof savedData> }>();
  const activeSaveIds = new Map<string, string>();
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
    async savePlayerImageBlob(image) {
      playerImages.set(image.id, image);
    },
    async loadPlayerImageBlob(imageId) {
      return playerImages.get(imageId) ?? null;
    },
    async deletePlayerImageBlob(imageId) {
      playerImages.delete(imageId);
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

  it("removes a player image from Character Data and blob storage", async () => {
    renderHook(() => useRuntimeStore());
    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
      await useRuntimeStore.getState().uploadPlayerImage("portrait", new File(["image"], "portrait.png", { type: "image/png" }));
    });
    const imageId = (useRuntimeStore.getState().characterData?.character.values.portrait as { imageId: string }).imageId;
    expect(await memoryStorage.loadPlayerImageBlob(imageId)).not.toBeNull();

    await act(async () => useRuntimeStore.getState().removePlayerImage("portrait"));

    expect(useRuntimeStore.getState().characterData?.character.values.portrait).toBeUndefined();
    expect(useRuntimeStore.getState().characterData?.playerImages[imageId]).toBeUndefined();
    expect(await memoryStorage.loadPlayerImageBlob(imageId)).toBeNull();
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
          资源库ID: "domain-cards",
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
          资源库ID: "bonus-cards",
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

  it("replaces one Composite Resource, drives dependencies, and preserves its Card Instance", async () => {
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
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("应变");
    expect(firstCard?.definitionRef).toEqual({ type: "compositeResource", compositeResourceId: "composite:compose-ancestry" });

    act(() => {
      if (firstCard) useRuntimeStore.getState().updateCardInstancePosition(firstCard.instanceId, 41, 29);
      useRuntimeStore.getState().commitResourceComposition("compose-ancestry", { a: elf, b: elf });
    });
    const cards = useRuntimeStore.getState().characterData?.cards.instances ?? [];
    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual(expect.objectContaining({ instanceId: firstCard?.instanceId, xPct: 41, yPct: 29 }));
    expect(useRuntimeStore.getState().characterData?.compositeResources["compose-ancestry"].fields.特性B).toBe("冥想");
  });
});
