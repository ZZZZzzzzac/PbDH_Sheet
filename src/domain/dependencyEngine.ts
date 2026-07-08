import { updateCharacterValue, type CharacterData, type CheckboxState } from "./characterData";
import type { ResourceLibraryEntry, ResourceLibraryQuery } from "./resourceLibrary";
import { findModule, type DependencyAction, type DependencyCondition, type SystemPackage } from "./systemPackage";

export interface ResourceSelectedEvent {
  type: "resourceSelected";
  sourceModuleId: string;
  libraryId: string;
  selectedEntries: ResourceLibraryEntry[];
}

export interface CheckboxChangedEvent {
  type: "checkboxChanged";
  sourceModuleId: string;
  optionId: string;
  checked: boolean;
  checkboxState: CheckboxState;
}

export type DependencyEvent = ResourceSelectedEvent | CheckboxChangedEvent;

export interface DependencyEvaluationResult {
  dataPatches: Record<string, string>;
  readOnlyDisplayContent: Record<string, string>;
  moduleVisibility: Record<string, boolean>;
  pageVisibility: Record<string, boolean>;
  resourcePickerDefaultQueries: Record<string, ResourceLibraryQuery>;
  warnings: string[];
}

export function createEmptyDependencyEvaluationResult(): DependencyEvaluationResult {
  return {
    dataPatches: {},
    readOnlyDisplayContent: {},
    moduleVisibility: {},
    pageVisibility: {},
    resourcePickerDefaultQueries: {},
    warnings: [],
  };
}

export function evaluateDependencies(
  data: CharacterData,
  systemPackage: SystemPackage,
  event: DependencyEvent,
): DependencyEvaluationResult {
  const result = createEmptyDependencyEvaluationResult();
  const writtenTargets = new Map<string, string>();

  for (const rule of systemPackage.dependencies ?? []) {
    if (!eventMatchesTrigger(event, rule.触发.类型, rule.触发.来源模块ID)) {
      continue;
    }
    if (!conditionMatches(rule.条件, event)) {
      continue;
    }

    for (const action of rule.动作) {
      applyAction({
        action,
        systemPackage,
        event,
        result,
        ruleId: rule.ID,
        writtenTargets,
      });
    }
  }

  return result;
}

export function applyDependencyResultToCharacterData(data: CharacterData, result: DependencyEvaluationResult): CharacterData {
  let nextData = data;

  for (const [moduleId, value] of Object.entries(result.dataPatches)) {
    nextData = updateCharacterValue(nextData, moduleId, value);
  }

  return nextData;
}

function eventMatchesTrigger(event: DependencyEvent, triggerType: string, sourceModuleId: string): boolean {
  return event.type === triggerType && event.sourceModuleId === sourceModuleId;
}

function conditionMatches(condition: DependencyCondition | undefined, event: DependencyEvent): boolean {
  if (!condition || condition.类型 === "always") {
    return true;
  }

  switch (condition.类型) {
    case "selectedResourceFieldEquals":
      return event.type === "resourceSelected" && selectedFieldValues(event, condition.字段).some((value) => value === condition.值);
    case "selectedResourceFieldIn":
      return event.type === "resourceSelected" && selectedFieldValues(event, condition.字段).some((value) => condition.值.includes(value));
    case "selectedResourceFieldNotEquals":
      return event.type === "resourceSelected" && selectedFieldValues(event, condition.字段).every((value) => value !== condition.值);
    case "checkboxOptionChecked":
      return event.type === "checkboxChanged" && event.checkboxState[condition.选项ID] === true;
    case "checkboxOptionUnchecked":
      return event.type === "checkboxChanged" && event.checkboxState[condition.选项ID] !== true;
    default:
      return false;
  }
}

function applyAction({
  action,
  systemPackage,
  event,
  result,
  ruleId,
  writtenTargets,
}: {
  action: DependencyAction;
  systemPackage: SystemPackage;
  event: DependencyEvent;
  result: DependencyEvaluationResult;
  ruleId: string;
  writtenTargets: Map<string, string>;
}) {
  switch (action.类型) {
    case "fillText": {
      const targetModule = findModule(systemPackage, action.目标模块ID);
      const value = fillTextValue(action.内容, event);
      const targetKey = `text:${action.目标模块ID}`;
      recordWrite(result, writtenTargets, targetKey, `text target ${action.目标模块ID}`, ruleId);

      if (targetModule?.类型 === "readOnlyDisplay") {
        result.readOnlyDisplayContent[action.目标模块ID] = value;
        return;
      }

      if (targetModule?.类型 === "freeText" || targetModule?.类型 === "longText") {
        result.dataPatches[action.目标模块ID] = value;
      }
      return;
    }

    case "setVisibility": {
      const targetKey = `visibility:${action.目标类型}:${action.目标ID}`;
      recordWrite(result, writtenTargets, targetKey, `${action.目标类型} visibility ${action.目标ID}`, ruleId);

      if (action.目标类型 === "page") {
        result.pageVisibility[action.目标ID] = action.显示;
        return;
      }

      result.moduleVisibility[action.目标ID] = action.显示;
      return;
    }

    case "setResourceDefaultFilter": {
      const targetKey = `resourceDefaultFilter:${action.目标模块ID}:${action.字段}`;
      recordWrite(result, writtenTargets, targetKey, `resource picker default filter ${action.目标模块ID}.${action.字段}`, ruleId);

      const currentQuery = result.resourcePickerDefaultQueries[action.目标模块ID] ?? {};
      result.resourcePickerDefaultQueries[action.目标模块ID] = {
        ...currentQuery,
        filters: {
          ...(currentQuery.filters ?? {}),
          [action.字段]: action.值,
        },
      };
      return;
    }
  }

}

function recordWrite(
  result: DependencyEvaluationResult,
  writtenTargets: Map<string, string>,
  key: string,
  label: string,
  ruleId: string,
) {
  const previousRuleId = writtenTargets.get(key);
  if (previousRuleId) {
    result.warnings.push(`Dependency conflict on ${label}: ${previousRuleId} overwritten by ${ruleId}.`);
  }
  writtenTargets.set(key, ruleId);
}

function fillTextValue(content: Extract<DependencyAction, { 类型: "fillText" }>["内容"], event: DependencyEvent): string {
  if (typeof content === "string") {
    return content;
  }

  if (event.type !== "resourceSelected") {
    return "";
  }

  return selectedFieldText(event.selectedEntries, content.字段, content.选择索引, content.分隔符);
}

function selectedFieldValues(event: ResourceSelectedEvent, field: string): string[] {
  return event.selectedEntries.map((entry) => entry.fields[field] ?? "");
}

function selectedFieldText(entries: ResourceLibraryEntry[], field: string, selectedIndex?: number, separator = "\n\n") {
  if (selectedIndex !== undefined) {
    return entries[selectedIndex]?.fields[field] ?? "";
  }

  return entries.map((entry) => entry.fields[field] ?? "").join(separator);
}
