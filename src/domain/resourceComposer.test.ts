import { describe, expect, it } from "vitest";
import { composeResource } from "./resourceComposer";

const module = {
  ID: "compose-ancestry",
  类型: "resourceComposer",
  按钮文本: "组合种族",
  来源槽位: [
    { ID: "a", 标签: "A", 资源库ID: "ancestries" },
    { ID: "b", 标签: "B", 资源库ID: "ancestries" },
  ],
  输出字段: [
    { 字段: "特性A", 来源槽位ID: "a", 来源字段: "特性A" },
    { 字段: "特性B", 来源槽位ID: "b", 来源字段: "特性B" },
  ],
  选择关系输出: { 字段: "卡牌显示方式", 全部相同时: "image", 不全相同时: "text" },
} as const;

const elf = { ID: "elf", fields: { ID: "elf", 特性A: "敏锐", 特性B: "冥想" } };
const human = { ID: "human", fields: { ID: "human", 特性A: "活力", 特性B: "应变" } };

describe("Resource Composer", () => {
  it("routes fields from fixed single selections", () => {
    expect(composeResource(module, { a: elf, b: human })).toEqual({
      ID: "composite:compose-ancestry",
      composerModuleId: "compose-ancestry",
      fields: { ID: "composite:compose-ancestry", 特性A: "敏锐", 特性B: "应变", 卡牌显示方式: "text" },
    });
  });

  it("allows the same entry in multiple slots", () => {
    expect(composeResource(module, { a: elf, b: elf })?.fields).toMatchObject({ 特性A: "敏锐", 特性B: "冥想", 卡牌显示方式: "image" });
  });

  it("can inherit a same-entry presentation value while keeping the configured fallback", () => {
    const presentationModule = {
      ...module,
      选择关系输出: { ...module.选择关系输出, 全部相同时来源字段: "卡牌显示方式" },
    } as const;
    const splitElf = { ...elf, fields: { ...elf.fields, 卡牌显示方式: "split" } };

    expect(composeResource(presentationModule, { a: splitElf, b: splitElf })?.fields.卡牌显示方式).toBe("split");
    expect(composeResource(presentationModule, { a: elf, b: elf })?.fields.卡牌显示方式).toBe("image");
    expect(composeResource(presentationModule, { a: splitElf, b: human })?.fields.卡牌显示方式).toBe("text");
  });

  it("does not produce partial output", () => {
    expect(composeResource(module, { a: elf })).toBeNull();
  });
});
