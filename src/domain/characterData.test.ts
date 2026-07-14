import { describe, expect, it } from "vitest";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { createCardInstance } from "./cardEngine";
import { createEmptyCharacterData, exportCharacterData, parseCharacterDataJson, removePlayerImage, updateCharacterValue, updatePlayerImage } from "./characterData";

describe("Character Data import/export", () => {
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
    }
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
    const data = createCardInstance(createEmptyCharacterData(minimalSystemPackage), {
      instanceId: "card-instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:符文护符",
    });
    const result = parseCharacterDataJson(exportCharacterData(data), minimalSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cards.instances).toEqual([
        expect.objectContaining({
          instanceId: "card-instance-1",
          definitionId: "domain-card:符文护符",
          state: "default",
          tableModuleId: "domain-card-table",
        }),
      ]);
    }
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
    expect(result.ok).toBe(true);
  });

  it("defaults indicators when importing an existing Card Instance", () => {
    const data = createCardInstance(createEmptyCharacterData(minimalSystemPackage), {
      instanceId: "legacy-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:符文护符",
    });
    const exported = JSON.parse(exportCharacterData(data));
    delete exported.cards.instances[0].indicators;

    const result = parseCharacterDataJson(JSON.stringify(exported), minimalSystemPackage);

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

  it("rejects hidden Resource Library selection refs in Character Data", () => {
    const data = createEmptyCharacterData(moduleDemoSystemPackage);
    const exported = JSON.parse(exportCharacterData(data));
    exported.character.values["domain-choice"] = {
      kind: "resource-selection",
      mode: "single",
      libraryId: "domains",
      selected: [{ libraryId: "domains", entryId: "flame-1", snapshot: { 名称: "烈焰" } }],
    };

    const result = parseCharacterDataJson(JSON.stringify(exported), moduleDemoSystemPackage);

    expect(result.ok).toBe(false);
  });
});
