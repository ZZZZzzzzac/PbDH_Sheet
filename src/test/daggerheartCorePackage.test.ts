import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import { createEmptyCharacterData, updateCharacterValue } from "../domain/characterData";
import { applyDependencyResultToCharacterData, evaluateDependencies } from "../domain/dependencyEngine";
import { runValidationChecksInProcess } from "../domain/validationScript";
import manifest from "../../public/system-packages/daggerheart-core/manifest.json";
import modules from "../../public/system-packages/daggerheart-core/modules.json";
import pages from "../../public/system-packages/daggerheart-core/pages.json";
import dependencies from "../../public/system-packages/daggerheart-core/dependencies.json";
import baseCss from "../../public/system-packages/daggerheart-core/layouts/base.css?raw";
import countableResourceCss from "../styles/countable-resource.css?raw";
import mainHtml from "../../public/system-packages/daggerheart-core/layouts/character-main.html?raw";
import shellCss from "../../public/system-packages/daggerheart-core/layouts/shell.css?raw";
import shellHtml from "../../public/system-packages/daggerheart-core/layouts/shell.html?raw";
import storyHtml from "../../public/system-packages/daggerheart-core/layouts/character-story.html?raw";
import ancestriesJson from "../../public/system-packages/daggerheart-core/resources/ancestries.json?raw";
import armorJson from "../../public/system-packages/daggerheart-core/resources/armor.json?raw";
import beastFormsJson from "../../public/system-packages/daggerheart-core/resources/beast-forms.json?raw";
import classesJson from "../../public/system-packages/daggerheart-core/resources/classes.json?raw";
import communitiesJson from "../../public/system-packages/daggerheart-core/resources/communities.json?raw";
import domainCardsJson from "../../public/system-packages/daggerheart-core/resources/domain-cards.json?raw";
import lootJson from "../../public/system-packages/daggerheart-core/resources/loot.json?raw";
import weaponsJson from "../../public/system-packages/daggerheart-core/resources/weapons.json?raw";
import subclassesJson from "../../public/system-packages/daggerheart-core/resources/subclasses.json?raw";
import consistencyCheck from "../../public/system-packages/daggerheart-core/checks/character-consistency.js?raw";

describe("Daggerheart core System Package", () => {
  it("loads the physical package through the normal zip pipeline", async () => {
    const result = await loadDaggerheartPackage();

    expect(result.ok, result.ok ? undefined : JSON.stringify(result.issues, null, 2)).toBe(true);
    if (!result.ok) return;

    expect(result.package.manifest.ID).toBe("daggerheart-core");
    expect(result.package.pages.map((page) => page.ID)).toEqual([
      "character-main",
      "character-story",
    ]);
    expect(result.package.shell?.htmlContent).toContain("<pb-page-outlet></pb-page-outlet>");
    expect(result.package.modules).toHaveLength(117);
    expect(new Set(result.package.modules.map((module) => module.ID)).size).toBe(117);
    expect(result.package.resourceLibraries).toHaveLength(9);
    expect(result.issues.filter((issue) => issue.level === "fatal" || issue.level === "error")).toEqual([]);
  });

  it("fills class defaults, HP maximum, and subclass filter without opening UI", async () => {
    const loaded = await loadDaggerheartPackage();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const classes = loaded.package.resourceLibraries?.find((library) => library.ID === "classes");
    const druid = classes?.entries.find((entry) => entry.fields.名称 === "德鲁伊");
    expect(druid).toBeDefined();
    if (!druid) return;

    const data = createEmptyCharacterData(loaded.package);
    const result = evaluateDependencies(data, loaded.package, {
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      selectedEntries: [druid],
    });
    const next = applyDependencyResultToCharacterData(data, result);

    expect(next.character.values["class-name"]).toBe("德鲁伊");
    expect(next.character.values["evasion"]).toBe("10");
    expect(next.character.values.hp).toEqual(expect.objectContaining({ current: 0, max: 6 }));
    expect(next.character.values["background-question-1"]).toBe(druid.fields.背景问题1);
    expect(next.character.values["connection-question-3"]).toBe(druid.fields.关系问题3);
    expect(result.resourcePickerDefaultQueries["pick-subclass"].filters).toEqual({ 主职: ["德鲁伊"] });
  });

  it("fills independent equipment fields and the Armor Counter maximum", async () => {
    const loaded = await loadDaggerheartPackage();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const data = createEmptyCharacterData(loaded.package);
    const armorLibrary = loaded.package.resourceLibraries?.find((library) => library.ID === "armor");
    const armor = armorLibrary?.entries[0];
    expect(armor).toBeDefined();
    if (!armor) return;

    const result = evaluateDependencies(data, loaded.package, {
      type: "resourceSelected",
      sourceModuleId: "pick-armor",
      libraryId: "armor",
      selectedEntries: [armor],
    });
    const next = applyDependencyResultToCharacterData(data, result);

    expect(next.character.values["armor-name"]).toBe(armor.fields.名称);
    expect(next.character.values["armor-base-major"]).toBe(armor.fields.重伤阈值);
    expect(next.character.values["armor-description"]).toBe(armor.fields.描述);
    expect(next.character.values["armor-slots"]).toEqual(expect.objectContaining({ current: 0, max: Number(armor.fields.护甲值) }));
  });

  it("keeps five loot Picker targets independent", () => {
    for (let index = 1; index <= 5; index += 1) {
      expect(modules).toEqual(expect.arrayContaining([
        expect.objectContaining({ ID: `pick-item-${index}`, 资源库ID: "loot" }),
        expect.objectContaining({ ID: `item-${index}`, 类型: "freeText" }),
      ]));
      expect(dependencies).toEqual(expect.arrayContaining([
        expect.objectContaining({ ID: `fill-item-${index}`, targets: [{ 类型: "module", 模块ID: `item-${index}` }] }),
      ]));
    }
  });

  it("connects domain and beast-form Pickers to the shared multi-Library Card Table", () => {
    expect(modules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ID: "character-card-table",
        资源库IDs: expect.arrayContaining(["domain-cards", "beast-forms"]),
      }),
      expect.objectContaining({ ID: "pick-domain-card", 资源库ID: "domain-cards" }),
      expect.objectContaining({ ID: "pick-beast-form", 资源库ID: "beast-forms" }),
    ]));
  });

  it("reports Daggerheart consistency issues without changing Character Data", async () => {
    const loaded = await loadDaggerheartPackage();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const classes = loaded.package.resourceLibraries?.find((library) => library.ID === "classes");
    const armor = loaded.package.resourceLibraries?.find((library) => library.ID === "armor")?.entries[0];
    const druid = classes?.entries.find((entry) => entry.fields.名称 === "德鲁伊");
    expect(druid).toBeDefined();
    expect(armor).toBeDefined();
    if (!druid || !armor) return;

    let data = createEmptyCharacterData(loaded.package);
    data = updateCharacterValue(data, "class-name", "德鲁伊");
    data = updateCharacterValue(data, "armor-name", armor.fields.名称);
    data = updateCharacterValue(data, "level", "2");
    data = updateCharacterValue(data, "hp", { current: 0, max: Number(druid.fields.初始生命点) });
    data = updateCharacterValue(data, "armor-slots", { current: 0, max: Number(armor.fields.护甲值) });
    data = updateCharacterValue(data, "major-threshold", String(Number(armor.fields.重伤阈值) + 2));
    data = updateCharacterValue(data, "severe-threshold", String(Number(armor.fields.严重阈值) + 2));
    const snapshot = JSON.stringify(data);

    const validIssues = await runValidationChecksInProcess({
      characterData: data,
      resourceLibraries: loaded.package.resourceLibraries ?? [],
      packageMetadata: { id: "daggerheart-core", version: "0.1.0" },
      checks: [{ ID: "character-consistency", 脚本: "checks/character-consistency.js", scriptContent: consistencyCheck }],
    });
    expect(validIssues).toEqual([]);
    expect(JSON.stringify(data)).toBe(snapshot);

    const invalidData = updateCharacterValue(updateCharacterValue(data, "major-threshold", "999"), "hp", { current: 0, max: 1 });
    const invalidIssues = await runValidationChecksInProcess({
      characterData: invalidData,
      resourceLibraries: loaded.package.resourceLibraries ?? [],
      packageMetadata: { id: "daggerheart-core", version: "0.1.0" },
      checks: [{ ID: "character-consistency", 脚本: "checks/character-consistency.js", scriptContent: consistencyCheck }],
    });
    expect(invalidIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "CLASS_HP_MAX_MISMATCH", level: "warning" }),
      expect.objectContaining({ code: "MAJOR_THRESHOLD_MISMATCH", level: "warning" }),
    ]));
  });

  it("normalizes ancestry and community resources for one shared Card Table", async () => {
    const ancestryEntries = JSON.parse(ancestriesJson) as Array<Record<string, unknown>>;
    const communityEntries = JSON.parse(communitiesJson) as Array<Record<string, unknown>>;
    const allEntries = [...ancestryEntries, ...communityEntries];

    expect(ancestryEntries).toHaveLength(18);
    expect(communityEntries).toHaveLength(9);
    expect(new Set(allEntries.map((entry) => entry.ID)).size).toBe(allEntries.length);
    expect(allEntries.every((entry) => typeof entry.名称 === "string" && typeof entry.描述 === "string")).toBe(true);
    expect(modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ ID: "pick-ancestry", 资源库ID: "ancestries" }),
      expect.objectContaining({ ID: "pick-community", 资源库ID: "communities" }),
      expect.objectContaining({
        ID: "character-card-table",
        资源库IDs: expect.arrayContaining(["ancestries", "communities"]),
      }),
    ]));
  });

  it("declares the complete Counter set with intentional maximum editing", async () => {
    const countables = modules.filter((module) => module.类型 === "countableResource");

    expect(countables.map((module) => module.ID)).toEqual([
      "hp",
      "stress",
      "hope",
      "armor-slots",
      "proficiency",
      "handful-gold",
      "bag-gold",
      "chest-gold",
    ]);
    expect(countables.filter((module) => "最大值可改" in module && module.最大值可改).map((module) => module.ID)).toEqual([
      "hp",
      "stress",
      "hope",
      "armor-slots",
    ]);
    expect(countables.find((module) => module.ID === "hope")).toEqual(expect.objectContaining({ 默认值: 2, 最大值: 6 }));
    expect(countables.find((module) => module.ID === "handful-gold")).toEqual(expect.objectContaining({ 默认值: 1, 最大值: 9 }));
    expect(modules.find((module) => module.ID === "level")).toEqual(expect.objectContaining({ 类型: "freeText", 默认值: "1" }));
    expect(baseCss).toMatch(/\.level-field \[data-module-type="freeText"\]\s*\{[^}]*height:\s*100%/s);
    expect(baseCss).toMatch(/\.level-field \[data-part="input"\]\s*\{[^}]*font-size:\s*clamp\(1\.4rem,\s*2vw,\s*1\.9rem\)/s);
  });

  it("composes the two-page layout into stable semantic regions without absolute positioning", () => {
    expect(baseCss).not.toMatch(/position\s*:\s*absolute/i);
    expect(shellCss).not.toMatch(/position\s*:\s*absolute/i);
    expect(mainHtml).toContain('<header class="identity-panel" aria-label="角色身份">');
    expect(mainHtml).toContain('<section class="upper-stat-layout" aria-label="防御与属性">');
    expect(mainHtml).toContain('<div class="sheet-body-layout">');
    expect(mainHtml).toContain('<section class="sheet-region equipment-region" aria-label="装备">');
    expect(mainHtml).not.toContain('id="subclass-name"');
    expect(storyHtml).toContain('<section class="story-overview" aria-label="角色设定概览">');
    expect(baseCss).toMatch(/\.story-overview\s*\{[^}]*align-items:\s*stretch/s);
    expect(baseCss).toMatch(/\.story-overview\s*>\s*\[data-module-slot-id\]\s*\{[^}]*height:\s*100%/s);
    expect(baseCss).toMatch(/\.story-overview \[data-module-type="longText"\] \[data-part="input"\]\s*\{[^}]*flex:\s*1 1 auto[^}]*height:\s*100%/s);
    expect(storyHtml).toContain('<section class="question-layout" aria-label="背景与关系">');
    expect(storyHtml).toContain('<section class="advancement-region" aria-label="升级记录">');
  });

  it("mounts each intended Sheet Module once and leaves subclass text to Cards", () => {
    const allHtml = `${shellHtml}${mainHtml}${storyHtml}`;
    const mountedIds = [...allHtml.matchAll(/<pb-module id="([^"]+)"/g)].map((match) => match[1]);
    const declaredIds = modules.map((module) => module.ID);

    expect(new Set(mountedIds).size).toBe(mountedIds.length);
    expect(mountedIds.every((id) => declaredIds.includes(id))).toBe(true);
    expect(declaredIds.filter((id) => !mountedIds.includes(id))).toEqual(["subclass-name"]);
  });

  it("declares complete persistent advancement checklists and read-only guidance", () => {
    expect(modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ ID: "advancement-tier-2", 类型: "checkboxResource" }),
      expect.objectContaining({ ID: "advancement-tier-3", 类型: "checkboxResource" }),
      expect.objectContaining({ ID: "advancement-tier-4", 类型: "checkboxResource" }),
    ]));
    expect(storyHtml).toContain('id="advancement-tier-2"');
    expect(storyHtml).toContain('id="advancement-tier-3"');
    expect(storyHtml).toContain('id="advancement-tier-4"');
    expect(modules.filter((module) => module.ID.startsWith("advancement-tier-") && module.类型 === "readOnlyDisplay")).toHaveLength(9);
    expect(storyHtml).toContain('id="advancement-tier-2-reward"');
    expect(storyHtml).toContain('id="advancement-tier-3-instructions"');
    expect(storyHtml).toContain('id="advancement-tier-4-footer"');

    const tier2 = modules.find((module) => module.ID === "advancement-tier-2");
    const tier3 = modules.find((module) => module.ID === "advancement-tier-3");
    const tier4 = modules.find((module) => module.ID === "advancement-tier-4");
    expect(tier2).toEqual(expect.objectContaining({ 类型: "checkboxResource", 选项: expect.arrayContaining([
      expect.objectContaining({ ID: "traits-3", 分组: "traits" }),
      expect.objectContaining({ ID: "hp-2", 分组: "hp" }),
      expect.objectContaining({ ID: "stress-2", 分组: "stress" }),
    ]) }));
    expect(tier2 && "选项" in tier2 ? tier2.选项 : []).toHaveLength(10);
    expect(tier3 && "选项" in tier3 ? tier3.选项 : []).toHaveLength(15);
    expect(tier4 && "选项" in tier4 ? tier4.选项 : []).toHaveLength(15);
    expect(tier3).toEqual(expect.objectContaining({ 选项: expect.arrayContaining([
      expect.objectContaining({ ID: "proficiency-2" }),
      expect.objectContaining({ ID: "multiclass-2" }),
    ]) }));
    expect(baseCss).toMatch(/\.advancement-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
    expect(baseCss).toMatch(/\.advancement-grid \[data-module-type="readOnlyDisplay"\] \[data-part="label"\]\s*\{[^}]*display:\s*none/s);
    expect(baseCss).toMatch(/\.advancement-grid \[data-module-type="checkboxResource"\] > \[data-part="label"\]\s*\{[^}]*display:\s*none/s);
    expect(baseCss).toMatch(/\.advancement-grid \[data-module-type="checkboxResource"\] \[data-part="option"\]\s*\{[^}]*grid-template-columns:\s*2\.5rem minmax\(0,\s*1fr\)/s);
    expect(baseCss).toMatch(/\.advancement-grid \[data-part="input"\]\s*\{[^}]*margin:\s*0/s);
    expect(baseCss).toMatch(/\.advancement-grid \[data-part="option-label"\]\s*\{[^}]*font-size:\s*0\.75rem[^}]*text-align:\s*left/s);
  });

  it("uses compact Picker-field rows and requested Player-facing labels", () => {
    expect(mainHtml).toContain('class="brand-panel" aria-label="匕首之心">匕首之心</div>');
    expect(mainHtml).not.toContain("labeled-picker");
    expect(modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ ID: "pick-class", 按钮文本: "职业" }),
      expect.objectContaining({ ID: "pick-subclass", 按钮文本: "子职" }),
    ]));
    expect(mainHtml.indexOf('class="character-name-field"')).toBeLessThan(mainHtml.indexOf('class="picker-field class-field"'));
    expect(mainHtml.indexOf('class="picker-field ancestry-field"')).toBeLessThan(mainHtml.indexOf('class="picker-field community-field"'));
    expect(baseCss).toMatch(/\.class-field\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto auto/s);
    expect(mainHtml).toContain('class="equipment-fields weapon-fields"');
    expect(mainHtml).not.toContain("<h3>主武器</h3>");
    expect(baseCss).toMatch(/data-module-type="resourcePicker"[^}]*font-size:\s*0/s);
    expect(modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ ID: "primary-weapon-name", 占位文本: "主武器" }),
      expect.objectContaining({ ID: "item-1", 标签: "", 占位文本: "物品栏 1" }),
      expect.objectContaining({ ID: "handful-gold", 标签: "把" }),
      expect.objectContaining({ ID: "bag-gold", 标签: "袋" }),
      expect.objectContaining({ ID: "chest-gold", 标签: "箱" }),
    ]));
  });

  it("uses aligned compact Pickers, a wider left body column, and a zero-gap vertical inventory", () => {
    expect(baseCss).toMatch(/data-module-type="resourcePicker"[^}]*align-self:\s*center/s);
    expect(baseCss).toMatch(/data-part="button"[^}]*height:\s*1\.65rem/s);
    expect(baseCss).toContain("grid-template-columns: minmax(24rem, 1.15fr) minmax(21rem, 1.05fr)");
    expect(baseCss).toMatch(/\.item-list\s*\{[^}]*grid-template-columns:\s*1fr[^}]*gap:\s*0[^}]*margin-top:\s*0/s);
    expect(baseCss).toMatch(/\.item-list article\s*\{[^}]*gap:\s*0[^}]*margin:\s*0[^}]*padding:\s*0/s);
  });

  it("repackages main-page resources, equipment, experiences, and inventory into aligned body rows", () => {
    const upperStart = mainHtml.indexOf('class="upper-stat-layout"');
    const bodyStart = mainHtml.indexOf('class="sheet-body-layout"');
    expect(mainHtml.indexOf('id="major-threshold"', upperStart)).toBeLessThan(bodyStart);
    expect(mainHtml.indexOf('id="severe-threshold"', upperStart)).toBeLessThan(bodyStart);
    expect(mainHtml.indexOf('id="armor-slots"')).toBeGreaterThan(bodyStart);

    const resourceStart = mainHtml.indexOf('class="sheet-region resource-region"');
    const classFeatureStart = mainHtml.indexOf('class="sheet-region class-feature-region"');
    for (const id of ["hp", "stress", "armor-slots", "hope", "class-hope-feature"]) {
      const position = mainHtml.indexOf(`id="${id}"`, resourceStart);
      expect(position).toBeGreaterThan(resourceStart);
      expect(position).toBeLessThan(classFeatureStart);
    }

    const experienceStart = mainHtml.indexOf('class="sheet-region experience-region"');
    const classFeatureStartAfterExperience = mainHtml.indexOf('class="sheet-region class-feature-region"', experienceStart);
    const rightColumnStart = mainHtml.indexOf('class="sheet-right-column sheet-main-right"');
    const inventoryStart = mainHtml.indexOf('class="sheet-region inventory-region"');
    const currencyStart = mainHtml.indexOf('class="currency-row"', inventoryStart);
    const backupStart = mainHtml.indexOf('class="backup-weapons"', inventoryStart);
    expect(classFeatureStartAfterExperience).toBeGreaterThan(experienceStart);
    expect(classFeatureStartAfterExperience).toBeLessThan(rightColumnStart);
    expect(inventoryStart).toBeGreaterThan(rightColumnStart);
    expect(currencyStart).toBeGreaterThan(inventoryStart);
    expect(backupStart).toBeGreaterThan(currencyStart);

    expect(baseCss).toMatch(/\.weapon-fields\s*\{[^}]*3\.5em 3\.5em 4\.5em 3\.5em 3\.5em/s);
    expect(baseCss).toMatch(/\.backup-weapon-fields\s*\{[^}]*3\.5em 3\.5em 4\.5em 3\.5em 3\.5em/s);
    expect(modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ ID: "class-hope-feature", 类型: "longText", 行数: 2 }),
      expect.objectContaining({ ID: "class-feature", 类型: "longText", 行数: 12 }),
    ]));
  });

  it("provides placeholders for every compact equipment value field", () => {
    const expectedPlaceholders: Record<string, string> = {
      "primary-weapon-stat": "属性",
      "primary-weapon-range": "距离",
      "primary-weapon-damage": "伤害",
      "primary-weapon-damage-type": "类型",
      "primary-weapon-hands": "负荷",
      "armor-base-major": "阈值",
      "armor-base-severe": "严重阈值",
    };

    for (const [id, placeholder] of Object.entries(expectedPlaceholders)) {
      expect(modules).toEqual(expect.arrayContaining([expect.objectContaining({ ID: id, 占位文本: placeholder })]));
    }
  });

  it("uses one filtered Weapon Library without duplicate category fields", () => {
    const weaponEntries = JSON.parse(weaponsJson) as Array<Record<string, unknown>>;

    expect(weaponEntries.every((entry) => "伤害类型" in entry && "负荷" in entry)).toBe(true);
    expect(new Set(weaponEntries.map((entry) => entry.ID)).size).toBe(weaponEntries.length);
    expect(new Set(weaponEntries.map((entry) => entry.类型))).toEqual(new Set(["主武器", "副武器"]));
    expect(weaponEntries.every((entry) => !("双手" in entry))).toBe(true);
    expect(weaponEntries.every((entry) => !("武器类别" in entry))).toBe(true);
    expect(manifest.resourceLibraries).toEqual(expect.arrayContaining([
      expect.objectContaining({ ID: "weapons", 路径: "resources/weapons.json" }),
    ]));
    expect(manifest.resourceLibraries.some((library) => ["primary-weapons", "secondary-weapons", "backup-weapons"].includes(library.ID))).toBe(false);
    expect(modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ ID: "pick-primary-weapon", 资源库ID: "weapons", 默认查询: expect.objectContaining({ filters: { 类型: ["主武器"] } }) }),
      expect.objectContaining({ ID: "pick-secondary-weapon", 资源库ID: "weapons", 默认查询: expect.objectContaining({ filters: { 类型: ["副武器"] } }) }),
      expect.objectContaining({ ID: "pick-backup-weapon-1", 资源库ID: "weapons" }),
      expect.objectContaining({ ID: "pick-backup-weapon-2", 资源库ID: "weapons" }),
    ]));
    expect(modules.some((module) => module.ID === "backup-weapon-1-category" || module.ID === "backup-weapon-2-category")).toBe(false);
    expect(JSON.stringify(dependencies)).toContain('"字段":"伤害类型"');
    expect(JSON.stringify(dependencies)).toContain('"字段":"负荷"');
    expect(JSON.stringify(dependencies)).not.toContain('"字段":"双手"');
    expect(JSON.stringify(dependencies)).not.toContain("武器类别");
  });

  it("balances upper stats, fills countable controls, and compacts equipment descriptions", () => {
    expect(baseCss).toContain("grid-template-columns: repeat(6, minmax(0, 1fr))");
    expect(baseCss).toMatch(/\.daggerheart-sheet\s*\{[^}]*align-content:\s*start/s);
    expect(baseCss).toMatch(/\.trait-summary \[data-part="input"\][^}]*font-size:\s*clamp\(1\.25rem, 1\.7vw, 1\.65rem\)/s);
    expect(countableResourceCss).toMatch(/\.counter\s*\{[^}]*width:\s*100%/s);
    expect(countableResourceCss).toMatch(/\.counter\s*\{[^}]*flex:\s*1 1 auto/s);
    expect(countableResourceCss).toMatch(/\.counter\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\) auto/s);
    expect(countableResourceCss).toMatch(/\.counter-value-group\s*\{[^}]*justify-content:\s*center/s);
    expect(baseCss).toMatch(/data-module-id\$="-description"[^}]*min-height:\s*2\.25rem/s);
  });

  it("adds five compact Experience and modifier rows between Hope and Currency", () => {
    for (let index = 1; index <= 5; index += 1) {
      expect(modules).toEqual(expect.arrayContaining([
        expect.objectContaining({ ID: `experience-${index}`, 类型: "freeText" }),
        expect.objectContaining({ ID: `experience-modifier-${index}`, 类型: "freeText" }),
      ]));
      expect(mainHtml).toContain(`id="experience-${index}"`);
      expect(mainHtml).toContain(`id="experience-modifier-${index}"`);
    }
    expect(mainHtml.indexOf('class="sheet-region experience-region"')).toBeGreaterThan(mainHtml.indexOf('class="sheet-main-left"'));
    expect(mainHtml.indexOf('class="sheet-region experience-region"')).toBeLessThan(mainHtml.indexOf('class="sheet-right-column sheet-main-right"'));
  });

  it("adds Event Log and Background Story beside the portrait", () => {
    expect(modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ ID: "event-log", 类型: "longText" }),
      expect.objectContaining({ ID: "background-story", 类型: "longText" }),
    ]));
    expect(storyHtml).toContain('<section class="story-overview" aria-label="角色设定概览">');
    expect(storyHtml).toContain('id="event-log"');
    expect(storyHtml).toContain('id="background-story"');
    expect(storyHtml).toContain('id="character-avatar"');
  });

  it("mounts Pages on the left and the shared Card Table once on the right", () => {
    expect((shellHtml.match(/<pb-page-outlet>/g) ?? [])).toHaveLength(1);
    expect((shellHtml.match(/id="character-card-table"/g) ?? [])).toHaveLength(1);
    expect(shellHtml).toContain('id="pick-domain-card"');
    expect(shellHtml).toContain('id="pick-beast-form"');
    expect(mainHtml).not.toContain('id="character-card-table"');
    expect(storyHtml).not.toContain('id="character-card-table"');
  });
});

async function loadDaggerheartPackage() {
  const bytes = zipSync({
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "pages.json": strToU8(JSON.stringify(pages)),
    "modules.json": strToU8(JSON.stringify(modules)),
    "dependencies.json": strToU8(JSON.stringify(dependencies)),
      "layouts/base.css": strToU8(baseCss),
      "layouts/shell.html": strToU8(shellHtml),
      "layouts/shell.css": strToU8(shellCss),
      "layouts/character-main.html": strToU8(mainHtml),
      "layouts/character-story.html": strToU8(storyHtml),
    "resources/ancestries.json": strToU8(ancestriesJson),
    "resources/communities.json": strToU8(communitiesJson),
    "resources/classes.json": strToU8(classesJson),
    "resources/subclasses.json": strToU8(subclassesJson),
    "resources/weapons.json": strToU8(weaponsJson),
    "resources/armor.json": strToU8(armorJson),
    "resources/loot.json": strToU8(lootJson),
    "resources/domain-cards.json": strToU8(domainCardsJson),
    "resources/beast-forms.json": strToU8(beastFormsJson),
    "checks/character-consistency.js": strToU8(consistencyCheck),
  });
  return loadSystemPackageFromZipFile(new Blob([bytes], { type: "application/zip" }));
}
