import Dexie, { type Table } from "dexie";
import type { CharacterData } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";
import type { RuntimePackageAsset } from "../loaders/assetResolver";

interface CharacterDataRecord {
  id: string;
  packageId: string;
  name?: string;
  updatedAt?: string;
  data: CharacterData;
}

interface SystemPackageRecord {
  id: string;
  packageId: string;
  data?: SystemPackage;
  packageAssets?: RuntimePackageAsset[];
  playerImage?: StoredPlayerImageBlob;
}

export interface StoredPlayerImageBlob {
  id: string;
  name?: string;
  mimeType: string;
  blob: Blob;
}

export interface CharacterSaveSummary {
  id: string;
  packageId: string;
  name: string;
  updatedAt: string;
}

export interface CharacterSaveRecord extends CharacterSaveSummary {
  data: CharacterData;
}

export interface StorageService {
  loadCurrentSystemPackage(): Promise<SystemPackage | null>;
  saveCurrentSystemPackage(systemPackage: SystemPackage, packageAssets?: RuntimePackageAsset[]): Promise<void>;
  clearCurrentSystemPackage(): Promise<void>;
  loadCurrentPackageAssets(packageId: string): Promise<RuntimePackageAsset[]>;
  loadCurrentCharacterData(packageId: string): Promise<CharacterData | null>;
  saveCurrentCharacterData(data: CharacterData): Promise<void>;
  listCharacterSaves(packageId: string): Promise<CharacterSaveSummary[]>;
  loadCharacterSave(packageId: string, saveId: string): Promise<CharacterData | null>;
  saveCharacterSave(record: CharacterSaveRecord): Promise<void>;
  renameCharacterSave(packageId: string, saveId: string, name: string): Promise<void>;
  deleteCharacterSave(packageId: string, saveId: string): Promise<void>;
  loadActiveCharacterSaveId(packageId: string): Promise<string | null>;
  setActiveCharacterSaveId(packageId: string, saveId: string): Promise<void>;
  savePlayerImageBlob(image: StoredPlayerImageBlob): Promise<void>;
  loadPlayerImageBlob(imageId: string): Promise<StoredPlayerImageBlob | null>;
}

class PbDHDatabase extends Dexie {
  characterSaves!: Table<CharacterDataRecord, string>;
  systemPackages!: Table<SystemPackageRecord, string>;

  constructor() {
    super("pbdh-sheet");
    this.version(1).stores({
      characterSaves: "id, packageId",
    });
    this.version(2).stores({
      characterSaves: "id, packageId",
      systemPackages: "id, packageId",
    });
  }
}

const db = new PbDHDatabase();
const currentCharacterRecordId = "current-character";
const currentSystemPackageRecordId = "current-system-package";
const playerImageRecordPrefix = "player-image:";
const currentCharacterPointerPrefix = "pbdh-current-character:";

export const storageService: StorageService = {
  async loadCurrentSystemPackage(): Promise<SystemPackage | null> {
    const record = await db.systemPackages.get(currentSystemPackageRecordId);
    return record?.data ?? null;
  },

  async saveCurrentSystemPackage(systemPackage: SystemPackage, packageAssets: RuntimePackageAsset[] = []): Promise<void> {
    await db.systemPackages.put({
      id: currentSystemPackageRecordId,
      packageId: systemPackage.manifest.ID,
      data: systemPackage,
      packageAssets,
    });
  },

  async clearCurrentSystemPackage(): Promise<void> {
    await db.systemPackages.delete(currentSystemPackageRecordId);
  },

  async loadCurrentPackageAssets(packageId: string): Promise<RuntimePackageAsset[]> {
    const record = await db.systemPackages.get(currentSystemPackageRecordId);
    if (!record || record.packageId !== packageId) {
      return [];
    }
    return record.packageAssets ?? [];
  },

  async loadCurrentCharacterData(packageId: string): Promise<CharacterData | null> {
    const activeId = await this.loadActiveCharacterSaveId(packageId);
    const record = activeId
      ? await db.characterSaves.get(activeId)
      : (await db.characterSaves.where("packageId").equals(packageId).first()) ?? (await db.characterSaves.get(currentCharacterRecordId));
    if (!record || record.packageId !== packageId) {
      return null;
    }
    return record.data;
  },

  async saveCurrentCharacterData(data: CharacterData): Promise<void> {
    const activeId = (await this.loadActiveCharacterSaveId(data.systemPackage.id)) ?? data.character.id;
    const existing = await db.characterSaves.get(activeId);
    await this.saveCharacterSave({
      id: activeId,
      packageId: data.systemPackage.id,
      name: existing?.name ?? defaultSaveName(data),
      updatedAt: data.updatedAt,
      data: { ...data, character: { ...data.character, id: activeId } },
    });
    await this.setActiveCharacterSaveId(data.systemPackage.id, activeId);
  },

  async listCharacterSaves(packageId: string): Promise<CharacterSaveSummary[]> {
    const records = await db.characterSaves.where("packageId").equals(packageId).toArray();
    return records
      .map((record) => ({
        id: record.id,
        packageId: record.packageId,
        name: record.name ?? defaultSaveName(record.data),
        updatedAt: record.updatedAt ?? record.data.updatedAt,
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  },

  async loadCharacterSave(packageId: string, saveId: string): Promise<CharacterData | null> {
    const record = await db.characterSaves.get(saveId);
    if (!record || record.packageId !== packageId) {
      return null;
    }
    return record.data;
  },

  async saveCharacterSave(record: CharacterSaveRecord): Promise<void> {
    await db.characterSaves.put({
      id: record.id,
      packageId: record.packageId,
      name: record.name,
      updatedAt: record.updatedAt,
      data: {
        ...record.data,
        character: {
          ...record.data.character,
          id: record.id,
        },
      },
    });
  },

  async renameCharacterSave(packageId: string, saveId: string, name: string): Promise<void> {
    const record = await db.characterSaves.get(saveId);
    if (!record || record.packageId !== packageId) {
      return;
    }
    await db.characterSaves.put({
      ...record,
      name,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteCharacterSave(packageId: string, saveId: string): Promise<void> {
    const record = await db.characterSaves.get(saveId);
    if (!record || record.packageId !== packageId) {
      return;
    }
    await db.characterSaves.delete(saveId);
  },

  async loadActiveCharacterSaveId(packageId: string): Promise<string | null> {
    if (typeof localStorage === "undefined") {
      return null;
    }
    return localStorage.getItem(`${currentCharacterPointerPrefix}${packageId}`);
  },

  async setActiveCharacterSaveId(packageId: string, saveId: string): Promise<void> {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(`${currentCharacterPointerPrefix}${packageId}`, saveId);
  },

  async savePlayerImageBlob(image: StoredPlayerImageBlob): Promise<void> {
    await db.systemPackages.put({
      id: `${playerImageRecordPrefix}${image.id}`,
      packageId: playerImageRecordPrefix,
      playerImage: image,
    });
  },

  async loadPlayerImageBlob(imageId: string): Promise<StoredPlayerImageBlob | null> {
    const record = await db.systemPackages.get(`${playerImageRecordPrefix}${imageId}`);
    return record?.playerImage ?? null;
  },
};

function defaultSaveName(data: CharacterData): string {
  const nameValue = data.character.values["character-name"];
  if (typeof nameValue === "string" && nameValue.trim()) {
    return nameValue.trim();
  }
  return "未命名角色";
}
