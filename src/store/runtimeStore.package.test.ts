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
      releaseVersion: "2.0.1",
      directory: "unavailable",
      files: ["manifest.json"],
    });

    expect(useRuntimeStore.getState().currentPackage).toBe(previousPackage);
    expect(useRuntimeStore.getState().bootStatus).toBe("ready");
    expect(useRuntimeStore.getState().packageIssues[0]?.code).toBe("PRESET_PACKAGE_FETCH_FAILED");
    expect(memoryStorage.getCachedPackage()?.manifest.ID).toBe("demo-minimal");
  });

  it("exposes incoming preset presentation and metadata progress only while switching", async () => {
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    configureRuntimeDependencies({
      storage: memoryStorage,
      loadPresetSystemPackage: async (_preset, onProgress) => {
        onProgress?.({ completed: 2, total: 4 });
        await gate;
        return { ok: false, issues: [{ level: "fatal", code: "PRESET_PACKAGE_FETCH_FAILED", text: "offline" }] };
      },
    });

    const switching = useRuntimeStore.getState().switchToPresetSystemPackage({
      id: "themed-preset",
      name: "主题预制包",
      version: "1",
      releaseVersion: "2.0.1",
      directory: "themed-preset",
      files: ["manifest.json", "pages.json", "modules.json", "layouts/main.html", "assets/card.webp"],
      loadingPresentation: { 标语: "罗德岛正在接驳", 强调色: "#63bfd1" },
    });
    await Promise.resolve();

    expect(useRuntimeStore.getState()).toMatchObject({
      bootStatus: "loading",
      packageLoadProgress: { completed: 2, total: 4 },
      packageLoadingPresentation: { 标语: "罗德岛正在接驳", 强调色: "#63bfd1" },
    });

    release();
    await switching;
    expect(useRuntimeStore.getState()).toMatchObject({
      bootStatus: "ready",
      packageLoadProgress: null,
      packageLoadingPresentation: null,
    });
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

  it("prepares missing questionnaire resources as warnings and applies available selections", () => {
    const questionnairePackage = {
      ...minimalSystemPackage,
      questionnaireCharacterCreation: { ID: "questionnaire", 名称: "职业问卷", htmlContent: "<p>问卷</p>" },
      modules: [
        { ID: "pick-class", 类型: "resourcePicker", 按钮文本: "选择职业", 资源库: [{ ID: "classes" }] },
        { ID: "class-name", 类型: "freeText", 标签: "职业" },
      ],
      dependencies: [{
        ID: "class-name",
        sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
        targets: [{ 类型: "module", 模块ID: "class-name" }],
        触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
        动作: [{ 类型: "fillText", 目标模块ID: "class-name", 内容: { 类型: "selectedResourceField", 字段: "名称" } }],
      }],
      resourceLibraries: [{
        ID: "classes",
        名称: "职业",
        路径: "resources/classes.json",
        fields: [{ key: "名称", label: "名称", visible: true, filterable: false, sortable: false, searchable: true }],
        entries: [{ ID: "职业:德鲁伊", fields: { 名称: "德鲁伊" } }],
      }],
    } as SystemPackage;
    const characterData = createEmptyCharacterData(questionnairePackage, "character:questionnaire");
    useRuntimeStore.setState({ currentPackage: questionnairePackage, characterData });

    useRuntimeStore.getState().prepareQuestionnaireResult("questionnaire", {
      protocolVersion: "1",
      interactions: [
        { type: "resourceSelected", sourceModuleId: "pick-class", libraryId: "classes", entryIds: ["职业:德鲁伊"] },
        { type: "resourceSelected", sourceModuleId: "pick-class", libraryId: "classes", entryIds: ["虚空:职业:女巫"] },
      ],
    });

    const pending = useRuntimeStore.getState().pendingQuestionnaireResult;
    expect(pending?.selections).toEqual([expect.objectContaining({ entries: [{ id: "职业:德鲁伊", name: "德鲁伊" }] })]);
    expect(pending?.missingResources).toEqual([expect.objectContaining({ entryId: "虚空:职业:女巫" })]);
    expect(useRuntimeStore.getState().importError).toBeNull();

    useRuntimeStore.getState().confirmQuestionnaireResult();
    expect(useRuntimeStore.getState().characterData?.character.values["class-name"]).toBe("德鲁伊");
  });

  it("refreshes a preset cache created by an older Base release and preserves the Character Save", async () => {
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    const characterId = useRuntimeStore.getState().characterData?.character.id;
    const preset = {
      id: minimalSystemPackage.manifest.ID,
      name: minimalSystemPackage.manifest.名称,
      version: "0.2.0",
      releaseVersion: "2.0.1",
      directory: "demo-minimal",
      files: ["manifest.json", "modules.json", "assets/card.webp"],
    };
    const refreshedPackage: SystemPackage = {
      ...minimalSystemPackage,
      manifest: { ...minimalSystemPackage.manifest, 版本: preset.version },
    };
    await memoryStorage.saveCurrentSystemPackage(
      minimalSystemPackage,
      [{ 路径: "assets/card.webp", 类型: "image/webp", staticUrl: "/pbdh/system-packages/demo-minimal/assets/card.webp?v=2.0.0" }],
      { source: "preset", presetId: preset.id, releaseVersion: "2.0.0" },
    );
    const loadPreset = vi.fn(async () => ({ ok: true as const, package: refreshedPackage, issues: [], packageAssets: [] }));
    configureRuntimeDependencies({ storage: memoryStorage, loadPresetSystemPackage: loadPreset });
    useRuntimeStore.setState({ currentPackage: null, characterData: null, bootStatus: "idle" });

    await useRuntimeStore.getState().initialize([preset]);

    expect(loadPreset).toHaveBeenCalledOnce();
    expect(useRuntimeStore.getState().currentPackage?.manifest.版本).toBe("0.2.0");
    expect(useRuntimeStore.getState().characterData?.character.id).toBe(characterId);
    expect(memoryStorage.getCacheMetadata()).toEqual({ source: "preset", presetId: preset.id, releaseVersion: "2.0.1" });
  });

  it("migrates a legacy shipped preset cache by recognizing its static asset URLs", async () => {
    const legacyStorage = createMemoryStorage(minimalSystemPackage, {
      packageAssets: [{ 路径: "assets/card.webp", 类型: "image/webp", staticUrl: "/pbdh/system-packages/demo-minimal/assets/card.webp" }],
    });
    const preset = {
      id: minimalSystemPackage.manifest.ID,
      name: minimalSystemPackage.manifest.名称,
      version: minimalSystemPackage.manifest.版本,
      releaseVersion: "2.0.1",
      directory: "demo-minimal",
      files: ["manifest.json", "assets/card.webp"],
    };
    const loadPreset = vi.fn(async () => ({ ok: true as const, package: minimalSystemPackage, issues: [], packageAssets: [] }));
    configureRuntimeDependencies({ storage: legacyStorage, loadPresetSystemPackage: loadPreset });

    await useRuntimeStore.getState().initialize([preset]);

    expect(loadPreset).toHaveBeenCalledOnce();
    expect(legacyStorage.getCacheMetadata()).toEqual({ source: "preset", presetId: preset.id, releaseVersion: "2.0.1" });
  });

  it("does not replace an imported package or a current-release preset cache", async () => {
    const preset = {
      id: minimalSystemPackage.manifest.ID,
      name: minimalSystemPackage.manifest.名称,
      version: minimalSystemPackage.manifest.版本,
      releaseVersion: "2.0.1",
      directory: "demo-minimal",
      files: ["manifest.json"],
    };
    const loadPreset = vi.fn(async () => ({ ok: true as const, package: minimalSystemPackage, issues: [] }));

    for (const cacheMetadata of [
      { source: "imported" as const },
      { source: "preset" as const, presetId: preset.id, releaseVersion: preset.releaseVersion },
    ]) {
      const protectedStorage = createMemoryStorage(minimalSystemPackage, { cacheMetadata });
      configureRuntimeDependencies({ storage: protectedStorage, loadPresetSystemPackage: loadPreset });
      await useRuntimeStore.getState().initialize([preset]);
    }

    expect(loadPreset).not.toHaveBeenCalled();
  });

  it("falls back to the cached preset with a warning when its refresh fails", async () => {
    const preset = {
      id: minimalSystemPackage.manifest.ID,
      name: minimalSystemPackage.manifest.名称,
      version: minimalSystemPackage.manifest.版本,
      releaseVersion: "2.0.1",
      directory: "demo-minimal",
      files: ["manifest.json"],
    };
    const staleStorage = createMemoryStorage(minimalSystemPackage, {
      cacheMetadata: { source: "preset", presetId: preset.id, releaseVersion: "2.0.0" },
    });
    configureRuntimeDependencies({
      storage: staleStorage,
      loadPresetSystemPackage: async () => ({ ok: false, issues: [{ level: "fatal", code: "PRESET_PACKAGE_FETCH_FAILED", text: "offline" }] }),
    });

    await useRuntimeStore.getState().initialize([preset]);

    expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe(preset.id);
    expect(useRuntimeStore.getState().bootStatus).toBe("ready");
    expect(useRuntimeStore.getState().packageIssues).toContainEqual(expect.objectContaining({ level: "warning", code: "PRESET_CACHE_REFRESH_FAILED" }));
  });

});
