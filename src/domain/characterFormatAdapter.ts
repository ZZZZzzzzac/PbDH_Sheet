import { createEmptyCharacterData, createCharacterId, type CharacterData, type PlayerImageData, type SheetValue } from "./characterData";
import type { CardInstance } from "./cardEngine";
import { carrierMatches, stableAdapterId, type CharacterFormatAdapter, type FormatCarrier, type FormatDiagnostic } from "./formatAdapter";
import { executePackageScriptInWorker } from "./packageScriptRunner";
import type { SystemPackage } from "./systemPackage";

export interface ExternalCharacterSource { document: unknown; fileName: string; carrier: FormatCarrier }
export interface CharacterConversionReport { convertedFields: number; skippedFields: number; matchedCards: number; skippedCards: number; convertedImages: number; skippedImages: number; diagnostics: FormatDiagnostic[] }
export interface CharacterAdapterConversion { adapter: CharacterFormatAdapter; data: CharacterData; suggestedSaveName?: string; report: CharacterConversionReport }
export interface CharacterAdapterExport { adapter: CharacterFormatAdapter; document: Record<string, unknown>; report: { exportedFields: number; skippedFields: number; exportedCards: number; skippedCards: number; exportedImages: number; skippedImages: number; diagnostics: FormatDiagnostic[] } }

interface ImportCard { tableModuleId: string; state: string; libraryId: string; entryId: string }
interface ImportImage { moduleId: string; name?: string; dataUrl: string }
interface CharacterImportResult {
  values: Record<string, unknown>;
  cards?: ImportCard[];
  images?: ImportImage[];
  suggestedSaveName?: string;
  skippedFields?: number;
  skippedCards?: number;
  skippedImages?: number;
  diagnostics?: FormatDiagnostic[];
}

export async function exportExternalCharacterData(data: CharacterData, adapter: CharacterFormatAdapter, systemPackage: SystemPackage): Promise<CharacterAdapterExport | { error: FormatDiagnostic }> {
  if (!adapter.exportScriptContent) return { error: { level: "error", code: "CHARACTER_ADAPTER_EXPORT_UNSUPPORTED", text: `${adapter.名称} 不支持导出。` } };
  let raw: unknown;
  try {
    raw = await executePackageScriptInWorker(adapter.exportScriptContent, { adapterId: adapter.ID, characterData: data, resourceLibraries: systemPackage.resourceLibraries ?? [] }, `${adapter.名称} Character Export Script`);
  } catch (error) {
    return { error: scriptError("CHARACTER_ADAPTER_EXPORT_SCRIPT_ERROR", adapter, error) };
  }
  if (!isRecord(raw) || !isRecord(raw.document)) return { error: invalidOutput(adapter, "导出脚本必须返回 document 对象。") };
  const diagnostics = normalizeDiagnostics(raw.diagnostics);
  if (!diagnostics) return { error: invalidOutput(adapter, "diagnostics 格式无效。") };
  return {
    adapter,
    document: raw.document,
    report: {
      exportedFields: nonNegativeInt(raw.exportedFields), skippedFields: nonNegativeInt(raw.skippedFields),
      exportedCards: nonNegativeInt(raw.exportedCards), skippedCards: nonNegativeInt(raw.skippedCards),
      exportedImages: nonNegativeInt(raw.exportedImages), skippedImages: nonNegativeInt(raw.skippedImages), diagnostics,
    },
  };
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
  try { jsonDocument = JSON.parse(text); jsonParsed = true; } catch { /* Embedded JSON carriers may still match. */ }
  for (const adapter of adapters) for (const carrier of adapter.载体) {
    if (carrier.类型 === "zip") continue;
    let document: unknown;
    if (carrier.类型 === "json") { if (!jsonParsed) continue; document = jsonDocument; }
    else {
      const extracted = extractEmbeddedJson(text, carrier.开始标记, carrier.结束标记, carrier.结束标记包含字符数 ?? 0);
      if (!extracted.ok) continue;
      document = extracted.document;
    }
    if (carrierMatches(carrier, document, fileName)) candidates.push({ adapter, source: { document, fileName, carrier } });
  }
  if (candidates.length === 0) {
    if (!jsonParsed && !looksLikeHtml(text)) return { status: "error", diagnostic: { level: "error", code: "CHARACTER_FORMAT_JSON_INVALID", text: "人物卡 JSON 无法解析。" } };
    return { status: "none" };
  }
  const unique = new Map(candidates.map((candidate) => [candidate.adapter.ID, candidate]));
  if (unique.size > 1) return { status: "ambiguous", adapters: [...unique.values()].map(({ adapter }) => adapter), sources: [...unique.values()].map(({ source }) => source) };
  const match = [...unique.values()][0];
  return { status: "match", adapter: match.adapter, source: match.source };
}

export async function convertExternalCharacterSource(source: ExternalCharacterSource, adapter: CharacterFormatAdapter, systemPackage: SystemPackage): Promise<CharacterAdapterConversion | { error: FormatDiagnostic }> {
  let raw: unknown;
  try {
    raw = await executePackageScriptInWorker(adapter.importScriptContent, {
      document: source.document,
      fileName: source.fileName,
      resourceLibraries: systemPackage.resourceLibraries ?? [],
    }, `${adapter.名称} Character Import Script`);
  } catch (error) {
    return { error: scriptError("CHARACTER_ADAPTER_IMPORT_SCRIPT_ERROR", adapter, error) };
  }
  if (!isRecord(raw) || !isRecord(raw.values)) return { error: invalidOutput(adapter, "导入脚本必须返回 values 对象。") };
  const result = raw as unknown as CharacterImportResult;
  const diagnostics = normalizeDiagnostics(result.diagnostics);
  if (!diagnostics || !optionalArray(result.cards) || !optionalArray(result.images)) return { error: invalidOutput(adapter, "cards、images 或 diagnostics 格式无效。") };

  const data = createEmptyCharacterData(systemPackage, createCharacterId());
  const modules = new Map(systemPackage.modules.map((module) => [module.ID, module]));
  const values = { ...data.character.values };
  let convertedFields = 0;
  for (const [moduleId, value] of Object.entries(result.values)) {
    const module = modules.get(moduleId);
    if (!module || !isSheetValue(value) || !valueMatchesModule(value, module)) return { error: invalidOutput(adapter, `values.${moduleId} 不符合当前 Module 合同。`) };
    values[moduleId] = module.类型 === "checkboxResource" && isRecord(values[moduleId]) && isRecord(value)
      ? { ...values[moduleId] as Record<string, boolean>, ...value as Record<string, boolean> }
      : value;
    convertedFields += 1;
  }

  const playerImages: Record<string, PlayerImageData> = {};
  let convertedImages = 0;
  let skippedImages = nonNegativeInt(result.skippedImages);
  for (const [index, image] of (result.images ?? []).entries()) {
    if (!isRecord(image) || typeof image.moduleId !== "string" || (image.name !== undefined && typeof image.name !== "string") || typeof image.dataUrl !== "string" || modules.get(image.moduleId)?.类型 !== "imageField") {
      return { error: invalidOutput(adapter, `images.${index} 无效。`) };
    }
    if (!isImageDataUrl(image.dataUrl)) {
      skippedImages += 1;
      diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_IMAGE_INVALID", text: `Player Image 无效，已跳过 ${image.moduleId}。`, path: `images.${index}.dataUrl` });
      continue;
    }
    const imageId = `player-image-${stableAdapterId(adapter.ID, image.moduleId, image.dataUrl)}`;
    const mimeType = /^data:([^;,]+)/iu.exec(image.dataUrl)?.[1] ?? "image/png";
    values[image.moduleId] = { kind: "player-image", imageId };
    playerImages[imageId] = { id: imageId, ...(image.name ? { name: image.name } : {}), mimeType, dataUrl: image.dataUrl };
    convertedImages += 1;
  }

  const cards: CardInstance[] = [];
  const seen = new Map<string, string>();
  let skippedCards = nonNegativeInt(result.skippedCards);
  for (const [index, card] of (result.cards ?? []).entries()) {
    if (!isImportCard(card) || modules.get(card.tableModuleId)?.类型 !== "cardTable") return { error: invalidOutput(adapter, `cards.${index} 无效。`) };
    const entry = systemPackage.resourceLibraries?.find((library) => library.ID === card.libraryId)?.entries.find((item) => item.ID === card.entryId);
    if (!entry) return { error: invalidOutput(adapter, `cards.${index} 引用了不存在的 Resource Entry ${card.libraryId}/${card.entryId}。`) };
    const key = `${card.tableModuleId}\u001f${card.libraryId}\u001f${card.entryId}`;
    const previousState = seen.get(key);
    if (previousState !== undefined) {
      skippedCards += 1;
      if (previousState !== card.state) diagnostics.push({ level: "warning", code: "CHARACTER_ADAPTER_CARD_STATE_CONFLICT", text: `Card「${entry.fields.名称 ?? entry.ID}」同时声明了冲突状态，后续状态已跳过。` });
      continue;
    }
    seen.set(key, card.state);
    const siblingIndex = cards.filter((item) => item.tableModuleId === card.tableModuleId).length;
    cards.push({ instanceId: `card-${stableAdapterId(adapter.ID, card.tableModuleId, card.libraryId, card.entryId, String(siblingIndex))}`, tableModuleId: card.tableModuleId, definitionRef: { type: "resourceLibrary", libraryId: card.libraryId, entryId: card.entryId }, state: card.state, xPct: 4 + (siblingIndex % 5) * 18, yPct: 6 + Math.floor(siblingIndex / 5) * 24, zIndex: siblingIndex + 1, face: "front", rotation: 0, scale: 1, indicators: [] });
  }
  return {
    adapter,
    data: { ...data, character: { ...data.character, values }, cards: { instances: cards }, playerImages, updatedAt: new Date().toISOString() },
    ...(typeof result.suggestedSaveName === "string" && result.suggestedSaveName.trim() ? { suggestedSaveName: result.suggestedSaveName.trim() } : {}),
    report: { convertedFields, skippedFields: nonNegativeInt(result.skippedFields), matchedCards: cards.length, skippedCards, convertedImages, skippedImages, diagnostics },
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

function scriptError(code: string, adapter: CharacterFormatAdapter, error: unknown): FormatDiagnostic { return { level: "error", code, text: `${adapter.名称} 执行失败：${error instanceof Error ? error.message : String(error)}` }; }
function invalidOutput(adapter: CharacterFormatAdapter, detail: string): FormatDiagnostic { return { level: "error", code: "CHARACTER_ADAPTER_SCRIPT_OUTPUT_INVALID", text: `${adapter.名称} 输出无效：${detail}` }; }
function nonNegativeInt(value: unknown): number { return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0; }
function optionalArray(value: unknown): boolean { return value === undefined || Array.isArray(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isSheetValue(value: unknown): value is SheetValue { return typeof value === "string" || (isRecord(value) && ((typeof value.current === "number" && (typeof value.max === "number" || value.max === null)) || (value.kind === "player-image" && typeof value.imageId === "string") || Object.values(value).every((item) => typeof item === "boolean"))); }
function valueMatchesModule(value: SheetValue, module: SystemPackage["modules"][number]): boolean {
  const record: Record<string, unknown> | undefined = isRecord(value) ? value : undefined;
  if (module.类型 === "freeText" || module.类型 === "longText") return typeof value === "string";
  if (module.类型 === "countableResource") {
    const current = record?.current;
    const max = record?.max;
    return typeof current === "number" && Number.isInteger(current) && current >= 0
      && (max === null || (typeof max === "number" && Number.isInteger(max) && max >= current));
  }
  if (module.类型 === "checkboxResource") {
    const optionIds = new Set(module.选项.map((option) => option.ID));
    return Boolean(record && Object.entries(record).every(([id, selected]) => optionIds.has(id) && typeof selected === "boolean"));
  }
  return false;
}
function isImportCard(value: unknown): value is ImportCard { return isRecord(value) && typeof value.tableModuleId === "string" && typeof value.state === "string" && typeof value.libraryId === "string" && typeof value.entryId === "string"; }
function isImageDataUrl(value: string): boolean { return /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\s]+$/iu.test(value); }
function normalizeDiagnostics(value: unknown): FormatDiagnostic[] | undefined { if (value === undefined) return []; if (!Array.isArray(value)) return undefined; const result: FormatDiagnostic[] = []; for (const item of value) { if (!isRecord(item) || (item.level !== "error" && item.level !== "warning") || typeof item.code !== "string" || typeof item.text !== "string" || (item.path !== undefined && typeof item.path !== "string")) return undefined; result.push({ level: item.level, code: item.code, text: item.text, ...(typeof item.path === "string" ? { path: item.path } : {}) }); } return result; }
function looksLikeHtml(text: string): boolean { return /<!doctype\s+html|<html\b/iu.test(text); }
