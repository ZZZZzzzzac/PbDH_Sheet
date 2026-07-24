import { createEmptyCharacterData, createCharacterId, type CharacterData, type CountableState, type PlayerImageData } from "./characterData";
import type { CardInstance } from "./cardEngine";
import {
  carrierMatches,
  normalizeExternalName,
  readSafePath,
  stableAdapterId,
  writeSafePath,
  type CharacterFormatAdapter,
  type FormatCarrier,
  type FormatDiagnostic,
} from "./formatAdapter";
import type { ResourceLibraryEntry } from "./resourceLibrary";
import type { SystemPackage } from "./systemPackage";

export interface ExternalCharacterSource {
  document: unknown;
  fileName: string;
  carrier: FormatCarrier;
}

export interface CharacterConversionReport {
  convertedFields: number;
  skippedFields: number;
  matchedCards: number;
  skippedCards: number;
  convertedImages: number;
  skippedImages: number;
  diagnostics: FormatDiagnostic[];
}

export interface CharacterAdapterConversion {
  adapter: CharacterFormatAdapter;
  data: CharacterData;
  suggestedSaveName?: string;
  report: CharacterConversionReport;
}

export interface CharacterAdapterExport {
  adapter: CharacterFormatAdapter;
  document: Record<string, unknown>;
  report: { exportedFields: number; skippedFields: number; exportedCards: number; skippedCards: number; exportedImages: number; skippedImages: number; diagnostics: FormatDiagnostic[] };
}

export function exportExternalCharacterData(data: CharacterData, adapter: CharacterFormatAdapter, systemPackage: SystemPackage): CharacterAdapterExport | { error: FormatDiagnostic } {
  const declaration = adapter.导出;
  if (!declaration) return { error: { level: "error", code: "CHARACTER_ADAPTER_EXPORT_UNSUPPORTED", text: `${adapter.名称} 不支持导出。` } };
  const document = structuredClone(declaration.默认值) as Record<string, unknown>;
  const diagnostics: FormatDiagnostic[] = [];
  let exportedFields = 0;
  let skippedFields = 0;
  let exportedCards = 0;
  let skippedCards = 0;
  let exportedImages = 0;
  let skippedImages = 0;
  const exportedCardIds = new Set<string>();
  for (const mapping of declaration.字段映射) {
    const value = data.character.values[mapping.来源模块ID];
    const converted = mapping.转换 === "number" && typeof value === "string" && value.trim() ? Number(value) : value;
    if ((typeof converted !== "string" && typeof converted !== "number") || (typeof converted === "number" && !Number.isFinite(converted))) {
      skippedFields += 1;
      diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_EXPORT_FIELD_SKIPPED", text: `字段 ${mapping.来源模块ID} 无法导出。` });
    } else if (writeSafePath(document, mapping.目标路径, converted)) exportedFields += 1;
  }
  for (const mapping of declaration.Checkbox映射 ?? []) {
    const value = data.character.values[mapping.来源模块ID];
    if (!isRecord(value)) { skippedFields += 1; continue; }
    const checkboxState = value as Record<string, unknown>;
    for (const optionMapping of mapping.选项映射) {
      const selected = optionMapping.来源选项IDs.every((optionId) => checkboxState[optionId] === true);
      writeSafePath(document, optionMapping.目标路径, selected ? 1 : 0);
    }
    exportedFields += 1;
  }
  for (const mapping of declaration.Countable映射) {
    const value = data.character.values[mapping.来源模块ID];
    if (!isCountable(value)) { skippedFields += 1; continue; }
    const length = mapping.长度 ?? value.max ?? value.current;
    const converted = mapping.转换 === "number" ? value.current
      : mapping.转换 === "booleanArray" ? Array.from({ length }, (_, index) => index < value.current)
        : Array.from({ length }, (_, index) => index < value.current ? 1 : index < (value.max ?? length) ? 0 : 2);
    if (mapping.目标路径列表 && Array.isArray(converted)) {
      mapping.目标路径列表.forEach((path, index) => writeSafePath(document, path, converted[index]));
      exportedFields += 1;
    } else if (mapping.目标路径 && writeSafePath(document, mapping.目标路径, converted)) exportedFields += 1;
    if (mapping.最大值目标路径) writeSafePath(document, mapping.最大值目标路径, value.max);
  }
  for (const mapping of declaration.图片映射) {
    const value = data.character.values[mapping.来源模块ID];
    const image = isRecord(value) && "kind" in value && value.kind === "player-image" && typeof value.imageId === "string" ? data.playerImages[value.imageId] : undefined;
    if (!image) {
      if (value !== undefined) skippedImages += 1;
      continue;
    }
    if (writeSafePath(document, mapping.目标路径, image.dataUrl)) exportedImages += 1;
  }
  for (const mapping of declaration.Card映射) {
    const outputCards: Record<string, unknown>[] = [];
    const cards = data.cards.instances.filter((card) => card.tableModuleId === mapping.来源CardTableID && card.state === mapping.状态);
    for (const card of cards) {
      if (card.definitionRef?.type !== "resourceLibrary" || !mapping.ResourceLibraryIDs.includes(card.definitionRef.libraryId)) continue;
      const resourceLibrary = systemPackage.resourceLibraries?.find((item) => item.ID === (card.definitionRef?.type === "resourceLibrary" ? card.definitionRef.libraryId : ""));
      const entry = resourceLibrary?.entries.find((item) => item.ID === (card.definitionRef?.type === "resourceLibrary" ? card.definitionRef.entryId : ""));
      if (!entry) continue;
      const output = structuredClone(mapping.默认值) as Record<string, unknown>;
      let hasExternalIdentity = false;
      let missingRequiredField = false;
      for (const field of mapping.字段映射) {
        const value = readResourceField(entry, field.来源Resource字段);
        const present = value !== undefined && value !== null && (typeof value !== "string" || value.trim() !== "");
        if (field.身份字段 && present) hasExternalIdentity = true;
        if (field.必填 && !present) missingRequiredField = true;
        if (present) writeSafePath(output, field.目标路径, value);
      }
      if (!hasExternalIdentity && missingRequiredField) continue;
      outputCards.push(output);
      exportedCardIds.add(card.instanceId);
      exportedCards += 1;
    }
    writeSafePath(document, mapping.目标路径, outputCards);
  }
  skippedCards += data.cards.instances.filter((card) => !exportedCardIds.has(card.instanceId)).length;
  const mappedModuleIds = new Set([
    ...declaration.字段映射.map((mapping) => mapping.来源模块ID),
    ...(declaration.Checkbox映射 ?? []).map((mapping) => mapping.来源模块ID),
    ...declaration.Countable映射.map((mapping) => mapping.来源模块ID),
    ...declaration.图片映射.map((mapping) => mapping.来源模块ID),
  ]);
  const defaultValues = createEmptyCharacterData(systemPackage, "export-default").character.values;
  const unmappedModules = Object.entries(data.character.values).filter(([moduleId, value]) => !mappedModuleIds.has(moduleId) && JSON.stringify(value) !== JSON.stringify(defaultValues[moduleId]));
  for (const [, value] of unmappedModules) {
    if (isRecord(value) && "kind" in value && value.kind === "player-image") skippedImages += 1;
    else skippedFields += 1;
  }
  if (unmappedModules.length > 0) diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_EXPORT_UNMAPPED_VALUES", text: `${unmappedModules.length} 个非默认 Character Value 没有外部格式映射。` });
  const referencedImageIds = new Set(Object.values(data.character.values).flatMap((value) => {
    return isRecord(value) && "kind" in value && value.kind === "player-image" && typeof value.imageId === "string" ? [value.imageId] : [];
  }));
  const orphanPlayerImages = Object.keys(data.playerImages).filter((imageId) => !referencedImageIds.has(imageId)).length;
  skippedImages += orphanPlayerImages;
  if (orphanPlayerImages > 0) diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_EXPORT_UNMAPPED_IMAGES", text: `${orphanPlayerImages} 张 Player Image 没有外部格式映射。` });
  if (Object.keys(data.compositeResources).length > 0 || Object.keys(data.resourceSelections ?? {}).length > 0) {
    skippedFields += Object.keys(data.compositeResources).length + Object.keys(data.resourceSelections ?? {}).length;
    diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_EXPORT_RESOURCE_STATE_SKIPPED", text: "外部格式不表示 PbDH Composite Resources 或 Resource Selection Snapshots。" });
  }
  if (skippedCards > 0) diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_EXPORT_CARD_SKIPPED", text: `${skippedCards} 张 Card 无法映射到外部格式。` });
  if (skippedImages > 0) diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_EXPORT_IMAGE_SKIPPED", text: `${skippedImages} 个图片槽位没有可导出的图片。` });
  return { adapter, document, report: { exportedFields, skippedFields, exportedCards, skippedCards, exportedImages, skippedImages, diagnostics } };
}

export type CharacterSourceParseResult =
  | { status: "none" }
  | { status: "ambiguous"; adapters: CharacterFormatAdapter[]; sources: ExternalCharacterSource[] }
  | { status: "match"; adapter: CharacterFormatAdapter; source: ExternalCharacterSource }
  | { status: "error"; diagnostic: FormatDiagnostic };

export function parseAndDetectCharacterSource(text: string, fileName: string, adapters: CharacterFormatAdapter[]): CharacterSourceParseResult {
  const candidates: Array<{ adapter: CharacterFormatAdapter; source: ExternalCharacterSource }> = [];
  let jsonDocument: unknown;
  let jsonParsed = false;
  try { jsonDocument = JSON.parse(text); jsonParsed = true; } catch { /* HTML/text carriers may still match. */ }

  for (const adapter of adapters) {
    for (const carrier of adapter.载体) {
      if (carrier.类型 === "zip") continue;
      let document: unknown;
      if (carrier.类型 === "json") {
        if (!jsonParsed) continue;
        document = jsonDocument;
      } else {
        const extracted = extractEmbeddedJson(text, carrier.开始标记, carrier.结束标记, carrier.结束标记包含字符数 ?? 0);
        if (!extracted.ok) continue;
        document = extracted.document;
      }
      if (carrierMatches(carrier, document, fileName)) candidates.push({ adapter, source: { document, fileName, carrier } });
    }
  }
  if (candidates.length === 0) {
    if (!jsonParsed && !looksLikeHtml(text)) return { status: "error", diagnostic: { level: "error", code: "CHARACTER_FORMAT_JSON_INVALID", text: "人物卡 JSON 无法解析。" } };
    return { status: "none" };
  }
  const unique = new Map(candidates.map((candidate) => [candidate.adapter.ID, candidate]));
  if (unique.size > 1) return { status: "ambiguous", adapters: [...unique.values()].map((item) => item.adapter), sources: [...unique.values()].map((item) => item.source) };
  const match = [...unique.values()][0];
  return { status: "match", adapter: match.adapter, source: match.source };
}

export function convertExternalCharacterSource(source: ExternalCharacterSource, adapter: CharacterFormatAdapter, systemPackage: SystemPackage): CharacterAdapterConversion {
  const data = createEmptyCharacterData(systemPackage, createCharacterId());
  const values = { ...data.character.values };
  const playerImages: Record<string, PlayerImageData> = {};
  const diagnostics: FormatDiagnostic[] = [];
  let convertedFields = 0;
  let skippedFields = 0;
  let convertedImages = 0;
  let skippedImages = 0;

  for (const mapping of adapter.字段映射) {
    const sourceValue = mapping.来源路径列表
      ? mapping.来源路径列表.map((path) => readSafePath(source.document, path))
      : readSafePath(source.document, mapping.来源路径 ?? []);
    const converted = convertText(sourceValue, mapping.转换, mapping.分隔符);
    if (converted === undefined) {
      skippedFields += 1;
      diagnostics.push({
        level: "warning",
        code: "CHARACTER_ADAPTER_FIELD_SKIPPED",
        text: `字段无法转换到 ${mapping.目标模块ID}。`,
        path: mapping.来源路径列表?.map((path) => path.join(".")).join(", ") ?? mapping.来源路径?.join("."),
      });
      continue;
    }
    values[mapping.目标模块ID] = converted;
    convertedFields += 1;
  }

  for (const mapping of adapter.Checkbox映射 ?? []) {
    const existing = values[mapping.目标模块ID];
    const checkboxState: Record<string, boolean> = isRecord(existing) ? { ...existing } as Record<string, boolean> : {};
    let mappedOptions = 0;
    for (const optionMapping of mapping.选项映射) {
      const selected = convertExternalCheckboxValue(readSafePath(source.document, optionMapping.来源路径));
      if (selected === undefined) continue;
      for (const optionId of optionMapping.目标选项IDs) checkboxState[optionId] = selected;
      mappedOptions += 1;
    }
    if (mappedOptions === 0) {
      skippedFields += 1;
      diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_CHECKBOX_SKIPPED", text: `Checkbox Resource 无法转换到 ${mapping.目标模块ID}。` });
      continue;
    }
    values[mapping.目标模块ID] = checkboxState;
    convertedFields += 1;
  }

  for (const mapping of adapter.Countable映射) {
    const sourceValues = mapping.来源路径列表
      ? mapping.来源路径列表.map((path) => readSafePath(source.document, path))
      : readSafePath(source.document, mapping.来源路径 ?? []);
    const current = convertCount(sourceValues, mapping.转换);
    if (current === undefined) {
      skippedFields += 1;
      diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_COUNT_SKIPPED", text: `Countable Resource 无法转换到 ${mapping.目标模块ID}。` });
      continue;
    }
    const existing = values[mapping.目标模块ID];
    const derivedMax = mapping.最大值转换 === "arrayLength" && Array.isArray(sourceValues)
      ? sourceValues.length
      : mapping.最大值转换 === "availableCount" && Array.isArray(sourceValues)
        ? sourceValues.filter((value) => value !== 2 && value !== "2").length
        : undefined;
    const declaredMax = derivedMax ?? (mapping.最大值来源路径 ? toInteger(readSafePath(source.document, mapping.最大值来源路径)) : mapping.最大值);
    const max = declaredMax !== undefined ? declaredMax : isCountable(existing) ? existing.max : null;
    values[mapping.目标模块ID] = { current: Math.max(0, Math.min(current, max ?? current)), max };
    convertedFields += 1;
  }

  for (const mapping of adapter.图片映射) {
    const value = readSafePath(source.document, mapping.来源路径);
    if (typeof value !== "string" || !isImageDataUrl(value)) {
      if (value !== undefined && value !== "") {
        diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_IMAGE_INVALID", text: `Player Image 无效，已跳过 ${mapping.目标模块ID}。`, path: mapping.来源路径.join(".") });
        skippedImages += 1;
      }
      continue;
    }
    const mimeType = /^data:([^;,]+)/iu.exec(value)?.[1] ?? "image/png";
    const imageId = `player-image-${stableAdapterId(adapter.ID, mapping.目标模块ID, value)}`;
    values[mapping.目标模块ID] = { kind: "player-image", imageId };
    playerImages[imageId] = { id: imageId, name: mapping.名称, mimeType, dataUrl: value };
    convertedImages += 1;
  }

  const cards: CardInstance[] = [];
  const conflictedCardKeys = new Set<string>();
  let skippedCards = 0;
  for (const cardMapping of adapter.Card映射) {
    const sourceCards = readSafePath(source.document, cardMapping.来源路径);
    if (!Array.isArray(sourceCards)) {
      diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_CARD_COLLECTION_INVALID", text: "Card 来源路径不是数组。", path: cardMapping.来源路径.join(".") });
      continue;
    }
    for (const [sourceIndex, sourceCard] of sourceCards.entries()) {
      const match = matchCard(sourceCard, sourceIndex, cardMapping, systemPackage);
      if (!match.ok) {
        skippedCards += 1;
        diagnostics.push({ level: "warning", code: match.code, text: match.text });
        continue;
      }
      const cardKey = `${cardMapping.目标CardTableID}\u001f${match.libraryId}\u001f${match.entry.ID}`;
      if (conflictedCardKeys.has(cardKey)) {
        skippedCards += 1;
        continue;
      }
      const conflictingIndexes = cards.flatMap((card, index) => card.tableModuleId === cardMapping.目标CardTableID
        && card.definitionRef?.type === "resourceLibrary"
        && card.definitionRef.libraryId === match.libraryId
        && card.definitionRef.entryId === match.entry.ID
        && card.state !== cardMapping.状态 ? [index] : []);
      if (conflictingIndexes.length > 0) {
        for (const index of conflictingIndexes.reverse()) cards.splice(index, 1);
        skippedCards += conflictingIndexes.length + 1;
        conflictedCardKeys.add(cardKey);
        diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_CARD_STATE_CONFLICT", text: "同一 Card 同时声明了冲突状态，相关 Card 已跳过。" });
        continue;
      }
      const siblingIndex = cards.filter((card) => card.tableModuleId === cardMapping.目标CardTableID).length;
      cards.push({
        instanceId: `card-${stableAdapterId(adapter.ID, cardMapping.目标CardTableID, match.libraryId, match.entry.ID, String(siblingIndex))}`,
        tableModuleId: cardMapping.目标CardTableID,
        definitionRef: { type: "resourceLibrary", libraryId: match.libraryId, entryId: match.entry.ID },
        state: cardMapping.状态,
        xPct: 4 + (siblingIndex % 5) * 18,
        yPct: 6 + Math.floor(siblingIndex / 5) * 24,
        zIndex: siblingIndex + 1,
        face: "front",
        rotation: 0,
        scale: 1,
        indicators: [],
      });
    }
  }

  const nameValue = adapter.角色名来源路径 ? readSafePath(source.document, adapter.角色名来源路径) : undefined;
  const suggestedSaveName = typeof nameValue === "string" && nameValue.trim() ? nameValue.trim() : undefined;
  return {
    adapter,
    data: { ...data, character: { ...data.character, values }, cards: { instances: cards }, playerImages, updatedAt: new Date().toISOString() },
    suggestedSaveName,
    report: { convertedFields, skippedFields, matchedCards: cards.length, skippedCards, convertedImages, skippedImages, diagnostics },
  };
}

export function extractEmbeddedJson(text: string, startMarker: string, endMarker: string, includeEndPrefix = 0): { ok: true; document: unknown } | { ok: false } {
  const start = text.indexOf(startMarker);
  if (start === -1) return { ok: false };
  const payloadStart = start + startMarker.length;
  const end = text.indexOf(endMarker, payloadStart);
  if (end === -1 || text.indexOf(startMarker, payloadStart) !== -1) return { ok: false };
  try { return { ok: true, document: JSON.parse(text.slice(payloadStart, end + Math.min(includeEndPrefix, endMarker.length)).trim()) }; } catch { return { ok: false }; }
}

function convertText(value: unknown, operation: "text" | "integerText" | "joinedText", separator = "\n"): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (operation === "joinedText") return Array.isArray(value)
    ? value.map((item) => String(item ?? "")).filter((item) => item.trim() !== "").join(separator)
    : undefined;
  if (operation === "integerText") {
    const integer = toInteger(value);
    return integer === undefined ? undefined : String(integer);
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function convertCount(value: unknown, operation: "number" | "truthyCount" | "checkedCount" | "triStateCount"): number | undefined {
  if (operation === "number") return toInteger(value);
  const values = Array.isArray(value) ? value : undefined;
  if (!values) return undefined;
  if (operation === "triStateCount") return values.filter((item) => item === 1 || item === "1").length;
  return values.filter(isTruthyExternal).length;
}

function convertExternalCheckboxValue(value: unknown): boolean | undefined {
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0" || value === 2 || value === "2") return false;
  return undefined;
}

function isTruthyExternal(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || (typeof value === "string" && value.toLocaleLowerCase() === "true");
}

function toInteger(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : undefined;
}

function isCountable(value: unknown): value is CountableState {
  return isRecord(value) && typeof value.current === "number" && (typeof value.max === "number" || value.max === null);
}

function isImageDataUrl(value: string): boolean {
  return /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\s]+$/iu.test(value);
}

function matchCard(
  source: unknown,
  sourceIndex: number,
  mapping: CharacterFormatAdapter["Card映射"][number],
  systemPackage: SystemPackage,
): { ok: true; libraryId: string; entry: ResourceLibraryEntry } | { ok: false; code: string; text: string } {
  const libraries = (systemPackage.resourceLibraries ?? []).filter((library) => mapping.ResourceLibraryIDs.includes(library.ID));
  const sourceLabel = describeSourceCard(source, sourceIndex, mapping);
  for (const rule of mapping.匹配优先级) {
    let candidates: Array<{ libraryId: string; entry: ResourceLibraryEntry }> = [];
    if (rule.类型 === "fields" && rule.字段) {
      candidates = libraries.flatMap((library) => library.entries.filter((entry) => rule.字段?.every((field) => {
        const sourceValue = normalizeComparable(readSafePath(source, field.来源路径));
        return sourceValue !== "" && sourceValue === normalizeComparable(readResourceField(entry, field.Resource字段));
      })).map((entry) => ({ libraryId: library.ID, entry })));
    } else {
      const sourceValue = applyCardMatchConversion(rule.来源路径 ? readSafePath(source, rule.来源路径) : undefined, rule.来源转换);
      if (normalizeComparable(sourceValue) === "") continue;
      const resourceField = rule.Resource字段 ?? (rule.类型 === "externalId" ? "ID" : rule.类型 === "uniqueName" ? "名称" : "描述");
      candidates = libraries.flatMap((library) => library.entries.filter((entry) => normalizeComparable(applyCardMatchConversion(readResourceField(entry, resourceField), rule.Resource转换)) === normalizeComparable(sourceValue)).map((entry) => ({ libraryId: library.ID, entry })));
    }
    if (candidates.length === 1) return { ok: true, ...candidates[0] };
    if (candidates.length > 1) return { ok: false, code: "CHARACTER_ADAPTER_CARD_AMBIGUOUS", text: `${sourceLabel}匹配到多个 Resource Entry，已跳过。` };
  }
  return { ok: false, code: "CHARACTER_ADAPTER_CARD_NOT_FOUND", text: `${sourceLabel}没有匹配的 Resource Entry，已跳过。` };
}

function describeSourceCard(source: unknown, sourceIndex: number, mapping: CharacterFormatAdapter["Card映射"][number]): string {
  const preferredRules = ["uniqueName", "fields", "externalId"] as const;
  for (const ruleType of preferredRules) {
    for (const rule of mapping.匹配优先级) {
      if (rule.类型 !== ruleType) continue;
      const values = rule.类型 === "fields"
        ? (rule.字段 ?? []).map((field) => readSafePath(source, field.来源路径))
        : [applyCardMatchConversion(rule.来源路径 ? readSafePath(source, rule.来源路径) : undefined, rule.来源转换)];
      const label = values.map(formatCardDiagnosticValue).find((value) => value !== undefined);
      if (label) return `Card「${label}」`;
    }
  }
  return `Card（${mapping.状态}第 ${sourceIndex + 1} 项）`;
}

function formatCardDiagnosticValue(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const normalized = normalizeExternalName(String(value));
  if (!normalized) return undefined;
  const characters = Array.from(normalized);
  return characters.length <= 80 ? normalized : `${characters.slice(0, 77).join("")}...`;
}

function applyCardMatchConversion(value: unknown, conversion: "fileStem" | undefined): unknown {
  if (conversion !== "fileStem" || typeof value !== "string") return value;
  const fileName = value.replace(/\\/gu, "/").split("/").at(-1) ?? "";
  return fileName.replace(/\.[^.]+$/u, "");
}

function readResourceField(entry: ResourceLibraryEntry, field: string): unknown {
  if (field === "ID") return entry.ID;
  return entry.fields[field] ?? (entry as unknown as Record<string, unknown>)[field];
}

function normalizeComparable(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? normalizeExternalName(String(value)).replace(/\s+/gu, " ") : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeHtml(text: string): boolean {
  return /<!doctype\s+html|<html\b/iu.test(text);
}
