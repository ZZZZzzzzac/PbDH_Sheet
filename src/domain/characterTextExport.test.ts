import { describe, expect, it } from "vitest";
import type { CharacterData } from "./characterData";
import type { CharacterTextExport } from "./characterTextExport";
import { formatCharacterTextExport } from "./characterTextFormatter";

const baseDefinition: CharacterTextExport = {
  ID: "test",
  名称: "测试文本导出",
  模板: ".st {字段}",
  字段分隔符: "",
  字段: [],
};

function characterData(values: CharacterData["character"]["values"]): CharacterData {
  return {
    kind: "pbdh-character-data",
    schemaVersion: "0.1.0",
    systemPackage: { id: "test", version: "1.0.0" },
    character: { id: "character", values },
    cards: { instances: [] },
    compositeResources: {},
    resourceSelections: {},
    playerImages: {},
    updatedAt: "2026-07-31T00:00:00.000Z",
  };
}

describe("formatCharacterTextExport", () => {
  it("normalizes signed decimal safe integers and formats fields in declaration order", () => {
    const definition: CharacterTextExport = {
      ...baseDefinition,
      模板: "cmd {字段} / {字段}",
      字段分隔符: ",",
      字段: [
        { 模块ID: "first", 取值: "文本", 模板: "A{值}" },
        { 模块ID: "counter", 取值: "当前值", 模板: "B{值}" },
        { 模块ID: "counter", 取值: "最大值", 模板: "C{值}-{未知}" },
      ],
    };

    expect(formatCharacterTextExport(definition, characterData({
      first: " +01 ",
      counter: { current: -2, max: 3 },
    }))).toBe("cmd A1,B-2,C3-{未知} / A1,B-2,C3-{未知}");
  });

  it.each(["", " ", "1.5", "abc", "9007199254740992"])("skips invalid text value %j", (value) => {
    const definition: CharacterTextExport = {
      ...baseDefinition,
      字段: [
        { 模块ID: "invalid", 取值: "文本", 模板: "错误{值}" },
        { 模块ID: "valid", 取值: "文本", 模板: "正确{值}" },
      ],
    };

    expect(formatCharacterTextExport(definition, characterData({ invalid: value, valid: "2" }))).toBe(".st 正确2");
  });

  it("skips null or unsafe countable values without interrupting export", () => {
    const definition: CharacterTextExport = {
      ...baseDefinition,
      字段: [
        { 模块ID: "counter", 取值: "当前值", 模板: "当前{值}" },
        { 模块ID: "counter", 取值: "最大值", 模板: "上限{值}" },
      ],
    };

    expect(formatCharacterTextExport(definition, characterData({
      counter: { current: Number.MAX_SAFE_INTEGER + 1, max: null },
    }))).toBe(".st");
  });
});
