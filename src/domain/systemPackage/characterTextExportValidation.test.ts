import { describe, expect, it } from "vitest";
import { moduleDemoSystemPackage } from "../../test/fixtures";
import { validateSystemPackage } from "./validator";

const validTextExport = {
  ID: "text",
  名称: "导出文本",
  模板: "{未知}{字段}",
  字段分隔符: "",
  字段: [
    { 模块ID: "character-name", 取值: "文本", 模板: "姓名{值}" },
    { 模块ID: "vitality", 取值: "当前值", 模板: "生命{值}" },
    { 模块ID: "vitality", 取值: "最大值", 模板: "生命上限{值}" },
  ],
} as const;

describe("Character Text Export validation", () => {
  it("accepts compatible fields without validating template placeholders", () => {
    const result = validateSystemPackage({ ...moduleDemoSystemPackage, characterTextExports: [validTextExport] });
    expect(result.ok).toBe(true);
  });

  it("rejects missing Module IDs", () => {
    const result = validateSystemPackage({
      ...moduleDemoSystemPackage,
      characterTextExports: [{
        ...validTextExport,
        字段: [{ 模块ID: "missing", 取值: "文本", 模板: "{值}" }],
      }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "CHARACTER_TEXT_EXPORT_MODULE_MISSING" }),
    ]));
  });

  it.each([
    ["character-name", "当前值"],
    ["vitality", "文本"],
  ] as const)("rejects selector %s/%s incompatible with Module type", (moduleId, selector) => {
    const result = validateSystemPackage({
      ...moduleDemoSystemPackage,
      characterTextExports: [{
        ...validTextExport,
        字段: [{ 模块ID: moduleId, 取值: selector, 模板: "{值}" }],
      }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "CHARACTER_TEXT_EXPORT_VALUE_INCOMPATIBLE" }),
    ]));
  });

  it("rejects duplicate export IDs", () => {
    const result = validateSystemPackage({
      ...moduleDemoSystemPackage,
      characterTextExports: [validTextExport, validTextExport],
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DUPLICATE_CHARACTER_TEXT_EXPORT_ID" }),
    ]));
  });
});
