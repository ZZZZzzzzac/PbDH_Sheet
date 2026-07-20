import { cloneAndFreeze, normalizeScriptIssues, type ScriptInput, type ValidationInput, type ValidationIssue } from "./validationScript";
export type { ValidationIssue, ValidationIssueLevel, ValidationInput } from "./validationScript";

const validationWorkerTimeoutMs = 3000;

export async function runValidationChecks(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const check of input.checks) {
    const scriptInput = cloneAndFreeze({
      characterData: input.characterData,
      resourceLibraries: input.resourceLibraries,
      cardState: input.cardState,
      packageMetadata: input.packageMetadata,
    });

    try {
      const rawIssues = await executeValidationScriptInWorker(check.scriptContent, scriptInput);
      issues.push(...normalizeScriptIssues(check.ID, rawIssues));
    } catch (error) {
      issues.push({
        level: "error",
        code: "VALIDATION_SCRIPT_ERROR",
        text: `Validation Script 执行失败：${error instanceof Error ? error.message : String(error)}`,
        source: check.ID,
      });
    }
  }

  return issues;
}

function executeValidationScriptInWorker(scriptContent: string, input: ScriptInput): Promise<unknown> {
  if (typeof Worker === "undefined") {
    throw new Error("Web Worker 不可用，Validation Script 必须在隔离 Worker 中执行。");
  }

  const worker = new Worker(new URL("./validationWorker.ts", import.meta.url), { type: "module" });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("Validation Script timed out."));
    }, validationWorkerTimeoutMs);

    worker.onmessage = (event: MessageEvent<{ ok: true; value: unknown } | { ok: false; error: string }>) => {
      clearTimeout(timeout);
      worker.terminate();
      if (event.data.ok) {
        resolve(event.data.value);
        return;
      }
      reject(new Error(event.data.error));
    };

    worker.onerror = (event: ErrorEvent) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(event.message));
    };

    worker.postMessage({ scriptContent, input });
  });
}
