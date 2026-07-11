import type { LongTextModule as LongTextModuleConfig } from "../domain/systemPackage";
import { useTextModuleState } from "./moduleState";

interface LongTextModuleProps {
  module: LongTextModuleConfig;
}

export function LongTextModule({ module }: LongTextModuleProps) {
  const [value, setValue] = useTextModuleState(module.ID, module.默认值 ?? "");
  const inputId = `module-${module.ID}`;
  const labelHidden = module.隐藏标签 === true || module.标签 === "";
  const accessibleName = module.标签 || module.占位文本 || module.ID;

  return (
    <div className="container container-stack" data-module-id={module.ID} data-module-type={module.类型} data-part="container" data-label-hidden={labelHidden ? "true" : undefined}>
      {!labelHidden ? (
        <label className="label" data-part="label" htmlFor={inputId}>
          {module.标签}
        </label>
      ) : null}
      <textarea
        id={inputId}
        className="input textarea"
        data-part="input"
        aria-label={labelHidden ? accessibleName : undefined}
        placeholder={module.占位文本}
        rows={module.行数 ?? 4}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}
