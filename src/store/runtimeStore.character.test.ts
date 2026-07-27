import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { minimalSystemPackage } from "../test/fixtures";
import { createMemoryStorage } from "../test/memoryStorage";
import type { PackageDirectoryHandle } from "../loaders/packageVfs";
import type { SystemPackage } from "../domain/systemPackage";
import { loadResourceExtensionJson } from "../domain/resourceExtension";
import { createCardInstance } from "../domain/cardEngine";
import { createEmptyCharacterData } from "../domain/characterData";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./runtimeStore";

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
      pendingResourceExtensionReplacement: null,
      pendingResourceExtensionConversion: null,
      pendingResourceFormatSelection: null,
      pendingResourceExtensionRemoval: null,
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
      pendingCharacterConversion: null,
      pendingCharacterFormatSelection: null,
      pendingQuestionnaireResult: null,
      authorPreviewActive: false,
    });
    await useRuntimeStore.getState().initialize();
  });

  afterEach(() => {
    resetRuntimeDependencies();
    vi.restoreAllMocks();
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

});
