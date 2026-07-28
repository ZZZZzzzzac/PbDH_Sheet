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
      pendingCardTablePlacements: {},
      authorPreviewActive: false,
    });
    await useRuntimeStore.getState().initialize();
  });

  afterEach(() => {
    resetRuntimeDependencies();
    vi.restoreAllMocks();
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
    const createdIds = useRuntimeStore.getState().characterData?.cards.instances.map((instance) => instance.instanceId);
    expect(useRuntimeStore.getState().pendingCardTablePlacements["domain-card-table"]).toEqual(createdIds);

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
