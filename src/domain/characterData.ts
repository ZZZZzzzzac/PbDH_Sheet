import { z } from "zod";
import type { SystemPackage } from "./systemPackage";

export const characterDataSchemaVersion = "0.1.0";

export interface CharacterData {
  kind: "pbdh-character-data";
  schemaVersion: typeof characterDataSchemaVersion;
  systemPackage: {
    id: string;
    version: string;
  };
  character: {
    id: string;
    values: Record<string, string>;
  };
  updatedAt: string;
}

const characterDataSchema: z.ZodType<CharacterData> = z.object({
  kind: z.literal("pbdh-character-data"),
  schemaVersion: z.literal(characterDataSchemaVersion),
  systemPackage: z.object({
    id: z.string().min(1),
    version: z.string().min(1),
  }),
  character: z.object({
    id: z.string().min(1),
    values: z.record(z.string().min(1), z.string()),
  }),
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
      values: {},
    },
    updatedAt: new Date().toISOString(),
  };
}

export function updateCharacterValue(data: CharacterData, moduleId: string, value: string): CharacterData {
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
