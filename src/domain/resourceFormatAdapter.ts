import type { RuntimePackageAsset } from "../loaders/assetResolver";
import type { SystemPackage } from "./systemPackage";
import {
  carrierMatches,
  normalizeExternalName,
  readSafePath,
  stableAdapterId,
  type FieldMapping,
  type FormatDiagnostic,
  type ResourceFormatAdapter,
  type ValueSource,
} from "./formatAdapter";

export interface ExternalResourceSource {
  document: unknown;
  fileName: string;
  assets: ReadonlyMap<string, Uint8Array>;
  sourceType: "json" | "zip";
  diagnostics?: FormatDiagnostic[];
}

export interface ResourceAdapterConversion {
  adapter: ResourceFormatAdapter;
  extensionDocument: Record<string, unknown>;
  assets: RuntimePackageAsset[];
  diagnostics: FormatDiagnostic[];
  counts: {
    sourceEntries: number;
    convertedEntries: number;
    skippedEntries: number;
    convertedFields: number;
    skippedFields: number;
    boundImages: number;
    orphanImages: number;
  };
}

export type ResourceAdapterDetection =
  | { status: "none" }
  | { status: "ambiguous"; adapters: ResourceFormatAdapter[] }
  | { status: "match"; adapter: ResourceFormatAdapter };

export function detectResourceFormatAdapter(source: ExternalResourceSource, adapters: ResourceFormatAdapter[]): ResourceAdapterDetection {
  const matches = adapters.filter((adapter) => adapter.载体.some((carrier) => carrierMatches(carrier, source.document, source.fileName)));
  if (matches.length === 0) return { status: "none" };
  if (matches.length > 1) return { status: "ambiguous", adapters: matches };
  return { status: "match", adapter: matches[0] };
}

export function convertExternalResourceSource(
  source: ExternalResourceSource,
  adapter: ResourceFormatAdapter,
  systemPackage: SystemPackage,
): ResourceAdapterConversion | { error: FormatDiagnostic } {
  const recordSources = adapter.记录源 ?? [{ 路径: adapter.记录路径 ?? [], 类型值: undefined }];
  const rawRecords: Array<{ value: unknown; forcedType?: string }> = [];
  for (const recordSource of recordSources) {
    const values = readSafePath(source.document, recordSource.路径);
    if (!Array.isArray(values)) {
      return { error: { level: "error", code: "RESOURCE_ADAPTER_RECORDS_INVALID", text: "Adapter 声明的记录路径不是数组。", path: recordSource.路径.join(".") } };
    }
    rawRecords.push(...values.map((value) => ({ value, forcedType: recordSource.类型值 })));
  }
  const packageNameValue = readValueSource(adapter.包名, source);
  const packageName = typeof packageNameValue === "string" ? normalizeExternalName(packageNameValue) : "";
  if (!packageName) {
    return { error: { level: "error", code: "RESOURCE_ADAPTER_PACKAGE_NAME_MISSING", text: "外部资源包没有可用名称。" } };
  }
  const versionValue = adapter.版本 ? readValueSource(adapter.版本, source) : undefined;
  const version = normalizeExternalName(String(versionValue ?? "未声明")) || "未声明";
  const extensionId = `resource-adapter:${adapter.ID}:${stableAdapterId(systemPackage.manifest.ID, adapter.ID, packageName)}`;
  const libraryNames = new Map((systemPackage.resourceLibraries ?? []).map((library) => [library.ID, library.名称]));
  const contributions = new Map<string, { ID: string; 名称: string; entries: Array<Record<string, unknown>> }>();
  const diagnostics: FormatDiagnostic[] = [...(source.diagnostics ?? [])];
  const retainedAssetPaths = new Set<string>();
  let convertedFields = 0;
  let skippedFields = 0;
  let skippedEntries = 0;
  let boundImages = 0;

  const records = rawRecords.filter((item): item is { value: Record<string, unknown>; forcedType?: string } => isRecord(item.value));
  skippedEntries += rawRecords.length - records.length;
  if (rawRecords.length !== records.length) diagnostics.push({ level: "warning", code: "RESOURCE_ADAPTER_ENTRY_NOT_OBJECT", text: `${rawRecords.length - records.length} 条外部记录不是对象，已跳过。` });

  const groupedRecordIndexes = new Set<number>();
  if (adapter.分组) {
    const groupConfig = adapter.分组;
    const groups = new Map<string, Array<{ record: Record<string, unknown>; index: number }>>();
    records.forEach(({ value: record, forcedType }, index) => {
      if ((forcedType ?? readText(record, adapter.类型路径)) !== groupConfig.适用类型) return;
      const key = readText(record, groupConfig.分组键路径);
      if (!key) return;
      const list = groups.get(key) ?? [];
      list.push({ record, index });
      groups.set(key, list);
      groupedRecordIndexes.add(index);
    });
    for (const [groupKey, candidates] of groups) {
      const bySlot = new Map<string, Array<Record<string, unknown>>>();
      for (const candidate of candidates) {
        const slotValue = readSafePath(candidate.record, groupConfig.Slot路径);
        const slot = groupConfig.Slots.find((item) => item.值 === slotValue);
        if (!slot) continue;
        const list = bySlot.get(slot.名称) ?? [];
        list.push(candidate.record);
        bySlot.set(slot.名称, list);
      }
      const duplicate = [...bySlot.entries()].find(([, values]) => values.length > 1);
      if (duplicate) {
        skippedEntries += candidates.length;
        diagnostics.push({ level: "warning", code: "RESOURCE_ADAPTER_GROUP_AMBIGUOUS", text: `分组 ${groupKey} 的 Slot ${duplicate[0]} 有重复记录，整个分组已跳过。` });
        continue;
      }
      const first = candidates[0]?.record;
      if (!first) continue;
      const entry: Record<string, unknown> = { ID: makeEntryId(adapter, first, `${groupKey}`), 名称: groupKey };
      applyFieldMappings(entry, first, groupConfig.公共字段映射, diagnostics, (converted) => converted ? convertedFields += 1 : skippedFields += 1);
      for (const mapping of groupConfig.Slot字段映射) {
        const record = bySlot.get(mapping.Slot)?.[0];
        if (!record) {
          diagnostics.push({ level: "warning", code: "RESOURCE_ADAPTER_GROUP_SLOT_MISSING", text: `分组 ${groupKey} 缺少 Slot ${mapping.Slot}。` });
          skippedFields += 1;
          continue;
        }
        const converted = convertFieldValue(readSafePath(record, mapping.来源路径), mapping.转换);
        if (converted === undefined) skippedFields += 1;
        else { entry[mapping.字段] = converted; convertedFields += 1; }
      }
      const imageRecord = (groupConfig.图片Slot优先级 ?? []).map((slot) => bySlot.get(slot)?.[0]).find(Boolean) ?? first;
      if (bindImage(entry, imageRecord, adapter, source, retainedAssetPaths, diagnostics)) boundImages += 1;
      addContribution(contributions, groupConfig.资源库ID, libraryNames.get(groupConfig.资源库ID) ?? groupConfig.资源库ID, entry);
    }
  }

  records.forEach(({ value: record, forcedType }, index) => {
    if (groupedRecordIndexes.has(index)) return;
    const type = forcedType ?? readText(record, adapter.类型路径);
    if (!type) {
      skippedEntries += 1;
      diagnostics.push({ level: "warning", code: "RESOURCE_ADAPTER_TYPE_MISSING", text: `记录 ${index + 1} 没有可用类型，已跳过。`, path: `${index}` });
      return;
    }
    const known = adapter.已知类型.find((mapping) => mapping.值 === type);
    if (!known && !adapter.未知类型?.启用) {
      skippedEntries += 1;
      diagnostics.push({ level: "warning", code: "RESOURCE_ADAPTER_TYPE_UNMAPPED", text: `类型 ${type} 未映射，记录已跳过。`, path: `${index}` });
      return;
    }
    const libraryId = known?.资源库ID ?? `${adapter.未知类型?.LibraryID前缀 ?? "外部类型:"}${normalizeExternalName(type)}`;
    const entry: Record<string, unknown> = { ID: makeEntryId(adapter, record, `${type}:${index}`) };
    if (known) {
      applyFieldMappings(entry, record, known.字段映射, diagnostics, (converted) => converted ? convertedFields += 1 : skippedFields += 1, `${index}`);
    } else {
      const runtimeFields = new Set(adapter.未知类型?.运行时字段 ?? []);
      for (const [field, value] of Object.entries(record)) {
        if (runtimeFields.has(field)) continue;
        entry[field] = value;
        convertedFields += 1;
      }
    }
    if (typeof entry.名称 !== "string" || !entry.名称.trim()) {
      skippedEntries += 1;
      diagnostics.push({ level: "warning", code: "RESOURCE_ADAPTER_ENTRY_NAME_MISSING", text: `记录 ${index + 1} 转换后缺少名称，已跳过。`, path: `${index}` });
      return;
    }
    if (bindImage(entry, record, adapter, source, retainedAssetPaths, diagnostics)) boundImages += 1;
    addContribution(contributions, libraryId, libraryNames.get(libraryId) ?? type, entry);
  });

  const convertedEntries = [...contributions.values()].reduce((sum, contribution) => sum + contribution.entries.length, 0);
  if (convertedEntries === 0) {
    return { error: { level: "error", code: "RESOURCE_ADAPTER_NO_VALID_ENTRIES", text: "转换后没有有效 Resource Entry。" } };
  }
  const assets: RuntimePackageAsset[] = [];
  for (const path of retainedAssetPaths) {
    const bytes = source.assets.get(path);
    if (!bytes) continue;
    assets.push({ 路径: `assets/external/${path.split("/").at(-1)}`, 类型: mimeFromBytes(bytes, path), bytes, sourceType: "resourceExtension", sourceId: extensionId });
  }
  const allImagePaths = [...source.assets.keys()].filter(isImagePath);
  const orphanImages = allImagePaths.filter((path) => !retainedAssetPaths.has(path)).length;
  if (orphanImages > 0) diagnostics.push({ level: "warning", code: "RESOURCE_ADAPTER_ORPHAN_IMAGES", text: `${orphanImages} 张未绑定图片已丢弃。` });

  return {
    adapter,
    extensionDocument: {
      ID: extensionId,
      名称: packageName,
      版本: version,
      目标系统包ID: systemPackage.manifest.ID,
      resourceLibraries: [...contributions.values()],
    },
    assets,
    diagnostics,
    counts: { sourceEntries: rawRecords.length, convertedEntries, skippedEntries, convertedFields, skippedFields, boundImages, orphanImages },
  };
}

function readValueSource(source: ValueSource, input: ExternalResourceSource): unknown {
  if (source.类型 === "文件名") return input.fileName.replace(/\.[^.]+$/u, "");
  if (source.类型 === "常量") return source.值;
  return readSafePath(input.document, source.路径);
}

function makeEntryId(adapter: ResourceFormatAdapter, record: Record<string, unknown>, fallback: string): string {
  const explicit = adapter.EntryID路径 ? readText(record, adapter.EntryID路径) : "";
  return explicit || `external:${adapter.ID}:${stableAdapterId(adapter.ID, fallback)}`;
}

function addContribution(map: Map<string, { ID: string; 名称: string; entries: Array<Record<string, unknown>> }>, id: string, name: string, entry: Record<string, unknown>) {
  const contribution = map.get(id) ?? { ID: id, 名称: name, entries: [] };
  contribution.entries.push(entry);
  map.set(id, contribution);
}

function applyFieldMappings(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  mappings: FieldMapping[],
  diagnostics: FormatDiagnostic[],
  count: (converted: boolean) => void,
  path = "",
) {
  for (const mapping of mappings) {
    const value = convertFieldValue(readSafePath(source, mapping.来源路径), mapping.转换);
    if (value === undefined) {
      count(false);
      if (mapping.必填) diagnostics.push({ level: "warning", code: "RESOURCE_ADAPTER_REQUIRED_FIELD_MISSING", text: `必填目标字段 ${mapping.字段} 无法转换。`, path });
      continue;
    }
    target[mapping.字段] = value;
    count(true);
  }
}

function convertFieldValue(value: unknown, operation: FieldMapping["转换"]): unknown {
  if (value === undefined || value === null) return undefined;
  if (operation === "json") return structuredClone(value);
  if (operation === "number") {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : undefined;
  }
  if (operation === "boolean") {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === 1 || value === "1") return true;
    if (value === "false" || value === 0 || value === "0") return false;
    return undefined;
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(String).join("\n");
  return undefined;
}

function bindImage(
  target: Record<string, unknown>,
  record: Record<string, unknown>,
  adapter: ResourceFormatAdapter,
  source: ExternalResourceSource,
  retained: Set<string>,
  diagnostics: FormatDiagnostic[],
): boolean {
  if (!adapter.图片) return false;
  const raw = readText(record, adapter.图片.来源路径);
  if (!raw) return false;
  const prefix = adapter.图片.资产目录 ? `${adapter.图片.资产目录.replace(/\/$/u, "")}/` : "";
  const direct = `${prefix}${raw}`;
  const matched = source.assets.has(direct)
    ? direct
    : [...source.assets.keys()].find((path) => path.startsWith(direct) && isImagePath(path))
      ?? [...source.assets.keys()].find((path) => path.startsWith(`${direct}.`) && isImagePath(path));
  if (!matched) {
    diagnostics.push({ level: "warning", code: "RESOURCE_ADAPTER_IMAGE_MISSING", text: `记录图片不存在：${raw}` });
    return false;
  }
  retained.add(matched);
  target[adapter.图片.目标字段] = `assets/external/${matched.split("/").at(-1)}`;
  return true;
}

function readText(value: unknown, path: Array<string | number>): string {
  const result = readSafePath(value, path);
  return typeof result === "string" || typeof result === "number" ? String(result).trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isImagePath(path: string): boolean {
  return /\.(?:png|jpe?g|webp|gif|avif|svg)$/iu.test(path);
}

function mimeFromPath(path: string): string {
  const extension = path.split(".").at(-1)?.toLocaleLowerCase();
  return extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "svg" ? "image/svg+xml" : `image/${extension ?? "png"}`;
}

function mimeFromBytes(bytes: Uint8Array, fallbackPath: string): string {
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return mimeFromPath(fallbackPath);
}
