import type { LongTextModule as LongTextModuleConfig } from "../domain/systemPackage";
import { useTextModuleState } from "./moduleState";

interface LongTextModuleProps {
  module: LongTextModuleConfig;
}

export function LongTextModule({ module }: LongTextModuleProps) {
  const [value, setValue] = useTextModuleState(module.ID, module.默认值 ?? "");
  const inputId = `module-${module.ID}`;

  return (
    <div className="container container-stack" data-module-id={module.ID} data-module-type={module.类型} data-part="container">
      <label className="label" data-part="label" htmlFor={inputId}>
        {module.标签}
      </label>
      <textarea
        id={inputId}
        className="input textarea"
        data-part="input"
        rows={module.行数 ?? 4}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}
