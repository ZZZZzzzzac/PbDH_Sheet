import type { CheckboxResourceModule as CheckboxResourceModuleConfig } from "../domain/systemPackage";
import { useRuntimeStore } from "../store/runtimeStore";
import { readModuleState } from "./moduleState";

interface CheckboxResourceModuleProps {
  module: CheckboxResourceModuleConfig;
}

type CheckboxState = Record<string, boolean>;

export function CheckboxResourceModule({ module }: CheckboxResourceModuleProps) {
  const rawValue = useRuntimeStore((state) => state.characterData?.character.values[module.ID]);
  const updateModuleValue = useRuntimeStore((state) => state.updateModuleValue);
  const fallback = Object.fromEntries(module.选项.map((option) => [option.ID, option.默认选中 ?? false]));
  const value = readModuleState<CheckboxState>(rawValue, fallback);
  const labelId = `module-${module.ID}-label`;

  const setChecked = (optionId: string, checked: boolean) => {
    updateModuleValue(module.ID, { ...value, [optionId]: checked });
  };

  return (
    <div className="container container-stack" data-module-id={module.ID} data-module-type={module.类型} role="group" aria-labelledby={labelId}>
      <div id={labelId} className="label">
        {module.标签}
      </div>
      <div className="checkbox-list">
        {module.选项.map((option) => (
          <label className="checkbox-row" key={option.ID}>
            <input type="checkbox" checked={value[option.ID] ?? false} onChange={(event) => setChecked(option.ID, event.target.checked)} />
            <span>{option.标签}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
