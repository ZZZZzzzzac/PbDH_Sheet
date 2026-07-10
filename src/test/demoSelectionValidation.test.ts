import { describe, expect, it } from "vitest";
import { characterDataSchemaVersion, type CharacterData } from "../domain/characterData";
import { normalizeResourceLibraries } from "../domain/resourceLibrary";
import { runValidationChecksInProcess } from "../domain/validationScript";
import classes from "../../public/system-packages/demo-selection/resources/classes.json";
import subclasses from "../../public/system-packages/demo-selection/resources/subclasses.json";
import domainCards from "../../public/system-packages/demo-selection/resources/domain_cards.json";
import validationScript from "../../public/system-packages/demo-selection/checks/class-subclass-domain.js?raw";

const resourceLibraries = normalizeResourceLibraries([
  { ID: "classes", 名称: "职业", 路径: "resources/classes.json", entries: classes },
  { ID: "subclasses", 名称: "子职", 路径: "resources/subclasses.json", entries: subclasses },
  { ID: "domain-cards", 名称: "领域卡", 路径: "resources/domain_cards.json", entries: domainCards },
]);

describe("demo-selection Validation Check", () => {
  it("returns no errors for matching class, subclass, and domain cards", async () => {
    const issues = await runDemoSelectionCheck({
      "class-name": "德鲁伊",
      "class-domains": "贤者+奥术",
      "subclass-name": "元素结社-基础",
      "domain-card-name": "符文护符",
      "domain-card-list": "释放混沌、墙面行走",
    });

    expect(issues.filter((issue) => issue.level === "error")).toEqual([]);
  });

  it("reports subclass and domain-card mismatches", async () => {
    const issues = await runDemoSelectionCheck({
      "class-name": "德鲁伊",
      "class-domains": "贤者+奥术",
      "subclass-name": "勇气呼唤-基础",
      "domain-card-name": "卷土重来",
      "domain-card-list": "符文护符、旋风猛袭",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "SUBCLASS_CLASS_MISMATCH",
          source: "class-subclass-domain",
        }),
        expect.objectContaining({
          level: "error",
          code: "DOMAIN_CARD_CLASS_MISMATCH",
          source: "class-subclass-domain",
          text: expect.stringContaining("卷土重来"),
        }),
        expect.objectContaining({
          level: "error",
          code: "DOMAIN_CARD_CLASS_MISMATCH",
          source: "class-subclass-domain",
          text: expect.stringContaining("旋风猛袭"),
        }),
      ]),
    );
  });

  it("skips related checks when one side is blank or cannot resolve to a Resource Library entry", async () => {
    const issues = await runDemoSelectionCheck({
      "class-name": "",
      "subclass-name": "不存在的子职",
      "domain-card-name": "不存在的领域卡",
      "domain-card-list": "卷土重来",
    });

    expect(issues).toEqual([]);
  });
});

async function runDemoSelectionCheck(values: Record<string, string>) {
  if (!resourceLibraries.ok) {
    throw new Error("demo-selection resource libraries should normalize");
  }

  return runValidationChecksInProcess({
    characterData: createCharacterData(values),
    resourceLibraries: resourceLibraries.resourceLibraries,
    packageMetadata: { id: "demo-selection", version: "0.1.0" },
    checks: [
      {
        ID: "class-subclass-domain",
        脚本: "checks/class-subclass-domain.js",
        scriptContent: validationScript,
      },
    ],
  });
}

function createCharacterData(values: Record<string, string>): CharacterData {
  return {
    kind: "pbdh-character-data",
    schemaVersion: characterDataSchemaVersion,
    systemPackage: {
      id: "demo-selection",
      version: "0.1.0",
    },
    character: {
      id: "current-character",
      values,
    },
    cards: { instances: [] },
    playerImages: {},
    updatedAt: "2026-07-09T00:00:00.000Z",
  };
}
