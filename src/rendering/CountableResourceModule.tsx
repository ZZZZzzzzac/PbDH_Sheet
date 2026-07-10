import type { CountableResourceModule as CountableResourceModuleConfig } from "../domain/systemPackage";
import { useRuntimeStore } from "../store/runtimeStore";
import { readCountableState } from "./moduleState";
import { clampInt } from "../utils";

interface CountableResourceModuleProps {
  module: CountableResourceModuleConfig;
}

type CountableState = { current: number; max: number | null };

export function CountableResourceModule({ module }: CountableResourceModuleProps) {
  const min = module.最小值 ?? 0;
  const step = module.步长 ?? 1;
  const editableMax = module.最大值可改 ?? false;
  const fallback: CountableState = {
    current: clampInt(module.默认值 ?? min, min, module.最大值 ?? null),
    max: module.最大值 ?? null,
  };

  const rawValue = useRuntimeStore((state) => state.characterData?.character.values[module.ID]);
  const updateModuleValue = useRuntimeStore((state) => state.updateModuleValue);
  const state = readCountableState(rawValue, fallback);
  const max = state.max;
  const current = clampInt(state.current, min, max);

  const setState = (next: Partial<CountableState>) => {
    updateModuleValue(module.ID, { ...state, ...next });
  };
  const setCurrent = (nextCurrent: number) => setState({ current: clampInt(nextCurrent, min, max) });
  const setMax = (nextMax: number | null) => setState({ max: nextMax });

  return (
    <div className="container" data-module-id={module.ID} data-module-type={module.类型}>
      <div className="label">{module.标签}</div>
      <div className="counter">
        <button className="button stepper" type="button" onClick={() => setCurrent(current - step)} disabled={current <= min} aria-label={`${module.标签}减少`}>
          -
        </button>
        <input
          className="input number-input"
          inputMode="numeric"
          aria-label={module.标签}
          value={current}
          onChange={(event) => setCurrent(parseInteger(event.target.value, fallback.current))}
        />
        <button
          className="button stepper"
          type="button"
          onClick={() => setCurrent(current + step)}
          disabled={max !== null && current >= max}
          aria-label={`${module.标签}增加`}
        >
          +
        </button>
        {max !== null ? (
          <span className="value">
            /{" "}
            {editableMax ? (
              <input
                className="input max-input"
                inputMode="numeric"
                aria-label={`${module.标签}上限`}
                value={max}
                onChange={(event) => setMax(parseIntegerNullable(event.target.value))}
              />
            ) : (
              max
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function parseInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIntegerNullable(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
