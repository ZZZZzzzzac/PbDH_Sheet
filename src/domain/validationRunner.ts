import type { CharacterData } from "./characterData";
import type { ResourceLibrary } from "./resourceLibrary";
import type { ValidationCheck } from "./systemPackage";

export type ValidationIssueLevel = "error" | "warning" | "info";

export interface ValidationIssue {
  level: ValidationIssueLevel;
  text: string;
  path?: string;
  code?: string;
  source: string;
}

export interface ValidationInput {
  characterData: CharacterData;
  resourceLibraries: ResourceLibrary[];
  packageMetadata: {
    id: string;
    version: string;
  };
  checks: ValidationCheck[];
}

interface ScriptInput {
  characterData: CharacterData;
  resourceLibraries: ResourceLibrary[];
  packageMetadata: ValidationInput["packageMetadata"];
}

type ScriptIssueInput = Partial<Omit<ValidationIssue, "source">>;

const validIssueLevels = new Set<ValidationIssueLevel>(["error", "warning", "info"]);
const validationWorkerTimeoutMs = 1000;

export async function runValidationChecks(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const check of input.checks) {
    const scriptInput = cloneAndFreeze({
      characterData: input.characterData,
      resourceLibraries: input.resourceLibraries,
      packageMetadata: input.packageMetadata,
    });

    try {
      const rawIssues = await executeValidationScript(check.scriptContent, scriptInput);
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

async function executeValidationScript(scriptContent: string, input: ScriptInput): Promise<unknown> {
  if (canUseValidationWorker()) {
    return executeValidationScriptInWorker(scriptContent, input);
  }

  return executeValidationScriptDirect(scriptContent, input);
}

function canUseValidationWorker() {
  return typeof Worker !== "undefined" && typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
}

function executeValidationScriptInWorker(scriptContent: string, input: ScriptInput): Promise<unknown> {
  const workerSource = `
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function deepFreeze(value) {
  if (!isRecord(value) && !Array.isArray(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if ((isRecord(child) || Array.isArray(child)) && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return value;
}
async function executeValidationScriptDirect(scriptContent, input) {
  const module = { exports: {} };
  const exports = module.exports;
  const runner = new Function(
    "module",
    "exports",
    "input",
    '"use strict";\\n' +
      'const document = undefined;\\n' +
      'const window = undefined;\\n' +
      'const self = undefined;\\n' +
      'const globalThis = undefined;\\n' +
      'const fetch = undefined;\\n' +
      'const XMLHttpRequest = undefined;\\n' +
      'const importScripts = undefined;\\n' +
      'const Worker = undefined;\\n' +
      scriptContent +
      '\\nconst validationCheck = module.exports && (module.exports.default || module.exports.run || module.exports);\\n' +
      'if (typeof validationCheck !== "function") {\\n' +
      '  throw new Error("Validation Script must assign a function to module.exports.");\\n' +
      '}\\n' +
      'return validationCheck(input);',
  );
  return await runner(module, exports, input);
}
self.onmessage = async (event) => {
  try {
    const input = deepFreeze(event.data.input);
    const value = await executeValidationScriptDirect(event.data.scriptContent, input);
    self.postMessage({ ok: true, value });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};`;
  const url = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));

  return new Promise((resolve, reject) => {
    const worker = new Worker(url);
    const timeout = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new Error("Validation Script timed out."));
    }, validationWorkerTimeoutMs);

    worker.onmessage = (event: MessageEvent<{ ok: true; value: unknown } | { ok: false; error: string }>) => {
      clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(url);

      if (event.data.ok) {
        resolve(event.data.value);
        return;
      }

      reject(new Error(event.data.error));
    };

    worker.onerror = (event) => {
      clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new Error(event.message));
    };

    worker.postMessage({ scriptContent, input });
  });
}

async function executeValidationScriptDirect(scriptContent: string, input: ScriptInput): Promise<unknown> {
  const module = { exports: {} as unknown };
  const exports = module.exports;
  const runner = new Function(
    "module",
    "exports",
    "input",
    `"use strict";
const document = undefined;
const window = undefined;
const self = undefined;
const globalThis = undefined;
const fetch = undefined;
const XMLHttpRequest = undefined;
const importScripts = undefined;
const Worker = undefined;
${scriptContent}
const validationCheck = module.exports && (module.exports.default || module.exports.run || module.exports);
if (typeof validationCheck !== "function") {
  throw new Error("Validation Script must assign a function to module.exports.");
}
return validationCheck(input);`,
  );

  return await runner(module, exports, input);
}

function normalizeScriptIssues(source: string, rawIssues: unknown): ValidationIssue[] {
  const issueInputs = Array.isArray(rawIssues) ? rawIssues : isRecord(rawIssues) && Array.isArray(rawIssues.issues) ? rawIssues.issues : undefined;

  if (!issueInputs) {
    return [
      {
        level: "error",
        code: "VALIDATION_SCRIPT_OUTPUT_INVALID",
        text: "Validation Script 必须返回 issue 数组。",
        source,
      },
    ];
  }

  const normalizedIssues: ValidationIssue[] = [];

  issueInputs.forEach((issueInput, index) => {
    if (!isRecord(issueInput)) {
      normalizedIssues.push(invalidIssue(source, index));
      return;
    }

    const candidate = issueInput as ScriptIssueInput;
    if (!validIssueLevels.has(candidate.level as ValidationIssueLevel) || typeof candidate.text !== "string" || !candidate.text.trim()) {
      normalizedIssues.push(invalidIssue(source, index));
      return;
    }

    normalizedIssues.push({
      level: candidate.level as ValidationIssueLevel,
      text: candidate.text,
      ...(typeof candidate.path === "string" ? { path: candidate.path } : {}),
      ...(typeof candidate.code === "string" ? { code: candidate.code } : {}),
      source,
    });
  });

  return normalizedIssues;
}

function invalidIssue(source: string, index: number): ValidationIssue {
  return {
    level: "error",
    code: "VALIDATION_SCRIPT_ISSUE_INVALID",
    text: `Validation Script 返回了无效 issue：${index}`,
    source,
  };
}

function cloneAndFreeze<T>(value: T): T {
  return deepFreeze(cloneData(value));
}

function cloneData<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (!isRecord(value) && !Array.isArray(value)) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value)) {
    if ((isRecord(child) || Array.isArray(child)) && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
