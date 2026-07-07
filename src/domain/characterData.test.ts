import { describe, expect, it } from "vitest";
import { minimalSystemPackage } from "../test/fixtures";
import { createEmptyCharacterData, exportCharacterData, parseCharacterDataJson, updateCharacterValue } from "./characterData";

describe("Character Data import/export", () => {
  it("exports values plus System Package identity, not the full System Package", () => {
    const data = updateCharacterValue(createEmptyCharacterData(minimalSystemPackage), "character-name", "阿青");
    const exported = JSON.parse(exportCharacterData(data));

    expect(exported.character.values["character-name"]).toBe("阿青");
    expect(exported.systemPackage).toEqual({
      id: "demo-minimal",
      version: "0.1.0",
    });
    expect(exported.pages).toBeUndefined();
    expect(exported.modules).toBeUndefined();
  });

  it("imports a previously exported Character Data JSON", () => {
    const data = updateCharacterValue(createEmptyCharacterData(minimalSystemPackage), "character-name", "阿青");
    const result = parseCharacterDataJson(exportCharacterData(data), minimalSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.character.values["character-name"]).toBe("阿青");
    }
  });

  it("rejects malformed JSON", () => {
    const result = parseCharacterDataJson("{", minimalSystemPackage);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("JSON 格式错误");
    }
  });
});
