import Dexie, { type Table } from "dexie";
import type { CharacterData } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";
import type { RuntimePackageAsset } from "../loaders/assetResolver";

interface CharacterDataRecord {
  id: string;
  packageId: string;
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

export interface StorageService {
  loadCurrentSystemPackage(): Promise<SystemPackage | null>;
  saveCurrentSystemPackage(systemPackage: SystemPackage, packageAssets?: RuntimePackageAsset[]): Promise<void>;
  loadCurrentPackageAssets(packageId: string): Promise<RuntimePackageAsset[]>;
  loadCurrentCharacterData(packageId: string): Promise<CharacterData | null>;
  saveCurrentCharacterData(data: CharacterData): Promise<void>;
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

  async loadCurrentPackageAssets(packageId: string): Promise<RuntimePackageAsset[]> {
    const record = await db.systemPackages.get(currentSystemPackageRecordId);
    if (!record || record.packageId !== packageId) {
      return [];
    }
    return record.packageAssets ?? [];
  },

  async loadCurrentCharacterData(packageId: string): Promise<CharacterData | null> {
    const record = await db.characterSaves.get(currentCharacterRecordId);
    if (!record || record.packageId !== packageId) {
      return null;
    }
    return record.data;
  },

  async saveCurrentCharacterData(data: CharacterData): Promise<void> {
    await db.characterSaves.put({
      id: currentCharacterRecordId,
      packageId: data.systemPackage.id,
      data,
    });
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
