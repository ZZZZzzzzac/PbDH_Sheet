import { create } from "zustand";
import {
  bringCardInstanceToFront as bringCardInstanceToFrontDomain,
  type CardTableLayout,
  clampCardWidth,
  deleteCardInstance as deleteCardInstanceDomain,
  flipCardInstance as flipCardInstanceDomain,
  addCardIndicator as addCardIndicatorDomain,
  rotateCardInstance as rotateCardInstanceDomain,
  setCardInstanceUpright as setCardInstanceUprightDomain,
  tidyCardTable as tidyCardTableDomain,
  transitionCardIndicator as transitionCardIndicatorDomain,
  updateCardInstancePosition as updateCardInstancePositionDomain,
  updateCardInstanceState as updateCardInstanceStateDomain,
} from "../domain/cardEngine";
import {
  type CheckboxState,
  type CountableState,
  createEmptyCharacterData,
  updateCharacterValue,
  updatePlayerImage,
  updateResourceSelectionSnapshot,
  removePlayerImage as removePlayerImageData,
  type CharacterData,
  type PlayerImageData,
  type PlayerImageValue,
  type SheetValue,
} from "../domain/characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies, hasRebuildableDependencies, rebuildDerivedDependencies } from "../domain/dependencyEngine";
import type { ResourceLibraryEntry, ResourceLibraryQuery } from "../domain/resourceLibrary";
import { composeResource, type ResourceComposerSelections } from "../domain/resourceComposer";
import { applyEffectiveResourceCatalog, createEffectiveResourceCatalog, type EffectiveResourceCatalog } from "../domain/effectiveResourceCatalog";
import type { GeneratedResourceId, ResourceExtension, ResourceExtensionIssue } from "../domain/resourceExtension";
import { validateCachedSystemPackage, type PackageIssue, type SystemPackage } from "../domain/systemPackage";
import { runValidationChecks as runValidationChecksDomain, type ValidationIssue } from "../domain/validationRunner";
import { parseCharacterDataText } from "../export/output";
import { createRuntimeAssetResolver, type RuntimeAssetResolver, type RuntimePackageAsset } from "../loaders/assetResolver";
import type { PackageDirectoryHandle } from "../loaders/packageVfs";
import { loadSystemPackageFromDirectoryFiles, loadSystemPackageFromDirectoryHandle, loadSystemPackageFromZipFile, type PackageLoadResult } from "../loaders/systemPackageLoader";
import { loadPresetSystemPackage, type PresetLoadProgress, type PresetSystemPackage } from "../loaders/presetSystemPackageLoader";
import { loadResourceExtensionFromJsonText, loadResourceExtensionFromZipFile, type NormalizedResourceExtensionArtifact } from "../loaders/resourceExtensionLoader";
import { loadAuthorPreviewDirectoryHandle, saveAuthorPreviewDirectoryHandle, storageService, type CharacterSaveSummary, type StorageService } from "../storage/storageService";
import { generateId } from "../utils";
import {
  createCardInstancesFromSelection,
  createCardInstanceFromComposite,
  dependencyRuntimeStateFromResult,
  ensureCardState,
  fileToDataUrl,
  hasCardCreationTarget,
  loadActiveCharacterForPackage,
  warnDependencyIssues,
} from "./runtimeHelpers";

export const autosaveDelayMs = 250;

type BootStatus = "idle" | "loading" | "ready" | "error";
type StorageStatus = "idle" | "saving" | "saved" | "error";
type ValidationStatus = "idle" | "running" | "complete";
export type FrameworkColorSchemePreference = "follow-skin" | "light" | "dark";

interface RuntimeState {
  basePackage: SystemPackage | null;
  currentPackage: SystemPackage | null;
  selectedSkinId: string | null;
  frameworkColorSchemePreference: FrameworkColorSchemePreference;
  resourceCatalog: EffectiveResourceCatalog | null;
  installedResourceExtensions: ResourceExtension[];
  resourceExtensionImport: ResourceExtensionImportState | null;
  pendingResourceExtensionReplacement: PendingResourceExtensionReplacement | null;
  pendingResourceExtensionRemoval: PendingResourceExtensionRemoval | null;
  resourceReferenceIssues: ResourceExtensionIssue[];
  packageAssetUrls: Record<string, string>;
  packageIssues: PackageIssue[];
  characterData: CharacterData | null;
  characterSaves: CharacterSaveSummary[];
  activeCharacterSaveId: string | null;
  derivedReadOnlyDisplayContent: Record<string, string>;
  derivedTextPlaceholders: Record<string, string>;
  moduleVisibility: Record<string, boolean>;
  pageVisibility: Record<string, boolean>;
  resourcePickerDefaultQueries: Record<string, ResourceLibraryQuery>;
  cardTableCardWidths: Record<string, number>;
  validationIssues: ValidationIssue[];
  validationStatus: ValidationStatus;
  bootStatus: BootStatus;
  packageLoadProgress: PresetLoadProgress | null;
  packageLoadingPresentation: NonNullable<PresetSystemPackage["loadingPresentation"]> | null;
  storageStatus: StorageStatus;
  importError: string | null;
  importNotice: string | null;
  authorPreviewActive: boolean;
  initialize: () => Promise<void>;
  uploadSystemPackageFromFile: (file: Blob) => Promise<void>;
  uploadSystemPackageFromDirectory: (files: Iterable<File>) => Promise<void>;
  switchToPresetSystemPackage: (preset: PresetSystemPackage) => Promise<void>;
  selectSystemPackageSkin: (skinId: string) => void;
  setFrameworkColorSchemePreference: (preference: FrameworkColorSchemePreference) => void;
  uploadResourceExtensionFromFile: (file: Blob) => Promise<void>;
  confirmResourceExtensionReplacement: () => Promise<void>;
  cancelResourceExtensionReplacement: () => void;
  requestResourceExtensionRemoval: (extensionId: string) => void;
  confirmResourceExtensionRemoval: () => Promise<void>;
  cancelResourceExtensionRemoval: () => void;
  enterAuthorPreview: (handle: PackageDirectoryHandle) => Promise<void>;
  exitAuthorPreview: () => void;
  createCharacterSave: (name?: string) => Promise<void>;
  switchCharacterSave: (saveId: string) => Promise<void>;
  renameCharacterSave: (saveId: string, name: string) => Promise<void>;
  duplicateCharacterSave: (saveId: string, name?: string) => Promise<void>;
  deleteCharacterSave: (saveId: string) => Promise<void>;
  updateModuleValue: (moduleId: string, value: SheetValue) => void;
  commitFreeTextChange: (moduleId: string, value: string) => void;
  commitResourceSelection: (moduleId: string, libraryId: string, entries: ResourceLibraryEntry[]) => void;
  commitResourceComposition: (moduleId: string, selections: ResourceComposerSelections) => void;
  commitCheckboxChange: (moduleId: string, optionId: string, checked: boolean, checkboxState: CheckboxState) => void;
  updateCardInstancePosition: (instanceId: string, xPct: number, yPct: number) => void;
  bringCardInstanceToFront: (instanceId: string) => void;
  updateCardInstanceState: (instanceId: string, cardState: string) => void;
  flipCardInstance: (instanceId: string) => void;
  rotateCardInstance: (instanceId: string, quarterTurns: number) => void;
  setCardInstanceUpright: (instanceId: string) => void;
  addCardIndicator: (instanceId: string) => void;
  transitionCardIndicator: (instanceId: string, indicatorId: string, direction: "increment" | "decrement") => void;
  tidyCardTable: (tableModuleId: string, layout: CardTableLayout) => void;
  setCardTableCardWidth: (tableModuleId: string, widthPx: number) => void;
  deleteCardInstance: (instanceId: string) => void;
  runValidationChecks: () => Promise<void>;
  runPreOutputValidation: () => Promise<ValidationIssue[]>;
  uploadPlayerImage: (moduleId: string, file: File) => Promise<void>;
  removePlayerImage: (moduleId: string) => Promise<void>;
  importCharacterDataFromText: (text: string) => Promise<void>;
  clearImportMessage: () => void;
}

let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
let activePackageAssetResolver: RuntimeAssetResolver | undefined;

interface RuntimeDependencies {
  loadSystemPackageFromFile: (file: Blob) => Promise<PackageLoadResult>;
  loadSystemPackageFromDirectory: (files: Iterable<File>) => Promise<PackageLoadResult>;
  loadSystemPackageFromDirectoryHandle: (handle: PackageDirectoryHandle) => Promise<PackageLoadResult>;
  loadPresetSystemPackage: (preset: PresetSystemPackage, onProgress?: (progress: PresetLoadProgress) => void) => Promise<PackageLoadResult>;
  loadPreviewDirectoryHandle: () => Promise<PackageDirectoryHandle | null>;
  savePreviewDirectoryHandle: (handle: PackageDirectoryHandle) => Promise<void>;
  storage: StorageService;
  runValidationChecks: typeof runValidationChecksDomain;
}

const defaultRuntimeDependencies: RuntimeDependencies = {
  loadSystemPackageFromFile: (file) => loadSystemPackageFromZipFile(file),
  loadSystemPackageFromDirectory: (files) => loadSystemPackageFromDirectoryFiles(files),
  loadSystemPackageFromDirectoryHandle: (handle) => loadSystemPackageFromDirectoryHandle(handle),
  loadPresetSystemPackage: (preset, onProgress) => loadPresetSystemPackage(preset, import.meta.env.BASE_URL, fetch, onProgress),
  loadPreviewDirectoryHandle: () => loadAuthorPreviewDirectoryHandle(),
  savePreviewDirectoryHandle: (handle) => saveAuthorPreviewDirectoryHandle(handle),
  storage: storageService,
  runValidationChecks: runValidationChecksDomain,
};

let runtimeDependencies = defaultRuntimeDependencies;
const authorPreviewSessionKey = "pbdh-author-preview";

function isCountableStateValue(value: SheetValue): value is CountableState {
  return typeof value === "object" && value !== null && "current" in value && "max" in value;
}

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
  } catch (error) {
    console.error("saveCurrentSystemPackage failed", error);
    storageStatus = "error";
  }
  await loadPackageIntoState(validation.package, validation.issues, set, storageStatus, validation.packageAssets ?? []);
}

function emptyDerivedState() {
  return {
    derivedReadOnlyDisplayContent: {} as Record<string, string>,
    derivedTextPlaceholders: {} as Record<string, string>,
    moduleVisibility: {} as Record<string, boolean>,
    pageVisibility: {} as Record<string, boolean>,
    resourcePickerDefaultQueries: {} as Record<string, ResourceLibraryQuery>,
    cardTableCardWidths: {} as Record<string, number>,
    validationIssues: [] as ValidationIssue[],
    validationStatus: "idle" as const,
  };
}

export type ResourceExtensionImportState =
  | { status: "success"; extensionId: string; contributionCount: number; entryCount: number; generatedIds: GeneratedResourceId[]; normalizedArtifact: NormalizedResourceExtensionArtifact; issues: ResourceExtensionIssue[] }
  | { status: "error"; issues: ResourceExtensionIssue[] };

export interface ResourceExtensionDifference {
  libraryId: string;
  added: number;
  removed: number;
  retained: number;
}

export interface PendingResourceExtensionReplacement {
  extension: ResourceExtension;
  assets: RuntimePackageAsset[];
  generatedIds: GeneratedResourceId[];
  normalizedArtifact: NormalizedResourceExtensionArtifact;
  issues: ResourceExtensionIssue[];
  differences: ResourceExtensionDifference[];
  previousImageCount: number;
  nextImageCount: number;
}

export interface PendingResourceExtensionRemoval {
  extensionId: string;
  extensionName: string;
  libraries: Array<{ libraryId: string; entryCount: number }>;
  imageCount: number;
  staleReferenceCount: number;
}

function rebuildDependencyRuntimeState(data: CharacterData, systemPackage: SystemPackage) {
  const result = rebuildDerivedDependencies(data, systemPackage);
  warnDependencyIssues(result);
  return dependencyRuntimeStateFromResult(result);
}

async function loadPackageIntoState(
  systemPackage: SystemPackage,
  issues: PackageIssue[],
  set: (partial: Partial<RuntimeState>) => void,
  storageStatus: StorageStatus = "idle",
  packageAssets?: RuntimePackageAsset[],
) : Promise<boolean> {
  let nextAssetResolver: RuntimeAssetResolver | undefined;
  try {
    const assets = packageAssets ?? (await runtimeDependencies.storage.loadCurrentPackageAssets(systemPackage.manifest.ID));
    const installedResourceExtensions = await runtimeDependencies.storage.listResourceExtensions(systemPackage.manifest.ID);
    const extensionAssets = await runtimeDependencies.storage.loadResourceExtensionAssets(systemPackage.manifest.ID);
    nextAssetResolver = createRuntimeAssetResolver([...assets, ...extensionAssets]);
    const resourceCatalog = createEffectiveResourceCatalog(systemPackage, installedResourceExtensions);
    const effectivePackage = applyEffectiveResourceCatalog(systemPackage, resourceCatalog);
    const loaded = await loadActiveCharacterForPackage(effectivePackage, runtimeDependencies.storage);
    const skinPreference = resolveSkinPreference(systemPackage);
    set({
      basePackage: systemPackage,
      currentPackage: effectivePackage,
      selectedSkinId: skinPreference.skinId,
      resourceCatalog,
      installedResourceExtensions,
      resourceExtensionImport: null,
      pendingResourceExtensionReplacement: null,
      pendingResourceExtensionRemoval: null,
      resourceReferenceIssues: collectStaleResourceReferenceIssues(loaded.characterData, resourceCatalog),
      packageAssetUrls: nextAssetResolver.urls,
      characterData: loaded.characterData,
      characterSaves: loaded.characterSaves,
      activeCharacterSaveId: loaded.activeCharacterSaveId,
      ...emptyDerivedState(),
      ...rebuildDependencyRuntimeState(loaded.characterData, effectivePackage),
      packageIssues: issues,
      bootStatus: "ready",
      packageLoadProgress: null,
      packageLoadingPresentation: null,
      storageStatus,
      ...(skinPreference.fellBack ? { importNotice: `此前选择的 Skin 已不存在，已回退到默认 Skin：${skinPreference.skinId}` } : {}),
    });
    activePackageAssetResolver?.revokeAll();
    activePackageAssetResolver = nextAssetResolver;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    nextAssetResolver?.revokeAll();
    set({
      packageIssues: [...issues, { level: "error", code: "PACKAGE_LOAD_FAILED", text: `加载 System Package 时出错：${message}`, path: "boot" }],
      bootStatus: activePackageAssetResolver ? "ready" : "error",
      packageLoadProgress: null,
      packageLoadingPresentation: null,
      storageStatus: "error",
      importError: message,
      importNotice: null,
    });
    return false;
  }
}

function resolveSkinPreference(systemPackage: SystemPackage): { skinId: string | null; fellBack: boolean } {
  const skins = systemPackage.skins ?? [];
  if (skins.length === 0) return { skinId: null, fellBack: false };
  let preferred: string | null = null;
  try {
    preferred = runtimeDependencies.storage.loadSystemPackageSkinPreference(systemPackage.manifest.ID);
  } catch (error) {
    console.error("loadSystemPackageSkinPreference failed", error);
    preferred = null;
  }
  if (preferred && skins.some((skin) => skin.ID === preferred)) return { skinId: preferred, fellBack: false };
  return { skinId: systemPackage.defaultSkin ?? skins[0].ID, fellBack: preferred !== null };
}

function loadFrameworkColorSchemePreference(): FrameworkColorSchemePreference {
  try {
    return runtimeDependencies.storage.loadFrameworkColorSchemePreference();
  } catch (error) {
    console.error("loadFrameworkColorSchemePreference failed", error);
    return "follow-skin";
  }
}

async function clearCachedPackageAndResetState(set: (partial: Partial<RuntimeState>) => void) {
  activePackageAssetResolver?.revokeAll();
  activePackageAssetResolver = undefined;
  let storageStatus: StorageStatus = "idle";

  try {
    await runtimeDependencies.storage.clearCurrentSystemPackage();
  } catch (error) {
    console.error("clearCurrentSystemPackage failed", error);
    storageStatus = "error";
  }

  set({
    basePackage: null,
    currentPackage: null,
    resourceCatalog: null,
    installedResourceExtensions: [],
    resourceExtensionImport: null,
    pendingResourceExtensionReplacement: null,
    pendingResourceExtensionRemoval: null,
    resourceReferenceIssues: [],
    packageAssetUrls: {},
    characterData: null,
    characterSaves: [],
    activeCharacterSaveId: null,
    ...emptyDerivedState(),
    packageIssues: [],
    bootStatus: "ready",
    packageLoadProgress: null,
    packageLoadingPresentation: null,
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
    autosaveTimer = undefined;
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

async function flushPendingAutosave(
  snapshot: CharacterData | null,
  activeSaveId: string | null,
  characterSaves: CharacterSaveSummary[],
) {
  if (!autosaveTimer) {
    return;
  }

  clearTimeout(autosaveTimer);
  autosaveTimer = undefined;

  if (!snapshot || !activeSaveId) {
    return;
  }

  const saveName = characterSaves.find((save) => save.id === activeSaveId)?.name ?? "未命名角色";
  await runtimeDependencies.storage.saveCharacterSave({
    id: activeSaveId,
    packageId: snapshot.systemPackage.id,
    name: saveName,
    updatedAt: snapshot.updatedAt,
    data: { ...snapshot, character: { ...snapshot.character, id: activeSaveId } },
  });
}

function saveCharacterDataImmediately(
  snapshot: CharacterData,
  activeSaveId: string | null,
  characterSaves: CharacterSaveSummary[],
  setStatus: (status: StorageStatus) => void,
) {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = undefined;
  }

  const saveId = activeSaveId ?? snapshot.character.id;
  const saveName = characterSaves.find((save) => save.id === saveId)?.name ?? "未命名角色";
  setStatus("saving");
  void runtimeDependencies.storage.saveCharacterSave({
    id: saveId,
    packageId: snapshot.systemPackage.id,
    name: saveName,
    updatedAt: snapshot.updatedAt,
    data: { ...snapshot, character: { ...snapshot.character, id: saveId } },
  })
    .then(() => setStatus("saved"))
    .catch(() => setStatus("error"));
}

async function reloadRuntimeAssets(packageId: string): Promise<RuntimeAssetResolver> {
  activePackageAssetResolver?.revokeAll();
  activePackageAssetResolver = createRuntimeAssetResolver([
    ...await runtimeDependencies.storage.loadCurrentPackageAssets(packageId),
    ...await runtimeDependencies.storage.loadResourceExtensionAssets(packageId),
  ]);
  return activePackageAssetResolver;
}

function resourceExtensionDifferences(previous: ResourceExtension, next: ResourceExtension): ResourceExtensionDifference[] {
  const libraryIds = new Set([...previous.resourceLibraries.map((item) => item.ID), ...next.resourceLibraries.map((item) => item.ID)]);
  return [...libraryIds].map((libraryId) => {
    const before = new Set(previous.resourceLibraries.find((item) => item.ID === libraryId)?.library.entries.map((entry) => entry.ID) ?? []);
    const after = new Set(next.resourceLibraries.find((item) => item.ID === libraryId)?.library.entries.map((entry) => entry.ID) ?? []);
    return {
      libraryId,
      added: [...after].filter((id) => !before.has(id)).length,
      removed: [...before].filter((id) => !after.has(id)).length,
      retained: [...after].filter((id) => before.has(id)).length,
    };
  });
}

function collectStaleResourceReferenceIssues(characterData: CharacterData | null, catalog: EffectiveResourceCatalog): ResourceExtensionIssue[] {
  if (!characterData) return [];
  const issues: ResourceExtensionIssue[] = [];
  const entryExists = (libraryId: string, entryId: string) => catalog.resourceLibraries.some((library) => library.ID === libraryId && library.entries.some((entry) => entry.ID === entryId));
  for (const instance of characterData.cards.instances) {
    if (instance.definitionRef.type === "resourceLibrary" && !entryExists(instance.definitionRef.libraryId, instance.definitionRef.entryId)) {
      issues.push({ level: "warning", code: "STALE_RESOURCE_DEFINITION_REFERENCE", text: `Card Instance 引用已失效：${instance.definitionRef.libraryId}/${instance.definitionRef.entryId}`, path: `cards.${instance.instanceId}.definitionRef` });
    }
  }
  for (const [moduleId, snapshot] of Object.entries(characterData.resourceSelections ?? {})) {
    for (const entryId of snapshot.entryIds) {
      if (!entryExists(snapshot.libraryId, entryId)) issues.push({ level: "warning", code: "STALE_RESOURCE_SELECTION_REFERENCE", text: `Derived Source Snapshot 引用已失效：${snapshot.libraryId}/${entryId}`, path: `resourceSelections.${moduleId}` });
    }
  }
  return issues;
}

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  basePackage: null,
  currentPackage: null,
  selectedSkinId: null,
  frameworkColorSchemePreference: "follow-skin",
  resourceCatalog: null,
  installedResourceExtensions: [],
  resourceExtensionImport: null,
  pendingResourceExtensionReplacement: null,
  pendingResourceExtensionRemoval: null,
  resourceReferenceIssues: [],
  packageAssetUrls: {},
  packageIssues: [],
  characterData: null,
  characterSaves: [],
  activeCharacterSaveId: null,
  ...emptyDerivedState(),
  bootStatus: "idle",
  packageLoadProgress: null,
  packageLoadingPresentation: null,
  storageStatus: "idle",
  importError: null,
  importNotice: null,
  authorPreviewActive: false,

  // ========== Package lifecycle & boot ==========

  async initialize() {
    set({ bootStatus: "loading", packageLoadProgress: null, packageLoadingPresentation: null, packageIssues: [], importError: null, importNotice: null, frameworkColorSchemePreference: loadFrameworkColorSchemePreference() });

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
          basePackage: null,
          currentPackage: null,
          resourceCatalog: null,
          installedResourceExtensions: [],
          resourceExtensionImport: null,
          pendingResourceExtensionReplacement: null,
          pendingResourceExtensionRemoval: null,
          resourceReferenceIssues: [],
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      activePackageAssetResolver?.revokeAll();
      activePackageAssetResolver = undefined;
      set({
        basePackage: null,
        currentPackage: null,
        resourceCatalog: null,
        installedResourceExtensions: [],
        resourceExtensionImport: null,
        pendingResourceExtensionReplacement: null,
        pendingResourceExtensionRemoval: null,
        resourceReferenceIssues: [],
        packageAssetUrls: {},
        characterData: null,
        characterSaves: [],
        activeCharacterSaveId: null,
        ...emptyDerivedState(),
        packageIssues: [{ level: "error", code: "INITIALIZE_FAILED", text: `初始化时出错：${message}，请检查浏览器存储或重新上传系统包。`, path: "boot" }],
        bootStatus: "error",
        storageStatus: "error",
        importError: message,
        importNotice: null,
      });
    }
  },

  async uploadSystemPackageFromFile(file) {
    set({ bootStatus: "loading", packageLoadProgress: null, packageLoadingPresentation: null, packageIssues: [], importError: null, importNotice: null });
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
    } catch (error) {
      console.error("saveCurrentSystemPackage (extension) failed", error);
      packageCacheStatus = "error";
    }

    await loadPackageIntoState(validation.package, validation.issues, set, packageCacheStatus, validation.packageAssets ?? []);
  },

  async uploadSystemPackageFromDirectory(files) {
    set({ bootStatus: "loading", packageLoadProgress: null, packageLoadingPresentation: null, packageIssues: [], importError: null, importNotice: null });
    const validation = await runtimeDependencies.loadSystemPackageFromDirectory(files);
    if (!validation.ok) {
      set((state) => ({ bootStatus: state.currentPackage ? "ready" : "error", packageIssues: validation.issues }));
      return;
    }
    let packageCacheStatus: StorageStatus = "idle";
    try {
      await runtimeDependencies.storage.saveCurrentSystemPackage(validation.package, validation.packageAssets ?? []);
    } catch (error) {
      console.error("saveCurrentSystemPackage (upload) failed", error);
      packageCacheStatus = "error";
    }
    await loadPackageIntoState(validation.package, validation.issues, set, packageCacheStatus, validation.packageAssets ?? []);
  },

  async switchToPresetSystemPackage(preset) {
    if (get().currentPackage?.manifest.ID === preset.id) return;
    set({
      bootStatus: "loading",
      packageLoadProgress: { completed: 0, total: preset.files.filter((path) => !path.startsWith("assets/")).length },
      packageLoadingPresentation: preset.loadingPresentation ?? null,
      packageIssues: [],
      importError: null,
      importNotice: null,
    });
    const validation = await runtimeDependencies.loadPresetSystemPackage(preset, (packageLoadProgress) => set({ packageLoadProgress }));
    if (!validation.ok) {
      set((state) => ({
        bootStatus: state.currentPackage ? "ready" : "error",
        packageLoadProgress: null,
        packageLoadingPresentation: null,
        packageIssues: validation.issues,
      }));
      return;
    }
    const loaded = await loadPackageIntoState(validation.package, validation.issues, set, "idle", validation.packageAssets ?? []);
    if (!loaded) return;
    try {
      await runtimeDependencies.storage.saveCurrentSystemPackage(validation.package, validation.packageAssets ?? []);
      set({ storageStatus: "saved" });
    } catch (error) {
      console.error("saveCurrentSystemPackage (preset) failed", error);
      set({ storageStatus: "error", importNotice: "预制系统包已切换，但浏览器无法缓存该系统包。" });
    }
  },

  selectSystemPackageSkin(skinId) {
    const systemPackage = get().currentPackage;
    if (!systemPackage?.skins?.some((skin) => skin.ID === skinId)) return;
    try {
      runtimeDependencies.storage.setSystemPackageSkinPreference(systemPackage.manifest.ID, skinId);
    } catch {
      set({ importNotice: "Skin 已切换，但浏览器无法保存该偏好。" });
    }
    set({ selectedSkinId: skinId });
  },

  setFrameworkColorSchemePreference(preference) {
    try {
      runtimeDependencies.storage.setFrameworkColorSchemePreference(preference);
    } catch {
      set({ importNotice: "Framework 配色已切换，但浏览器无法保存该偏好。" });
    }
    set({ frameworkColorSchemePreference: preference });
  },

  async uploadResourceExtensionFromFile(file) {
    const basePackage = get().basePackage;
    if (!basePackage) {
      set({ resourceExtensionImport: { status: "error", issues: [{ level: "error", code: "RESOURCE_EXTENSION_NO_CURRENT_PACKAGE", text: "当前没有可用的 System Package。" }] } });
      return;
    }

    const installed = get().installedResourceExtensions;
    const currentCatalog = createEffectiveResourceCatalog(basePackage, installed);
    const entryIdsByLibrary = new Map(currentCatalog.resourceLibraries.map((library) => [library.ID, new Set(library.entries.map((entry) => entry.ID))]));
    const idContext = {
      extensionIds: installed.map((extension) => extension.ID),
      libraryIds: currentCatalog.resourceLibraries.map((library) => library.ID),
      entryIdsByLibrary,
    };
    const fileName = "name" in file && typeof file.name === "string" ? file.name : "";
    const isZip = fileName.toLocaleLowerCase().endsWith(".zip") || file.type === "application/zip";
    let loaded;
    try {
      loaded = isZip
        ? await loadResourceExtensionFromZipFile(file, basePackage.manifest.ID, idContext)
        : loadResourceExtensionFromJsonText(await file.text(), basePackage.manifest.ID, idContext);
    } catch {
      set({ resourceExtensionImport: { status: "error", issues: [{ level: "error", code: "RESOURCE_EXTENSION_READ_FAILED", text: "无法读取 Resource Extension 文件。" }] } });
      return;
    }
    if (!loaded.ok) {
      set({ resourceExtensionImport: { status: "error", issues: loaded.issues } });
      return;
    }

    const nextExtensions = [...installed.filter((extension) => extension.ID !== loaded.extension.ID), loaded.extension];
    const nextCatalog = createEffectiveResourceCatalog(basePackage, nextExtensions);
    const candidateStatus = nextCatalog.extensions.find((status) => status.extension.ID === loaded.extension.ID);
    if (!candidateStatus || candidateStatus.status === "disabled") {
      set({ resourceExtensionImport: { status: "error", issues: candidateStatus?.issues ?? [{ level: "error", code: "RESOURCE_EXTENSION_INSTALL_FAILED", text: "Resource Extension 无法加入有效资源目录。" }] } });
      return;
    }

    const previous = installed.find((extension) => extension.ID === loaded.extension.ID);
    if (previous) {
      const storedAssets = await runtimeDependencies.storage.loadResourceExtensionAssets(basePackage.manifest.ID);
      set({
        pendingResourceExtensionReplacement: {
          extension: loaded.extension,
          assets: loaded.assets,
          generatedIds: loaded.generatedIds,
          normalizedArtifact: loaded.normalizedArtifact,
          issues: loaded.issues,
          differences: resourceExtensionDifferences(previous, loaded.extension),
          previousImageCount: storedAssets.filter((asset) => asset.sourceId === previous.ID).length,
          nextImageCount: loaded.assets.length,
        },
        resourceExtensionImport: null,
      });
      return;
    }

    try {
      await runtimeDependencies.storage.saveResourceExtension(loaded.extension, loaded.assets);
    } catch {
      set({ resourceExtensionImport: { status: "error", issues: [{ level: "error", code: "RESOURCE_EXTENSION_STORAGE_FAILED", text: "Resource Extension 无法写入本地存储。" }] } });
      return;
    }

    const effectivePackage = applyEffectiveResourceCatalog(basePackage, nextCatalog);
    const characterData = get().characterData;
    const assetResolver = await reloadRuntimeAssets(basePackage.manifest.ID);
    set({
      currentPackage: effectivePackage,
      resourceCatalog: nextCatalog,
      installedResourceExtensions: nextExtensions,
      packageAssetUrls: assetResolver.urls,
      ...(characterData ? rebuildDependencyRuntimeState(characterData, effectivePackage) : {}),
      resourceReferenceIssues: collectStaleResourceReferenceIssues(characterData, nextCatalog),
      resourceExtensionImport: {
        status: "success",
        extensionId: loaded.extension.ID,
        contributionCount: loaded.extension.resourceLibraries.length,
        entryCount: loaded.extension.resourceLibraries.reduce((count, library) => count + library.library.entries.length, 0),
        generatedIds: loaded.generatedIds,
        normalizedArtifact: loaded.normalizedArtifact,
        issues: loaded.issues,
      },
    });
  },

  async confirmResourceExtensionReplacement() {
    const pending = get().pendingResourceExtensionReplacement;
    const basePackage = get().basePackage;
    if (!pending || !basePackage) return;
    const nextExtensions = get().installedResourceExtensions.map((extension) => extension.ID === pending.extension.ID ? pending.extension : extension);
    const nextCatalog = createEffectiveResourceCatalog(basePackage, nextExtensions);
    const status = nextCatalog.extensions.find((item) => item.extension.ID === pending.extension.ID);
    if (!status || status.status === "disabled") {
      set({ pendingResourceExtensionReplacement: null, resourceExtensionImport: { status: "error", issues: status?.issues ?? [] } });
      return;
    }
    try {
      await runtimeDependencies.storage.saveResourceExtension(pending.extension, pending.assets);
      await reloadRuntimeAssets(basePackage.manifest.ID);
    } catch {
      set({ resourceExtensionImport: { status: "error", issues: [{ level: "error", code: "RESOURCE_EXTENSION_STORAGE_FAILED", text: "Resource Extension 替换失败；运行时保持原版本。" }] } });
      return;
    }
    const effectivePackage = applyEffectiveResourceCatalog(basePackage, nextCatalog);
    const characterData = get().characterData;
    set({
      currentPackage: effectivePackage,
      resourceCatalog: nextCatalog,
      installedResourceExtensions: nextExtensions,
      packageAssetUrls: activePackageAssetResolver?.urls ?? {},
      pendingResourceExtensionReplacement: null,
      resourceReferenceIssues: collectStaleResourceReferenceIssues(characterData, nextCatalog),
      ...(characterData ? rebuildDependencyRuntimeState(characterData, effectivePackage) : {}),
      resourceExtensionImport: {
        status: "success", extensionId: pending.extension.ID,
        contributionCount: pending.extension.resourceLibraries.length,
        entryCount: pending.extension.resourceLibraries.reduce((count, library) => count + library.library.entries.length, 0),
        generatedIds: pending.generatedIds, normalizedArtifact: pending.normalizedArtifact, issues: pending.issues,
      },
    });
  },

  cancelResourceExtensionReplacement() {
    set({ pendingResourceExtensionReplacement: null });
  },

  requestResourceExtensionRemoval(extensionId) {
    const extension = get().installedResourceExtensions.find((item) => item.ID === extensionId);
    const basePackage = get().basePackage;
    if (!extension || !basePackage) return;
    const nextCatalog = createEffectiveResourceCatalog(basePackage, get().installedResourceExtensions.filter((item) => item.ID !== extensionId));
    const staleReferenceCount = collectStaleResourceReferenceIssues(get().characterData, nextCatalog).length;
    const imageCount = Object.keys(get().packageAssetUrls).filter((key) => key.startsWith(`resource-extension:${encodeURIComponent(extensionId)}:`)).length;
    set({ pendingResourceExtensionRemoval: {
      extensionId,
      extensionName: extension.名称,
      libraries: extension.resourceLibraries.map((library) => ({ libraryId: library.ID, entryCount: library.library.entries.length })),
      imageCount,
      staleReferenceCount,
    } });
  },

  async confirmResourceExtensionRemoval() {
    const pending = get().pendingResourceExtensionRemoval;
    const basePackage = get().basePackage;
    if (!pending || !basePackage) return;
    try {
      await runtimeDependencies.storage.deleteResourceExtension(basePackage.manifest.ID, pending.extensionId);
      await reloadRuntimeAssets(basePackage.manifest.ID);
    } catch {
      set({ resourceExtensionImport: { status: "error", issues: [{ level: "error", code: "RESOURCE_EXTENSION_UNINSTALL_FAILED", text: "Resource Extension 卸载失败。" }] } });
      return;
    }
    const nextExtensions = get().installedResourceExtensions.filter((extension) => extension.ID !== pending.extensionId);
    const nextCatalog = createEffectiveResourceCatalog(basePackage, nextExtensions);
    const effectivePackage = applyEffectiveResourceCatalog(basePackage, nextCatalog);
    const characterData = get().characterData;
    set({
      currentPackage: effectivePackage,
      resourceCatalog: nextCatalog,
      installedResourceExtensions: nextExtensions,
      packageAssetUrls: activePackageAssetResolver?.urls ?? {},
      pendingResourceExtensionRemoval: null,
      resourceExtensionImport: null,
      resourceReferenceIssues: collectStaleResourceReferenceIssues(characterData, nextCatalog),
      ...(characterData ? rebuildDependencyRuntimeState(characterData, effectivePackage) : {}),
    });
  },

  cancelResourceExtensionRemoval() {
    set({ pendingResourceExtensionRemoval: null });
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

  // ========== Character Save CRUD ==========

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
      ...emptyDerivedState(),
      ...rebuildDependencyRuntimeState(characterData, currentPackage),
      importError: null,
      importNotice: null,
      validationIssues: [],
      validationStatus: "idle",
      resourceReferenceIssues: [],
    });
  },

  async switchCharacterSave(saveId) {
    const currentPackage = get().currentPackage;
    if (!currentPackage) {
      return;
    }

    if (saveId === get().activeCharacterSaveId) {
      return;
    }

    const previousCharacterData = get().characterData;
    const previousSaveId = get().activeCharacterSaveId;
    const previousSaves = get().characterSaves;
    try {
      await flushPendingAutosave(previousCharacterData, previousSaveId, previousSaves);
    } catch (error) {
      console.error("flushPendingAutosave failed before switchCharacterSave", error);
      set({ storageStatus: "error" });
    }

    const characterData = await runtimeDependencies.storage.loadCharacterSave(currentPackage.manifest.ID, saveId);
    if (!characterData) {
      set({ storageStatus: "error" });
      return;
    }

    await runtimeDependencies.storage.setActiveCharacterSaveId(currentPackage.manifest.ID, saveId);
    const normalizedData = ensureCardState(characterData, currentPackage)!;
    set({
      characterData: normalizedData,
      activeCharacterSaveId: saveId,
      ...emptyDerivedState(),
      ...rebuildDependencyRuntimeState(normalizedData, currentPackage),
      importError: null,
      importNotice: null,
      storageStatus: "idle",
      resourceReferenceIssues: get().resourceCatalog ? collectStaleResourceReferenceIssues(normalizedData, get().resourceCatalog!) : [],
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
      ...emptyDerivedState(),
      ...rebuildDependencyRuntimeState(data, currentPackage),
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
    const normalizedData = ensureCardState(nextData)!;
    set({
      characterData: normalizedData,
      characterSaves: remaining,
      activeCharacterSaveId: nextSave.id,
      ...emptyDerivedState(),
      ...rebuildDependencyRuntimeState(normalizedData, currentPackage),
      validationIssues: [],
      validationStatus: "idle",
      importError: null,
      importNotice: null,
    });
  },

  // ========== Character data & dependency orchestration ==========

  updateModuleValue(moduleId, value) {
    const characterData = get().characterData;
    const currentPackage = get().currentPackage;
    if (!characterData) {
      return;
    }

    const dataWithValue = updateCharacterValue(characterData, moduleId, value);
    const module = currentPackage?.modules.find((candidate) => candidate.ID === moduleId);
    if (currentPackage && module?.类型 === "countableResource" && isCountableStateValue(value)) {
      const result = evaluateDependencies(dataWithValue, currentPackage, {
        type: "countableChanged",
        sourceModuleId: moduleId,
        countableState: value,
      });
      warnDependencyIssues(result);
      const nextData = applyDependencyResultToCharacterData(dataWithValue, result);
      const derivedResult = rebuildDerivedDependencies(nextData, currentPackage);
      warnDependencyIssues(derivedResult);
      set({
        characterData: nextData,
        ...dependencyRuntimeStateFromResult(derivedResult),
        importError: null,
        importNotice: null,
      });
    } else {
      set({
        characterData: dataWithValue,
        importError: null,
        importNotice: null,
      });
    }

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  commitFreeTextChange(moduleId, value) {
    const currentPackage = get().currentPackage;
    const characterData = get().characterData;
    const module = currentPackage?.modules.find((candidate) => candidate.ID === moduleId);
    if (!currentPackage || !characterData || module?.类型 !== "freeText") {
      return;
    }

    const result = evaluateDependencies(characterData, currentPackage, {
      type: "freeTextChanged",
      sourceModuleId: moduleId,
      value,
    });
    warnDependencyIssues(result);
    const derivedResult = rebuildDerivedDependencies(characterData, currentPackage);
    warnDependencyIssues(derivedResult);
    set({
      ...dependencyRuntimeStateFromResult(derivedResult),
      importError: null,
      importNotice: null,
    });
  },

  commitResourceSelection(moduleId, libraryId, entries) {
    const currentPackage = get().currentPackage;
    const characterData = get().characterData;
    if (!currentPackage || !characterData) {
      return;
    }

    const shouldPersistSelection = hasRebuildableDependencies(currentPackage, moduleId);
    const dataWithSnapshot = shouldPersistSelection
      ? updateResourceSelectionSnapshot(characterData, moduleId, libraryId, entries.map((entry) => entry.ID))
      : characterData;
    const result = evaluateDependencies(dataWithSnapshot, currentPackage, {
        type: "resourceSelected",
        sourceModuleId: moduleId,
        libraryId,
        selectedEntries: entries,
    });
    warnDependencyIssues(result);

    let nextData = applyDependencyResultToCharacterData(dataWithSnapshot, result);
    for (const instruction of result.cardCreationInstructions) {
      if (instruction.libraryId) {
        nextData = createCardInstancesFromSelection(nextData, currentPackage, instruction.moduleId, instruction.libraryId, instruction.entries);
      }
    }
    const derivedResult = rebuildDerivedDependencies(nextData, currentPackage);
    warnDependencyIssues(derivedResult);

    set(() => ({
      characterData: nextData,
      ...dependencyRuntimeStateFromResult(derivedResult),
      importError: null,
      importNotice: null,
    }));

    if (shouldPersistSelection || Object.keys(result.dataPatches).length > 0 || hasCardCreationTarget(currentPackage, moduleId)) {
      scheduleAutosave(
        () => get().characterData,
        (status) => set({ storageStatus: status }),
      );
    }
  },

  commitResourceComposition(moduleId, selections) {
    const currentPackage = get().currentPackage;
    const characterData = get().characterData;
    const module = currentPackage?.modules.find((candidate) => candidate.ID === moduleId);
    if (!currentPackage || !characterData || module?.类型 !== "resourceComposer") return;
    const composite = composeResource(module, selections);
    if (!composite) return;
    const withComposite: CharacterData = {
      ...characterData,
      compositeResources: { ...characterData.compositeResources, [moduleId]: composite },
      updatedAt: new Date().toISOString(),
    };
    const result = evaluateDependencies(withComposite, currentPackage, {
      type: "resourceSelected",
      sourceModuleId: moduleId,
      selectedEntries: [composite],
    });
    warnDependencyIssues(result);
    let nextData = applyDependencyResultToCharacterData(withComposite, result);
    if (result.cardCreationInstructions.length > 0) {
      nextData = createCardInstanceFromComposite(nextData, currentPackage, moduleId, composite);
    }
    const derivedResult = rebuildDerivedDependencies(nextData, currentPackage);
    warnDependencyIssues(derivedResult);
    set(() => ({
      characterData: nextData,
      ...dependencyRuntimeStateFromResult(derivedResult),
      importError: null,
      importNotice: null,
    }));
    saveCharacterDataImmediately(
      nextData,
      get().activeCharacterSaveId,
      get().characterSaves,
      (status) => set({ storageStatus: status }),
    );
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

    const nextData = applyDependencyResultToCharacterData(dataWithCheckboxState, result);
    const derivedResult = rebuildDerivedDependencies(nextData, currentPackage);
    warnDependencyIssues(derivedResult);

    set(() => ({
      characterData: nextData,
      ...dependencyRuntimeStateFromResult(derivedResult),
      importError: null,
      importNotice: null,
    }));

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  // ========== Card operations ==========

  updateCardInstancePosition(instanceId, xPct, yPct) {
    const data = get().characterData;
    if (!data) {
      return;
    }

    set({
      characterData: updateCardInstancePositionDomain(data, instanceId, xPct, yPct),
      importError: null,
      importNotice: null,
    });

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  bringCardInstanceToFront(instanceId) {
    const data = get().characterData;
    if (!data) {
      return;
    }

    set({
      characterData: bringCardInstanceToFrontDomain(data, instanceId),
      importError: null,
      importNotice: null,
    });

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  updateCardInstanceState(instanceId, cardState) {
    const data = get().characterData;
    if (!data) {
      return;
    }

    set({
      characterData: updateCardInstanceStateDomain(data, instanceId, cardState),
      importError: null,
      importNotice: null,
    });

    scheduleAutosave(
      () => get().characterData,
      (status) => set({ storageStatus: status }),
    );
  },

  tidyCardTable(tableModuleId, layout) {
    const data = get().characterData;
    if (!data) {
      return;
    }

    set({
      characterData: tidyCardTableDomain(data, tableModuleId, layout),
      importError: null,
      importNotice: null,
    });

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
    const data = get().characterData;
    if (!data) {
      return;
    }

    set({
      characterData: deleteCardInstanceDomain(data, instanceId),
      importError: null,
      importNotice: null,
    });

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
      cardState: characterData.cards,
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
      cardState: characterData.cards,
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

    const previousValue = characterData.character.values[moduleId];
    const previousImageId = isPlayerImageValue(previousValue)
      ? previousValue.imageId
      : undefined;
    const imageId = generateId(`${moduleId}-`);
    const dataUrl = await fileToDataUrl(file);
    const image: PlayerImageData = {
      id: imageId,
      name: file.name || undefined,
      mimeType: file.type || "application/octet-stream",
      dataUrl,
    };

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

  flipCardInstance(instanceId) {
    updateCardStateAndAutosave(get, set, (data) => flipCardInstanceDomain(data, instanceId));
  },

  rotateCardInstance(instanceId, quarterTurns) {
    updateCardStateAndAutosave(get, set, (data) => rotateCardInstanceDomain(data, instanceId, quarterTurns));
  },

  setCardInstanceUpright(instanceId) {
    updateCardStateAndAutosave(get, set, (data) => setCardInstanceUprightDomain(data, instanceId));
  },

  addCardIndicator(instanceId) {
    updateCardStateAndAutosave(get, set, (data) => addCardIndicatorDomain(data, instanceId, generateId("card-indicator-")));
  },

  transitionCardIndicator(instanceId, indicatorId, direction) {
    updateCardStateAndAutosave(get, set, (data) => transitionCardIndicatorDomain(data, instanceId, indicatorId, direction));
  },

  // ========== Image & import/export ==========

  async removePlayerImage(moduleId) {
    const data = get().characterData;
    const value = data?.character.values[moduleId];
    if (!data || !isPlayerImageValue(value)) return;

    set({ characterData: removePlayerImageData(data, moduleId) });
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
      ...rebuildDependencyRuntimeState(result.data, currentPackage),
      importError: null,
      importNotice: "Character Data 已导入为 Character Save。",
      resourceReferenceIssues: get().resourceCatalog ? collectStaleResourceReferenceIssues(result.data, get().resourceCatalog!) : [],
    });

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

function updateCardStateAndAutosave(
  get: () => RuntimeState,
  set: (partial: Partial<RuntimeState> | ((state: RuntimeState) => Partial<RuntimeState>)) => void,
  update: (data: CharacterData) => CharacterData,
) {
  const data = get().characterData;
  if (!data) {
    return;
  }
  set({
    characterData: update(data),
    importError: null,
    importNotice: null,
  });
  scheduleAutosave(
    () => get().characterData,
    (status) => set({ storageStatus: status }),
  );
}

function isPlayerImageValue(value: unknown): value is PlayerImageValue {
  return typeof value === "object" && value !== null && "kind" in value && (value as PlayerImageValue).kind === "player-image";
}
