import type { FreeTextModule } from "../domain/systemPackage";
import { useRuntimeStore } from "../store/runtimeStore";

interface FreeTextModuleProps {
  module: FreeTextModule;
}

export function FreeTextModule({ module }: FreeTextModuleProps) {
  const value = useRuntimeStore((state) => state.characterData?.character.values[module.ID] ?? module.默认值 ?? "");
  const updateModuleValue = useRuntimeStore((state) => state.updateModuleValue);
  const inputId = `module-${module.ID}`;

  return (
    <div className="sheet-module" data-module-id={module.ID}>
      <label className="module-label" htmlFor={inputId}>
        {module.标签}
      </label>
      <input
        id={inputId}
        className="module-input"
        value={value}
        onChange={(event) => updateModuleValue(module.ID, event.target.value)}
      />
    </div>
  );
}
