import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  allowedGlobalHtmlAttributes,
  allowedHtmlAttributesByTag,
  allowedHtmlTags,
  forbiddenHtmlTags,
  frameworkSchemaVersion,
} from "../src/domain/systemPackage";
import { systemPackageContractEntries } from "../src/domain/systemPackageContractRegistry";
import { systemPackageContractExamples } from "../src/domain/systemPackageContractExamples";
import { packageScriptTimeoutMs } from "../src/domain/packageScriptRunner";
import { packageArchiveLimits } from "../src/loaders/packageVfs";
import {
  stableSystemPackageCssVariableDefinitions,
  stableSystemPackageDataAttributes,
  stableModuleDataParts,
  systemPackageCssRestrictions,
  unstablePresentationDetails,
} from "../src/domain/systemPackagePresentationContract";

type JsonSchema = Record<string, unknown>;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = join(repoRoot, "docs", "system-package");
const contractRoot = join(docsRoot, "contract");
const legacyGeneratedRoot = join(docsRoot, "generated");
const legacySchemaRoot = join(contractRoot, "schemas");
const checkOnly = process.argv.includes("--check");
const generatedStart = "<!-- BEGIN GENERATED CONTRACT -->";
const generatedEnd = "<!-- END GENERATED CONTRACT -->";

const generated = new Map<string, string>();
const schemas = new Map<string, JsonSchema>();

for (const entry of systemPackageContractEntries) {
  const schema = z.toJSONSchema(entry.schema, {
    target: "draft-2020-12",
    io: entry.io ?? (entry.group === "runtime" ? "output" : "input"),
    unrepresentable: "any",
    cycles: "ref",
    reused: "ref",
  }) as JsonSchema;
  schema.$id = `urn:pbdh:system-package:${frameworkSchemaVersion}:${entry.id}`;
  schema.title = entry.title;
  schema.description = entry.summary;
  schemas.set(entry.id, schema);
}

generated.set(join(contractRoot, "script-api.d.ts"), renderScriptDeclarations());
for (const document of new Set(systemPackageContractEntries.flatMap((entry) => entry.document ? [entry.document] : []))) {
  const path = join(contractRoot, document);
  generated.set(path, replaceGeneratedRegion(readFileSync(path, "utf8"), renderDocumentContract(document), document));
}

if (checkOnly) {
  const stale = [...generated].flatMap(([path, expected]) => {
    try {
      return readFileSync(path, "utf8") === expected ? [] : [relative(repoRoot, path)];
    } catch {
      return [relative(repoRoot, path)];
    }
  }).concat(
    existsSync(legacyGeneratedRoot) ? [relative(repoRoot, legacyGeneratedRoot)] : [],
    existsSync(legacySchemaRoot) ? [relative(repoRoot, legacySchemaRoot)] : [],
  );
  if (stale.length > 0) {
    console.error(`System Package generated contract is stale:\n${stale.map((path) => `- ${path}`).join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`System Package generated contract is current (${generated.size} files).`);
  }
} else {
  for (const [path, content] of generated) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
  }
  console.log(`Generated ${generated.size} System Package contract files.`);
}

function renderDocumentContract(document: string): string {
  const lines = [
    "## 精确合同（自动生成）",
    "",
    "> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。",
    "",
    `合同版本：\`${frameworkSchemaVersion}\`。未列入 \`required\` 的字段均可省略；\`additionalProperties: false\` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。`,
    "",
  ];

  for (const entry of systemPackageContractEntries.filter((item) => item.document === document)) {
    lines.push(...renderContractEntry(entry, document));
  }
  if (document === "package-and-assets.md") lines.push(...renderRuntimeLimits());
  if (document === "pages-layout-skins.md") lines.push(...renderPresentationContract());
  lines.push(...renderExamples(document));
  return lines.join("\n");
}

function renderContractEntry(entry: (typeof systemPackageContractEntries)[number], document: string): string[] {
  const schema = schemas.get(entry.id)!;
  const scriptLink = relative(dirname(join(contractRoot, document)), join(contractRoot, "script-api.d.ts")).replaceAll("\\", "/");
  return [
    `### ${entry.title}`,
    "",
    entry.summary,
    "",
    ...(entry.group === "script" ? [`TypeScript 合同：[\`script-api.d.ts\`](${scriptLink})`, ""] : []),
    "语义约束：",
    "",
    ...entry.semanticConstraints.map((constraint) => `- ${constraint}`),
    "",
    "| 路径 | 必填 | 类型 | 约束 / 默认值 |",
    "| --- | --- | --- | --- |",
    ...schemaRows(schema).map((row) => `| ${escapeCell(row.path)} | ${row.required ? "是" : "否"} | ${escapeCell(row.type)} | ${escapeCell(row.rules || "—")} |`),
    "",
  ];
}

function renderExamples(document: string): string[] {
  const examples = systemPackageContractExamples.filter((example) => example.document === document);
  if (examples.length === 0) return [];
  const lines = ["### 自动验证例子", "", "以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。", ""];
  for (const example of examples) {
    const parsed = example.schema.safeParse(example.value);
    if (!parsed.success) {
      throw new Error(`Contract example ${example.id} is invalid: ${parsed.error.message}`);
    }
    lines.push(
      `#### ${example.title}`,
      "",
      example.notes,
      "",
      "```json",
      JSON.stringify(example.value, null, 2),
      "```",
      "",
    );
  }
  return lines;
}

function replaceGeneratedRegion(source: string, generatedContent: string, document: string): string {
  const startIndex = source.indexOf(generatedStart);
  const endIndex = source.indexOf(generatedEnd);
  if (startIndex < 0 || endIndex < startIndex || source.indexOf(generatedStart, startIndex + generatedStart.length) >= 0 || source.indexOf(generatedEnd, endIndex + generatedEnd.length) >= 0) {
    throw new Error(`${document} 必须且只能包含一对生成区块标记。`);
  }
  const replacement = `${generatedStart}\n\n${generatedContent.trim()}\n\n${generatedEnd}`;
  return `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex + generatedEnd.length)}`;
}

function schemaRows(schema: JsonSchema): Array<{ path: string; required: boolean; type: string; rules: string }> {
  const rows: Array<{ path: string; required: boolean; type: string; rules: string }> = [];
  const seen = new Set<string>();
  visit(schema, "$", true, schema, rows, seen, 0);
  return rows;
}

function visit(
  raw: unknown,
  path: string,
  required: boolean,
  root: JsonSchema,
  rows: Array<{ path: string; required: boolean; type: string; rules: string }>,
  seen: Set<string>,
  depth: number,
): void {
  if (!isRecord(raw) || depth > 20) return;
  const schema = resolveSchema(raw, root);
  const key = `${path}:${JSON.stringify(schema)}`;
  if (seen.has(key)) return;
  seen.add(key);
  rows.push({ path, required, type: describeType(schema, root), rules: describeRules(schema) });

  const requiredNames = new Set(Array.isArray(schema.required) ? schema.required.filter((value): value is string => typeof value === "string") : []);
  if (isRecord(schema.properties)) {
    for (const [name, property] of Object.entries(schema.properties)) {
      visit(property, path === "$" ? name : `${path}.${name}`, requiredNames.has(name), root, rows, seen, depth + 1);
    }
  }
  if (schema.items) visit(schema.items, `${path}[]`, true, root, rows, seen, depth + 1);
  const variants = Array.isArray(schema.anyOf) ? schema.anyOf : Array.isArray(schema.oneOf) ? schema.oneOf : [];
  variants.forEach((variant, index) => visit(variant, `${path}<${variantLabel(variant, root) ?? `variant ${index + 1}`}>`, required, root, rows, seen, depth + 1));
}

function resolveSchema(schema: JsonSchema, root: JsonSchema): JsonSchema {
  if (typeof schema.$ref !== "string" || !schema.$ref.startsWith("#/$defs/")) return schema;
  const name = schema.$ref.slice("#/$defs/".length);
  const defs = isRecord(root.$defs) ? root.$defs : {};
  if (!isRecord(defs[name])) return schema;
  const { $ref: _ref, ...siblings } = schema;
  return { ...defs[name], ...siblings };
}

function describeType(raw: JsonSchema, root: JsonSchema): string {
  const schema = resolveSchema(raw, root);
  if ("const" in schema) return JSON.stringify(schema.const);
  if (Array.isArray(schema.enum)) return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  const variants = Array.isArray(schema.anyOf) ? schema.anyOf : Array.isArray(schema.oneOf) ? schema.oneOf : undefined;
  if (variants) return variants.map((variant) => isRecord(variant) ? describeType(variant, root) : "unknown").join(" | ");
  if (Array.isArray(schema.type)) return schema.type.join(" | ");
  if (typeof schema.type === "string") return schema.type;
  if (schema.$ref) return String(schema.$ref).split("/").at(-1) ?? "ref";
  return "unknown";
}

function variantLabel(raw: unknown, root: JsonSchema): string | undefined {
  if (!isRecord(raw)) return undefined;
  const schema = resolveSchema(raw, root);
  if (!isRecord(schema.properties)) return undefined;
  for (const discriminator of ["类型", "type", "操作", "显示方式"]) {
    const property = schema.properties[discriminator];
    if (!isRecord(property)) continue;
    const resolved = resolveSchema(property, root);
    if (typeof resolved.const === "string") return resolved.const;
  }
  return undefined;
}

function describeRules(schema: JsonSchema): string {
  const rules: string[] = [];
  for (const [key, label] of [["minLength", "最短"], ["maxLength", "最长"], ["minimum", "最小"], ["maximum", "最大"], ["minItems", "最少项"], ["maxItems", "最多项"]] as const) {
    if (schema[key] !== undefined) rules.push(`${label} ${schema[key]}`);
  }
  if (schema.pattern) rules.push(`pattern: ${schema.pattern}`);
  if (schema.default !== undefined) rules.push(`默认 ${JSON.stringify(schema.default)}`);
  if (schema.additionalProperties === false) rules.push("未知字段不属于合同");
  if (schema.description) rules.push(String(schema.description));
  return rules.join("；");
}

function renderScriptDeclarations(): string {
  const lines = [
    "// Generated from the runtime Zod contracts. Do not edit.",
    "// Package scripts export: module.exports = async function (input) { ... }",
    "",
  ];
  for (const entry of systemPackageContractEntries.filter((item) => item.group === "script")) {
    const typeName = entry.id.replace(/^script-/, "").split(/[^a-zA-Z0-9]+/u).map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join("");
    lines.push(`export type ${typeName} = ${schemaToTypeScript(schemas.get(entry.id)!, schemas.get(entry.id)!)};`, "");
  }
  lines.push("export type PackageScript<TInput, TOutput> = (input: Readonly<TInput>) => TOutput | Promise<TOutput>;", "");
  return lines.join("\n");
}

function schemaToTypeScript(raw: unknown, root: JsonSchema, depth = 0): string {
  if (!isRecord(raw) || depth > 20) return "unknown";
  const schema = resolveSchema(raw, root);
  if (schema.description === "Uint8Array") return "Uint8Array";
  if ("const" in schema) return JSON.stringify(schema.const);
  if (Array.isArray(schema.enum)) return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  const variants = Array.isArray(schema.anyOf) ? schema.anyOf : Array.isArray(schema.oneOf) ? schema.oneOf : undefined;
  if (variants) return variants.map((variant) => schemaToTypeScript(variant, root, depth + 1)).join(" | ");
  if (schema.type === "array") return `Array<${schemaToTypeScript(schema.items, root, depth + 1)}>`;
  if (schema.type === "object" || schema.properties || schema.additionalProperties) {
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);
    const properties = isRecord(schema.properties) ? Object.entries(schema.properties).map(([name, value]) => `${JSON.stringify(name)}${required.has(name) ? "" : "?"}: ${schemaToTypeScript(value, root, depth + 1)};`) : [];
    if (isRecord(schema.additionalProperties)) properties.push(`[key: string]: ${schemaToTypeScript(schema.additionalProperties, root, depth + 1)};`);
    return `{ ${properties.join(" ")} }`;
  }
  if (schema.type === "string") return "string";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "null") return "null";
  return "unknown";
}

function renderPresentationContract(): string[] {
  const lines = [
    "### HTML/CSS 与稳定主题扩展面",
    "",
    "#### HTML tags",
    "",
    [...allowedHtmlTags].sort().map((tag) => `\`${tag}\``).join("、"),
    "",
    "明确禁止且产生专用诊断：",
    "",
    [...forbiddenHtmlTags].sort().map((tag) => `\`${tag}\``).join("、"),
    "",
    "#### Attributes",
    "",
    `全局允许：${[...allowedGlobalHtmlAttributes].sort().map((name) => `\`${name}\``).join("、")}。除 \`pb-module\` 外，任意非空 \`data-*\` 属性允许；事件属性 \`on*\` 始终禁止。`,
    "",
    "| Tag | 专用属性 |",
    "| --- | --- |",
    ...[...allowedHtmlAttributesByTag].sort(([left], [right]) => left.localeCompare(right)).map(([tag, names]) => `| \`${tag}\` | ${[...names].sort().map((name) => `\`${name}\``).join("、") || "无"} |`),
    "",
    "`pb-module` 必须有非空 `id`；它不能携带任意 data 属性。`data-guide-region-id` 必须非空，供 Guide 的 region target 使用。`img.src` 只允许包内相对资源。",
    "",
    "#### CSS restrictions",
    "",
    "| 语法 | 行为 |",
    "| --- | --- |",
    ...systemPackageCssRestrictions.map((rule) => `| \`${rule.syntax}\` | ${rule.behavior} |`),
    "",
    "#### 稳定主题 API",
    "",
    "以下变量承诺在当前 schemaVersion 系列保持兼容。Skin 应在自己的包作用域根上覆盖：",
    "",
    "| Variable | 默认值 | 用途 |",
    "| --- | --- | --- |",
    ...stableSystemPackageCssVariableDefinitions.map((item) => `| \`${item.name}\` | \`${item.defaultValue}\` | ${item.purpose} |`),
    "",
    "以下 data attributes 可作为包作用域 Skin hooks：",
    "",
    ...stableSystemPackageDataAttributes.map((name) => `- \`${name}\``),
    "",
    "稳定 `data-part` 值按 Module 类型列出；组合选择器应始终带 `data-module-type`，避免同名 part 误伤其他模块：",
    "",
    "| Module type | Stable data-part values |",
    "| --- | --- |",
    ...Object.entries(stableModuleDataParts).map(([type, parts]) => `| \`${type}\` | ${parts.map((name) => `\`${name}\``).join("、")} |`),
    "",
    "#### 不稳定实现细节",
    "",
    ...unstablePresentationDetails.map((detail) => `- ${detail}`),
    "",
    "移除或改变稳定 hook 需要提高 System Package schemaVersion、提供迁移说明，并增加兼容期；新增 hook 可在兼容版本中完成。",
    "",
  ];
  return lines;
}

function renderRuntimeLimits(): string[] {
  return [
    "### 运行时安全上限",
    "",
    "安全上限用于拒绝恶意或意外输入，不是发布体积目标。数值直接来自 VFS 与 Worker 常量。",
    "",
    "| 项目 | 当前值 |",
    "| --- | ---: |",
    `| zip 压缩体积 | ${formatBytes(packageArchiveLimits.maxCompressedBytes)} |`,
    `| 展开后或目录总字节 | ${formatBytes(packageArchiveLimits.maxExpandedBytes)} |`,
    `| 文件数 | ${packageArchiveLimits.maxFiles} |`,
    `| zip 展开/压缩比 | ${packageArchiveLimits.maxCompressionRatio}:1 |`,
    `| Package Script Worker 超时 | ${packageScriptTimeoutMs} ms |`,
    "",
    "当前没有独立单文件上限；文件仍受总字节、文件数、浏览器内存和资产优化政策约束。",
    "",
  ];
}

function formatBytes(bytes: number): string {
  return `${bytes / (1024 * 1024)} MiB (${bytes} bytes)`;
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
