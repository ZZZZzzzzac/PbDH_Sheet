import { z } from "zod";
import type { SystemPackage } from "./systemPackage";

export const characterDataSchemaVersion = "0.1.0";

export type CheckboxState = Record<string, boolean>;
export type CountableState = { current: number; max: number | null };
export type PlayerImageValue = { kind: "player-image"; imageId: string };
export type SheetValue = string | CheckboxState | CountableState | PlayerImageValue;

export interface PlayerImageData {
  id: string;
  name?: string;
  mimeType: string;
  dataUrl: string;
}

export interface CharacterData {
  kind: "pbdh-character-data";
  schemaVersion: typeof characterDataSchemaVersion;
  systemPackage: {
    id: string;
    version: string;
  };
  character: {
    id: string;
    values: Record<string, SheetValue>;
  };
  playerImages: Record<string, PlayerImageData>;
  updatedAt: string;
}

const sheetValueSchema = z.union([
  z.string(),
  z.record(z.string(), z.boolean()),
  z.object({ current: z.number(), max: z.number().nullable() }),
  z.object({ kind: z.literal("player-image"), imageId: z.string().min(1) }),
]);

const characterDataSchema: z.ZodType<CharacterData> = z.object({
  kind: z.literal("pbdh-character-data"),
  schemaVersion: z.literal(characterDataSchemaVersion),
  systemPackage: z.object({
    id: z.string().min(1),
    version: z.string().min(1),
  }),
  character: z.object({
    id: z.string().min(1),
    values: z.record(z.string().min(1), sheetValueSchema),
  }),
  playerImages: z
    .record(
      z.string().min(1),
      z.object({
        id: z.string().min(1),
        name: z.string().optional(),
        mimeType: z.string().min(1),
        dataUrl: z.string().min(1),
      }),
    )
    .default({}),
  updatedAt: z.string().min(1),
});

export type CharacterImportResult =
  | { ok: true; data: CharacterData }
  | { ok: false; error: string };

export function createEmptyCharacterData(systemPackage: SystemPackage): CharacterData {
  return {
    kind: "pbdh-character-data",
    schemaVersion: characterDataSchemaVersion,
    systemPackage: {
      id: systemPackage.manifest.ID,
      version: systemPackage.manifest.版本,
    },
    character: {
      id: "current-character",
      values: seedDefaultModuleValues(systemPackage),
    },
    playerImages: {},
    updatedAt: new Date().toISOString(),
  };
}

function seedDefaultModuleValues(systemPackage: SystemPackage): Record<string, SheetValue> {
  const values: Record<string, SheetValue> = {};

  for (const module of systemPackage.modules) {
    switch (module.类型) {
      case "freeText":
      case "longText":
        values[module.ID] = module.默认值 ?? "";
        break;
      case "checkboxResource":
        values[module.ID] = Object.fromEntries(
          module.选项.map((option) => [option.ID, option.默认选中 ?? false] as const),
        );
        break;
      case "countableResource": {
        const min = module.最小值 ?? 0;
        const max = module.最大值 ?? null;
        const defaultValue = module.默认值 ?? min;
        values[module.ID] = { current: clampInt(defaultValue, min, max), max };
        break;
      }
      case "readOnlyDisplay":
      case "imageField":
        break;
    }
  }

  return values;
}

function clampInt(value: number, min: number, max: number | null) {
  if (value < min) {
    return min;
  }
  if (max !== null && value > max) {
    return max;
  }
  return value;
}

export function updateCharacterValue(data: CharacterData, moduleId: string, value: SheetValue): CharacterData {
  return {
    ...data,
    character: {
      ...data.character,
      values: {
        ...data.character.values,
        [moduleId]: value,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function updatePlayerImage(data: CharacterData, moduleId: string, image: PlayerImageData): CharacterData {
  return {
    ...updateCharacterValue(data, moduleId, { kind: "player-image", imageId: image.id }),
    playerImages: {
      ...data.playerImages,
      [image.id]: image,
    },
  };
}

export function exportCharacterData(data: CharacterData): string {
  return JSON.stringify(data, null, 2);
}

export function parseCharacterDataJson(text: string, currentPackage: SystemPackage): CharacterImportResult {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(text);
  } catch {
    return { ok: false, error: "导入失败：Character JSON 格式错误。" };
  }

  const parsed = characterDataSchema.safeParse(parsedJson);

  if (!parsed.success) {
    return {
      ok: false,
      error: "导入失败：文件不是有效的 Character Data。",
    };
  }

  if (
    parsed.data.systemPackage.id !== currentPackage.manifest.ID ||
    parsed.data.systemPackage.version !== currentPackage.manifest.版本
  ) {
    return {
      ok: false,
      error: "导入失败：Character Data 不属于当前 System Package。",
    };
  }

  return { ok: true, data: parsed.data };
}
