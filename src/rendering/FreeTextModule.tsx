import type { FreeTextModule } from "../domain/systemPackage";
import { useTextModuleState } from "./moduleState";

interface FreeTextModuleProps {
  module: FreeTextModule;
}

export function FreeTextModule({ module }: FreeTextModuleProps) {
  const [value, setValue] = useTextModuleState(module.ID, module.默认值 ?? "");
  const inputId = `module-${module.ID}`;
  const labelHidden = module.隐藏标签 === true || module.标签 === "";
  const accessibleName = module.标签 || module.占位文本 || module.ID;

  return (
    <div className="container" data-module-id={module.ID} data-module-type={module.类型} data-part="container" data-label-hidden={labelHidden ? "true" : undefined}>
      {!labelHidden ? (
        <label className="label" data-part="label" htmlFor={inputId}>
          {module.标签}
        </label>
      ) : null}
      <input
        id={inputId}
        className="input"
        data-part="input"
        aria-label={labelHidden ? accessibleName : undefined}
        placeholder={module.占位文本}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}
