import { Blob as NodeBlob } from "node:buffer";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { PbDHDatabase, type StoredPlayerImageBlob } from "./storageService";
import { loadResourceExtensionJson } from "../domain/resourceExtension";

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

describe("Resource Extension repository", () => {
  it("stores, replaces, lists, and removes Extensions without changing System Package records", async () => {
    const databaseName = `pbdh-sheet-extension-${crypto.randomUUID()}`;
    databases.add(databaseName);
    const database = new PbDHDatabase(databaseName);
    const first = loadResourceExtensionJson(JSON.stringify({
      ID: "void", 名称: "虚空", 版本: "1", 目标系统包ID: "core",
      resourceLibraries: [{ ID: "classes", 名称: "职业", entries: [{ ID: "void-class", 名称: "刺客" }] }],
    }), "core");
    if (!first.ok) throw new Error(JSON.stringify(first.issues));
    const replacement = { ...first.extension, 版本: "2" };

    await database.systemPackages.put({ id: "current-system-package", packageId: "core", data: { marker: "unchanged" } } as never);
    await database.resourceExtensions.put({ id: "core::void", extensionId: "void", targetSystemPackageId: "core", data: first.extension });
    await database.resourceExtensions.put({ id: "core::void", extensionId: "void", targetSystemPackageId: "core", data: replacement, assets: [{ 路径: "assets/card.png", 类型: "image/png", bytes: new Uint8Array([1]), sourceType: "resourceExtension", sourceId: "void" }] });

    const extensions = await database.resourceExtensions.where("targetSystemPackageId").equals("core").toArray();
    expect(extensions).toHaveLength(1);
    expect(extensions[0].data.版本).toBe("2");
    expect(extensions[0].assets?.[0]).toMatchObject({ 路径: "assets/card.png", sourceId: "void" });
    expect(await database.systemPackages.get("current-system-package")).toMatchObject({ data: { marker: "unchanged" } });

    await database.resourceExtensions.delete("core::void");
    expect(await database.resourceExtensions.count()).toBe(0);
    database.close();
  });
});
