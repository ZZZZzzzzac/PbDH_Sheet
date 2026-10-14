import type { CharacterData, SheetValue } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";

export const DHOL_BASE_URL = "https://screenol.pages.dev";
export const DHOL_ADAPTER_ID = "dhsheet-character";
export const DHOL_PACKAGE_ID = "daggerheart-core";

export function supportsDholDelivery(systemPackage: SystemPackage | null): boolean {
  return systemPackage?.manifest.ID === DHOL_PACKAGE_ID &&
    Boolean(systemPackage.characterFormatAdapters?.some((adapter) => adapter.ID === DHOL_ADAPTER_ID && adapter.exportScriptContent));
}

const attributes = ["agility", "strength", "finesse", "instinct", "presence", "knowledge"] as const;
const maxSheetBytes = 512 * 1024;
const maxRequestBytes = 544 * 1024;

export function normalizeDholRoomCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function shown(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "value" in value) return shown(value.value);
  return "";
}

function resourceMax(sheet: Record<string, unknown>, key: "hp" | "stress" | "armorBoxes", maxKey: string): number {
  const marks = sheet[key];
  if (!Array.isArray(marks) || marks.length < 1 || marks.length > 100 || marks.some((mark) => typeof mark !== "boolean")) {
    throw new Error(`角色的${key}资源栏无效，无法发送。`);
  }
  const value = sheet[maxKey];
  if (typeof value !== "number" || !Number.isInteger(value) || value < (key === "armorBoxes" ? 0 : 1) || value > marks.length) {
    throw new Error(`角色的${maxKey}无效，无法发送。`);
  }
  return value;
}

function weaponDisplay(value: unknown): { attribute: string; range: string } {
  const text = shown(value);
  return {
    attribute: text.match(/敏捷|力量|灵巧|本能|风度|知识/u)?.[0] ?? "",
    range: text.match(/极远距离|远距离|近距离|极远|邻近|近战/u)?.[0] ?? "",
  };
}

function portableValues(values: Record<string, SheetValue>): Record<string, Exclude<SheetValue, { kind: "player-image" }>> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) =>
    !(value && typeof value === "object" && "kind" in value && value.kind === "player-image"),
  )) as Record<string, Exclude<SheetValue, { kind: "player-image" }>>;
}

function goldSlots(value: SheetValue | undefined, length: number): boolean[] {
  const current = value && typeof value === "object" && "current" in value && typeof value.current === "number"
    ? Math.max(0, Math.trunc(value.current)) : 0;
  return Array.from({ length }, (_, index) => index < current);
}

function resourceFields(systemPackage: SystemPackage, libraryId: string, entryId: string): Record<string, string> | null {
  return systemPackage.resourceLibraries?.find((library) => library.ID === libraryId)?.entries.find((entry) => entry.ID === entryId)?.fields ?? null;
}

function resolvedCardFields(data: CharacterData, systemPackage: SystemPackage, reference: CharacterData["cards"]["instances"][number]["definitionRef"]): Record<string, string> | null {
  if (reference.type === "resourceLibrary") return resourceFields(systemPackage, reference.libraryId, reference.entryId);
  return data.compositeResources[reference.compositeResourceId]?.fields ?? null;
}

function readableCard(data: CharacterData, systemPackage: SystemPackage, card: CharacterData["cards"]["instances"][number]) {
  const fields = resolvedCardFields(data, systemPackage, card.definitionRef);
  if (!fields) return null;
  const id = card.definitionRef.type === "resourceLibrary" ? card.definitionRef.entryId : card.definitionRef.compositeResourceId;
  const name = fields["名称"] || id;
  const description = fields["描述"] || Object.entries(fields)
    .filter(([key, value]) => key !== "名称" && key !== "原名" && value)
    .map(([key, value]) => `${key}：${value}`).join("\n");
  return { standarized: true, id: fields["原名"] || id, name, type: "unknown", class: fields["领域"] || "", description, cardSelectDisplay: {} };
}

function completeCards(exported: unknown, data: CharacterData, systemPackage: SystemPackage, state: string) {
  const cards = Array.isArray(exported) ? exported.filter((card) => card && typeof card === "object" && "name" in card && card.name) : [];
  const supplement = data.cards.instances.filter((card) => card.state === state).flatMap((card) => {
    const readable = readableCard(data, systemPackage, card);
    return readable && !cards.some((existing) => existing.id === readable.id && existing.name === readable.name) ? [readable] : [];
  });
  return [...cards, ...supplement];
}

/** Keep the established dhSheet fields; desktopView captures PbDH's edited values at send time. */
export function buildDholDelivery(data: CharacterData, exported: Record<string, unknown>, systemPackage: SystemPackage) {
  if (data.systemPackage.id !== DHOL_PACKAGE_ID) throw new Error("只有匕首之心系统包可以发送到在线面板。");
  if (systemPackage.manifest.ID !== DHOL_PACKAGE_ID) throw new Error("当前系统包与角色不匹配。");
  const sheet: Record<string, unknown> = { ...exported, characterImage: "", companionImage: "" };
  sheet.cards = completeCards(sheet.cards, data, systemPackage, "配置");
  sheet.inventory_cards = completeCards(sheet.inventory_cards, data, systemPackage, "宝库");
  // PbDH has nine slots per handful/bag, while dhol's dhSheet view has ten.
  // Keep the extra slots empty and retain the exact counters in pbdhSource.
  sheet.gold = [
    ...goldSlots(data.character.values["handful-gold"], 9), false,
    ...goldSlots(data.character.values["bag-gold"], 9), false,
    ...goldSlots(data.character.values["chest-gold"], 1),
  ];
  const name = shown(sheet.name).trim();
  if (!name || [...name].length > 80) throw new Error("请先填写有效的角色名（不超过 80 字）。");
  if (sheet.ruleSetId !== "daggerheart") throw new Error("dhSheet 导出格式与在线面板不兼容。");
  const primary = weaponDisplay(sheet.primaryWeaponTrait);
  const secondary = weaponDisplay(sheet.secondaryWeaponTrait);
  sheet.desktopView = {
    version: 1,
    evasion: shown(sheet.evasion),
    armorValue: shown(sheet.armorValue),
    minorThreshold: shown(sheet.minorThreshold),
    majorThreshold: shown(sheet.majorThreshold),
    attributes: Object.fromEntries(attributes.map((key) => [key, shown(sheet[key])])),
    hpMax: resourceMax(sheet, "hp", "hpMax"),
    stressMax: resourceMax(sheet, "stress", "stressMax"),
    armorMax: resourceMax(sheet, "armorBoxes", "armorMax"),
    primaryWeaponAttribute: primary.attribute,
    primaryWeaponRange: primary.range,
    secondaryWeaponAttribute: secondary.attribute,
    secondaryWeaponRange: secondary.range,
  };
  // The dhol contract retains unknown JSON fields. Preserve every non-image module value,
  // including hand-edited text that has no dedicated dhSheet field.
  sheet.pbdhSource = {
    systemPackage: data.systemPackage,
    values: portableValues(data.character.values),
    compositeResources: data.compositeResources,
    selectedResources: Object.fromEntries(Object.entries(data.resourceSelections ?? {}).map(([moduleId, selection]) => [moduleId, {
      libraryId: selection.libraryId,
      entries: selection.entryIds.map((entryId) => ({ id: entryId, fields: resourceFields(systemPackage, selection.libraryId, entryId) })),
    }])),
    cards: data.cards.instances.map((card) => ({ state: card.state, fields: resolvedCardFields(data, systemPackage, card.definitionRef) })),
  };
  const sheetBytes = new TextEncoder().encode(JSON.stringify(sheet)).byteLength;
  if (sheetBytes > maxSheetBytes) throw new Error("角色文字数据超过在线面板的 512 KiB 上限，请精简内容后重试。");
  return { schemaVersion: 2 as const, sheet };
}

export interface DholSendResult {
  ok: true;
  action: "created" | "updated";
  name: string;
  generation: number;
  seq: number;
}

function responseError(code: unknown): string {
  switch (code) {
    case "ROOM_NOT_FOUND": return "房间不存在，请检查房间码。";
    case "ROOM_EXPIRED": return "房间已过期，请向主持人获取新房间码。";
    case "INVALID_CHARACTER": return "角色数据无效，请检查角色名和资源栏。";
    case "UNSUPPORTED_SCHEMA": return "角色数据版本不受支持，请刷新页面后重试。";
    case "PAYLOAD_TOO_LARGE": return "角色数据过大，请精简内容后重试。";
    case "RATE_LIMITED": return "投递过于频繁，请稍后重试。";
    case "PERSISTENCE_FAILED": return "房间保存失败，请在同一弹窗中重试。";
    case "ORIGIN_NOT_ALLOWED": return "当前 PbDH 地址尚未被在线面板允许。";
    default: return "在线面板拒绝了这次投递。";
  }
}

export async function sendDholDelivery(roomCode: string, requestId: string, delivery: ReturnType<typeof buildDholDelivery>, baseUrl = DHOL_BASE_URL): Promise<DholSendResult> {
  const code = normalizeDholRoomCode(roomCode);
  if (code.length !== 6) throw new Error("房间码必须为 6 位英文字母或数字。");
  const body = JSON.stringify(delivery);
  if (new TextEncoder().encode(body).byteLength > maxRequestBytes) throw new Error("投递请求超过在线面板的 544 KiB 上限。");
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/u, "")}/api/v2/rooms/${code}/characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
      body,
    });
  } catch {
    throw new Error("无法连接到在线面板，请检查网络后在同一弹窗中重试。");
  }
  let result: unknown;
  try { result = await response.json(); } catch { throw new Error(`在线面板响应异常（HTTP ${response.status}）。`); }
  if (!response.ok) throw new Error(responseError(result && typeof result === "object" && "code" in result ? result.code : null));
  if (!result || typeof result !== "object" || !("ok" in result) || result.ok !== true ||
      !("action" in result) || (result.action !== "created" && result.action !== "updated") ||
      !("name" in result) || typeof result.name !== "string" ||
      !("generation" in result) || typeof result.generation !== "number" ||
      !("seq" in result) || typeof result.seq !== "number") {
    throw new Error("在线面板的成功响应格式无效。");
  }
  return result as DholSendResult;
}
