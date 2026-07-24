import { z } from "zod";

export const safePathSegmentSchema = z.union([z.string().min(1), z.number().int().min(0)]);
export const safePathSchema = z.array(safePathSegmentSchema);

export type SafePath = z.infer<typeof safePathSchema>;

const safeRelativeFilePathSchema = z.string().min(1).refine((path) => !path.startsWith("/") && !path.includes("\\") && path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== ".."), { message: "必须是安全的包内相对路径。" });

const detectionRuleSchema = z.object({
  路径: safePathSchema,
  存在: z.boolean().optional(),
  等于: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
}).refine((rule) => rule.存在 !== undefined || rule.等于 !== undefined, {
  message: "检测规则必须声明 存在 或 等于。",
});

export const jsonCarrierSchema = z.object({
  类型: z.literal("json"),
  根类型: z.enum(["object", "array"]).optional(),
  文件后缀: z.string().min(1).optional(),
  检测: z.array(detectionRuleSchema).min(1),
});

export const embeddedJsonCarrierSchema = z.object({
  类型: z.literal("embeddedJson"),
  文件后缀: z.string().min(1).optional(),
  开始标记: z.string().min(1),
  结束标记: z.string().min(1),
  结束标记包含字符数: z.number().int().min(0).optional(),
  检测: z.array(detectionRuleSchema).min(1),
});

export const zipCarrierSchema = z.object({
  类型: z.literal("zip"),
  文件后缀: z.string().min(1).optional(),
  JSON成员: z.array(z.object({ 路径: safeRelativeFilePathSchema, 键: z.string().min(1) })).min(1),
  检测: z.array(detectionRuleSchema).min(1),
});

export const formatCarrierSchema = z.discriminatedUnion("类型", [jsonCarrierSchema, embeddedJsonCarrierSchema, zipCarrierSchema]);
export type FormatCarrier = z.infer<typeof formatCarrierSchema>;

export const valueSourceSchema = z.discriminatedUnion("类型", [
  z.object({ 类型: z.literal("路径"), 路径: safePathSchema }),
  z.object({ 类型: z.literal("文件名") }),
  z.object({ 类型: z.literal("常量"), 值: z.union([z.string(), z.number(), z.boolean(), z.null()]) }),
]);
export type ValueSource = z.infer<typeof valueSourceSchema>;

export const fieldMappingSchema = z.object({
  字段: z.string().min(1),
  来源路径: safePathSchema,
  转换: z.enum(["text", "number", "boolean", "json"]).default("text"),
  必填: z.boolean().optional(),
});
export type FieldMapping = z.infer<typeof fieldMappingSchema>;

export const resourceFormatAdapterSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  载体: z.array(formatCarrierSchema).min(1),
  包名: valueSourceSchema,
  版本: valueSourceSchema.optional(),
  记录路径: safePathSchema.optional(),
  记录源: z.array(z.object({ 路径: safePathSchema, 类型值: z.string().min(1).optional() })).min(1).optional(),
  类型路径: safePathSchema,
  EntryID路径: safePathSchema.optional(),
  已知类型: z.array(z.object({
    值: z.string().min(1),
    资源库ID: z.string().min(1),
    字段映射: z.array(fieldMappingSchema).min(1),
  })),
  未知类型: z.object({
    启用: z.boolean(),
    LibraryID前缀: z.string().min(1).default("外部类型:"),
    运行时字段: z.array(z.string().min(1)).default([]),
  }).optional(),
  图片: z.object({
    来源路径: safePathSchema,
    目标字段: z.string().min(1).default("卡图"),
    资产目录: safeRelativeFilePathSchema.optional(),
  }).optional(),
  分组: z.object({
    适用类型: z.string().min(1),
    分组键路径: safePathSchema,
    Slot路径: safePathSchema,
    Slots: z.array(z.object({ 名称: z.string().min(1), 值: z.union([z.string(), z.number()]) })).min(2),
    资源库ID: z.string().min(1),
    公共字段映射: z.array(fieldMappingSchema),
    Slot字段映射: z.array(z.object({ Slot: z.string().min(1), 字段: z.string().min(1), 来源路径: safePathSchema, 转换: z.enum(["text", "number", "boolean", "json"]).default("text") })).min(1),
    图片Slot优先级: z.array(z.string().min(1)).optional(),
  }).optional(),
}).superRefine((adapter, context) => {
  if ((adapter.记录路径 === undefined) === (adapter.记录源 === undefined)) {
    context.addIssue({ code: "custom", message: "Resource Format Adapter 必须且只能声明 记录路径 或 记录源。" });
  }
  const knownTypes = adapter.已知类型.map((mapping) => normalizeExternalName(mapping.值));
  if (new Set(knownTypes).size !== knownTypes.length) context.addIssue({ code: "custom", path: ["已知类型"], message: "已知类型值必须唯一。" });
  for (const [carrierIndex, carrier] of adapter.载体.entries()) {
    if (carrier.类型 !== "zip") continue;
    const paths = carrier.JSON成员.map((member) => member.路径.toLocaleLowerCase());
    const keys = carrier.JSON成员.map((member) => member.键);
    if (new Set(paths).size !== paths.length) context.addIssue({ code: "custom", path: ["载体", carrierIndex, "JSON成员"], message: "ZIP JSON member 路径不能重复。" });
    if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", path: ["载体", carrierIndex, "JSON成员"], message: "ZIP JSON member 键不能重复。" });
  }
  if (!adapter.分组) return;
  const slotNames = adapter.分组.Slots.map((slot) => slot.名称);
  const slotValues = adapter.分组.Slots.map((slot) => `${typeof slot.值}:${String(slot.值)}`);
  if (new Set(slotNames).size !== slotNames.length) context.addIssue({ code: "custom", path: ["分组", "Slots"], message: "分组 Slot 名称必须唯一。" });
  if (new Set(slotValues).size !== slotValues.length) context.addIssue({ code: "custom", path: ["分组", "Slots"], message: "分组 Slot 值必须唯一。" });
  adapter.分组.Slot字段映射.forEach((mapping, index) => {
    if (!slotNames.includes(mapping.Slot)) context.addIssue({ code: "custom", path: ["分组", "Slot字段映射", index, "Slot"], message: "Slot 字段映射必须引用已声明 Slot。" });
  });
  const priority = adapter.分组.图片Slot优先级 ?? [];
  if (new Set(priority).size !== priority.length || priority.some((slot) => !slotNames.includes(slot))) {
    context.addIssue({ code: "custom", path: ["分组", "图片Slot优先级"], message: "图片 Slot 优先级必须唯一并引用已声明 Slot。" });
  }
});
export type ResourceFormatAdapter = z.infer<typeof resourceFormatAdapterSchema>;

export const characterTextMappingSchema = z.object({
  目标模块ID: z.string().min(1),
  来源路径: safePathSchema,
  转换: z.enum(["text", "integerText", "joinedText"]).default("text"),
  分隔符: z.string().optional(),
});

export const characterCountMappingSchema = z.object({
  目标模块ID: z.string().min(1),
  来源路径: safePathSchema.optional(),
  来源路径列表: z.array(safePathSchema).min(1).optional(),
  转换: z.enum(["number", "truthyCount", "checkedCount", "triStateCount"]),
  最大值来源路径: safePathSchema.optional(),
  最大值: z.number().int().min(0).nullable().optional(),
  最大值转换: z.enum(["arrayLength", "availableCount"]).optional(),
}).refine((mapping) => mapping.来源路径 !== undefined || mapping.来源路径列表 !== undefined, {
  message: "Countable 映射必须声明 来源路径 或 来源路径列表。",
});

export const characterImageMappingSchema = z.object({
  目标模块ID: z.string().min(1),
  来源路径: safePathSchema,
  名称: z.string().optional(),
});

const cardMatchRuleSchema = z.object({
  类型: z.enum(["externalId", "fields", "uniqueName", "exactDescription"]),
  来源路径: safePathSchema.optional(),
  Resource字段: z.string().min(1).optional(),
  字段: z.array(z.object({ 来源路径: safePathSchema, Resource字段: z.string().min(1) })).min(1).optional(),
}).superRefine((rule, context) => {
  if (rule.类型 === "fields" && !rule.字段) context.addIssue({ code: "custom", message: "fields 匹配必须声明字段。" });
  if (rule.类型 !== "fields" && !rule.来源路径) context.addIssue({ code: "custom", message: `${rule.类型} 匹配必须声明来源路径。` });
});

export const characterCardMappingSchema = z.object({
  来源路径: safePathSchema,
  状态: z.string(),
  目标CardTableID: z.string().min(1),
  ResourceLibraryIDs: z.array(z.string().min(1)).min(1),
  匹配优先级: z.array(cardMatchRuleSchema).min(1),
});

export const characterExportSchema = z.object({
  文件后缀: z.literal(".json").default(".json"),
  默认值: z.record(z.string(), z.unknown()).default({}),
  字段映射: z.array(z.object({ 来源模块ID: z.string().min(1), 目标路径: safePathSchema, 转换: z.enum(["text", "number"]).default("text") })),
  Countable映射: z.array(z.object({ 来源模块ID: z.string().min(1), 目标路径: safePathSchema.optional(), 目标路径列表: z.array(safePathSchema).optional(), 最大值目标路径: safePathSchema.optional(), 转换: z.enum(["number", "booleanArray", "triStateArray"]), 长度: z.number().int().min(0).optional() }).refine((value) => value.目标路径 || value.目标路径列表, { message: "Countable 导出必须声明目标路径或目标路径列表。" })).default([]),
  图片映射: z.array(z.object({ 来源模块ID: z.string().min(1), 目标路径: safePathSchema })).default([]),
  Card映射: z.array(z.object({
    来源CardTableID: z.string().min(1),
    状态: z.string(),
    目标路径: safePathSchema,
    ResourceLibraryIDs: z.array(z.string().min(1)).min(1),
    默认值: z.record(z.string(), z.unknown()).default({}),
    字段映射: z.array(z.object({ 来源Resource字段: z.string().min(1), 目标路径: safePathSchema, 身份字段: z.boolean().default(false), 必填: z.boolean().default(false) })),
  })).default([]),
}).optional();

export const characterFormatAdapterSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  载体: z.array(formatCarrierSchema).min(1),
  角色名来源路径: safePathSchema.optional(),
  字段映射: z.array(characterTextMappingSchema),
  Countable映射: z.array(characterCountMappingSchema).default([]),
  图片映射: z.array(characterImageMappingSchema).default([]),
  Card映射: z.array(characterCardMappingSchema).default([]),
  导出: characterExportSchema,
});
export type CharacterFormatAdapter = z.infer<typeof characterFormatAdapterSchema>;

export interface FormatDiagnostic {
  level: "error" | "warning";
  code: string;
  text: string;
  path?: string;
}

export interface ParsedFormatSource {
  document: unknown;
  fileName: string;
  carrier: FormatCarrier;
}

export function readSafePath(value: unknown, path: SafePath): unknown {
  let current = value;
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(current) || segment >= current.length) return undefined;
      current = current[segment];
      continue;
    }
    if (typeof current !== "object" || current === null || Array.isArray(current) || !Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function writeSafePath(target: Record<string, unknown>, path: SafePath, value: unknown): boolean {
  if (path.length === 0 || typeof path[0] !== "string") return false;
  let current: Record<string, unknown> | unknown[] = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const nextSegment = path[index + 1];
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return false;
      const next = current[segment];
      if (typeof next !== "object" || next === null) current[segment] = typeof nextSegment === "number" ? [] : {};
      current = current[segment] as Record<string, unknown> | unknown[];
    } else {
      if (Array.isArray(current)) return false;
      const next = current[segment];
      if (typeof next !== "object" || next === null) current[segment] = typeof nextSegment === "number" ? [] : {};
      current = current[segment] as Record<string, unknown> | unknown[];
    }
  }
  const last = path[path.length - 1];
  if (typeof last === "number") {
    if (!Array.isArray(current)) return false;
    current[last] = value;
  } else {
    if (Array.isArray(current)) return false;
    current[last] = value;
  }
  return true;
}

export function carrierMatches(carrier: FormatCarrier, document: unknown, fileName: string): boolean {
  if (carrier.文件后缀 && !fileName.toLocaleLowerCase().endsWith(carrier.文件后缀.toLocaleLowerCase())) return false;
  if (carrier.类型 === "json" && carrier.根类型 === "array" && !Array.isArray(document)) return false;
  if (carrier.类型 === "json" && carrier.根类型 === "object" && (typeof document !== "object" || document === null || Array.isArray(document))) return false;
  return carrier.检测.every((rule) => {
    const value = readSafePath(document, rule.路径);
    if (rule.存在 !== undefined && (value !== undefined) !== rule.存在) return false;
    if ("等于" in rule && value !== rule.等于) return false;
    return true;
  });
}

export function normalizeExternalName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export function stableAdapterId(...parts: string[]): string {
  const source = parts.map(normalizeExternalName).join("\u001f");
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
