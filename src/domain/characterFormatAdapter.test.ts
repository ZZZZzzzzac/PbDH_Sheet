import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import type { SystemPackage } from "./systemPackage";
import { convertExternalCharacterSource, exportExternalCharacterData, parseAndDetectCharacterSource } from "./characterFormatAdapter";

const packageRoot = join(process.cwd(), "public", "system-packages", "daggerheart-core");
const migrationRoot = join(process.cwd(), "docs", "migration", "save");
let daggerheartPackage: SystemPackage;

describe("Character Format Adapter scripts", () => {
  beforeAll(async () => {
    const loaded = await loadSystemPackageFromZipFile(new Blob([createPackageZip()]));
    expect(loaded.ok, loaded.ok ? undefined : JSON.stringify(loaded.issues, null, 2)).toBe(true);
    if (!loaded.ok) throw new Error("daggerheart-core failed to load");
    daggerheartPackage = loaded.package;
  });

  it("imports the real ZZZ fixture, tri-state resources, equipment, cards, and diagnostics", async () => {
    const text = readFileSync(join(migrationRoot, "啄页_匕首之心人物卡_zzz.json"), "utf8");
    const sourceDocument = JSON.parse(text) as Record<string, unknown>;
    const detection = parseAndDetectCharacterSource(text, "啄页_匕首之心人物卡_zzz.json", daggerheartPackage.characterFormatAdapters ?? []);
    expect(detection.status).toBe("match");
    if (detection.status !== "match") return;
    const conversion = await convertExternalCharacterSource(detection.source, detection.adapter, daggerheartPackage);
    expect("error" in conversion).toBe(false);
    if ("error" in conversion) return;
    expect(conversion.suggestedSaveName).toBe("啄页");
    expect(conversion.data.character.values).toEqual(expect.objectContaining({
      "character-name": "啄页",
      hp: expectedTriState(sourceDocument, "HpSlotCheckbox", 12),
      stress: expectedTriState(sourceDocument, "StressSlotCheckbox", 12),
      "armor-slots": expectedTriState(sourceDocument, "ArmorSlotCheckbox", 12),
      "primary-weapon-name": joined(sourceDocument, "PrimaryWeaponNameTextbox", "PrimaryWeaponStatTextbox", "PrimaryWeaponDamageTextbox"),
      "primary-weapon-description": sourceDocument.PrimaryWeaponTraitTextbox,
      "secondary-weapon-name": joined(sourceDocument, "SecondaryWeaponNameTextbox", "SecondaryWeaponStatTextbox", "SecondaryWeaponDamageTextbox"),
      "secondary-weapon-description": sourceDocument.SecondaryWeaponTraitTextbox,
      "backup-weapon-1-name": joined(sourceDocument, "Backup1WeaponNameTextbox", "Backup1WeaponStatTextbox", "Backup1WeaponDamageTextbox"),
      "backup-weapon-2-name": joined(sourceDocument, "Backup2WeaponNameTextbox", "Backup2WeaponStatTextbox", "Backup2WeaponDamageTextbox"),
      "armor-name": joined(sourceDocument, "ArmorNameTextbox", "ArmorThresholdTextbox", "ArmorScoreTextbox"),
      "armor-value": String(sourceDocument.ArmorTextbox),
      "armor-description": sourceDocument.ArmorTraitTextbox,
      inventory: sourceDocument.ItemSlot1Textbox,
    }));
    expect(conversion.data.character.values["advancement-tier-3"]).toEqual(expect.objectContaining({ subclass: true, "multiclass-1": false }));
    expect(conversion.report).toMatchObject({ matchedCards: 13, skippedCards: 1, convertedImages: 1 });
    expect(conversion.report.diagnostics).toContainEqual(expect.objectContaining({ code: "CHARACTER_ADAPTER_CARD_NOT_FOUND", text: "Card「器灵-木鸟」没有匹配的 Resource Entry，已跳过。" }));

    const exported = await exportExternalCharacterData(conversion.data, detection.adapter, daggerheartPackage);
    expect("error" in exported).toBe(false);
    if ("error" in exported) return;
    expect(exported.document).toEqual(expect.objectContaining({ ArmorTextbox: sourceDocument.ArmorTextbox, ArmorTraitTextbox: sourceDocument.ArmorTraitTextbox, ItemSlot1Textbox: sourceDocument.ItemSlot1Textbox }));
  });

  it("treats ZZZ advancement state 2 as unselected and tri-state slot 2 as unavailable", async () => {
    const document = JSON.parse(readFileSync(join(migrationRoot, "啄页_匕首之心人物卡_zzz.json"), "utf8")) as Record<string, unknown>;
    document.LevelupT3_F1 = "2";
    document.LevelupT3_H1 = "1";
    document.LevelupT3_I1 = "1";
    const detection = parseAndDetectCharacterSource(JSON.stringify(document), "advancement.json", daggerheartPackage.characterFormatAdapters ?? []);
    if (detection.status !== "match") throw new Error("fixture not detected");
    const conversion = await convertExternalCharacterSource(detection.source, detection.adapter, daggerheartPackage);
    if ("error" in conversion) throw new Error(conversion.error.text);
    expect(conversion.data.character.values["advancement-tier-3"]).toEqual(expect.objectContaining({ subclass: false, "proficiency-1": true, "multiclass-1": true }));
    expect(conversion.data.character.values.hp).toEqual(expectedTriState(document, "HpSlotCheckbox", 12));
  });

  it("imports dhSheet profession features, inventory, motivation, and composed equipment from JSON and HTML", async () => {
    const jsonText = readFileSync(join(migrationRoot, "布罗克-战士-仙灵-龟人-荒野之民-LV1.json"), "utf8");
    const htmlText = readFileSync(join(migrationRoot, "布罗克-战士-仙灵-龟人-荒野之民-LV1.html"), "utf8");
    const document = JSON.parse(jsonText) as Record<string, unknown>;
    const profession = (document.cards as Array<Record<string, unknown>>).find((card) => card.type === "profession" && card.id === document.profession);
    expect(profession).toBeTruthy();
    const conversions = await Promise.all([[jsonText, "布罗克.json"], [htmlText, "布罗克.html"]].map(async ([text, name]) => {
      const detection = parseAndDetectCharacterSource(text, name, daggerheartPackage.characterFormatAdapters ?? []);
      if (detection.status !== "match") throw new Error(`${name} not detected`);
      const conversion = await convertExternalCharacterSource(detection.source, detection.adapter, daggerheartPackage);
      if ("error" in conversion) throw new Error(conversion.error.text);
      return conversion;
    }));
    const values = conversions[0].data.character.values;
    expect(conversions[1].data.character.values).toEqual(values);
    expect(values).toEqual(expect.objectContaining({
      "class-feature": profession?.description,
      "class-hope-feature": (profession?.professionSpecial as Record<string, unknown>)["希望特性"],
      inventory: (document.inventory as unknown[]).filter((item) => String(item).trim()).join("\n"),
      "event-log": document.characterMotivation,
      "primary-weapon-name": joined(document, "primaryWeaponName", "primaryWeaponTrait", "primaryWeaponDamage"),
      "secondary-weapon-name": joined(document, "secondaryWeaponName", "secondaryWeaponTrait", "secondaryWeaponDamage"),
      "armor-name": joined(document, "armorName", "armorBaseScore", "armorThreshold"),
      "armor-value": String(document.armorValue),
    }));
    expect(conversions[0].data.cards.instances.some((card) => card.state === "配置")).toBe(true);
    expect(conversions[0].data.cards.instances.some((card) => card.state === "宝库")).toBe(true);
  });

  it("extracts embedded JSON without executing source scripts or requesting resources", () => {
    let executed = false;
    Object.defineProperty(globalThis, "unsafeAdapterProbe", { configurable: true, set: () => { executed = true; } });
    const text = `<html><img src="https://invalid.example/probe.png"><script>globalThis.unsafeAdapterProbe=true</script><script>window.characterData = {"ruleSetId":"daggerheart","name":"Safe"\n};</script></html>`;
    expect(parseAndDetectCharacterSource(text, "safe.html", daggerheartPackage.characterFormatAdapters ?? []).status).toBe("match");
    expect(executed).toBe(false);
    delete (globalThis as Record<string, unknown>).unsafeAdapterProbe;
  });

  it("reports thrown and invalid script output without mutating Character Data", async () => {
    const base = daggerheartPackage.characterFormatAdapters?.[0];
    if (!base) throw new Error("missing adapter");
    const source = { document: {}, fileName: "x.json", carrier: base.载体[0] };
    const thrown = await convertExternalCharacterSource(source, { ...base, importScriptContent: "module.exports=()=>{throw new Error('boom')}" }, daggerheartPackage);
    expect(thrown).toEqual({ error: expect.objectContaining({ code: "CHARACTER_ADAPTER_IMPORT_SCRIPT_ERROR", text: expect.stringContaining("boom") }) });
    const invalid = await convertExternalCharacterSource(source, { ...base, importScriptContent: "module.exports=()=>({cards:[]})" }, daggerheartPackage);
    expect(invalid).toEqual({ error: expect.objectContaining({ code: "CHARACTER_ADAPTER_SCRIPT_OUTPUT_INVALID" }) });
  });

  it("warns and skips a malformed Player Image while keeping valid values", async () => {
    const base = daggerheartPackage.characterFormatAdapters?.[0];
    if (!base) throw new Error("missing adapter");
    const source = { document: {}, fileName: "x.json", carrier: base.载体[0] };
    const conversion = await convertExternalCharacterSource(source, {
      ...base,
      importScriptContent: "module.exports=()=>({values:{'character-name':'Still valid'},images:[{moduleId:'character-avatar',dataUrl:'data:text/html;base64,PGgxPkJhZDwvaDE+'}]})",
    }, daggerheartPackage);
    if ("error" in conversion) throw new Error(conversion.error.text);
    expect(conversion.data.character.values["character-name"]).toBe("Still valid");
    expect(conversion.report).toMatchObject({ convertedImages: 0, skippedImages: 1 });
    expect(conversion.report.diagnostics).toContainEqual(expect.objectContaining({ code: "CHARACTER_ADAPTER_IMAGE_INVALID" }));
  });
});

function expectedTriState(document: Record<string, unknown>, prefix: string, length: number): { current: number; max: number } {
  const values = Array.from({ length }, (_, index) => Number(document[`${prefix}${index + 1}`]));
  return { current: values.filter((value) => value === 1).length, max: values.filter((value) => value === 0 || value === 1).length };
}
function joined(document: Record<string, unknown>, ...fields: string[]): string { return fields.map((field) => String(document[field] ?? "").trim()).filter(Boolean).join("｜"); }
function createPackageZip(): Uint8Array { return zipSync(Object.fromEntries(walkFiles(packageRoot).map((path) => [relative(packageRoot, path).replaceAll("\\", "/"), new Uint8Array(readFileSync(path))])), { level: 0 }); }
function walkFiles(directory: string): string[] { return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walkFiles(join(directory, entry.name)) : [join(directory, entry.name)]); }
