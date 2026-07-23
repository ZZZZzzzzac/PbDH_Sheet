const ELITE_STAGES = ["等级精英X", "等级精英Y"];
const ALL_STAGES = ["预备", "正式", "资深", ...ELITE_STAGES];
const STAGE_MESSAGE = "干员等级必须是预备、正式、资深、等级精英X或等级精英Y。";

module.exports = ({ characterData, resourceLibraries }) => {
  const values = characterData && characterData.character ? characterData.character.values || {} : {};
  const libraries = new Map((resourceLibraries || []).map((library) => [library.ID, library]));
  const issues = [];
  const level = integer(values.level);
  const className = text(values["class-name"]);
  const subclassName = text(values["subclass-name"]);
  const subclassStage = text(values["subclass-stage"]);
  const isElite = ELITE_STAGES.includes(subclassStage);
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
    warn(issues, "SUBCLASS_MISSING", "character.values.subclass-name", "尚未选择干员。");
  }
  if (subclassName && !ALL_STAGES.includes(subclassStage)) {
    warn(issues, "SUBCLASS_STAGE_INVALID", "character.values.subclass-stage", STAGE_MESSAGE);
  } else if (subclassName && !hasSubclassEntry(libraries.get("subclasses"), subclassName, subclassStage)) {
    warn(issues, "SUBCLASS_UNKNOWN", "character.values.subclass-name", "当前干员类型及等级组合不在干员资源库中。");
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
  if (t2.subclass === true && !["正式", "资深", ...ELITE_STAGES].includes(subclassStage)) {
    warn(issues, "T2_SUBCLASS_UPGRADE_MISSING", "character.values.subclass-stage", "已在 T2 勾选升级干员，但当前干员仍是预备等级。");
  }
  if (t3.subclass === true && !["资深", ...ELITE_STAGES].includes(subclassStage)) {
    warn(issues, "T3_SUBCLASS_UPGRADE_MISSING", "character.values.subclass-stage", "已在 T3 勾选升级干员，但当前干员尚未达到资深等级。");
  }

  if ((level !== undefined && level >= 8) || t4["subclass-elite"] === true) {
    if (!isElite) {
      warn(issues, "T4_ELITE_SUBCLASS_MISSING", "character.values.subclass-stage", "T4 应选择等级精英X或等级精英Y的干员。");
    }
  } else if (isElite) {
    warn(issues, "ELITE_SUBCLASS_BEFORE_T4", "character.values.subclass-stage", "角色尚未到达 T4，不应提前选择等级精英的干员。");
  }

  return issues;
};

function hasNamedEntry(library, name) {
  return Boolean(library && library.entries.some((entry) => (entry.fields && entry.fields.名称) === name));
}

function hasSubclassEntry(library, name, stage) {
  return Boolean(library && library.entries.some((entry) => entry.fields && entry.fields.名称 === name && entry.fields.等级 === stage));
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
