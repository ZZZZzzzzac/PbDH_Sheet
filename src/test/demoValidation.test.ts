import { describe, expect, it } from "vitest";
import { characterDataSchemaVersion, type CharacterData } from "../domain/characterData";
import { normalizeResourceLibraries } from "../domain/resourceLibrary";
import { runValidationChecksInProcess } from "../domain/validationScript";
import classes from "../../public/system-packages/demo/resources/classes.json";
import subclasses from "../../public/system-packages/demo/resources/subclasses.json";
import demoCards from "../../public/system-packages/demo/resources/demo_cards.json";
import validationScript from "../../public/system-packages/demo/checks/demo-rules.js?raw";

const resourceLibraries = normalizeResourceLibraries([
  { ID: "classes", 名称: "职业", 路径: "resources/classes.json", entries: classes },
  { ID: "subclasses", 名称: "子职", 路径: "resources/subclasses.json", entries: subclasses },
  { ID: "demo-cards", 名称: "演示卡牌", 路径: "resources/demo_cards.json", entries: demoCards },
]);

describe("demo Validation Check", () => {
  it("keeps the default Character free of Validation issues", async () => {
    expect(await runDemoCheck({})).toEqual([]);
  });

  it.each([
    [{ "validation-a": "2" }, "DEMO_EQUATION_INCOMPLETE", "info"],
    [{ "validation-a": "a", "validation-b": "2", "validation-c": "3" }, "DEMO_EQUATION_NOT_NUMERIC", "warning"],
    [{ "validation-a": "2", "validation-b": "3", "validation-c": "4" }, "DEMO_EQUATION_MISMATCH", "error"],
    [{ "validation-a": "2", "validation-b": "3", "validation-c": "5" }, "DEMO_EQUATION_VALID", "info"],
  ] as const)("reports the A/B/C exercise result", async (values, code, level) => {
    expect(await runDemoCheck(values)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code, level, source: "demo-rules" }),
    ]));
  });

  it("reports a Resource relationship mismatch", async () => {
    const issues = await runDemoCheck({ "class-name": "守灯人", "subclass-name": "苔痕向导" });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DEMO_SUBCLASS_CLASS_MISMATCH", level: "error", source: "demo-rules" }),
    ]));
  });

  it("reports Card state information and volume warnings", async () => {
    const issues = await runDemoCheck({}, {
      instances: Array.from({ length: 6 }, (_, index) => ({ id: `card-${index}`, state: index === 0 ? "已消耗" : "当前" })),
    });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DEMO_CONSUMED_CARDS", level: "info" }),
      expect.objectContaining({ code: "DEMO_MANY_CARDS", level: "warning" }),
    ]));
  });
});

async function runDemoCheck(values: Record<string, string>, cardState: { instances: Array<{ id: string; state: string }> } = { instances: [] }) {
  if (!resourceLibraries.ok) throw new Error("demo resource libraries should normalize");

  return runValidationChecksInProcess({
    characterData: createCharacterData(values),
    resourceLibraries: resourceLibraries.resourceLibraries,
    cardState,
    packageMetadata: { id: "demo", version: "0.1.0" },
    checks: [{ ID: "demo-rules", 脚本: "checks/demo-rules.js", scriptContent: validationScript }],
  });
}

function createCharacterData(values: Record<string, string>): CharacterData {
  return {
    kind: "pbdh-character-data",
    schemaVersion: characterDataSchemaVersion,
    systemPackage: { id: "demo", version: "0.1.0" },
    character: { id: "current-character", values },
    cards: { instances: [] },
    playerImages: {},
    updatedAt: "2026-07-20T00:00:00.000Z",
  };
}
