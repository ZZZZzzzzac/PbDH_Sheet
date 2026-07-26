import { describe, expect, it } from "vitest";
import type { SystemPackage } from "./systemPackage";
import { resolveQuestionnaireResult } from "./questionnaire";

const systemPackage = {
  manifest: { ID: "test", 名称: "Test", 版本: "1", schemaVersion: "0.2.0" },
  pages: [{ ID: "main", 名称: "Main", layout: { 类型: "htmlTemplate", htmlContent: '<pb-module id="pick-class"></pb-module>' } }],
  modules: [{ ID: "pick-class", 类型: "resourcePicker", 按钮文本: "选择职业", 资源库: [{ ID: "classes" }] }],
  resourceLibraries: [{
    ID: "classes",
    名称: "职业",
    路径: "resources/classes.json",
    fields: [{ key: "名称", label: "名称", visible: true, filterable: false, sortable: false, searchable: true }],
    entries: [
      { ID: "class:druid", fields: { 名称: "德鲁伊" } },
      { ID: "class:bard", fields: { 名称: "吟游诗人" } },
    ],
  }],
} as SystemPackage;

function result(entryIds = ["class:druid"], overrides: Record<string, unknown> = {}) {
  return {
    protocolVersion: "1",
    interactions: [{
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      entryIds,
      ...overrides,
    }],
  };
}

describe("resolveQuestionnaireResult", () => {
  it("resolves canonical entries for an existing linked Resource Picker", () => {
    const resolved = resolveQuestionnaireResult(result(), systemPackage);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.selections[0].entries).toEqual([systemPackage.resourceLibraries![0].entries[0]]);
  });

  it.each([
    ["missing picker", result(undefined, { sourceModuleId: "missing" }), "Resource Picker 不存在"],
    ["unlinked library", result(undefined, { libraryId: "other" }), "未链接 Resource Library"],
    ["missing entry", result(["class:missing"]), "Resource Entry 不存在"],
    ["duplicate entry", result(["class:druid", "class:druid"]), "不能重复"],
    ["single picker cardinality", result(["class:druid", "class:bard"]), "只允许单选"],
    ["unsupported event", result(undefined, { type: "freeTextChanged" }), "问卷结果格式无效"],
  ])("rejects %s", (_name, input, message) => {
    const resolved = resolveQuestionnaireResult(input, systemPackage);
    expect(resolved).toEqual(expect.objectContaining({ ok: false, error: expect.stringContaining(message) }));
  });

  it("rejects a serialized result larger than 64 KiB", () => {
    const resolved = resolveQuestionnaireResult(result([`class:${"x".repeat(70_000)}`]), systemPackage);
    expect(resolved).toEqual({ ok: false, error: "问卷结果超过 64 KiB 限制。" });
  });
});
