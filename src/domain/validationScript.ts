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
  cardState: CharacterData["cards"];
  packageMetadata: {
    id: string;
    version: string;
  };
  checks: ValidationCheck[];
}

export interface ScriptInput {
  characterData: CharacterData;
  resourceLibraries: ResourceLibrary[];
  cardState: CharacterData["cards"];
  packageMetadata: ValidationInput["packageMetadata"];
}

export type RawCheckResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

type ScriptIssueInput = Partial<Omit<ValidationIssue, "source">>;

const validIssueLevels = new Set<ValidationIssueLevel>(["error", "warning", "info"]);

export function buildScriptBody(scriptContent: string): string {
  return [
    '"use strict";',
    scriptContent,
    "const validationCheck = module.exports && (module.exports.default || module.exports.run || module.exports);",
    'if (typeof validationCheck !== "function") {',
    '  throw new Error("Validation Script must assign a function to module.exports.");',
    "}",
    "return validationCheck(input);",
  ].join("\n");
}

export function executeScriptInContext(scriptContent: string, input: ScriptInput): Promise<unknown> {
  const module = { exports: {} as unknown };
  const exports = module.exports;
  const runner = new Function("module", "exports", "input", buildScriptBody(scriptContent));
  return Promise.resolve(runner(module, exports, input));
}

export function normalizeScriptIssues(source: string, rawIssues: unknown): ValidationIssue[] {
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

export function invalidIssue(source: string, index: number): ValidationIssue {
  return {
    level: "error",
    code: "VALIDATION_SCRIPT_ISSUE_INVALID",
    text: `Validation Script 返回了无效 issue：${index}`,
    source,
  };
}

export function cloneAndFreeze<T>(value: T): T {
  return deepFreeze(cloneData(value));
}

export function cloneData<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function deepFreeze<T>(value: T): T {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * 与 Web Worker 版本等价的主线程实现，仅用于无真实 Worker 的测试环境。
 * 生产环境走 `runValidationChecks`（worker 隔离），不应直接调用本函数。
 */
export async function runValidationChecksInProcess(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const scriptInput = cloneAndFreeze({
    characterData: input.characterData,
    resourceLibraries: input.resourceLibraries,
    cardState: input.cardState,
    packageMetadata: input.packageMetadata,
  });

  for (const check of input.checks) {
    try {
      const rawIssues = await executeScriptInContext(check.scriptContent, scriptInput);
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
