import { create } from "zustand";
import {
  bringCardInstanceToFront as bringCardInstanceToFrontDomain,
  type CardTableLayout,
  clampCardWidth,
  deleteCardInstance as deleteCardInstanceDomain,
  tidyCardTable as tidyCardTableDomain,
  updateCardInstancePosition as updateCardInstancePositionDomain,
  updateCardInstanceState as updateCardInstanceStateDomain,
} from "../domain/cardEngine";
import {
  type CheckboxState,
  createEmptyCharacterData,
  updateCharacterValue,
  updatePlayerImage,
  type CharacterData,
  type PlayerImageData,
  type SheetValue,
} from "../domain/characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies } from "../domain/dependencyEngine";
import type { ResourceLibraryEntry, ResourceLibraryQuery } from "../domain/resourceLibrary";
import { validateCachedSystemPackage, type PackageIssue, type SystemPackage } from "../domain/systemPackage";
import { runValidationChecks as runValidationChecksDomain, type ValidationIssue } from "../domain/validationRunner";
import { parseCharacterDataText } from "../export/output";
import { createRuntimeAssetResolver, type RuntimeAssetResolver, type RuntimePackageAsset } from "../loaders/assetResolver";
import type { PackageDirectoryHandle } from "../loaders/packageVfs";
import { loadSystemPackageFromDirectoryFiles, loadSystemPackageFromDirectoryHandle, loadSystemPackageFromZipFile, type PackageLoadResult } from "../loaders/systemPackageLoader";
import { loadAuthorPreviewDirectoryHandle, saveAuthorPreviewDirectoryHandle, storageService, type CharacterSaveSummary, type StorageService } from "../storage/storageService";
import { generateId } from "../utils";
import {
  createCardInstancesFromSelection,
  ensureCardState,
  fileToDataUrl,
  hasCardCreationTarget,
  loadActiveCharacterForPackage,
  mergeDependencyRuntimeState,
  saveImportedPlayerImages,
  warnDependencyIssues,
} from "./runtimeHelpers";

export const autosaveDelayMs = 250;

type BootStatus = "idle" | "loading" | "ready" | "error";
type StorageStatus = "idle" | "saving" | "saved" | "error";
type ValidationStatus = "idle" | "running" | "complete";

interface RuntimeState {
  currentPackage: SystemPackage | null;
  packageAssetUrls: Record<string, string>;
  packageIssues: PackageIssue[];
  characterData: CharacterData | null;
  characterSaves: CharacterSaveSummary[];
  activeCharacterSaveId: string | null;
  derivedReadOnlyDisplayContent: Record<string, string>;
  moduleVisibility: Record<string, boolean>;
  pageVisibility: Record<string, boolean>;
  resourcePickerDefaultQueries: Record<string, ResourceLibraryQuery>;
  cardTableCardWidths: Record<string, number>;
  validationIssues: ValidationIssue[];
  validationStatus: ValidationStatus;
  bootStatus: BootStatus;
  storageStatus: StorageStatus;
  importError: string | null;
  importNotice: string | null;
  authorPreviewActive: boolean;
  initialize: () => Promise<void>;
  uploadSystemPackageFromFile: (file: Blob) => Promise<void>;
  uploadSystemPackageFromDirectory: (files: Iterable<File>) => Promise<void>;
  enterAuthorPreview: (handle: PackageDirectoryHandle) => Promise<void>;
  exitAuthorPreview: () => void;
  createCharacterSave: (name?: string) => Promise<void>;
  switchCharacterSave: (saveId: string) => Promise<void>;
  renameCharacterSave: (saveId: string, name: string) => Promise<void>;
  duplicateCharacterSave: (saveId: string, name?: string) => Promise<void>;
  deleteCharacterSave: (saveId: string) => Promise<void>;
  updateModuleValue: (moduleId: string, value: SheetValue) => void;
  commitResourceSelection: (moduleId: string, libraryId: string, entries: ResourceLibraryEntry[]) => void;
  commitCheckboxChange: (moduleId: string, optionId: string, checked: boolean, checkboxState: CheckboxState) => void;
  updateCardInstancePosition: (instanceId: string, xPct: number, yPct: number) => void;
  bringCardInstanceToFront: (instanceId: string) => void;
  updateCardInstanceState: (instanceId: string, cardState: string) => void;
  tidyCardTable: (tableModuleId: string, layout: CardTableLayout) => void;
  setCardTableCardWidth: (tableModuleId: string, widthPx: number) => void;
  deleteCardInstance: (instanceId: string) => void;
  runValidationChecks: () => Promise<void>;
  runPreOutputValidation: () => Promise<ValidationIssue[]>;
  uploadPlayerImage: (moduleId: string, file: File) => Promise<void>;
  importCharacterDataFromText: (text: string) => Promise<void>;
  clearImportMessage: () => void;
}

let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
let activePackageAssetResolver: RuntimeAssetResolver | undefined;

interface RuntimeDependencies {
  loadSystemPackageFromFile: (file: Blob) => Promise<PackageLoadResult>;
  loadSystemPackageFromDirectory: (files: Iterable<File>) => Promise<PackageLoadResult>;
  loadSystemPackageFromDirectoryHandle: (handle: PackageDirectoryHandle) => Promise<PackageLoadResult>;
  loadPreviewDirectoryHandle: () => Promise<PackageDirectoryHandle | null>;
  savePreviewDirectoryHandle: (handle: PackageDirectoryHandle) => Promise<void>;
  storage: StorageService;
  runValidationChecks: typeof runValidationChecksDomain;
}

const defaultRuntimeDependencies: RuntimeDependencies = {
  loadSystemPackageFromFile: (file) => loadSystemPackageFromZipFile(file),
  loadSystemPackageFromDirectory: (files) => loadSystemPackageFromDirectoryFiles(files),
  loadSystemPackageFromDirectoryHandle: (handle) => loadSystemPackageFromDirectoryHandle(handle),
  loadPreviewDirectoryHandle: () => loadAuthorPreviewDirectoryHandle(),
  savePreviewDirectoryHandle: (handle) => saveAuthorPreviewDirectoryHandle(handle),
  storage: storageService,
  runValidationChecks: runValidationChecksDomain,
};

let runtimeDependencies = defaultRuntimeDependencies;
const authorPreviewSessionKey = "pbdh-author-preview";

async function loadPreviewPackage(handle: PackageDirectoryHandle, set: (partial: Partial<RuntimeState>) => void) {
  set({ bootStatus: "loading", packageIssues: [], importError: null, importNotice: null, authorPreviewActive: true });
  const validation = await runtimeDependencies.loadSystemPackageFromDirectoryHandle(handle);
  if (!validation.ok) {
    activePackageAssetResolver?.revokeAll();
    activePackageAssetResolver = undefined;
    set({
      currentPackage: null,
      packageAssetUrls: {},
      characterData: null,
      characterSaves: [],
      activeCharacterSaveId: null,
      ...emptyDerivedState(),
      bootStatus: "error",
      packageIssues: validation.issues,
      authorPreviewActive: true,
    });
    return;
  }
  let storageStatus: StorageStatus = "idle";
  try {
    await runtimeDependencies.storage.saveCurrentSystemPackage(validation.package, validation.packageAssets ?? []);
  } catch {
    storageStatus = "error";
  }
  await loadPackageIntoState(validation.package, validation.issues, set, storageStatus, validation.packageAssets ?? []);
}

function emptyDerivedState() {
  return {
    derivedReadOnlyDisplayContent: {} as Record<string, string>,
    moduleVisibility: {} as Record<string, boolean>,
    pageVisibility: {} as Record<string, boolean>,
    resourcePickerDefaultQueries: {} as Record<string, ResourceLibraryQuery>,
    cardTableCardWidths: {} as Record<string, number>,
    validationIssues: [] as ValidationIssue[],
    validationStatus: "idle" as const,
  };
}

async function loadPackageIntoState(
  systemPackage: SystemPackage,
  issues: PackageIssue[],
  set: (partial: Partial<RuntimeState>) => void,
  storageStatus: StorageStatus = "idle",
  packageAssets?: RuntimePackageAsset[],
) {
  activePackageAssetResolver?.revokeAll();
  const assets = packageAssets ?? (await runtimeDependencies.storage.loadCurrentPackageAssets(systemPackage.manifest.ID));
  activePackageAssetResolver = createRuntimeAssetResolver(assets);

  try {
    const loaded = await loadActiveCharacterForPackage(systemPackage, runtimeDependencies.storage);
    set({
      currentPackage: systemPackage,
      packageAssetUrls: activePackageAssetResolver.urls,
      characterData: loaded.characterData,
      characterSaves: loaded.characterSaves,
      activeCharacterSaveId: loaded.activeCharacterSaveId,
      ...emptyDerivedState(),
      packageIssues: issues,
      bootStatus: "ready",
      storageStatus,
    });
  } catch {
    set({
      currentPackage: systemPackage,
      packageAssetUrls: activePackageAssetResolver.urls,
      characterData: createEmptyCharacterData(systemPackage),
      characterSaves: [],
      activeCharacterSaveId: null,
      ...emptyDerivedState(),
      packageIssues: issues,
      bootStatus: "ready",
      storageStatus: "error",
    });
  }
}

async function clearCachedPackageAndResetState(set: (partial: Partial<RuntimeState>) => void) {
  activePackageAssetResolver?.revokeAll();
  activePackageAssetResolver = undefined;
  let storageStatus: StorageStatus = "idle";

  try {
    await runtimeDependencies.storage.clearCurrentSystemPackage();
  } catch {
    storageStatus = "error";
  }

  set({
    currentPackage: null,
    packageAssetUrls: {},
    characterData: null,
    characterSaves: [],
    activeCharacterSaveId: null,
    ...emptyDerivedState(),
    packageIssues: [],
    bootStatus: "ready",
    storageStatus,
    importNotice:
      storageStatus === "error"
        ? "缓存的 System Package 读取失败，已回到空白状态。请在浏览器中清理站点数据后重新上传系统包。"
        : "缓存的 System Package 已失效，已清除。请重新上传系统包。",
  });
}

function scheduleAutosave(
  readSnapshot: () => CharacterData | null,
  setStatus: (status: StorageStatus) => void,
) {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }

  setStatus("saving");
  autosaveTimer = setTimeout(() => {
    const snapshot = readSnapshot();
    if (!snapshot) {
      setStatus("error");
      return;
    }

    void runtimeDependencies.storage
      .saveCurrentCharacterData(snapshot)
      .then(() => setStatus("saved"))
      .catch(() => setStatus("error"));
  }, autosaveDelayMs);
}

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  currentPackage: null,
  packageAssetUrls: {},
  packageIssues: [],
  characterData: null,
  characterSaves: [],
  activeCharacterSaveId: null,
  ...emptyDerivedState(),
  bootStatus: "idle",
  storageStatus: "idle",
  importError: null,
  importNotice: null,
  authorPreviewActive: false,

  async initialize() {
    set({ bootStatus: "loading", packageIssues: [], importError: null, importNotice: null });

    try {
      if (sessionStorage.getItem(authorPreviewSessionKey) === "active") {
        const handle = await runtimeDependencies.loadPreviewDirectoryHandle();
        if (!handle) {
          set({ currentPackage: null, characterData: null, bootStatus: "error", authorPreviewActive: true, packageIssues: [{ level: "fatal", code: "PREVIEW_DIRECTORY_PERMISSION_REQUIRED", text: "Author Preview 开发目录不可用，请重新授权或选择目录。" }] });
          return;
        }
        const permission = handle.queryPermission ? await handle.queryPermission({ mode: "read" }) : "granted";
        if (permission !== "granted") {
          set({ currentPackage: null, characterData: null, bootStatus: "error", authorPreviewActive: true, packageIssues: [{ level: "fatal", code: "PREVIEW_DIRECTORY_PERMISSION_REQUIRED", text: "无法重新读取 Author Preview 开发目录，请重新授权或选择目录。" }] });
          return;
        }
        await loadPreviewPackage(handle, set);
        return;
      }
      const cachedPackage = await runtimeDependencies.storage.loadCurrentSystemPackage();
      if (!cachedPackage) {
        activePackageAssetResolver?.revokeAll();
        activePackageAssetResolver = undefined;
        set({
          currentPackage: null,
          packageAssetUrls: {},
          characterData: null,
          characterSaves: [],
          activeCharacterSaveId: null,
          ...emptyDerivedState(),
          packageIssues: [],
          bootStatus: "ready",
          storageStatus: "idle",
        });
        return;
      }

      const cachedValidation = validateCachedSystemPackage(cachedPackage);
      if (!cachedValidation.ok) {
        await clearCachedPackageAndResetState(set);
        return;
      }

      await loadPackageIntoState(cachedValidation.package, [], set);
    } catch {
      await clearCachedPackageAndResetState(set);
    }
  },

  async uploadSystemPackageFromFile(file) {
    set({ bootStatus: "loading", packageIssues: [], importError: null, importNotice: null });
    const validation = await runtimeDependencies.loadSystemPackageFromFile(file);

    if (!validation.ok) {
      set((state) => ({
        bootStatus: state.currentPackage ? "ready" : "error",
        packageIssues: validation.issues,
      }));
      return;
    }

    let packageCacheStatus: StorageStatus = "idle";
    try {
      await runtimeDependencies.storage.saveCurrentSystemPackage(validation.package, validation.packageAssets ?? []);
    } catch {
      packageCacheStatus = "error";
    }

    await loadPackageIntoState(validation.package, validation.issues, set, packageCacheStatus, validation.packageAssets ?? []);
  },

  async uploadSystemPackageFromDirectory(files) {
    set({ bootStatus: "loading", packageIssues: [], importError: null, importNotice: null });
    const validation = await runtimeDependencies.loadSystemPackageFromDirectory(files);
    if (!validation.ok) {
      set((state) => ({ bootStatus: state.currentPackage ? "ready" : "error", packageIssues: validation.issues }));
      return;
    }
    let packageCacheStatus: StorageStatus = "idle";
    try {
      await runtimeDependencies.storage.saveCurrentSystemPackage(validation.package, validation.packageAssets ?? []);
    } catch {
      packageCacheStatus = "error";
    }
    await loadPackageIntoState(validation.package, validation.issues, set, packageCacheStatus, validation.packageAssets ?? []);
  },

  async enterAuthorPreview(handle) {
    sessionStorage.setItem(authorPreviewSessionKey, "active");
    await runtimeDependencies.savePreviewDirectoryHandle(handle);
    await loadPreviewPackage(handle, set);
  },

  exitAuthorPreview() {
    sessionStorage.removeItem(authorPreviewSessionKey);
    set({ authorPreviewActive: false, importNotice: "已退出预览；当前 System Package 保持不变。" });
  },

  async createCharacterSave(name = "未命名角色") {
    const currentPackage = get().currentPackage;
    if (!currentPackage) {
      return;
    }

    const characterData = createEmptyCharacterData(currentPackage);
    await runtimeDependencies.storage.saveCharacterSave({
      id: characterData.character.id,
      packageId: characterData.systemPackage.id,
      name,
      updatedAt: characterData.updatedAt,
      data: characterData,
    });
    await runtimeDependencies.storage.setActiveCharacterSaveId(characterData.systemPackage.id, characterData.character.id);
    set({
      characterData,
      characterSaves: await runtimeDependencies.storage.listCharacterSaves(characterData.systemPackage.id),
      activeCharacterSaveId: characterData.character.id,
      importError: null,
      importNotice: null,
      validationIssues: [],
      validationStatus: "idle",
    });
  },

  async switchCharacterSave(saveId) {
    const currentPackage = get().currentPackage;
    if (!currentPackage) {
      return;
    }

    const characterData = await runtimeDependencies.storage.loadCharacterSave(currentPackage.manifest.ID, saveId);
    if (!characterData) {
      set({ storageStatus: "error" });
      return;
    }

    await runtimeDependencies.storage.setActiveCharacterSaveId(currentPackage.manifest.ID, saveId);
    set({
      characterData: ensureCardState(characterData),
      activeCharacterSaveId: saveId,
      ...emptyDerivedState(),
      importError: null,
      importNotice: null,
      storageStatus: "idle",
    });
  },

  async renameCharacterSave(saveId, name) {
    const currentPackage = get().currentPackage;
    if (!currentPackage || !name.trim()) {
      return;
    }

    await runtimeDependencies.storage.renameCharacterSave(currentPackage.manifest.ID, saveId, name.trim());
    set({
      characterSaves: await runtimeDependencies.storage.listCharacterSaves(currentPackage.manifest.ID),
      importError: null,
      importNotice: null,
    });
  },

  async duplicateCharacterSave(saveId, name) {
    const currentPackage = get().currentPackage;
    const source = currentPackage ? await runtimeDependencies.storage.loadCharacterSave(currentPackage.manifest.ID, saveId) : null;
    if (!currentPackage || !source) {
      return;
    }

    const now = new Date().toISOString();
    const duplicateId = generateId("character-");
    const sourceSummary = get().characterSaves.find((save) => save.id === saveId);
    const data: CharacterData = {
      ...source,
      character: {
        ...source.character,
        id: duplicateId,
      },
      updatedAt: now,
    };

    await runtimeDependencies.storage.saveCharacterSave({
      id: duplicateId,
      packageId: currentPackage.manifest.ID,
      name: name?.trim() || `${sourceSummary?.name ?? "未命名角色"} 副本`,
      updatedAt: now,
      data,
    });
    await runtimeDependencies.storage.setActiveCharacterSaveId(currentPackage.manifest.ID, duplicateId);
    set({
      characterData: data,
      activeCharacterSaveId: duplicateId,
      characterSaves: await runtimeDependencies.storage.listCharacterSaves(currentPackage.manifest.ID),
      validationIssues: [],
      validationStatus: "idle",
      importError: null,
      importNotice: null,
    });
  },

  async deleteCharacterSave(saveId) {
    const currentPackage = get().currentPackage;
    if (!currentPackage) {
      return;
    }

    await runtimeDependencies.storage.deleteCharacterSave(currentPackage.manifest.ID, saveId);
    const remaining = await runtimeDependencies.storage.listCharacterSaves(currentPackage.manifest.ID);
    const nextSave = remaining[0];

    if (!nextSave) {
      await get().createCharacterSave();
      return;
    }

    const nextData = await runtimeDependencies.storage.loadCharacterSave(currentPackage.manifest.ID, nextSave.id);
    await runtimeDependencies.storage.setActiveCharacterSaveId(currentPackage.manifest.ID, nextSave.id);
    set({
      characterData: ensureCardState(nextData),
      characterSaves: remaining,
      activeCharacterSaveId: nextSave.id,
      validationIssues: [],
      validationStatus: "idle",
      importError: null,
      importNotice: null,
    });
  },

  updateModuleValue(moduleId, value) {
    if (!get().characterData) {
      return;
    }

    set((state) => ({
      characterData: state.characterData ? updateCharacterValue(state.characterData, moduleId, value) : null,
      importError: null,
      importNotice: null,
    }));

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  commitResourceSelection(moduleId, libraryId, entries) {
    const currentPackage = get().currentPackage;
    const characterData = get().characterData;
    if (!currentPackage || !characterData) {
      return;
    }

    const result = evaluateDependencies(characterData, currentPackage, {
        type: "resourceSelected",
        sourceModuleId: moduleId,
        libraryId,
        selectedEntries: entries,
    });
    warnDependencyIssues(result);

    set((state) => ({
      characterData: createCardInstancesFromSelection(
        applyDependencyResultToCharacterData(characterData, result),
        currentPackage,
        moduleId,
        libraryId,
        entries,
      ),
      ...mergeDependencyRuntimeState(state, result),
      importError: null,
      importNotice: null,
    }));

    if (Object.keys(result.dataPatches).length > 0 || hasCardCreationTarget(currentPackage, moduleId)) {
      scheduleAutosave(
        () => get().characterData,
        (status) => set({ storageStatus: status }),
      );
    }
  },

  commitCheckboxChange(moduleId, optionId, checked, checkboxState) {
    const currentPackage = get().currentPackage;
    const characterData = get().characterData;
    if (!currentPackage || !characterData) {
      return;
    }

    const dataWithCheckboxState = updateCharacterValue(characterData, moduleId, checkboxState);
    const result = evaluateDependencies(dataWithCheckboxState, currentPackage, {
      type: "checkboxChanged",
      sourceModuleId: moduleId,
      optionId,
      checked,
      checkboxState,
    });
    warnDependencyIssues(result);

    set((state) => ({
      characterData: applyDependencyResultToCharacterData(dataWithCheckboxState, result),
      ...mergeDependencyRuntimeState(state, result),
      importError: null,
      importNotice: null,
    }));

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  updateCardInstancePosition(instanceId, xPct, yPct) {
    if (!get().characterData) {
      return;
    }

    set((state) => ({
      characterData: state.characterData ? updateCardInstancePositionDomain(state.characterData, instanceId, xPct, yPct) : null,
      importError: null,
      importNotice: null,
    }));

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  bringCardInstanceToFront(instanceId) {
    if (!get().characterData) {
      return;
    }

    set((state) => ({
      characterData: state.characterData ? bringCardInstanceToFrontDomain(state.characterData, instanceId) : null,
      importError: null,
      importNotice: null,
    }));

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  updateCardInstanceState(instanceId, cardState) {
    if (!get().characterData) {
      return;
    }

    set((state) => ({
      characterData: state.characterData ? updateCardInstanceStateDomain(state.characterData, instanceId, cardState) : null,
      importError: null,
      importNotice: null,
    }));

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  tidyCardTable(tableModuleId, layout) {
    if (!get().characterData) {
      return;
    }

    set((state) => ({
      characterData: state.characterData ? tidyCardTableDomain(state.characterData, tableModuleId, layout) : null,
      importError: null,
      importNotice: null,
    }));

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  setCardTableCardWidth(tableModuleId, widthPx) {
    set((state) => ({
      cardTableCardWidths: {
        ...state.cardTableCardWidths,
        [tableModuleId]: clampCardWidth(widthPx),
      },
    }));
  },

  deleteCardInstance(instanceId) {
    if (!get().characterData) {
      return;
    }

    set((state) => ({
      characterData: state.characterData ? deleteCardInstanceDomain(state.characterData, instanceId) : null,
      importError: null,
      importNotice: null,
    }));

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  async runValidationChecks() {
    const currentPackage = get().currentPackage;
    const characterData = get().characterData;
    if (!currentPackage || !characterData) {
      set({ validationIssues: [], validationStatus: "complete" });
      return;
    }

    const checks = currentPackage.validationChecks ?? [];
    if (checks.length === 0) {
      set({ validationIssues: [], validationStatus: "complete" });
      return;
    }

    set({ validationStatus: "running" });
    const validationIssues = await runtimeDependencies.runValidationChecks({
      characterData,
      resourceLibraries: currentPackage.resourceLibraries ?? [],
      packageMetadata: {
        id: currentPackage.manifest.ID,
        version: currentPackage.manifest.版本,
      },
      checks,
    });
    set({ validationIssues, validationStatus: "complete" });
  },

  async runPreOutputValidation() {
    const currentPackage = get().currentPackage;
    const characterData = get().characterData;
    if (!currentPackage || !characterData) {
      set({ validationIssues: [], validationStatus: "complete" });
      return [];
    }

    const checks = currentPackage.validationChecks ?? [];
    if (checks.length === 0) {
      set({ validationIssues: [], validationStatus: "complete" });
      return [];
    }

    set({ validationStatus: "running" });
    const validationIssues = await runtimeDependencies.runValidationChecks({
      characterData,
      resourceLibraries: currentPackage.resourceLibraries ?? [],
      packageMetadata: {
        id: currentPackage.manifest.ID,
        version: currentPackage.manifest.版本,
      },
      checks,
    });
    set({ validationIssues, validationStatus: "complete" });
    return validationIssues;
  },

  async uploadPlayerImage(moduleId, file) {
    const characterData = get().characterData;
    if (!characterData) {
      return;
    }

    const imageId = generateId(`${moduleId}-`);
    const dataUrl = await fileToDataUrl(file);
    const image: PlayerImageData = {
      id: imageId,
      name: file.name || undefined,
      mimeType: file.type || "application/octet-stream",
      dataUrl,
    };

    try {
      await runtimeDependencies.storage.savePlayerImageBlob({
        id: image.id,
        name: image.name,
        mimeType: image.mimeType,
        blob: file,
      });
    } catch {
      set({ storageStatus: "error" });
      return;
    }

    set((state) => ({
      characterData: state.characterData ? updatePlayerImage(state.characterData, moduleId, image) : null,
      importError: null,
      importNotice: null,
    }));

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  async importCharacterDataFromText(text) {
    const currentPackage = get().currentPackage;

    if (!currentPackage) {
      set({
        importError: "导入失败：当前没有可用的 System Package。",
        importNotice: null,
      });
      return;
    }

    const result = parseCharacterDataText(text, currentPackage);

    if (!result.ok) {
      set({
        importError: result.error,
        importNotice: null,
      });
      return;
    }

    set({
      characterData: result.data,
      activeCharacterSaveId: result.data.character.id,
      ...emptyDerivedState(),
      importError: null,
      importNotice: "Character Data 已导入为 Character Save。",
    });

    await saveImportedPlayerImages(result.data.playerImages, runtimeDependencies.storage);
    await runtimeDependencies.storage.saveCharacterSave({
      id: result.data.character.id,
      packageId: result.data.systemPackage.id,
      name: "导入角色",
      updatedAt: result.data.updatedAt,
      data: result.data,
    });
    await runtimeDependencies.storage.setActiveCharacterSaveId(result.data.systemPackage.id, result.data.character.id);
    set({
      characterSaves: await runtimeDependencies.storage.listCharacterSaves(result.data.systemPackage.id),
      activeCharacterSaveId: result.data.character.id,
    });

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  clearImportMessage() {
    set({ importError: null, importNotice: null });
  },
}));

export function configureRuntimeDependencies(dependencies: Partial<RuntimeDependencies>) {
  runtimeDependencies = { ...defaultRuntimeDependencies, ...dependencies };
}

export function resetRuntimeDependencies() {
  runtimeDependencies = defaultRuntimeDependencies;
}
