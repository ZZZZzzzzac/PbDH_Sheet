module.exports = ({ characterData, resourceLibraries }) => {
  const values = characterData && characterData.character ? characterData.character.values || {} : {};
  const libraries = new Map((resourceLibraries || []).map((library) => [library.ID, library]));
  const issues = [];
  const level = integer(values.level);
  const className = text(values["class-name"]);
  const subclassName = text(values["subclass-name"]);
  const subclassStage = text(values["subclass-stage"]);
  const attackAttribute = text(values["weapon-attack-attribute"]);
  const armorSummary = text(values["armor-summary"]);
  const thresholds = text(values.thresholds);
  const armorValue = text(values["armor-value"]);

  if (level === undefined || level < 1 || level > 10) {
    warn(issues, "LEVEL_INVALID", "character.values.level", "等级应为 1 到 10 的整数。");
  }
  if (!className) {
    warn(issues, "CLASS_MISSING", "character.values.class-name", "尚未选择职业。");
  } else if (!hasNamedEntry(libraries.get("classes"), className)) {
    warn(issues, "CLASS_UNKNOWN", "character.values.class-name", "当前职业不在职业资源库中。");
  }
  if (!subclassName) {
    warn(issues, "SUBCLASS_MISSING", "character.values.subclass-name", "尚未选择子职。");
  }
  if (subclassName && !["T1", "T2", "T3", "T4X", "T4Y"].includes(subclassStage)) {
    warn(issues, "SUBCLASS_STAGE_INVALID", "character.values.subclass-stage", "子职阶段必须是 T1、T2、T3、T4X 或 T4Y。");
  } else if (subclassName && !hasSubclassEntry(libraries.get("subclasses"), subclassName, subclassStage)) {
    warn(issues, "SUBCLASS_UNKNOWN", "character.values.subclass-name", "当前子职及阶段组合不在子职资源库中。");
  }
  if (subclassName && !["敏捷", "力量", "灵巧", "本能", "风度", "知识"].includes(attackAttribute)) {
    warn(issues, "WEAPON_ATTACK_ATTRIBUTE_MISSING", "character.values.weapon-attack-attribute", "选择子职后，需要声明武器原型使用的攻击属性。");
  }
  if (armorSummary && !/^\d+\s*[/／]\s*\d+$/.test(thresholds)) {
    warn(issues, "CURRENT_THRESHOLDS_INVALID", "character.values.thresholds", "请按“重度 / 严重”填写当前阈值；当前阈值应计入护甲基础阈值、等级和其他价值。");
  }
  if (armorSummary && !/^\d+$/.test(armorValue)) {
    warn(issues, "CURRENT_ARMOR_VALUE_INVALID", "character.values.armor-value", "请填写当前护甲值，并计入护甲基础值、等级和其他价值。");
  }

  const t2 = checkboxState(values["advancement-tier-2"]);
  const t3 = checkboxState(values["advancement-tier-3"]);
  const t4 = checkboxState(values["advancement-tier-4"]);
  if (t2.subclass === true && !["T2", "T3", "T4X", "T4Y"].includes(subclassStage)) {
    warn(issues, "T2_SUBCLASS_UPGRADE_MISSING", "character.values.subclass-stage", "已在 T2 勾选升级子职，但当前子职尚未升级至 T2。");
  }
  if (t3.subclass === true && !["T3", "T4X", "T4Y"].includes(subclassStage)) {
    warn(issues, "T3_SUBCLASS_UPGRADE_MISSING", "character.values.subclass-stage", "已在 T3 勾选升级子职，但当前子职尚未升级至 T3。");
  }

  if ((level !== undefined && level >= 8) || t4["subclass-elite"] === true) {
    if (!["T4X", "T4Y"].includes(subclassStage)) {
      warn(issues, "T4_ELITE_SUBCLASS_MISSING", "character.values.subclass-stage", "T4 应选择精英干员 X 或 Y。");
    }
  } else if (["T4X", "T4Y"].includes(subclassStage)) {
    warn(issues, "ELITE_SUBCLASS_BEFORE_T4", "character.values.subclass-stage", "角色尚未到达 T4，不应提前选择精英干员。");
  }

  return issues;
};

function hasNamedEntry(library, name) {
  return Boolean(library && library.entries.some((entry) => (entry.fields && entry.fields.名称) === name));
}

function hasSubclassEntry(library, name, stage) {
  return Boolean(library && library.entries.some((entry) => entry.fields && entry.fields.名称 === name && entry.fields.阶段 === stage));
}

function checkboxState(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function integer(value) {
  const source = text(value);
  return /^\d+$/.test(source) ? Number(source) : undefined;
}

function warn(issues, code, path, textValue) {
  issues.push({ level: "warning", code, path, text: textValue });
}
