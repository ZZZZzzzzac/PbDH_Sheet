import type { CheckboxResourceModule as CheckboxResourceModuleConfig } from "../domain/systemPackage";
import { useRuntimeStore } from "../store/runtimeStore";
import { readCheckboxState } from "./moduleState";

interface CheckboxResourceModuleProps {
  module: CheckboxResourceModuleConfig;
}

type CheckboxState = Record<string, boolean>;

export function CheckboxResourceModule({ module }: CheckboxResourceModuleProps) {
  const rawValue = useRuntimeStore((state) => state.characterData?.character.values[module.ID]);
  const commitCheckboxChange = useRuntimeStore((state) => state.commitCheckboxChange);
  const fallback = Object.fromEntries(module.选项.map((option) => [option.ID, option.默认选中 ?? false]));
  const value = readCheckboxState(rawValue, fallback);
  const labelId = `module-${module.ID}-label`;

  const setChecked = (optionId: string, checked: boolean) => {
    commitCheckboxChange(module.ID, optionId, checked, { ...value, [optionId]: checked });
  };

  return (
    <div className="container container-stack" data-module-id={module.ID} data-module-type={module.类型} data-part="container" role="group" aria-labelledby={labelId}>
      <div id={labelId} className="label" data-part="label">
        {module.标签}
      </div>
      <div className="checkbox-list" data-part="options">
        {module.选项.map((option) => (
          <label className="checkbox-row" data-part="option" key={option.ID}>
            <input data-part="input" type="checkbox" checked={value[option.ID] ?? false} onChange={(event) => setChecked(option.ID, event.target.checked)} />
            <span data-part="option-label">{option.标签}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
