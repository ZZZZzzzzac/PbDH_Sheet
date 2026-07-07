import { create } from "zustand";
import { createEmptyCharacterData, parseCharacterDataJson, updateCharacterValue, type CharacterData } from "../domain/characterData";
import type { PackageIssue, PackageValidationResult, SystemPackage } from "../domain/systemPackage";
import { loadSystemPackageFromUrl } from "../loaders/systemPackageLoader";
import { storageService, type StorageService } from "../storage/storageService";

export const autosaveDelayMs = 250;

type BootStatus = "idle" | "loading" | "ready" | "error";
type StorageStatus = "idle" | "saving" | "saved" | "error";

interface RuntimeState {
  currentPackage: SystemPackage | null;
  packageIssues: PackageIssue[];
  characterData: CharacterData | null;
  bootStatus: BootStatus;
  storageStatus: StorageStatus;
  importError: string | null;
  importNotice: string | null;
  initialize: () => Promise<void>;
  updateModuleValue: (moduleId: string, value: string) => void;
  importCharacterDataFromText: (text: string) => Promise<void>;
  clearImportMessage: () => void;
}

let autosaveTimer: ReturnType<typeof setTimeout> | undefined;

interface RuntimeDependencies {
  loadSystemPackage: () => Promise<PackageValidationResult>;
  storage: StorageService;
}

const defaultRuntimeDependencies: RuntimeDependencies = {
  loadSystemPackage: () => loadSystemPackageFromUrl(),
  storage: storageService,
};

let runtimeDependencies = defaultRuntimeDependencies;

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
  packageIssues: [],
  characterData: null,
  bootStatus: "idle",
  storageStatus: "idle",
  importError: null,
  importNotice: null,

  async initialize() {
    set({ bootStatus: "loading" });
    const validation = await runtimeDependencies.loadSystemPackage();

    if (!validation.ok) {
      set({
        currentPackage: null,
        characterData: null,
        bootStatus: "error",
        packageIssues: validation.issues,
      });
      return;
    }

    try {
      const saved = await runtimeDependencies.storage.loadCurrentCharacterData(validation.package.manifest.ID);
      set({
        currentPackage: validation.package,
        characterData: saved ?? createEmptyCharacterData(validation.package),
        packageIssues: validation.issues,
        bootStatus: "ready",
      });
    } catch {
      set({
        currentPackage: validation.package,
        characterData: createEmptyCharacterData(validation.package),
        packageIssues: validation.issues,
        bootStatus: "ready",
        storageStatus: "error",
      });
    }
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
      importError: null,
      importNotice: "Character Data 已导入。",
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

export function configureRuntimeDependencies(dependencies: RuntimeDependencies) {
  runtimeDependencies = dependencies;
}

export function resetRuntimeDependencies() {
  runtimeDependencies = defaultRuntimeDependencies;
}
