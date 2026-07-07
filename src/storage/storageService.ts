import Dexie, { type Table } from "dexie";
import type { CharacterData } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";

interface CharacterDataRecord {
  id: string;
  packageId: string;
  data: CharacterData;
}

interface SystemPackageRecord {
  id: string;
  packageId: string;
  data: SystemPackage;
}

export interface StorageService {
  loadCurrentSystemPackage(): Promise<SystemPackage | null>;
  saveCurrentSystemPackage(systemPackage: SystemPackage): Promise<void>;
  loadCurrentCharacterData(packageId: string): Promise<CharacterData | null>;
  saveCurrentCharacterData(data: CharacterData): Promise<void>;
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

export const storageService: StorageService = {
  async loadCurrentSystemPackage(): Promise<SystemPackage | null> {
    const record = await db.systemPackages.get(currentSystemPackageRecordId);
    return record?.data ?? null;
  },

  async saveCurrentSystemPackage(systemPackage: SystemPackage): Promise<void> {
    await db.systemPackages.put({
      id: currentSystemPackageRecordId,
      packageId: systemPackage.manifest.ID,
      data: systemPackage,
    });
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
};
