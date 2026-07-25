function image(data, moduleId) {
  const value = data.character.values[moduleId];
  return value && value.kind === "player-image" && data.playerImages[value.imageId] ? data.playerImages[value.imageId].dataUrl : undefined;
}
function entryFor(card, libraries) {
  if (!card.definitionRef || card.definitionRef.type !== "resourceLibrary") return undefined;
  const library = libraries.find((item) => item.ID === card.definitionRef.libraryId);
  const entry = library && library.entries.find((item) => item.ID === card.definitionRef.entryId);
  return entry ? { libraryId: library.ID, entry } : undefined;
}
function field(entry, name) { return name === "ID" ? entry.ID : entry.fields && entry.fields[name] !== undefined ? entry.fields[name] : entry[name]; }
function countable(value) { return value && typeof value.current === "number" ? value : undefined; }
function exportCards(data, libraries, state, dhSheet) {
  const allowed = ["communities", "subclasses", "domain-cards"];
  const cards = [];
  for (const card of data.cards.instances) {
    if (card.tableModuleId !== "character-card-table" || card.state !== state) continue;
    const found = entryFor(card, libraries);
    if (!found || !allowed.includes(found.libraryId)) continue;
    const name = field(found.entry, "名称");
    const description = field(found.entry, "描述");
    if (!name || !description) continue;
    cards.push(dhSheet ? { id: field(found.entry, "原名"), name, class: field(found.entry, "领域"), description } : { data: { 原名: field(found.entry, "原名"), 名称: name, 描述: description } });
  }
  return cards;
}
function exportZzz(data, libraries) {
  const values = data.character.values;
  const document = { cards: exportCards(data, libraries, "配置", false) };
  const pairs = {
    "character-name": "NameTextbox", "ancestry-name": "RaceTextbox", "community-name": "CommunityTextbox", "class-name": "ClassTextbox", level: "LevelTextbox", evasion: "EvasionTextbox",
    agility: "AgilityTextbox", strength: "StrengthTextbox", finesse: "FinesseTextbox", instinct: "InstinctTextbox", presence: "PresenceTextbox", knowledge: "KnowledgeTextbox",
    "major-threshold": "MajorTextbox", "severe-threshold": "SevereTextbox", "class-feature": "ClassFeatureTextbox", "primary-weapon-description": "PrimaryWeaponTraitTextbox",
    "secondary-weapon-description": "SecondaryWeaponTraitTextbox", "backup-weapon-1-name": "Backup1WeaponNameTextbox", "backup-weapon-1-description": "Backup1WeaponTraitTextbox",
    "backup-weapon-2-name": "Backup2WeaponNameTextbox", "backup-weapon-2-description": "Backup2WeaponTraitTextbox", "armor-value": "ArmorTextbox", "armor-description": "ArmorTraitTextbox",
    inventory: "ItemSlot1Textbox", "event-log": "EventLogTextbox",
  };
  Object.entries(pairs).forEach(([id, target]) => { if (typeof values[id] === "string") document[target] = values[id]; });
  if (typeof values["primary-weapon-name"] === "string") document.PrimaryWeaponNameTextbox = values["primary-weapon-name"];
  if (typeof values["secondary-weapon-name"] === "string") document.SecondaryWeaponNameTextbox = values["secondary-weapon-name"];
  if (typeof values["armor-name"] === "string") document.ArmorNameTextbox = values["armor-name"];
  for (let index = 1; index <= 5; index += 1) { document[`Experience${index}Textbox`] = values[`experience-${index}`] || ""; document[`Experience${index}ModifierTextbox`] = values[`experience-modifier-${index}`] || ""; }
  for (let index = 1; index <= 3; index += 1) { document[`BackgroundQuestion${index}Textbox`] = values[`background-question-${index}`] || ""; document[`ConnectQuestion${index}Textbox`] = values[`connection-question-${index}`] || ""; document[`BackgroundAnswer${index}Textbox`] = values[`background-answer-${index}`] || ""; document[`ConnectAnswer${index}Textbox`] = values[`connection-answer-${index}`] || ""; }
  for (const [id, prefix, length, tri] of [["hp", "HpSlotCheckbox", 12, true], ["stress", "StressSlotCheckbox", 12, true], ["armor-slots", "ArmorSlotCheckbox", 12, true], ["hope", "HopeSlotCheckbox", 6, false], ["proficiency", "ProficiencyCheckbox", 5, false], ["handful-gold", "HandfulGoldCheckbox", 9, false], ["bag-gold", "BagGoldCheckbox", 9, false]]) {
    const value = countable(values[id]);
    if (!value) continue;
    for (let index = 0; index < length; index += 1) document[`${prefix}${index + 1}`] = index < value.current ? 1 : tri && value.max !== null && index >= value.max ? 2 : 0;
  }
  const chest = countable(values["chest-gold"]); if (chest) document.ChestGoldCheckbox1 = chest.current;
  const advancement = { A1: "traits-1", A2: "traits-2", A3: "traits-3", B1: "hp-1", B2: "hp-2", C1: "stress-1", C2: "stress-2", D1: "experiences", E1: "domain-card", F1: "subclass", G1: "evasion", H1: "proficiency-1", I1: "multiclass-1" };
  for (const tier of [2, 3, 4]) { const state = values[`advancement-tier-${tier}`] || {}; Object.entries(advancement).forEach(([suffix, option]) => { document[`LevelupT${tier}_${suffix}`] = state[option] ? 1 : 0; }); }
  const avatar = image(data, "character-avatar"); if (avatar) document.avatarImageSrc = avatar;
  return { document, exportedFields: Object.keys(document).length, exportedCards: document.cards.length, exportedImages: avatar ? 1 : 0, skippedFields: 0, skippedCards: 0, skippedImages: 0, diagnostics: [] };
}
function exportDhSheet(data, libraries) {
  const values = data.character.values;
  const number = (id) => Number(values[id]) || 0;
  const document = { ruleSetId: "daggerheart", cards: exportCards(data, libraries, "配置", true), inventory_cards: exportCards(data, libraries, "宝库", true), name: values["character-name"] || "", level: number("level"), evasion: number("evasion") };
  for (const id of ["agility", "strength", "finesse", "instinct", "presence", "knowledge"]) document[id] = { value: number(id) };
  document.professionRef = { name: values["class-name"] || "" }; document.communityRef = { name: values["community-name"] || "" }; document.subclassRef = { name: values["subclass-name"] || "" }; document.ancestry1Ref = { name: values["ancestry-name"] || "" };
  for (const [id, current, max, array] of [["hp", "hp", "hpMax", true], ["stress", "stress", "stressMax", true], ["hope", "hope", "hopeMax", false], ["armor-slots", "armorBoxes", "armorMax", true], ["proficiency", "proficiency", null, true]]) {
    const value = countable(values[id]); if (!value) continue; document[current] = array ? Array.from({ length: value.max === null ? value.current : value.max }, (_, index) => index < value.current) : value.current; if (max) document[max] = value.max;
  }
  const avatar = image(data, "character-avatar"); const companion = image(data, "companion-portrait"); if (avatar) document.characterImage = avatar; if (companion) document.companionImage = companion;
  return { document, exportedFields: Object.keys(document).length, exportedCards: document.cards.length + document.inventory_cards.length, exportedImages: (avatar ? 1 : 0) + (companion ? 1 : 0), skippedFields: 0, skippedCards: 0, skippedImages: 0, diagnostics: [] };
}
module.exports = function (input) { return input.adapterId === "zzz-character-json" ? exportZzz(input.characterData, input.resourceLibraries || []) : exportDhSheet(input.characterData, input.resourceLibraries || []); };
