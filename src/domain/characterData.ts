import { z } from "zod";
import { type CardInstance } from "./cardEngine";
import type { CompositeResource } from "./resourceComposer";
import { findResourceLibrary, type SystemPackage } from "./systemPackage";
import { findResourceLibraryEntry } from "./resourceLibrary";
import { clampInt, generateId } from "../utils";

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

export interface ResourceSelectionSnapshot {
  libraryId: string;
  entryIds: string[];
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
  cards: {
    instances: CardInstance[];
  };
  compositeResources: Record<string, CompositeResource>;
  resourceSelections?: Record<string, ResourceSelectionSnapshot>;
  playerImages: Record<string, PlayerImageData>;
  updatedAt: string;
}

const sheetValueSchema = z.union([
  z.string(),
  z.record(z.string(), z.boolean()),
  z.object({ current: z.number(), max: z.number().nullable() }),
  z.object({ kind: z.literal("player-image"), imageId: z.string().min(1) }),
]);

const characterDataSchema = z.object({
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
  cards: z
    .object({
      instances: z.array(
        z.object({
          instanceId: z.string().min(1),
          tableModuleId: z.string().min(1),
          definitionRef: z.discriminatedUnion("type", [
            z.object({ type: z.literal("resourceLibrary"), libraryId: z.string().min(1), entryId: z.string().min(1) }),
            z.object({ type: z.literal("compositeResource"), compositeResourceId: z.string().min(1) }),
          ]).optional(),
          libraryId: z.string().min(1).optional(),
          definitionId: z.string().min(1).optional(),
          state: z.string().min(1),
          xPct: z.number(),
          yPct: z.number(),
          zIndex: z.number().int(),
          face: z.enum(["front", "back"]),
          rotation: z.number(),
          scale: z.number().positive(),
          indicators: z.union([
            z.array(z.object({
              indicatorId: z.string().min(1),
              colorIndex: z.number().int().min(0).max(9),
              value: z.number().int().min(0),
            })).max(10),
            z.record(z.string().min(1), z.number().int().min(0)),
          ]).default([]),
          tokenCount: z.number().int().min(0),
        }).refine((instance) => Boolean(instance.definitionRef || (instance.libraryId && instance.definitionId)), {
          message: "Card Instance 必须提供 Definition Reference。",
        }),
      ),
    })
    .default({ instances: [] }),
  compositeResources: z.record(z.string().min(1), z.object({
    ID: z.string().min(1),
    composerModuleId: z.string().min(1),
    fields: z.record(z.string(), z.string()),
  })).default({}),
  resourceSelections: z.record(z.string().min(1), z.object({
    libraryId: z.string().min(1),
    entryIds: z.array(z.string().min(1)).min(1),
  })).default({}),
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

export function createEmptyCharacterData(systemPackage: SystemPackage, characterId = createCharacterId()): CharacterData {
  return {
    kind: "pbdh-character-data",
    schemaVersion: characterDataSchemaVersion,
    systemPackage: {
      id: systemPackage.manifest.ID,
      version: systemPackage.manifest.版本,
    },
    character: {
      id: characterId,
      values: seedDefaultModuleValues(systemPackage),
    },
    cards: {
      instances: [],
    },
    compositeResources: {},
    resourceSelections: {},
    playerImages: {},
    updatedAt: new Date().toISOString(),
  };
}

export function createCharacterId(): string {
  return generateId("character-");
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
      case "cardTable":
      case "resourcePicker":
        break;
    }
  }

  return values;
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
  const previousValue = data.character.values[moduleId];
  const previousImageId = isPlayerImageValue(previousValue) ? previousValue.imageId : undefined;
  const playerImages = { ...data.playerImages };
  if (previousImageId) delete playerImages[previousImageId];

  return {
    ...updateCharacterValue(data, moduleId, { kind: "player-image", imageId: image.id }),
    playerImages: {
      ...playerImages,
      [image.id]: image,
    },
  };
}

export function removePlayerImage(data: CharacterData, moduleId: string): CharacterData {
  const value = data.character.values[moduleId];
  if (!isPlayerImageValue(value)) return data;

  const values = { ...data.character.values };
  const playerImages = { ...data.playerImages };
  delete values[moduleId];
  delete playerImages[value.imageId];

  return {
    ...data,
    character: { ...data.character, values },
    playerImages,
    updatedAt: new Date().toISOString(),
  };
}

function isPlayerImageValue(value: unknown): value is PlayerImageValue {
  return typeof value === "object" && value !== null && "kind" in value && (value as PlayerImageValue).kind === "player-image";
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

  return { ok: true, data: migrateCharacterResourceReferences(normalizeCharacterData(parsed.data), currentPackage) };
}

export function updateResourceSelectionSnapshot(
  data: CharacterData,
  moduleId: string,
  libraryId: string,
  entryIds: string[],
): CharacterData {
  if (entryIds.length === 0) return data;
  return {
    ...data,
    resourceSelections: {
      ...(data.resourceSelections ?? {}),
      [moduleId]: { libraryId, entryIds },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeCharacterData(data: z.infer<typeof characterDataSchema>): CharacterData {
  return {
    ...data,
    cards: {
      instances: data.cards.instances.map((instance) => {
        const definitionRef = instance.definitionRef ?? (instance.libraryId && instance.definitionId
          ? { type: "resourceLibrary" as const, libraryId: instance.libraryId, entryId: instance.definitionId }
          : undefined);
        if (!definitionRef) throw new Error(`Card Instance ${instance.instanceId} 缺少 Definition Reference。`);
        const { libraryId: _libraryId, definitionId: _definitionId, ...current } = instance;
        return { ...current, definitionRef };
      }),
    },
  };
}

export function migrateCharacterResourceReferences(data: CharacterData, systemPackage: SystemPackage): CharacterData {
  return {
    ...data,
    cards: {
      instances: data.cards.instances.map((instance) => {
        if (instance.definitionRef.type !== "resourceLibrary") return instance;
        const entry = findResourceLibraryEntry(findResourceLibrary(systemPackage, instance.definitionRef.libraryId), instance.definitionRef.entryId);
        if (!entry || entry.ID === instance.definitionRef.entryId) return instance;
        return { ...instance, definitionRef: { ...instance.definitionRef, entryId: entry.ID } };
      }),
    },
    resourceSelections: Object.fromEntries(Object.entries(data.resourceSelections ?? {}).map(([moduleId, snapshot]) => {
      const library = findResourceLibrary(systemPackage, snapshot.libraryId);
      return [moduleId, {
        ...snapshot,
        entryIds: snapshot.entryIds.map((entryId) => findResourceLibraryEntry(library, entryId)?.ID ?? entryId),
      }];
    })),
  };
}
