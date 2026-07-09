import { create } from "zustand";
import {
  type CheckboxState,
  createEmptyCharacterData,
  parseCharacterDataJson,
  updateCharacterValue,
  updatePlayerImage,
  type CharacterData,
  type PlayerImageData,
  type SheetValue,
} from "../domain/characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies, type DependencyEvaluationResult } from "../domain/dependencyEngine";
import type { ResourceLibraryEntry, ResourceLibraryQuery } from "../domain/resourceLibrary";
import { validateCachedSystemPackage, type PackageIssue, type SystemPackage } from "../domain/systemPackage";
import { runValidationChecks as runValidationChecksDomain, type ValidationIssue } from "../domain/validationRunner";
import { createRuntimeAssetResolver, type RuntimeAssetResolver, type RuntimePackageAsset } from "../loaders/assetResolver";
import { loadSystemPackageFromZipFile, type PackageLoadResult } from "../loaders/systemPackageLoader";
import { storageService, type StorageService } from "../storage/storageService";

export const autosaveDelayMs = 250;

type BootStatus = "idle" | "loading" | "ready" | "error";
type StorageStatus = "idle" | "saving" | "saved" | "error";
type ValidationStatus = "idle" | "running" | "complete";

interface RuntimeState {
  currentPackage: SystemPackage | null;
  packageAssetUrls: Record<string, string>;
  packageIssues: PackageIssue[];
  characterData: CharacterData | null;
  derivedReadOnlyDisplayContent: Record<string, string>;
  moduleVisibility: Record<string, boolean>;
  pageVisibility: Record<string, boolean>;
  resourcePickerDefaultQueries: Record<string, ResourceLibraryQuery>;
  validationIssues: ValidationIssue[];
  validationStatus: ValidationStatus;
  bootStatus: BootStatus;
  storageStatus: StorageStatus;
  importError: string | null;
  importNotice: string | null;
  initialize: () => Promise<void>;
  uploadSystemPackageFromFile: (file: Blob) => Promise<void>;
  updateModuleValue: (moduleId: string, value: SheetValue) => void;
  commitResourceSelection: (moduleId: string, libraryId: string, entries: ResourceLibraryEntry[]) => void;
  commitCheckboxChange: (moduleId: string, optionId: string, checked: boolean, checkboxState: CheckboxState) => void;
  runValidationChecks: () => Promise<void>;
  uploadPlayerImage: (moduleId: string, file: File) => Promise<void>;
  importCharacterDataFromText: (text: string) => Promise<void>;
  clearImportMessage: () => void;
}

let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
let activePackageAssetResolver: RuntimeAssetResolver | undefined;

interface RuntimeDependencies {
  loadSystemPackageFromFile: (file: Blob) => Promise<PackageLoadResult>;
  storage: StorageService;
  runValidationChecks: typeof runValidationChecksDomain;
}

const defaultRuntimeDependencies: RuntimeDependencies = {
  loadSystemPackageFromFile: (file) => loadSystemPackageFromZipFile(file),
  storage: storageService,
  runValidationChecks: runValidationChecksDomain,
};

let runtimeDependencies = defaultRuntimeDependencies;

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
    const saved = await runtimeDependencies.storage.loadCurrentCharacterData(systemPackage.manifest.ID);
    set({
      currentPackage: systemPackage,
      packageAssetUrls: activePackageAssetResolver.urls,
      characterData: saved ?? createEmptyCharacterData(systemPackage),
      derivedReadOnlyDisplayContent: {},
      moduleVisibility: {},
      pageVisibility: {},
      resourcePickerDefaultQueries: {},
      validationIssues: [],
      validationStatus: "idle",
      packageIssues: issues,
      bootStatus: "ready",
      storageStatus,
    });
  } catch {
    set({
      currentPackage: systemPackage,
      packageAssetUrls: activePackageAssetResolver.urls,
      characterData: createEmptyCharacterData(systemPackage),
      derivedReadOnlyDisplayContent: {},
      moduleVisibility: {},
      pageVisibility: {},
      resourcePickerDefaultQueries: {},
      validationIssues: [],
      validationStatus: "idle",
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
    derivedReadOnlyDisplayContent: {},
    moduleVisibility: {},
    pageVisibility: {},
    resourcePickerDefaultQueries: {},
    validationIssues: [],
    validationStatus: "idle",
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
  derivedReadOnlyDisplayContent: {},
  moduleVisibility: {},
  pageVisibility: {},
  resourcePickerDefaultQueries: {},
  validationIssues: [],
  validationStatus: "idle",
  bootStatus: "idle",
  storageStatus: "idle",
  importError: null,
  importNotice: null,

  async initialize() {
    set({ bootStatus: "loading", packageIssues: [], importError: null, importNotice: null });

    try {
      const cachedPackage = await runtimeDependencies.storage.loadCurrentSystemPackage();
      if (!cachedPackage) {
        activePackageAssetResolver?.revokeAll();
        activePackageAssetResolver = undefined;
        set({
          currentPackage: null,
          packageAssetUrls: {},
          characterData: null,
          derivedReadOnlyDisplayContent: {},
          moduleVisibility: {},
          pageVisibility: {},
          resourcePickerDefaultQueries: {},
          validationIssues: [],
          validationStatus: "idle",
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
      characterData: applyDependencyResultToCharacterData(characterData, result),
      ...mergeDependencyRuntimeState(state, result),
      importError: null,
      importNotice: null,
    }));

    if (Object.keys(result.dataPatches).length > 0) {
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

  async uploadPlayerImage(moduleId, file) {
    const characterData = get().characterData;
    if (!characterData) {
      return;
    }

    const imageId = createPlayerImageId(moduleId);
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

    const result = parseCharacterDataJson(text, currentPackage);

    if (!result.ok) {
      set({
        importError: result.error,
        importNotice: null,
      });
      return;
    }

    set({
      characterData: result.data,
      derivedReadOnlyDisplayContent: {},
      moduleVisibility: {},
      pageVisibility: {},
      resourcePickerDefaultQueries: {},
      validationIssues: [],
      validationStatus: "idle",
      importError: null,
      importNotice: "Character Data 已导入。",
    });

    await saveImportedPlayerImages(result.data.playerImages);

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

function warnDependencyIssues(result: DependencyEvaluationResult) {
  for (const warning of result.warnings) {
    console.warn(warning);
  }
}

function mergeDependencyRuntimeState(
  state: RuntimeState,
  result: DependencyEvaluationResult,
): Pick<RuntimeState, "derivedReadOnlyDisplayContent" | "moduleVisibility" | "pageVisibility" | "resourcePickerDefaultQueries"> {
  return {
    derivedReadOnlyDisplayContent: {
      ...state.derivedReadOnlyDisplayContent,
      ...result.readOnlyDisplayContent,
    },
    moduleVisibility: {
      ...state.moduleVisibility,
      ...result.moduleVisibility,
    },
    pageVisibility: {
      ...state.pageVisibility,
      ...result.pageVisibility,
    },
    resourcePickerDefaultQueries: mergeResourcePickerDefaultQueries(state.resourcePickerDefaultQueries, result.resourcePickerDefaultQueries),
  };
}

function mergeResourcePickerDefaultQueries(
  current: Record<string, ResourceLibraryQuery>,
  updates: Record<string, ResourceLibraryQuery>,
): Record<string, ResourceLibraryQuery> {
  const next = { ...current };

  for (const [moduleId, query] of Object.entries(updates)) {
    next[moduleId] = {
      ...next[moduleId],
      ...query,
      filters: {
        ...(next[moduleId]?.filters ?? {}),
        ...(query.filters ?? {}),
      },
    };
  }

  return next;
}

function createPlayerImageId(moduleId: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${moduleId}-${random}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function saveImportedPlayerImages(images: Record<string, PlayerImageData>) {
  await Promise.all(
    Object.values(images).map(async (image) => {
      const blob = dataUrlToBlob(image.dataUrl, image.mimeType);
      await runtimeDependencies.storage.savePlayerImageBlob({
        id: image.id,
        name: image.name,
        mimeType: image.mimeType,
        blob,
      });
    }),
  );
}

function dataUrlToBlob(dataUrl: string, fallbackMimeType: string): Blob {
  const [header, payload] = dataUrl.split(",", 2);
  const mimeType = /data:([^;]+)/.exec(header)?.[1] ?? fallbackMimeType;
  const binary = atob(payload ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}
