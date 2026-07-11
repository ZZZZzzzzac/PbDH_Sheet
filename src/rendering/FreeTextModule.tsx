import type { FreeTextModule } from "../domain/systemPackage";
import { useTextModuleState } from "./moduleState";

interface FreeTextModuleProps {
  module: FreeTextModule;
}

export function FreeTextModule({ module }: FreeTextModuleProps) {
  const [value, setValue] = useTextModuleState(module.ID, module.默认值 ?? "");
  const inputId = `module-${module.ID}`;

  return (
    <div className="container" data-module-id={module.ID} data-module-type={module.类型} data-part="container">
      <label className="label" data-part="label" htmlFor={inputId}>
        {module.标签}
      </label>
      <input
        id={inputId}
        className="input"
        data-part="input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}
