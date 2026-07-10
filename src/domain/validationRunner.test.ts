import { describe, expect, it } from "vitest";
import { createEmptyCharacterData, updateCharacterValue } from "./characterData";
import { runValidationChecksInProcess } from "./validationScript";
import { minimalSystemPackage } from "../test/fixtures";

describe("Validation Runner", () => {
  it("runs multiple checks and normalizes issues with source IDs", async () => {
    const characterData = updateCharacterValue(createEmptyCharacterData(minimalSystemPackage), "character-name", "阿青");

    const issues = await runValidationChecksInProcess({
      characterData,
      resourceLibraries: [],
      packageMetadata: { id: "demo", version: "0.1.0" },
      checks: [
        {
          ID: "name-check",
          脚本: "checks/name.js",
          scriptContent: `module.exports = (input) => input.characterData.character.values["character-name"] === "阿青"
            ? [{ level: "info", text: "姓名已填写", path: "character.values.character-name", code: "NAME_OK" }]
            : [];`,
        },
        {
          ID: "empty-check",
          脚本: "checks/empty.js",
          scriptContent: "exports.run = () => [];",
        },
      ],
    });

    expect(issues).toEqual([
      {
        level: "info",
        text: "姓名已填写",
        path: "character.values.character-name",
        code: "NAME_OK",
        source: "name-check",
      },
    ]);
  });

  it("turns script exceptions into error issues", async () => {
    const issues = await runValidationChecksInProcess({
      characterData: createEmptyCharacterData(minimalSystemPackage),
      resourceLibraries: [],
      packageMetadata: { id: "demo", version: "0.1.0" },
      checks: [
        {
          ID: "broken-check",
          脚本: "checks/broken.js",
          scriptContent: "module.exports = () => { throw new Error('boom'); };",
        },
      ],
    });

    expect(issues).toEqual([
      expect.objectContaining({
        level: "error",
        code: "VALIDATION_SCRIPT_ERROR",
        text: "Validation Script 执行失败：boom",
        source: "broken-check",
      }),
    ]);
  });

  it("reports invalid script output as an error issue", async () => {
    const issues = await runValidationChecksInProcess({
      characterData: createEmptyCharacterData(minimalSystemPackage),
      resourceLibraries: [],
      packageMetadata: { id: "demo", version: "0.1.0" },
      checks: [
        {
          ID: "invalid-check",
          脚本: "checks/invalid.js",
          scriptContent: "module.exports = () => ({ ok: true });",
        },
      ],
    });

    expect(issues).toEqual([
      expect.objectContaining({
        level: "error",
        code: "VALIDATION_SCRIPT_OUTPUT_INVALID",
        source: "invalid-check",
      }),
    ]);
  });

  it("does not let scripts mutate original Character Data", async () => {
    const characterData = updateCharacterValue(createEmptyCharacterData(minimalSystemPackage), "character-name", "阿青");

    const issues = await runValidationChecksInProcess({
      characterData,
      resourceLibraries: [],
      packageMetadata: { id: "demo", version: "0.1.0" },
      checks: [
        {
          ID: "mutation-check",
          脚本: "checks/mutation.js",
          scriptContent: `module.exports = (input) => {
            input.characterData.character.values["character-name"] = "被改掉";
            return [];
          };`,
        },
      ],
    });

    expect(characterData.character.values["character-name"]).toBe("阿青");
    expect(issues).toEqual([
      expect.objectContaining({
        level: "error",
        code: "VALIDATION_SCRIPT_ERROR",
        source: "mutation-check",
      }),
    ]);
  });
});
