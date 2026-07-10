import { describe, expect, it } from "vitest";
import { minimalSystemPackage } from "../test/fixtures";
import { createEmptyCharacterData } from "./characterData";
import {
  clampCardTablePosition,
  createCardInstance,
  createCardTableLayout,
  deleteCardInstance,
  tidyCardTable,
  updateCardInstancePosition,
  updateCardInstanceState,
} from "./cardEngine";

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

    const layout = createCardTableLayout({ surfaceWidthPx: 800, cardCount: 1 });
    const tidied = tidyCardTable(withMoved, "domain-card-table", layout);

    expect(tidied.cards.instances[0]).toEqual(expect.objectContaining({ xPct: layout.insetXPct, yPct: layout.insetYPct, rotation: 0 }));
  });

  it("tidies cards using measured card width and surface size so cards do not overlap", () => {
    const data = Array.from({ length: 6 }).reduce(
      (nextData, _item, index) =>
        createCardInstance(nextData, {
          instanceId: `instance-${index}`,
          tableModuleId: "domain-card-table",
          libraryId: "domain-cards",
          definitionId: `domain-card:${index}`,
        }),
      createEmptyCharacterData(minimalSystemPackage),
    );
    const surfaceWidthPx = 568;
    const layout = createCardTableLayout({ surfaceWidthPx, cardCount: data.cards.instances.length });

    const tidied = tidyCardTable(data, "domain-card-table", layout);
    const instances = tidied.cards.instances;
    const cardWidthPct = (layout.cardWidthPx / surfaceWidthPx) * 100;
    const cardHeightPct = (layout.cardHeightPx / layout.surfaceHeightPx) * 100;

    expect(layout.columns).toBe(2);
    expect(instances[1].xPct - instances[0].xPct).toBeGreaterThan(cardWidthPct);
    expect(instances[2].yPct - instances[0].yPct).toBeGreaterThan(cardHeightPct);
    expect(layout.surfaceHeightPx).toBeGreaterThan(520);
  });

  it("clamps dragged cards so the full card stays inside the table", () => {
    const layout = createCardTableLayout({
      surfaceWidthPx: 800,
      cardCount: 1,
      preferredCardWidthPx: 200,
    });

    const clamped = clampCardTablePosition(layout, 99, 99);

    expect(clamped.xPct).toBeCloseTo(75);
    expect(clamped.yPct).toBeCloseTo(46.28);
  });

  it("can expand the Card Table layout to the remaining viewport height", () => {
    const layout = createCardTableLayout({
      surfaceWidthPx: 800,
      cardCount: 1,
      preferredCardWidthPx: 200,
      minSurfaceHeightPx: 900,
    });

    expect(layout.surfaceHeightPx).toBe(900);
    expect(clampCardTablePosition(layout, 99, 99).yPct).toBeCloseTo(68.96);
  });
});
