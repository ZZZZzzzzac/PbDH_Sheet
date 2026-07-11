import { describe, expect, it } from "vitest";
import {
  filterResourceLibraryEntries,
  getResourceLibraryFields,
  inferResourceFieldWidth,
  normalizeResourceLibraries,
  queryResourceLibraryEntries,
  searchResourceLibraryEntries,
  sortResourceLibraryEntries,
} from "./resourceLibrary";

describe("Resource Library normalization", () => {
  it("normalizes object-array entries with max field set and missing fields as empty strings", () => {
    const result = normalizeResourceLibraries([
      {
        ID: "domains",
        名称: "领域",
        路径: "resources/domains.json",
        entries: [
          { ID: "blade-1", 名称: "利刃一", 领域: "利刃", 等级: 1 },
          { ID: "bone-1", 名称: "骸骨一", 领域: "骸骨", 描述: "阴影" },
        ],
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resourceLibraries[0].fields.map((field) => field.key)).toEqual(["ID", "名称", "领域", "等级", "描述"]);
      expect(result.resourceLibraries[0].entries[0].fields).toEqual({
        ID: "blade-1",
        名称: "利刃一",
        领域: "利刃",
        等级: "1",
        描述: "",
      });
    }
  });

  it("applies module field templates without changing normalized entry fields", () => {
    const result = normalizeResourceLibraries([
      {
        ID: "weapons",
        名称: "武器",
        路径: "resources/weapons.json",
        entries: [{ ID: "sword", 名称: "剑", 领域: "利刃", 伤害: "d8" }],
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const library = result.resourceLibraries[0];
      expect(library.fields.map((field) => field.key)).toEqual(["ID", "名称", "领域", "伤害"]);
      expect(getResourceLibraryFields(library)).toBe(library.fields);
      expect(
        getResourceLibraryFields(library, [
          { 键: "名称", 标签: "武器名", 默认显示: true, 可筛选: false, 可排序: true, 列宽: "normal" },
          { 键: "领域", 标签: "可用领域", 默认显示: false, 可筛选: true, 可排序: false, 列宽: "compact" },
        ]),
      ).toEqual([
        { key: "名称", label: "武器名", visible: true, filterable: false, sortable: true, searchable: true, width: "normal" },
        { key: "领域", label: "可用领域", visible: false, filterable: true, sortable: false, searchable: false, width: "compact" },
      ]);
      expect(library.entries[0].fields.伤害).toBe("d8");
    }
  });

  it("infers semantic field widths from sampled value lengths only", () => {
    expect(inferResourceFieldWidth(["1", "2"])).toBe("compact");
    expect(inferResourceFieldWidth(["战士", "吟游诗人"])).toBe("normal");
    expect(inferResourceFieldWidth(["短描述"])).toBe("compact");
    expect(inferResourceFieldWidth(["这是一段比较长的资源字段内容，应该给更多表格空间"])).toBe("fill");
    expect(inferResourceFieldWidth(["中等长度字段文本内容"])).toBe("wide");
  });

  it("reports invalid library shapes and missing or duplicate entry IDs", () => {
    const notArray = normalizeResourceLibraries([{ ID: "bad", 名称: "坏库", 路径: "bad.json", entries: {} }]);
    const missingId = normalizeResourceLibraries([{ ID: "bad", 名称: "坏库", 路径: "bad.json", entries: [{ 名称: "无 ID" }] }]);
    const duplicateId = normalizeResourceLibraries([
      { ID: "bad", 名称: "坏库", 路径: "bad.json", entries: [{ ID: "x" }, { ID: "x" }] },
    ]);

    expect(notArray.ok).toBe(false);
    expect(notArray.ok ? [] : notArray.issues).toEqual([expect.objectContaining({ code: "RESOURCE_LIBRARY_NOT_ARRAY" })]);
    expect(missingId.ok).toBe(false);
    expect(missingId.ok ? [] : missingId.issues).toEqual([expect.objectContaining({ code: "RESOURCE_ENTRY_ID_MISSING" })]);
    expect(duplicateId.ok).toBe(false);
    expect(duplicateId.ok ? [] : duplicateId.issues).toEqual([expect.objectContaining({ code: "DUPLICATE_RESOURCE_ENTRY_ID" })]);
  });
});

describe("Resource Library query", () => {
  const entries = [
    { ID: "blade-1", fields: { ID: "blade-1", 名称: "Bravo", 领域: "利刃", 等级: "1" } },
    { ID: "bone-1", fields: { ID: "bone-1", 名称: "Alpha", 领域: "骸骨", 等级: "1" } },
    { ID: "sage-2", fields: { ID: "sage-2", 名称: "Charlie", 领域: "贤者", 等级: "2" } },
  ];

  it("combines same-field filters with OR and different fields with AND", () => {
    expect(
      filterResourceLibraryEntries(entries, {
        领域: ["利刃", "骸骨"],
        等级: ["1"],
      }).map((entry) => entry.ID),
    ).toEqual(["blade-1", "bone-1"]);
  });

  it("sorts entries by string field and direction", () => {
    expect(sortResourceLibraryEntries(entries, { field: "名称", direction: "asc" }).map((entry) => entry.ID)).toEqual([
      "bone-1",
      "blade-1",
      "sage-2",
    ]);
    expect(sortResourceLibraryEntries(entries, { field: "等级", direction: "desc" }).map((entry) => entry.ID)).toEqual([
      "sage-2",
      "blade-1",
      "bone-1",
    ]);
  });

  it("queries with filters and sorting together", () => {
    const library = {
      ID: "domains",
      名称: "领域",
      路径: "resources/domains.json",
      fields: [],
      entries,
    };

    expect(
      queryResourceLibraryEntries(library, {
        filters: { 领域: ["利刃", "骸骨"] },
        sort: { field: "名称", direction: "asc" },
      }).map((entry) => entry.ID),
    ).toEqual(["bone-1", "blade-1"]);
  });

  it("searches case-insensitively with cross-field AND terms", () => {
    expect(searchResourceLibraryEntries(entries, "alpha 骸骨", ["名称", "领域"]).map((entry) => entry.ID)).toEqual(["bone-1"]);
    expect(searchResourceLibraryEntries(entries, "  利刃  ", ["名称", "领域"]).map((entry) => entry.ID)).toEqual(["blade-1"]);
  });
});
