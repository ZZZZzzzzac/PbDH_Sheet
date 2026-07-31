import { describe, expect, it } from "vitest";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { createCardInstance } from "./cardEngine";
import { createEmptyCharacterData, exportCharacterData, parseCharacterDataJson, removePlayerImage, updateCharacterValue, updatePlayerImage, updateResourceSelectionSnapshot } from "./characterData";
import { normalizeResourceLibraries } from "./resourceLibrary";
import type { SystemPackage } from "./systemPackage";

const compatibilitySystemPackage = {
  ...moduleDemoSystemPackage,
  manifest: { ...moduleDemoSystemPackage.manifest, 版本: "2.0.0" },
  modules: [
    ...moduleDemoSystemPackage.modules,
    { ID: "pick-class", 类型: "resourcePicker", 按钮文本: "选择职业", 资源库: [{ ID: "classes" }] },
    {
      ID: "compose-class", 类型: "resourceComposer", 按钮文本: "组合职业",
      来源槽位: [{ ID: "base", 标签: "基础", 资源库ID: "classes" }],
      输出字段: [{ 字段: "名称", 来源槽位ID: "base", 来源字段: "名称" }],
    },
    {
      ID: "class-cards", 类型: "cardTable", 标签: "职业卡",
      资源来源: [
        { 类型: "resourceLibrary", ID: "classes" },
        { 类型: "resourceComposer", ID: "compose-class" },
      ],
      状态选项: ["配置", "已消耗"],
    },
  ],
  resourceLibraries: [{
    ID: "classes", 名称: "职业", 路径: "classes.json",
    entries: [{ ID: "class:current", legacyIds: ["class-old"], fields: { ID: "class:current", 名称: "守卫" } }],
  }],
} as SystemPackage;

describe("Character Data import/export", () => {
  it("migrates legacy Card and Derived Source references to the current Resource Entry ID", () => {
    const normalized = normalizeResourceLibraries([{
      ID: "classes", 名称: "职业", 路径: "classes.json",
      entries: [{ ID: "职业:德鲁伊", 旧ID: "class-old", 名称: "德鲁伊" }],
    }]);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    const systemPackage = {
      ...compatibilitySystemPackage,
      resourceLibraries: normalized.resourceLibraries,
    };
    let data = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "legacy-class-card",
      tableModuleId: "class-cards",
      libraryId: "classes",
      definitionId: "class-old",
    });
    data = updateResourceSelectionSnapshot(data, "pick-class", "classes", ["class-old"]);

    const result = parseCharacterDataJson(exportCharacterData(data), systemPackage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.cards.instances[0].definitionRef).toEqual({
      type: "resourceLibrary", libraryId: "classes", entryId: "职业:德鲁伊",
    });
    expect(result.data.resourceSelections?.["pick-class"].entryIds).toEqual(["职业:德鲁伊"]);
  });

  it("exports values plus System Package identity, not the full System Package", () => {
    const data = updateCharacterValue(createEmptyCharacterData(minimalSystemPackage), "character-name", "阿青");
    const exported = JSON.parse(exportCharacterData(data));

    expect(exported.character.values["character-name"]).toBe("阿青");
    expect(exported.systemPackage).toEqual({
      id: "demo-minimal",
      version: "0.1.0",
    });
    expect(exported.cards).toEqual({ instances: [] });
    expect(exported.pages).toBeUndefined();
    expect(exported.modules).toBeUndefined();
    expect(exported.playerImages).toEqual({});
  });

  it("imports a previously exported Character Data JSON", () => {
    const data = updateCharacterValue(createEmptyCharacterData(minimalSystemPackage), "character-name", "阿青");
    const result = parseCharacterDataJson(exportCharacterData(data), minimalSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.character.values["character-name"]).toBe("阿青");
      expect(result.data.character.id).not.toBe(data.character.id);
      expect(result.report.diagnostics).toEqual([]);
    }
  });

  it("projects same-ID Character Data from another package version onto current defaults", () => {
    const source = createEmptyCharacterData(compatibilitySystemPackage, "source-character");
    source.systemPackage.version = "0.1.0";
    source.character.values["character-name"] = "阿青";
    source.character.values.background = { current: 1, max: 2 } as never;
    source.character.values.conditions = { removed: true };
    source.character.values.vitality = { current: 9, max: 6 };
    source.character.values.removed = "旧字段";

    const result = parseCharacterDataJson(exportCharacterData(source), compatibilitySystemPackage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.character.id).not.toBe("source-character");
    expect(result.data.systemPackage).toEqual({ id: "demo", version: "2.0.0" });
    expect(result.data.character.values).toMatchObject({
      "character-name": "阿青",
      background: "写下角色的来历。",
      conditions: { wounded: false, exhausted: false, inspired: true },
      vitality: { current: 3, max: 6 },
    });
    expect(result.data.character.values.removed).toBeUndefined();
    expect(result.report.convertedFields).toBe(1);
    expect(result.report.skippedFields).toBe(4);
    expect(result.report.diagnostics.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "CHARACTER_DATA_VALUE_INCOMPATIBLE",
      "CHARACTER_DATA_MODULE_MISSING",
    ]));
  });

  it("drops unusable Cards and resets only an invalid Card state", () => {
    const source = createEmptyCharacterData(compatibilitySystemPackage, "source-character");
    const baseCard = {
      instanceId: "valid-card", tableModuleId: "class-cards",
      definitionRef: { type: "resourceLibrary" as const, libraryId: "classes", entryId: "class:current" },
      state: "旧状态", xPct: 10, yPct: 20, zIndex: 1, face: "front" as const,
      rotation: 0, scale: 1, indicators: [],
    };
    source.cards.instances = [
      baseCard,
      { ...baseCard, instanceId: "missing-entry", definitionRef: { type: "resourceLibrary", libraryId: "classes", entryId: "missing" } },
      { ...baseCard, instanceId: "missing-table", tableModuleId: "removed-table" },
    ];

    const result = parseCharacterDataJson(exportCharacterData(source), compatibilitySystemPackage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.cards.instances).toEqual([
      expect.objectContaining({ instanceId: "valid-card", state: "配置" }),
    ]);
    expect(result.report.matchedCards).toBe(1);
    expect(result.report.skippedCards).toBe(2);
    expect(result.report.diagnostics.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "CHARACTER_DATA_CARD_STATE_RESET",
      "CHARACTER_DATA_CARD_RESOURCE_MISSING",
      "CHARACTER_DATA_CARD_TABLE_INVALID",
    ]));
  });

  it("keeps only current Composite Resources, selection snapshots, and Player Images", () => {
    const source = createEmptyCharacterData(compatibilitySystemPackage, "source-character");
    source.compositeResources = {
      "composite:compose-class": {
        ID: "composite:compose-class", composerModuleId: "compose-class",
        fields: { ID: "composite:compose-class", 名称: "守卫" },
      },
      "composite:removed": {
        ID: "composite:removed", composerModuleId: "removed",
        fields: { ID: "composite:removed", 名称: "旧组合" },
      },
    };
    source.resourceSelections = {
      "pick-class": { libraryId: "classes", entryIds: ["class:current"] },
      removed: { libraryId: "classes", entryIds: ["class:current"] },
      "missing-entry": { libraryId: "classes", entryIds: ["missing"] },
    };
    source.character.values.portrait = { kind: "player-image", imageId: "portrait-valid" };
    source.playerImages = {
      "portrait-valid": { id: "portrait-valid", mimeType: "image/png", dataUrl: "data:image/png;base64,AA==" },
      orphan: { id: "orphan", mimeType: "image/png", dataUrl: "data:image/png;base64,AA==" },
    };

    const result = parseCharacterDataJson(exportCharacterData(source), compatibilitySystemPackage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.data.compositeResources)).toEqual(["composite:compose-class"]);
    expect(result.data.resourceSelections).toEqual({
      "pick-class": { libraryId: "classes", entryIds: ["class:current"] },
    });
    expect(result.data.playerImages).toEqual({
      "portrait-valid": expect.objectContaining({ id: "portrait-valid" }),
    });
    expect(result.report.diagnostics.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "CHARACTER_DATA_COMPOSITE_INCOMPATIBLE",
      "CHARACTER_DATA_SELECTION_INCOMPATIBLE",
      "CHARACTER_DATA_IMAGE_ORPHANED",
    ]));
  });

  it("rejects malformed JSON", () => {
    const result = parseCharacterDataJson("{", minimalSystemPackage);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("JSON 格式错误");
    }
  });

  it("seeds default values for stateful modules on a fresh character", () => {
    const data = createEmptyCharacterData(moduleDemoSystemPackage);
    const exported = JSON.parse(exportCharacterData(data));

    expect(exported.character.values["character-name"]).toBe("");
    expect(exported.character.values["background"]).toBe("写下角色的来历。");
    expect(exported.character.values["conditions"]).toEqual({
      wounded: false,
      exhausted: false,
      inspired: true,
    });
    expect(exported.character.values["vitality"]).toEqual({ current: 3, max: 6 });
    expect(exported.character.values["rule-note"]).toBeUndefined();
    expect(exported.character.values["sect-emblem"]).toBeUndefined();
    expect(exported.character.values["portrait"]).toBeUndefined();
    expect(exported.cards).toEqual({ instances: [] });
  });

  it("exports and imports Card Instance state", () => {
    const data = createCardInstance(createEmptyCharacterData(compatibilitySystemPackage), {
      instanceId: "card-instance-1",
      tableModuleId: "class-cards",
      libraryId: "classes",
      definitionId: "class:current",
    });
    const result = parseCharacterDataJson(exportCharacterData(data), compatibilitySystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cards.instances).toEqual([
        expect.objectContaining({
          instanceId: "card-instance-1",
          definitionRef: { type: "resourceLibrary", libraryId: "classes", entryId: "class:current" },
          state: "配置",
          tableModuleId: "class-cards",
        }),
      ]);
    }
  });

  it("normalizes legacy libraryId and definitionId Card references on import", () => {
    const data = createCardInstance(createEmptyCharacterData(compatibilitySystemPackage), {
      instanceId: "legacy-card", tableModuleId: "class-cards", libraryId: "classes", definitionId: "class:current",
    });
    const json = JSON.parse(exportCharacterData(data));
    const reference = json.cards.instances[0].definitionRef;
    delete json.cards.instances[0].definitionRef;
    json.cards.instances[0].libraryId = reference.libraryId;
    json.cards.instances[0].definitionId = reference.entryId;

    const result = parseCharacterDataJson(JSON.stringify(json), compatibilitySystemPackage);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.cards.instances[0].definitionRef).toEqual({ type: "resourceLibrary", libraryId: "classes", entryId: "class:current" });
  });

  it("imports older Character Data without card state as an empty Card State", () => {
    const exported = JSON.parse(exportCharacterData(createEmptyCharacterData(minimalSystemPackage)));
    delete exported.cards;

    const result = parseCharacterDataJson(JSON.stringify(exported), minimalSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cards).toEqual({ instances: [] });
    }
  });

  it("exports Resource Selection snapshots and defaults older data to an empty record", () => {
    const data = updateResourceSelectionSnapshot(createEmptyCharacterData(compatibilitySystemPackage), "pick-class", "classes", ["class:current"]);
    const exported = JSON.parse(exportCharacterData(data));
    expect(exported.resourceSelections).toEqual({ "pick-class": { libraryId: "classes", entryIds: ["class:current"] } });

    delete exported.resourceSelections;
    const result = parseCharacterDataJson(JSON.stringify(exported), compatibilitySystemPackage);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.resourceSelections).toEqual({});
  });

  it("stores player image fields as value references plus portable player image data", () => {
    const data = updatePlayerImage(createEmptyCharacterData(moduleDemoSystemPackage), "portrait", {
      id: "portrait-test",
      name: "portrait.png",
      mimeType: "image/png",
      dataUrl: "data:image/png;base64,AA==",
    });
    const exported = JSON.parse(exportCharacterData(data));
    const result = parseCharacterDataJson(exportCharacterData(data), moduleDemoSystemPackage);

    expect(exported.character.values.portrait).toEqual({ kind: "player-image", imageId: "portrait-test" });
    expect(exported.playerImages["portrait-test"]).toEqual({
      id: "portrait-test",
      name: "portrait.png",
      mimeType: "image/png",
      dataUrl: "data:image/png;base64,AA==",
    });
    expect(Object.keys(exported).at(-1)).toBe("playerImages");
    expect(result.ok).toBe(true);
  });

  it("defaults indicators when importing an existing Card Instance", () => {
    const data = createCardInstance(createEmptyCharacterData(compatibilitySystemPackage), {
      instanceId: "legacy-card",
      tableModuleId: "class-cards",
      libraryId: "classes",
      definitionId: "class:current",
    });
    const exported = JSON.parse(exportCharacterData(data));
    delete exported.cards.instances[0].indicators;

    const result = parseCharacterDataJson(JSON.stringify(exported), compatibilitySystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.cards.instances[0].indicators).toEqual([]);
  });

  it("removes replaced and explicitly removed player images", () => {
    const original = updatePlayerImage(createEmptyCharacterData(moduleDemoSystemPackage), "portrait", {
      id: "portrait-old", name: "old.png", mimeType: "image/png", dataUrl: "data:image/png;base64,AA==",
    });
    const replaced = updatePlayerImage(original, "portrait", {
      id: "portrait-new", name: "new.png", mimeType: "image/png", dataUrl: "data:image/png;base64,BB==",
    });

    expect(replaced.playerImages["portrait-old"]).toBeUndefined();
    expect(replaced.character.values.portrait).toEqual({ kind: "player-image", imageId: "portrait-new" });

    const removed = removePlayerImage(replaced, "portrait");
    expect(removed.character.values.portrait).toBeUndefined();
    expect(removed.playerImages["portrait-new"]).toBeUndefined();
  });

  it("drops unsupported hidden Resource Library selection values with a diagnostic", () => {
    const data = createEmptyCharacterData(moduleDemoSystemPackage);
    const exported = JSON.parse(exportCharacterData(data));
    exported.character.values["domain-choice"] = {
      kind: "resource-selection",
      mode: "single",
      libraryId: "domains",
      selected: [{ libraryId: "domains", entryId: "flame-1", snapshot: { 名称: "烈焰" } }],
    };

    const result = parseCharacterDataJson(JSON.stringify(exported), moduleDemoSystemPackage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.character.values["domain-choice"]).toBeUndefined();
    expect(result.report.diagnostics).toContainEqual(expect.objectContaining({
      code: "CHARACTER_DATA_MODULE_MISSING",
      path: "character.values.domain-choice",
    }));
  });
});
