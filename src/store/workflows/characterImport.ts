import { exportCharacterData, type CharacterData } from "../../domain/characterData";
import { emptyDerivedState, collectStaleResourceReferenceIssues, rebuildDependencyRuntimeState } from "../runtimeStateHelpers";
import type { RuntimeEnvironment } from "../runtimeEnvironment";
import type { RuntimeGet, RuntimeSet } from "../runtimeTypes";
import { scheduleAutosave } from "./autosave";

export async function persistImportedCharacter(
  environment: RuntimeEnvironment,
  data: CharacterData,
  saveName: string,
  notice: string,
  set: RuntimeSet,
  get: RuntimeGet,
): Promise<void> {
  const currentPackage = get().currentPackage;
  if (!currentPackage) return;
  set({
    characterData: data,
    activeCharacterSaveId: data.character.id,
    ...emptyDerivedState(),
    ...rebuildDependencyRuntimeState(data, currentPackage),
    importError: null,
    importNotice: notice,
    pendingCharacterConversion: null,
    pendingCharacterFormatSelection: null,
    pendingQuestionnaireResult: null,
    resourceReferenceIssues: get().resourceCatalog
      ? collectStaleResourceReferenceIssues(data, get().resourceCatalog!)
      : [],
  });
  await environment.dependencies.storage.saveCharacterSave({
    id: data.character.id,
    packageId: data.systemPackage.id,
    name: saveName,
    updatedAt: data.updatedAt,
    data,
  });
  await environment.dependencies.storage
    .setActiveCharacterSaveId(data.systemPackage.id, data.character.id);
  set({
    characterSaves: await environment.dependencies.storage.listCharacterSaves(data.systemPackage.id),
    activeCharacterSaveId: data.character.id,
  });
  scheduleAutosave(environment, () => get().characterData, (storageStatus) => set({ storageStatus }));
}

export async function importCharacterSource(
  environment: RuntimeEnvironment,
  text: string,
  fileName: string,
  selectedAdapterId: string | undefined,
  set: RuntimeSet,
  get: RuntimeGet,
): Promise<void> {
  const currentPackage = get().currentPackage;
  if (!currentPackage) {
    set({ importError: "导入失败：当前没有可用的 System Package。", importNotice: null });
    return;
  }
  const [{ parseCharacterDataText }, { convertExternalCharacterSource, parseAndDetectCharacterSource }] = await Promise.all([
    import("../../export/output"),
    import("../../domain/characterFormatAdapter"),
  ]);
  const native = parseCharacterDataText(text, currentPackage);
  if (native.ok) {
    await persistImportedCharacter(
      environment,
      native.data,
      "导入角色",
      "Character Data 已导入为 Character Save。",
      set,
      get,
    );
    return;
  }
  const detection = parseAndDetectCharacterSource(
    text,
    fileName,
    currentPackage.characterFormatAdapters ?? [],
  );
  if (detection.status === "error" || detection.status === "none") {
    set({
      importError: detection.status === "error"
        ? detection.diagnostic.text
        : "导入失败：当前 System Package 不支持此人物卡格式。",
      importNotice: null,
    });
    return;
  }
  if (detection.status === "ambiguous" && !selectedAdapterId) {
    set({
      pendingCharacterFormatSelection: {
        text,
        fileName,
        adapters: detection.adapters.map(({ ID, 名称 }) => ({ ID, 名称 })),
      },
      pendingCharacterConversion: null,
      importError: null,
      importNotice: null,
    });
    return;
  }
  const adapter = detection.status === "match"
    ? detection.adapter
    : detection.adapters.find((candidate) => candidate.ID === selectedAdapterId);
  const source = detection.status === "match"
    ? detection.source
    : detection.sources[detection.adapters.findIndex((candidate) => candidate.ID === selectedAdapterId)];
  if (!adapter || !source) {
    set({
      importError: "导入失败：选择的 Character Format Adapter 不匹配此文件。",
      importNotice: null,
    });
    return;
  }
  const conversion = await convertExternalCharacterSource(source, adapter, currentPackage);
  if ("error" in conversion) {
    set({
      importError: `导入失败：${conversion.error.text}`,
      importNotice: null,
      pendingCharacterConversion: null,
    });
    return;
  }
  const normalized = parseCharacterDataText(exportCharacterData(conversion.data), currentPackage);
  if (!normalized.ok) {
    set({
      importError: `导入失败：转换结果不符合当前 Character Data 合同。${normalized.error}`,
      importNotice: null,
      pendingCharacterConversion: null,
    });
    return;
  }
  conversion.data = normalized.data;
  const lossy = conversion.report.diagnostics.length > 0
    || conversion.report.skippedCards > 0
    || conversion.report.skippedFields > 0
    || conversion.report.skippedImages > 0;
  if (lossy) {
    set({
      pendingCharacterConversion: conversion,
      pendingCharacterFormatSelection: null,
      importError: null,
      importNotice: null,
    });
    return;
  }
  await persistImportedCharacter(
    environment,
    conversion.data,
    conversion.suggestedSaveName ?? "导入角色",
    `${adapter.名称} 已导入为新的 Character Save。`,
    set,
    get,
  );
}
