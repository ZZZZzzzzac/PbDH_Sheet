import { describe, expect, it } from "vitest";
import { loadResourceExtensionJson } from "./resourceExtension";

describe("Resource Extension JSON loader", () => {
  it("loads multiple contributions and preserves explicit IDs", () => {
    const result = loadResourceExtensionJson(JSON.stringify({
      ID: "void",
      名称: "虚空扩展",
      版本: "1.0.0",
      目标系统包ID: "daggerheart-core",
      resourceLibraries: [
        { ID: "classes", 名称: "职业", entries: [{ ID: "class:void", 名称: "刺客" }] },
        { ID: "void-transformations", 名称: "转变", entries: [{ ID: "transformation:void", 名称: "虚空化" }] },
      ],
    }), "daggerheart-core");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.generatedIds).toEqual([]);
    expect(result.extension.resourceLibraries.map((library) => library.ID)).toEqual(["classes", "void-transformations"]);
    expect(result.extension.resourceLibraries[0].library.entries[0].fields.名称).toBe("刺客");
  });

  it("round-trips namespaced root metadata without exposing it as a resource field", () => {
    const metadata = {
      "cn.pbdh.cards.workspace": {
        schemaVersion: "1.0.0",
        packageKind: "card",
        entries: [{ libraryId: "cards", entryId: "card-1", order: 0 }],
      },
    };
    const result = loadResourceExtensionJson(JSON.stringify({
      ID: "cards",
      名称: "卡牌",
      版本: "1.0.0",
      目标系统包ID: "core",
      resourceLibraries: [{ ID: "cards", 名称: "卡牌", entries: [{ ID: "card-1", 名称: "示例" }] }],
      metadata,
    }), "core");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extension.metadata).toEqual(metadata);
    expect(result.extension.resourceLibraries[0].library.fields.map((field) => field.key)).toEqual(["ID", "名称"]);
    expect(JSON.parse(result.normalizedJson).metadata).toEqual(metadata);
  });

  it("rejects metadata keys that are not reverse-domain namespaces", () => {
    const result = loadResourceExtensionJson(JSON.stringify({
      名称: "卡牌",
      版本: "1.0.0",
      目标系统包ID: "core",
      resourceLibraries: [{ ID: "cards", 名称: "卡牌", entries: [] }],
      metadata: { workspace: {} },
    }), "core");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toContainEqual(expect.objectContaining({
      code: "RESOURCE_EXTENSION_SHAPE_INVALID",
      path: "metadata.workspace",
    }));
  });

  it("generates all missing IDs, retries collisions, and round-trips normalized JSON", () => {
    const ids = ["taken-extension", "extension-ok", "taken-library", "library-ok", "taken-entry", "entry-ok"];
    const generateId = () => ids.shift() ?? "unexpected";
    const result = loadResourceExtensionJson(JSON.stringify({
      名称: "无 ID 扩展",
      版本: "1",
      目标系统包ID: "core",
      resourceLibraries: [{ 名称: "新库", entries: [{ 名称: "新条目" }] }],
    }), "core", {
      extensionIds: ["taken-extension"],
      libraryIds: ["taken-library"],
      entryIdsByLibrary: new Map([["library-ok", new Set(["taken-entry"])]]),
      generateId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.generatedIds.map((item) => item.value)).toEqual(["extension-ok", "library-ok", "entry-ok"]);
    const roundTrip = loadResourceExtensionJson(result.normalizedJson, "core");
    expect(roundTrip.ok).toBe(true);
    if (roundTrip.ok) expect(roundTrip.generatedIds).toEqual([]);
  });

  it("rejects wrong targets and reports every duplicate candidate Entry ID", () => {
    const wrongTarget = loadResourceExtensionJson(JSON.stringify({
      ID: "wrong", 名称: "错误", 版本: "1", 目标系统包ID: "other",
      resourceLibraries: [{ ID: "classes", 名称: "职业", entries: [] }],
    }), "core");
    expect(wrongTarget.ok).toBe(false);
    if (!wrongTarget.ok) expect(wrongTarget.issues[0].code).toBe("RESOURCE_EXTENSION_TARGET_MISMATCH");

    const duplicates = loadResourceExtensionJson(JSON.stringify({
      ID: "duplicates", 名称: "重复", 版本: "1", 目标系统包ID: "core",
      resourceLibraries: [{ ID: "classes", 名称: "职业", entries: [
        { ID: "same", 名称: "A" }, { ID: "same", 名称: "B" }, { ID: "same", 名称: "C" },
      ] }],
    }), "core");
    expect(duplicates.ok).toBe(false);
    if (!duplicates.ok) expect(duplicates.issues.filter((issue) => issue.code === "DUPLICATE_RESOURCE_ENTRY_ID")).toHaveLength(2);
  });
});
