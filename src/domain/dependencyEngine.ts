import { updateCharacterValue, type CharacterData } from "./characterData";
import { findModule, type SystemPackage } from "./systemPackage";
import type { ResourceLibraryEntry } from "./resourceLibrary";

export interface ResourceSelectedEvent {
  type: "resourceSelected";
  sourceModuleId: string;
  libraryId: string;
  selectedEntries: ResourceLibraryEntry[];
}

export function applyResourceSelectedDependencies(
  data: CharacterData,
  systemPackage: SystemPackage,
  event: ResourceSelectedEvent,
): CharacterData {
  let nextData = data;

  for (const rule of systemPackage.dependencies ?? []) {
    if (rule.触发.来源模块ID !== event.sourceModuleId) {
      continue;
    }

    for (const action of rule.动作) {
      const targetModule = findModule(systemPackage, action.目标模块ID);
      if (targetModule?.类型 !== "freeText" && targetModule?.类型 !== "longText") {
        continue;
      }

      nextData = updateCharacterValue(nextData, action.目标模块ID, selectedFieldText(event.selectedEntries, action.资源字段, action.选择索引, action.分隔符));
    }
  }

  return nextData;
}

function selectedFieldText(entries: ResourceLibraryEntry[], field: string, selectedIndex?: number, separator = "\n\n") {
  if (selectedIndex !== undefined) {
    return entries[selectedIndex]?.fields[field] ?? "";
  }

  return entries.map((entry) => entry.fields[field] ?? "").join(separator);
}
