import { describe, expect, it } from "vitest";
import { resolveCardPresentation } from "./cardPresentation";

const entry = {
  ID: "card-1",
  fields: { ID: "card-1", 名称: "原名", 原名: "Original", 旧ID: "card-old", 描述: "原描述", 特性名: "飞行", 特性描述: "可以飞行", 类型: "种族", 隐藏: "内部" },
};

describe("Card Presentation", () => {
  it("uses 名称, 描述, and remaining fields by default", () => {
    expect(resolveCardPresentation(entry)).toMatchObject({
      name: "原名",
      description: "原描述",
      tags: ["飞行", "可以飞行", "种族", "内部"],
    });
  });

  it("formats name and description templates and excludes consumed fields from inferred tags", () => {
    expect(resolveCardPresentation(entry, {
      名称模板: "{{名称}} · {{类型}}",
      描述模板: "**{{特性名}}**：{{特性描述}}",
    })).toMatchObject({
      name: "原名 · 种族",
      description: "**飞行**：可以飞行",
      tags: ["原描述", "内部"],
    });
  });

  it("orders, limits, or suppresses explicit tag fields", () => {
    expect(resolveCardPresentation(entry, { 标签字段: ["类型", "名称"] }).tags).toEqual(["种族", "原名"]);
    expect(resolveCardPresentation(entry, { 标签字段: [] }).tags).toEqual([]);
  });
});
