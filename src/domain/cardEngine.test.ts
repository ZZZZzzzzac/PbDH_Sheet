import { describe, expect, it } from "vitest";
import { minimalSystemPackage } from "../test/fixtures";
import { createEmptyCharacterData } from "./characterData";
import { createCardInstance, deleteCardInstance, tidyCardTable, updateCardInstancePosition, updateCardInstanceState } from "./cardEngine";

describe("cardEngine", () => {
  it("creates separate Card Instances from the same Card Definition", () => {
    const data = createEmptyCharacterData(minimalSystemPackage);
    const withFirst = createCardInstance(data, {
      instanceId: "instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:符文护符",
    });
    const withSecond = createCardInstance(withFirst, {
      instanceId: "instance-2",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:符文护符",
    });

    expect(withSecond.cards.instances).toEqual([
      expect.objectContaining({ instanceId: "instance-1", definitionId: "domain-card:符文护符", xPct: 4, yPct: 6, zIndex: 1 }),
      expect.objectContaining({ instanceId: "instance-2", definitionId: "domain-card:符文护符", xPct: 22, yPct: 6, zIndex: 2 }),
    ]);
  });

  it("updates Card Instance table position and state", () => {
    const data = createCardInstance(createEmptyCharacterData(minimalSystemPackage), {
      instanceId: "instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:符文护符",
    });

    const moved = updateCardInstanceState(updateCardInstancePosition(data, "instance-1", 42, 28), "instance-1", "vault");

    expect(moved.cards.instances[0]).toEqual(expect.objectContaining({ state: "vault", xPct: 42, yPct: 28 }));
  });

  it("deletes a Card Instance without touching other instances", () => {
    const withFirst = createCardInstance(createEmptyCharacterData(minimalSystemPackage), {
      instanceId: "instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:符文护符",
    });
    const withSecond = createCardInstance(withFirst, {
      instanceId: "instance-2",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:释放混沌",
    });

    const deleted = deleteCardInstance(withSecond, "instance-1");

    expect(deleted.cards.instances.map((instance) => instance.instanceId)).toEqual(["instance-2"]);
  });

  it("tidies a Card Table into a grid", () => {
    const withFirst = createCardInstance(createEmptyCharacterData(minimalSystemPackage), {
      instanceId: "instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:符文护符",
    });
    const withMoved = updateCardInstancePosition(withFirst, "instance-1", 88, 77);

    const tidied = tidyCardTable(withMoved, "domain-card-table");

    expect(tidied.cards.instances[0]).toEqual(expect.objectContaining({ xPct: 4, yPct: 6, rotation: 0 }));
  });
});
