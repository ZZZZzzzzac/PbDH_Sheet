import { afterEach, describe, expect, it, vi } from "vitest";
import type { CharacterData } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";
import { buildDholDelivery, normalizeDholRoomCode, sendDholDelivery, supportsDholDelivery } from "./dholDelivery";

const data: CharacterData = {
  kind: "pbdh-character-data", schemaVersion: "0.1.0", systemPackage: { id: "daggerheart-core", version: "2.3.0" },
  character: { id: "hero-1", values: {
    "character-name": "阿岚", "background-story": "手动改写的背景", "custom-extension-text": "第三方资源原文",
    "handful-gold": { current: 2, max: 9 }, "bag-gold": { current: 1, max: 9 }, "chest-gold": { current: 1, max: null },
    "character-avatar": { kind: "player-image", imageId: "portrait" },
  } },
  cards: { instances: [] }, compositeResources: {}, playerImages: {
    portrait: { id: "portrait", mimeType: "image/png", dataUrl: "data:image/png;base64,secret" },
  }, updatedAt: "2026-10-13T00:00:00.000Z",
};

const exported = {
  ruleSetId: "daggerheart", name: "阿岚", characterImage: "data:image/png;base64,secret", companionImage: "data:image/png;base64,secret",
  hope: 4, hopeMax: 6, hp: [false, true, false, false, false, false], hpMax: 6,
  stress: [false, false, false, false, false, false], stressMax: 6,
  armorBoxes: [false, true], armorMax: 2, cards: [{ id: "extension-1", name: "第三方卡牌", description: "扩展原文" }],
  inventory_cards: [], evasion: "13", armorValue: "2", minorThreshold: "17", majorThreshold: "25",
  agility: { value: "+2" }, strength: { value: "0" }, finesse: { value: "1" }, instinct: { value: "0" }, presence: { value: "-1" }, knowledge: { value: "1" },
  primaryWeaponTrait: "力量 / 近战", secondaryWeaponTrait: "灵巧 / 远距离",
};
const systemPackage = { manifest: { ID: "daggerheart-core" }, resourceLibraries: [] } as SystemPackage;

afterEach(() => vi.unstubAllGlobals());

describe("PbDH delivery through the existing dhSheet contract", () => {
  it("keeps edited values and extension text while dropping both portraits", () => {
    const delivery = buildDholDelivery(data, exported, systemPackage);
    expect(delivery.schemaVersion).toBe(2);
    expect(delivery.sheet).toMatchObject({
      name: "阿岚", characterImage: "", companionImage: "", cards: exported.cards,
      gold: [true, true, false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false, true],
      desktopView: { evasion: "13", minorThreshold: "17", hpMax: 6, armorMax: 2,
        attributes: { agility: "+2" }, primaryWeaponAttribute: "力量", primaryWeaponRange: "近战" },
      pbdhSource: { values: { "background-story": "手动改写的背景", "custom-extension-text": "第三方资源原文" } },
    });
    expect(JSON.stringify(delivery)).not.toContain("base64");
    expect(JSON.stringify(delivery)).not.toContain("character-avatar");
    expect(exported.characterImage).toContain("base64");
  });

  it("only accepts the Daggerheart system package and valid resource tracks", () => {
    const adapter = { ID: "dhsheet-character", exportScriptContent: "module.exports=()=>({})" };
    expect(supportsDholDelivery({ manifest: { ID: "daggerheart-core" }, characterFormatAdapters: [adapter] } as SystemPackage)).toBe(true);
    expect(supportsDholDelivery({ manifest: { ID: "witchy" }, characterFormatAdapters: [adapter] } as SystemPackage)).toBe(false);
    expect(() => buildDholDelivery({ ...data, systemPackage: { id: "witchy", version: "1" } }, exported, systemPackage)).toThrow("只有匕首之心");
    expect(() => buildDholDelivery(data, { ...exported, hpMax: 7 }, systemPackage)).toThrow("hpMax");
  });

  it("keeps cards from a third-party library unknown to the dhSheet adapter", () => {
    const extendedData: CharacterData = { ...data, cards: { instances: [{
      instanceId: "extra", tableModuleId: "character-card-table", state: "配置",
      definitionRef: { type: "resourceLibrary", libraryId: "new-library", entryId: "extra-card" },
      xPct: 0, yPct: 0, zIndex: 1, face: "front", rotation: 0, scale: 1,
    }] } };
    const extendedPackage = { ...systemPackage, resourceLibraries: [{
      ID: "new-library", entries: [{ ID: "extra-card", fields: { 名称: "额外能力", 描述: "未被旧适配器识别的原文" } }],
    }] } as SystemPackage;
    const delivery = buildDholDelivery(extendedData, exported, extendedPackage);
    expect(delivery.sheet.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "额外能力", description: "未被旧适配器识别的原文" }),
    ]));
  });

  it("sends the v2 body with the same endpoint and headers as dhSheet", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, action: "created", name: "阿岚", generation: 1, seq: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(normalizeDholRoomCode("ab-c123")).toBe("ABC123");
    const result = await sendDholDelivery("ab-c123", "request-1", buildDholDelivery(data, exported, systemPackage), "https://rooms.example/");
    expect(result.action).toBe("created");
    expect(fetchMock).toHaveBeenCalledWith("https://rooms.example/api/v2/rooms/ABC123/characters", expect.objectContaining({
      method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": "request-1" },
    }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).sheet.desktopView.minorThreshold).toBe("17");
  });
});
