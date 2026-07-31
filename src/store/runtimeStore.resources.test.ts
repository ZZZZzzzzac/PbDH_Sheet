import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { minimalSystemPackage } from "../test/fixtures";
import { createMemoryStorage } from "../test/memoryStorage";
import type { PackageDirectoryHandle } from "../loaders/packageVfs";
import type { SystemPackage } from "../domain/systemPackage";
import { loadResourceExtensionJson } from "../domain/resourceExtension";
import { createCardInstance } from "../domain/cardEngine";
import { createEmptyCharacterData, exportCharacterData } from "../domain/characterData";
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

  it("previews external resource conversion and keeps catalog/storage unchanged on cancel", async () => {
    const basePackage = {
      ...minimalSystemPackage,
      resourceLibraries: [{ ID: "cards", 名称: "卡牌", 路径: "cards.json", fields: [], entries: [] }],
      resourceFormatAdapters: [{
        ID: "external-cards", 名称: "External Cards",
        载体: [{ 类型: "json", 根类型: "array", 文件后缀: ".json", 检测: [{ 路径: [0, "kind"], 等于: "card" }] }],
        导入脚本: "adapters/import.js",
        importScriptContent: "module.exports=({document,fileName})=>({name:fileName.replace(/\\.json$/,''),resourceLibraries:[{ID:'cards',名称:'卡牌',entries:document.map((item,index)=>({ID:item.id||`external-${index}`,名称:item.name}))}],counts:{sourceEntries:document.length,convertedEntries:document.length,skippedEntries:0,convertedFields:document.length,skippedFields:0,boundImages:0,orphanImages:0}})",
      }, {
        ID: "external-cards-second", 名称: "External Cards Second",
        载体: [{ 类型: "json", 根类型: "array", 文件后缀: ".json", 检测: [{ 路径: [0, "kind"], 等于: "card" }] }],
        导入脚本: "adapters/import.js",
        importScriptContent: "module.exports=({document,fileName})=>({name:fileName.replace(/\\.json$/,''),resourceLibraries:[{ID:'cards',名称:'卡牌',entries:document.map((item,index)=>({ID:item.id||`external-${index}`,名称:item.name}))}],counts:{sourceEntries:document.length,convertedEntries:document.length,skippedEntries:0,convertedFields:document.length,skippedFields:0,boundImages:0,orphanImages:0}})",
      }],
    } as unknown as SystemPackage;
    configureRuntimeDependencies({ loadSystemPackageFromFile: async () => ({ ok: true, package: basePackage, issues: [] }), storage: memoryStorage });
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    const source = () => new File([JSON.stringify([{ kind: "card", name: "External" }])], "cards.json", { type: "application/json" });

    await useRuntimeStore.getState().uploadResourceExtensionFromFile(source());
    expect(useRuntimeStore.getState().pendingResourceFormatSelection?.adapters).toHaveLength(2);
    expect(await memoryStorage.listResourceExtensions(basePackage.manifest.ID)).toEqual([]);
    await useRuntimeStore.getState().selectResourceFormatAdapter("external-cards");
    expect(useRuntimeStore.getState().pendingResourceExtensionConversion?.loaded.conversion?.counts.convertedEntries).toBe(1);
    expect(useRuntimeStore.getState().currentPackage?.resourceLibraries?.[0].entries).toEqual([]);
    expect(await memoryStorage.listResourceExtensions(basePackage.manifest.ID)).toEqual([]);
    useRuntimeStore.getState().cancelResourceExtensionConversion();
    expect(await memoryStorage.listResourceExtensions(basePackage.manifest.ID)).toEqual([]);

    await useRuntimeStore.getState().uploadResourceExtensionFromFile(source());
    await useRuntimeStore.getState().selectResourceFormatAdapter("external-cards");
    await useRuntimeStore.getState().confirmResourceExtensionConversion();
    expect(useRuntimeStore.getState().currentPackage?.resourceLibraries?.[0].entries[0].fields.名称).toBe("External");
    expect(await memoryStorage.listResourceExtensions(basePackage.manifest.ID)).toHaveLength(1);

    await useRuntimeStore.getState().uploadResourceExtensionFromFile(source());
    await useRuntimeStore.getState().selectResourceFormatAdapter("external-cards");
    await useRuntimeStore.getState().confirmResourceExtensionConversion();
    expect(useRuntimeStore.getState().pendingResourceExtensionReplacement?.extension.名称).toBe("cards");
    useRuntimeStore.getState().cancelResourceExtensionReplacement();
    expect(await memoryStorage.listResourceExtensions(basePackage.manifest.ID)).toHaveLength(1);
  });

  it("does not mutate the active Character Save until a lossy external conversion is confirmed", async () => {
    const basePackage = {
      ...minimalSystemPackage,
      characterFormatAdapters: [{
        ID: "external-character", 名称: "External Character",
        载体: [{ 类型: "json", 根类型: "object", 文件后缀: ".json", 检测: [{ 路径: ["external"], 等于: true }] }],
        导入脚本: "adapters/import.js",
        importScriptContent: "module.exports=({document})=>({values:{'character-name':document.name},suggestedSaveName:document.name,skippedFields:1,diagnostics:[{level:'warning',code:'TEST_SKIPPED',text:'one skipped field'}]})",
      }, {
        ID: "external-character-second", 名称: "External Character Second",
        载体: [{ 类型: "json", 根类型: "object", 文件后缀: ".json", 检测: [{ 路径: ["external"], 等于: true }] }],
        导入脚本: "adapters/import.js",
        importScriptContent: "module.exports=({document})=>({values:{'character-name':document.name},suggestedSaveName:document.name})",
      }],
    } as unknown as SystemPackage;
    configureRuntimeDependencies({ loadSystemPackageFromFile: async () => ({ ok: true, package: basePackage, issues: [] }), storage: memoryStorage });
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    const before = useRuntimeStore.getState().characterData;
    const saveCount = (await memoryStorage.listCharacterSaves(basePackage.manifest.ID)).length;

    await useRuntimeStore.getState().importCharacterDataFromFile(new File([JSON.stringify({ external: true, name: "Converted" })], "character.json"));
    expect(useRuntimeStore.getState().pendingCharacterFormatSelection?.adapters).toHaveLength(2);
    await useRuntimeStore.getState().selectCharacterFormatAdapter("external-character");
    expect(useRuntimeStore.getState().pendingCharacterConversion?.report.skippedFields).toBe(1);
    expect(useRuntimeStore.getState().characterData).toBe(before);
    expect(await memoryStorage.listCharacterSaves(basePackage.manifest.ID)).toHaveLength(saveCount);
    useRuntimeStore.getState().cancelCharacterConversion();
    expect(useRuntimeStore.getState().characterData).toBe(before);

    await useRuntimeStore.getState().importCharacterDataFromFile(new File([JSON.stringify({ external: true, name: "Converted" })], "character.json"));
    await useRuntimeStore.getState().selectCharacterFormatAdapter("external-character");
    await useRuntimeStore.getState().confirmCharacterConversion();
    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("Converted");
    expect(useRuntimeStore.getState().activeCharacterSaveId).not.toBe(before?.character.id);
    expect(await memoryStorage.listCharacterSaves(basePackage.manifest.ID)).toHaveLength(saveCount + 1);
    expect(await memoryStorage.listResourceExtensions(basePackage.manifest.ID)).toEqual([]);
  });

  it("creates new saves for lossless and confirmed lossy native Character Data imports", async () => {
    await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    const original = useRuntimeStore.getState().characterData!;
    const initialSaveCount = (await memoryStorage.listCharacterSaves(minimalSystemPackage.manifest.ID)).length;

    const lossless = createEmptyCharacterData(minimalSystemPackage, original.character.id);
    lossless.systemPackage.version = "0.0.1";
    lossless.character.values["character-name"] = "兼容角色";
    await useRuntimeStore.getState().importCharacterDataFromText(exportCharacterData(lossless));

    const importedLossless = useRuntimeStore.getState().characterData!;
    expect(useRuntimeStore.getState().pendingCharacterConversion).toBeNull();
    expect(importedLossless.character.values["character-name"]).toBe("兼容角色");
    expect(importedLossless.character.id).not.toBe(original.character.id);
    expect(importedLossless.systemPackage.version).toBe(minimalSystemPackage.manifest.版本);
    expect(await memoryStorage.listCharacterSaves(minimalSystemPackage.manifest.ID)).toHaveLength(initialSaveCount + 1);

    const lossy = createEmptyCharacterData(minimalSystemPackage, original.character.id);
    lossy.character.values.removed = "不可用";
    const beforeLossy = useRuntimeStore.getState().characterData;
    await useRuntimeStore.getState().importCharacterDataFromText(exportCharacterData(lossy));

    expect(useRuntimeStore.getState().characterData).toBe(beforeLossy);
    expect(useRuntimeStore.getState().pendingCharacterConversion).toMatchObject({
      sourceName: "PbDH Character Data",
      report: { skippedFields: 1 },
    });
    expect(await memoryStorage.listCharacterSaves(minimalSystemPackage.manifest.ID)).toHaveLength(initialSaveCount + 1);

    await useRuntimeStore.getState().confirmCharacterConversion();
    expect(useRuntimeStore.getState().characterData?.character.id).not.toBe(original.character.id);
    expect(await memoryStorage.listCharacterSaves(minimalSystemPackage.manifest.ID)).toHaveLength(initialSaveCount + 2);
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

});
