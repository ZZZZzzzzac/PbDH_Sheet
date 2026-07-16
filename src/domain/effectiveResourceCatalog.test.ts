import { describe, expect, it } from "vitest";
import { minimalSystemPackage } from "../test/fixtures";
import { createEffectiveResourceCatalog } from "./effectiveResourceCatalog";
import { loadResourceExtensionJson, type ResourceExtension } from "./resourceExtension";
import type { SystemPackage } from "./systemPackage";

const packageWithClasses: SystemPackage = {
  ...minimalSystemPackage,
  resourceLibraries: [{
    ID: "classes", 名称: "核心职业", 路径: "resources/classes.json",
    fields: [
      { key: "ID", label: "ID", visible: false, filterable: false, sortable: false, searchable: false },
      { key: "名称", label: "名称", visible: true, filterable: true, sortable: true, searchable: true },
    ],
    entries: [{ ID: "class:guardian", fields: { ID: "class:guardian", 名称: "守护者" } }],
  }],
};

function extension(document: object): ResourceExtension {
  const result = loadResourceExtensionJson(JSON.stringify(document), packageWithClasses.manifest.ID);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.extension;
}

describe("Effective Resource Catalog", () => {
  it("atomically merges multiple contributions and records Entry provenance", () => {
    const candidate = extension({
      ID: "void", 名称: "虚空", 版本: "1", 目标系统包ID: packageWithClasses.manifest.ID,
      resourceLibraries: [
        { ID: "classes", 名称: "不能改名", entries: [{ ID: "class:void", 名称: "刺客", 领域: "午夜" }] },
        { ID: "void-transformations", 名称: "虚空转变", entries: [{ ID: "transformation:void", 名称: "虚空化" }] },
      ],
    });
    const catalog = createEffectiveResourceCatalog(packageWithClasses, [candidate]);

    expect(catalog.resourceLibraries.map((library) => [library.ID, library.名称, library.entries.length])).toEqual([
      ["classes", "核心职业", 2],
      ["void-transformations", "虚空转变", 1],
    ]);
    expect(catalog.libraries[0].entryProvenance["class:guardian"].type).toBe("systemPackage");
    expect(catalog.libraries[0].entryProvenance["class:void"]).toMatchObject({ type: "resourceExtension", id: "void" });
    expect(catalog.resourceLibraries[0].fields.map((field) => field.key)).toContain("领域");
  });

  it("disables the whole conflicting Extension and collects all conflicts", () => {
    const candidate = extension({
      ID: "conflict", 名称: "冲突", 版本: "1", 目标系统包ID: packageWithClasses.manifest.ID,
      resourceLibraries: [
        { ID: "classes", 名称: "职业", entries: [{ ID: "class:guardian", 名称: "冲突职业" }] },
        { ID: "new-library", 名称: "新库", entries: [{ ID: "new-entry", 名称: "不应提交" }] },
      ],
    });
    const catalog = createEffectiveResourceCatalog(packageWithClasses, [candidate]);

    expect(catalog.extensions[0].status).toBe("disabled");
    expect(catalog.extensions[0].issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "RESOURCE_ENTRY_ID_CONFLICT" })]));
    expect(catalog.resourceLibraries).toHaveLength(1);
    expect(catalog.resourceLibraries[0].entries).toHaveLength(1);
  });

  it("allows the same Entry ID in different Libraries", () => {
    const candidate = extension({
      ID: "same-entry", 名称: "跨库同 ID", 版本: "1", 目标系统包ID: packageWithClasses.manifest.ID,
      resourceLibraries: [{ ID: "items", 名称: "物品", entries: [{ ID: "class:guardian", 名称: "同名 ID 物品" }] }],
    });
    const catalog = createEffectiveResourceCatalog(packageWithClasses, [candidate]);
    expect(catalog.extensions[0].status).toBe("active");
    expect(catalog.resourceLibraries).toHaveLength(2);
  });

  it("falls back to a standalone Library when a package update removes the target, but disables on a real conflict", () => {
    const candidate = extension({
      ID: "survivor", 名称: "持续扩展", 版本: "1", 目标系统包ID: packageWithClasses.manifest.ID,
      resourceLibraries: [{ ID: "classes", 名称: "扩展职业", entries: [{ ID: "extension-class", 名称: "扩展职业" }] }],
    });
    const packageWithoutClasses = { ...packageWithClasses, manifest: { ...packageWithClasses.manifest, 版本: "2" }, resourceLibraries: [] };
    const standalone = createEffectiveResourceCatalog(packageWithoutClasses, [candidate]);
    expect(standalone.extensions[0].status).toBe("active");
    expect(standalone.resourceLibraries[0]).toMatchObject({ ID: "classes", 名称: "扩展职业" });

    const conflictingPackage = {
      ...packageWithClasses,
      manifest: { ...packageWithClasses.manifest, 版本: "3" },
      resourceLibraries: packageWithClasses.resourceLibraries?.map((library) => ({ ...library, entries: [{ ID: "extension-class", fields: { ID: "extension-class", 名称: "包内冲突" } }] })),
    };
    const conflict = createEffectiveResourceCatalog(conflictingPackage, [candidate]);
    expect(conflict.extensions[0].status).toBe("disabled");
    expect(conflict.resourceLibraries[0].entries).toHaveLength(1);
  });
});
