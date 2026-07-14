import { describe, expect, it } from "vitest";
import { minimalSystemPackage } from "../test/fixtures";
import { createEmptyCharacterData } from "./characterData";
import {
  clampCardTablePosition,
  addCardIndicator,
  createCardInstance,
  createCardTableLayout,
  deleteCardInstance,
  flipCardInstance,
  readCardIndicators,
  rotateCardInstance,
  setCardInstanceUpright,
  tidyCardTable,
  transitionCardIndicator,
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

  it("flips and quarter-turns a Card Instance without changing unrelated state", () => {
    const data = createCardInstance(createEmptyCharacterData(minimalSystemPackage), {
      instanceId: "instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:符文护符",
    });

    const changed = rotateCardInstance(flipCardInstance(data, "instance-1"), "instance-1", -1);
    const restored = setCardInstanceUpright(changed, "instance-1");

    expect(changed.cards.instances[0]).toEqual(expect.objectContaining({ face: "back", rotation: 270, definitionId: "domain-card:符文护符" }));
    expect(restored.cards.instances[0]).toEqual(expect.objectContaining({ face: "back", rotation: 0 }));
    expect(rotateCardInstance(data, "instance-1", 5).cards.instances[0].rotation).toBe(90);
  });

  it("keeps a zero indicator and removes it only when decrementing at zero", () => {
    const data = createCardInstance(createEmptyCharacterData(minimalSystemPackage), {
      instanceId: "instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:符文护符",
    });
    const placed = addCardIndicator(data, "instance-1", "indicator-1");
    const increased = transitionCardIndicator(placed, "instance-1", "indicator-1", "increment");
    const zero = transitionCardIndicator(increased, "instance-1", "indicator-1", "decrement");
    const removed = transitionCardIndicator(zero, "instance-1", "indicator-1", "decrement");

    expect(readCardIndicators(placed.cards.instances[0])).toEqual([{ indicatorId: "indicator-1", colorIndex: 0, value: 0 }]);
    expect(readCardIndicators(increased.cards.instances[0])[0].value).toBe(1);
    expect(readCardIndicators(zero.cards.instances[0])[0].value).toBe(0);
    expect(readCardIndicators(removed.cards.instances[0])).toEqual([]);
  });

  it("assigns ten stable colors and refuses an eleventh indicator", () => {
    const initial = createCardInstance(createEmptyCharacterData(minimalSystemPackage), {
      instanceId: "instance-1", tableModuleId: "domain-card-table", libraryId: "domain-cards", definitionId: "card",
    });
    const filled = Array.from({ length: 11 }).reduce(
      (data, _item, index) => addCardIndicator(data, "instance-1", `indicator-${index}`),
      initial,
    );

    expect(readCardIndicators(filled.cards.instances[0])).toHaveLength(10);
    expect(readCardIndicators(filled.cards.instances[0]).map((indicator) => indicator.colorIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("reads Author-typed prototype indicators as generic colored indicators", () => {
    expect(readCardIndicators({ indicators: { charge: 2, shield: 0 } })).toEqual([
      { indicatorId: "charge", colorIndex: 0, value: 2 },
      { indicatorId: "shield", colorIndex: 1, value: 0 },
    ]);
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
