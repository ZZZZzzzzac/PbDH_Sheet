import type { SheetValue } from "../domain/characterData";
import { useRuntimeStore } from "../store/runtimeStore";

export function useTextModuleState(moduleId: string, defaultValue = "") {
  const rawValue = useRuntimeStore((state) => state.characterData?.character.values[moduleId]);
  const updateModuleValue = useRuntimeStore((state) => state.updateModuleValue);
  const value = typeof rawValue === "string" ? rawValue : defaultValue;

  return [value, (nextValue: string) => updateModuleValue(moduleId, nextValue)] as const;
}

export function readModuleState<T>(rawValue: SheetValue | undefined, fallback: T): T {
  if (rawValue && typeof rawValue === "object") {
    return { ...fallback, ...(rawValue as Partial<T>) };
  }

  return fallback;
}
