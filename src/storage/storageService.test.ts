import { Blob as NodeBlob } from "node:buffer";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { PbDHDatabase, type StoredPlayerImageBlob } from "./storageService";

const databases = new Set<string>();

afterEach(async () => {
  await Promise.all([...databases].map((name) => Dexie.delete(name)));
  databases.clear();
});

describe("PbDHDatabase migrations", () => {
  it("moves legacy player image blobs out of systemPackages when upgrading from v2 to v3", async () => {
    const databaseName = `pbdh-sheet-migration-${crypto.randomUUID()}`;
    databases.add(databaseName);

    const image: StoredPlayerImageBlob = {
      id: "portrait-1",
      name: "portrait.png",
      mimeType: "image/png",
      blob: new NodeBlob(["portrait bytes"], { type: "image/png" }),
    };
    const legacyDatabase = new Dexie(databaseName);
    legacyDatabase.version(1).stores({
      characterSaves: "id, packageId",
    });
    legacyDatabase.version(2).stores({
      characterSaves: "id, packageId",
      systemPackages: "id, packageId",
    });
    await legacyDatabase.open();
    await legacyDatabase.table("systemPackages").bulkPut([
      {
        id: `player-image:${image.id}`,
        packageId: "player-image:",
        playerImage: image,
      },
      {
        id: "current-system-package",
        packageId: "test-package",
      },
    ]);
    legacyDatabase.close();

    const upgradedDatabase = new PbDHDatabase(databaseName);
    await upgradedDatabase.open();

    const migratedImage = await upgradedDatabase.playerImages.get(image.id);
    const legacyImageRecord = await upgradedDatabase.systemPackages.get(`player-image:${image.id}`);
    const currentSystemPackage = await upgradedDatabase.systemPackages.get("current-system-package");
    upgradedDatabase.close();

    expect(migratedImage).toMatchObject({
      id: image.id,
      name: image.name,
      mimeType: image.mimeType,
    });
    expect(migratedImage?.blob).toBeInstanceOf(NodeBlob);
    expect(migratedImage?.blob).toMatchObject({
      size: image.blob.size,
      type: image.blob.type,
    });
    expect(legacyImageRecord).toBeUndefined();
    expect(currentSystemPackage).toMatchObject({
      id: "current-system-package",
      packageId: "test-package",
    });
  });
});
