/// <reference lib="webworker" />
import { deepFreeze, executeScriptInContext, type ScriptInput } from "./validationScript";

self.onmessage = async (event: MessageEvent<{ scriptContent: string; input: ScriptInput }>) => {
  const { scriptContent, input } = event.data;
  try {
    const frozen = deepFreeze(input);
    const value = await executeScriptInContext(scriptContent, frozen);
    (self as unknown as Worker).postMessage({ ok: true, value });
  } catch (error) {
    (self as unknown as Worker).postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};