import { createCardInstance } from "../domain/cardEngine";
import {
  type CharacterData,
  type PlayerImageData,
  createEmptyCharacterData,
} from "../domain/characterData";
import { type DependencyEvaluationResult } from "../domain/dependencyEngine";
import type { ResourceLibraryEntry, ResourceLibraryQuery } from "../domain/resourceLibrary";
import type { CompositeResource } from "../domain/resourceComposer";
import type { SystemPackage } from "../domain/systemPackage";
import type { CharacterSaveSummary, StorageService } from "../storage/storageService";
import { generateId } from "../utils";

export interface DependencyMergeState {
  derivedReadOnlyDisplayContent: Record<string, string>;
  moduleVisibility: Record<string, boolean>;
  pageVisibility: Record<string, boolean>;
  resourcePickerDefaultQueries: Record<string, ResourceLibraryQuery>;
}

export function warnDependencyIssues(result: DependencyEvaluationResult) {
  for (const warning of result.warnings) {
    console.warn(warning);
  }
}

export function mergeDependencyRuntimeState(
  state: DependencyMergeState,
  result: DependencyEvaluationResult,
): DependencyMergeState {
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

export function mergeResourcePickerDefaultQueries(
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

export function ensureCardState(data: CharacterData | null): CharacterData | null {
  if (!data) {
    return null;
  }

  return {
    ...data,
    cards: {
      instances: (data.cards?.instances ?? []).map((instance) => {
        const legacy = instance as typeof instance & { libraryId?: string; definitionId?: string };
        if (instance.definitionRef || !legacy.libraryId || !legacy.definitionId) return instance;
        const { libraryId, definitionId, ...current } = legacy;
        return { ...current, definitionRef: { type: "resourceLibrary" as const, libraryId, entryId: definitionId } };
      }),
    },
    compositeResources: data.compositeResources ?? {},
    resourceSelections: data.resourceSelections ?? {},
  };
}

export function dependencyRuntimeStateFromResult(result: DependencyEvaluationResult): DependencyMergeState {
  return {
    derivedReadOnlyDisplayContent: result.readOnlyDisplayContent,
    moduleVisibility: result.moduleVisibility,
    pageVisibility: result.pageVisibility,
    resourcePickerDefaultQueries: result.resourcePickerDefaultQueries,
  };
}

export async function loadActiveCharacterForPackage(
  systemPackage: SystemPackage,
  storage: StorageService,
): Promise<{
  characterData: CharacterData;
  characterSaves: CharacterSaveSummary[];
  activeCharacterSaveId: string;
}> {
  const packageId = systemPackage.manifest.ID;
  let characterSaves = await storage.listCharacterSaves(packageId);
  let activeCharacterSaveId = await storage.loadActiveCharacterSaveId(packageId);

  if (!activeCharacterSaveId || !characterSaves.some((save) => save.id === activeCharacterSaveId)) {
    activeCharacterSaveId = characterSaves[0]?.id ?? null;
  }

  if (activeCharacterSaveId) {
    const saved = ensureCardState(await storage.loadCharacterSave(packageId, activeCharacterSaveId));
    if (saved) {
      await storage.setActiveCharacterSaveId(packageId, activeCharacterSaveId);
      return {
        characterData: saved,
        characterSaves,
        activeCharacterSaveId,
      };
    }
  }

  const characterData = createEmptyCharacterData(systemPackage);
  await storage.saveCharacterSave({
    id: characterData.character.id,
    packageId,
    name: "未命名角色",
    updatedAt: characterData.updatedAt,
    data: characterData,
  });
  await storage.setActiveCharacterSaveId(packageId, characterData.character.id);
  characterSaves = await storage.listCharacterSaves(packageId);
  return {
    characterData,
    characterSaves,
    activeCharacterSaveId: characterData.character.id,
  };
}

export function createCardInstancesFromSelection(
  data: CharacterData,
  systemPackage: SystemPackage,
  moduleId: string,
  libraryId: string,
  entries: ResourceLibraryEntry[],
): CharacterData {
  const sourceModule = systemPackage.modules.find((module) => module.ID === moduleId);
  if (sourceModule?.类型 !== "resourcePicker" || !sourceModule.创建卡牌) {
    return data;
  }
  const cardCreation = sourceModule.创建卡牌;
  const targetTable = systemPackage.modules.find((module) => module.ID === cardCreation.卡牌桌面模块ID);
  if (targetTable?.类型 !== "cardTable" || !targetTable.资源来源.some((source) => source.类型 === "resourceLibrary" && source.ID === libraryId)) {
    return data;
  }

  return entries.reduce(
    (nextData, entry) =>
      createCardInstance(nextData, {
        instanceId: generateId(`${entry.ID}:`),
        tableModuleId: cardCreation.卡牌桌面模块ID,
        libraryId,
        definitionId: entry.ID,
        state: cardCreation.默认状态 ?? targetTable.状态选项?.[0],
      }),
    data,
  );
}

export function hasCardCreationTarget(systemPackage: SystemPackage, moduleId: string): boolean {
  const sourceModule = systemPackage.modules.find((module) => module.ID === moduleId);
  return (sourceModule?.类型 === "resourcePicker" || sourceModule?.类型 === "resourceComposer") && Boolean(sourceModule.创建卡牌);
}

export function createCardInstanceFromComposite(
  data: CharacterData,
  systemPackage: SystemPackage,
  moduleId: string,
  composite: CompositeResource,
): CharacterData {
  const sourceModule = systemPackage.modules.find((module) => module.ID === moduleId);
  if (sourceModule?.类型 !== "resourceComposer" || !sourceModule.创建卡牌) return data;
  const targetTable = systemPackage.modules.find((module) => module.ID === sourceModule.创建卡牌?.卡牌桌面模块ID);
  if (targetTable?.类型 !== "cardTable" || !targetTable.资源来源.some((source) => source.类型 === "resourceComposer" && source.ID === moduleId)) return data;
  const reference = { type: "compositeResource" as const, compositeResourceId: composite.ID };
  const exists = data.cards.instances.some((instance) => instance.tableModuleId === targetTable.ID
    && instance.definitionRef.type === "compositeResource"
    && instance.definitionRef.compositeResourceId === composite.ID);
  if (exists) return data;
  return createCardInstance(data, {
    instanceId: generateId(`${composite.ID}:`),
    tableModuleId: targetTable.ID,
    definitionRef: reference,
    state: sourceModule.创建卡牌.默认状态 ?? targetTable.状态选项?.[0],
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function saveImportedPlayerImages(
  images: Record<string, PlayerImageData>,
  storage: StorageService,
) {
  await Promise.all(
    Object.values(images).map(async (image) => {
      const blob = dataUrlToBlob(image.dataUrl, image.mimeType);
      await storage.savePlayerImageBlob({
        id: image.id,
        name: image.name,
        mimeType: image.mimeType,
        blob,
      });
    }),
  );
}

export function dataUrlToBlob(dataUrl: string, fallbackMimeType: string): Blob {
  const [header, payload] = dataUrl.split(",", 2);
  const mimeType = /data:([^;]+)/.exec(header)?.[1] ?? fallbackMimeType;
  const binary = atob(payload ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}
