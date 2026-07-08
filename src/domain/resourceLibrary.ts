import { z } from "zod";

export const resourceLibraryFieldWidthSchema = z.enum(["compact", "normal", "wide", "fill"]);

export const resourceLibraryFieldTemplateSchema = z.object({
  键: z.string().min(1),
  标签: z.string().min(1).optional(),
  默认显示: z.boolean().optional(),
  可筛选: z.boolean().optional(),
  可排序: z.boolean().optional(),
  列宽: resourceLibraryFieldWidthSchema.optional(),
});

export const resourceLibraryReferenceSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  路径: z.string().min(1),
});

export const resourceLibraryPackageInputSchema = resourceLibraryReferenceSchema.extend({
  entries: z.unknown(),
});

export const resourceLibraryFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  visible: z.boolean(),
  filterable: z.boolean(),
  sortable: z.boolean(),
  width: resourceLibraryFieldWidthSchema.optional(),
});

export const resourceLibraryEntrySchema = z.object({
  ID: z.string().min(1),
  fields: z.record(z.string(), z.string()),
});

export const resourceLibrarySchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  路径: z.string().min(1),
  fields: z.array(resourceLibraryFieldSchema),
  entries: z.array(resourceLibraryEntrySchema),
});

export type ResourceLibraryFieldTemplate = z.infer<typeof resourceLibraryFieldTemplateSchema>;
export type ResourceLibraryFieldWidth = z.infer<typeof resourceLibraryFieldWidthSchema>;
export type ResourceLibraryReference = z.infer<typeof resourceLibraryReferenceSchema>;
export type ResourceLibraryPackageInput = z.infer<typeof resourceLibraryPackageInputSchema>;
export type ResourceLibraryField = z.infer<typeof resourceLibraryFieldSchema>;
export type ResourceLibraryEntry = z.infer<typeof resourceLibraryEntrySchema>;
export type ResourceLibrary = z.infer<typeof resourceLibrarySchema>;

export type ResourceLibraryIssue = {
  level: "fatal" | "error";
  code: string;
  text: string;
  path?: string;
};

export type ResourceLibraryQuery = {
  filters?: Record<string, string[]>;
  sort?: {
    field: string;
    direction?: "asc" | "desc";
  };
};

export type ResourceLibraryNormalizationResult =
  | { ok: true; resourceLibraries: ResourceLibrary[] }
  | { ok: false; issues: ResourceLibraryIssue[] };

export function normalizeResourceLibraries(inputs: ResourceLibraryPackageInput[]): ResourceLibraryNormalizationResult {
  const issues: ResourceLibraryIssue[] = [];
  const libraries: ResourceLibrary[] = [];
  const libraryIds = new Set<string>();

  inputs.forEach((input, libraryIndex) => {
    if (libraryIds.has(input.ID)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_RESOURCE_LIBRARY_ID",
        text: `Resource Library ID 重复：${input.ID}`,
        path: `resourceLibraries.${libraryIndex}.ID`,
      });
      return;
    }
    libraryIds.add(input.ID);

    const normalized = normalizeResourceLibrary(input, libraryIndex);
    if (normalized.ok) {
      libraries.push(normalized.library);
    } else {
      issues.push(...normalized.issues);
    }
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, resourceLibraries: libraries };
}

function normalizeResourceLibrary(
  input: ResourceLibraryPackageInput,
  libraryIndex: number,
): { ok: true; library: ResourceLibrary } | { ok: false; issues: ResourceLibraryIssue[] } {
  if (!Array.isArray(input.entries)) {
    return {
      ok: false,
      issues: [
        {
          level: "error",
          code: "RESOURCE_LIBRARY_NOT_ARRAY",
          text: `Resource Library 必须是 JSON 对象数组：${input.ID}`,
          path: `resourceLibraries.${libraryIndex}.entries`,
        },
      ],
    };
  }

  const issues: ResourceLibraryIssue[] = [];
  const entryIds = new Set<string>();
  const rawEntries: Array<Record<string, unknown>> = [];
  const fieldKeys: string[] = [];
  const complexFieldKeys = new Set<string>();

  input.entries.forEach((entry, entryIndex) => {
    if (!isPlainObject(entry)) {
      issues.push({
        level: "error",
        code: "RESOURCE_LIBRARY_ENTRY_NOT_OBJECT",
        text: `Resource Library 条目必须是 JSON 对象：${input.ID}`,
        path: `resourceLibraries.${libraryIndex}.entries.${entryIndex}`,
      });
      return;
    }

    const idValue = entry.ID;
    if (typeof idValue !== "string" || idValue.trim() === "") {
      issues.push({
        level: "error",
        code: "RESOURCE_ENTRY_ID_MISSING",
        text: `Resource Library 条目缺少稳定 ID：${input.ID}`,
        path: `resourceLibraries.${libraryIndex}.entries.${entryIndex}.ID`,
      });
      return;
    }

    if (entryIds.has(idValue)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_RESOURCE_ENTRY_ID",
        text: `Resource Library 条目 ID 重复：${idValue}`,
        path: `resourceLibraries.${libraryIndex}.entries.${entryIndex}.ID`,
      });
      return;
    }
    entryIds.add(idValue);

    for (const [key, value] of Object.entries(entry)) {
      if (!fieldKeys.includes(key)) {
        fieldKeys.push(key);
      }
      if (isComplexResourceValue(value)) {
        complexFieldKeys.add(key);
      }
    }

    rawEntries.push(entry);
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const entries = rawEntries.map((entry) => ({
    ID: String(entry.ID),
    fields: Object.fromEntries(fieldKeys.map((key) => [key, resourceValueToString(entry[key])])),
  }));
  const fields = fieldKeys.map((key) => buildFieldMetadata(key, complexFieldKeys.has(key), entries.map((entry) => entry.fields[key] ?? "")));

  return {
    ok: true,
    library: {
      ID: input.ID,
      名称: input.名称,
      路径: input.路径,
      fields,
      entries,
    },
  };
}

function buildFieldMetadata(key: string, isComplex: boolean, values: string[]): ResourceLibraryField {
  return {
    key,
    label: key,
    visible: true,
    filterable: !isComplex,
    sortable: !isComplex,
    width: inferResourceFieldWidth(key, values),
  };
}

export function getResourceLibraryFields(
  library: ResourceLibrary,
  templates?: ResourceLibraryFieldTemplate[],
): ResourceLibraryField[] {
  if (!templates || templates.length === 0) {
    return library.fields;
  }

  const inferredFields = new Map(library.fields.map((field) => [field.key, field]));

  return templates.map((template) => {
    const inferred = inferredFields.get(template.键);
    return {
      key: template.键,
      label: template.标签 ?? inferred?.label ?? template.键,
      visible: template.默认显示 ?? true,
      filterable: template.可筛选 ?? inferred?.filterable ?? true,
      sortable: template.可排序 ?? inferred?.sortable ?? true,
      width: template.列宽 ?? inferred?.width ?? inferResourceFieldWidth(template.键, library.entries.map((entry) => entry.fields[template.键] ?? "")),
    };
  });
}

export function inferResourceFieldWidth(key: string, values: string[] = []): ResourceLibraryFieldWidth {
  if (isLongResourceFieldKey(key)) {
    return "fill";
  }
  if (key === "名称" || key.toLowerCase() === "name") {
    return "normal";
  }
  if (isCompactResourceFieldKey(key)) {
    return "compact";
  }

  const p90Length = percentile(values.map((value) => stringDisplayLength(value)).filter((length) => length > 0), 0.9);
  if (p90Length >= 40) {
    return "fill";
  }
  if (p90Length >= 18) {
    return "wide";
  }
  if (p90Length > 0 && p90Length <= 6) {
    return "compact";
  }
  return "normal";
}

export function queryResourceLibraryEntries(library: ResourceLibrary, query: ResourceLibraryQuery = {}): ResourceLibraryEntry[] {
  return sortResourceLibraryEntries(filterResourceLibraryEntries(library.entries, query.filters ?? {}), query.sort);
}

export function filterResourceLibraryEntries(
  entries: ResourceLibraryEntry[],
  filters: Record<string, string[]>,
): ResourceLibraryEntry[] {
  const activeFilters = Object.entries(filters)
    .map(([field, values]) => [field, values.filter(Boolean)] as const)
    .filter(([, values]) => values.length > 0);

  if (activeFilters.length === 0) {
    return entries;
  }

  return entries.filter((entry) =>
    activeFilters.every(([field, allowedValues]) => allowedValues.includes(entry.fields[field] ?? "")),
  );
}

export function sortResourceLibraryEntries(
  entries: ResourceLibraryEntry[],
  sort: ResourceLibraryQuery["sort"],
): ResourceLibraryEntry[] {
  if (!sort) {
    return entries;
  }

  const direction = sort.direction === "desc" ? -1 : 1;
  return [...entries].sort((left, right) => direction * (left.fields[sort.field] ?? "").localeCompare(right.fields[sort.field] ?? "", "zh-Hans"));
}

export function uniqueResourceFieldValues(library: ResourceLibrary, fieldKey: string): string[] {
  return [...new Set(library.entries.map((entry) => entry.fields[fieldKey] ?? "").filter((value) => value !== ""))].sort((left, right) =>
    left.localeCompare(right, "zh-Hans"),
  );
}

export function summarizeResourceEntry(entry: ResourceLibraryEntry): string {
  return entry.fields.名称 || entry.fields.Name || entry.fields.name || entry.ID;
}

function resourceValueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return JSON.stringify(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isComplexResourceValue(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function isCompactResourceFieldKey(key: string): boolean {
  return /^(ID|id)$/.test(key) || /(等级|类型|领域|属性|回想|消耗|费用|数量|主职|施法属性|生命|闪避)$/.test(key);
}

function isLongResourceFieldKey(key: string): boolean {
  return /(描述|效果|简介|特性|规则|文本|说明|问题|内容)$/.test(key);
}

function stringDisplayLength(value: string): number {
  return [...value].reduce((length, char) => length + (char.charCodeAt(0) <= 0x7f ? 1 : 2), 0);
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index] ?? 0;
}
