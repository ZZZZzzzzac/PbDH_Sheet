import Dexie, { type Table } from "dexie";
import type { CharacterData } from "../domain/characterData";

interface CharacterDataRecord {
  id: string;
  packageId: string;
  data: CharacterData;
}

export interface StorageService {
  loadCurrentCharacterData(packageId: string): Promise<CharacterData | null>;
  saveCurrentCharacterData(data: CharacterData): Promise<void>;
}

class PbDHDatabase extends Dexie {
  characterSaves!: Table<CharacterDataRecord, string>;

  constructor() {
    super("pbdh-sheet");
    this.version(1).stores({
      characterSaves: "id, packageId",
    });
  }
}

const db = new PbDHDatabase();
const currentCharacterRecordId = "current-character";

export const storageService: StorageService = {
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
