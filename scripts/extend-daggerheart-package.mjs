import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "public", "system-packages", "daggerheart-core");
const modulesPath = path.join(packageRoot, "modules.json");
const dependenciesPath = path.join(packageRoot, "dependencies.json");
const modules = JSON.parse(await readFile(modulesPath, "utf8"));
const dependencies = JSON.parse(await readFile(dependenciesPath, "utf8"));

const additions = [];
const rules = [];

for (const config of [
  { id: "primary-weapon", label: "主武器", library: "primary-weapons" },
  { id: "secondary-weapon", label: "副武器", library: "secondary-weapons" },
  { id: "backup-weapon-1", label: "备用武器一", library: "backup-weapons" },
  { id: "backup-weapon-2", label: "备用武器二", library: "backup-weapons" },
]) {
  additions.push(
    picker(`pick-${config.id}`, `选择${config.label}`, config.library),
    text(`${config.id}-name`, `${config.label}名称`),
    text(`${config.id}-stat`, "属性"),
    text(`${config.id}-range`, "距离"),
    text(`${config.id}-damage`, "伤害"),
    text(`${config.id}-damage-type`, "伤害类型"),
    text(`${config.id}-hands`, "持握方式"),
    ...(config.library === "backup-weapons" ? [text(`${config.id}-category`, "武器类别")] : []),
    longText(`${config.id}-description`, `${config.label}描述`, 4),
  );
  const fields = [
    ["name", "名称"], ["stat", "属性"], ["range", "距离"], ["damage", "伤害"],
    ["damage-type", "伤害类型"], ["hands", "双手"],
    ...(config.library === "backup-weapons" ? [["category", "武器类别"]] : []),
    ["description", "描述"],
  ];
  rules.push(fillFieldsRule(`fill-${config.id}`, `pick-${config.id}`, config.id, fields));
}

additions.push(
  picker("pick-armor", "选择护甲", "armor"),
  text("armor-name", "护甲名称"),
  text("armor-base-major", "基础重度阈值"),
  text("armor-base-severe", "基础严重阈值"),
  text("armor-value", "护甲值"),
  longText("armor-description", "护甲描述", 4),
);
rules.push({
  ID: "fill-armor",
  sources: [{ 类型: "resourcePicker", 模块ID: "pick-armor" }],
  targets: ["armor-name", "armor-base-major", "armor-base-severe", "armor-value", "armor-description", "armor-slots"].map(target),
  触发: { 类型: "resourceSelected", 来源模块ID: "pick-armor" },
  条件: { 类型: "always" },
  动作: [
    fillText("armor-name", "名称"),
    fillText("armor-base-major", "重度阈值"),
    fillText("armor-base-severe", "严重阈值"),
    fillText("armor-value", "护甲值"),
    fillText("armor-description", "描述"),
    { 类型: "fillCountable", 目标模块ID: "armor-slots", 最大值: selectedField("护甲值") },
  ],
});

for (let index = 1; index <= 5; index += 1) {
  additions.push(picker(`pick-item-${index}`, `选择物品 ${index}`, "loot"), text(`item-${index}`, `物品 ${index}`));
  rules.push(fillFieldsRule(`fill-item-${index}`, `pick-item-${index}`, `item-${index}`, [["", "名称"]], true));
}

additions.push(
  cardPicker("pick-domain-card", "选择领域卡", "domain-cards"),
  cardPicker("pick-beast-form", "选择野兽形态", "beast-forms"),
  { ID: "character-avatar", 类型: "imageField", 标签: "角色头像", 替代文本: "角色头像" },
  longText("character-appearance", "角色形象", 6),
  longText("event-log", "事件记录", 10),
);
for (let index = 1; index <= 3; index += 1) {
  additions.push(longText(`background-answer-${index}`, `背景回答 ${index}`, 4));
  additions.push(longText(`connection-answer-${index}`, `关系回答 ${index}`, 4));
}

const classDomains = {
  吟游诗人: ["优雅", "典籍"], 德鲁伊: ["贤者", "奥术"], 守护者: ["勇气", "利刃"],
  游侠: ["骸骨", "贤者"], 游荡者: ["午夜", "优雅"], 神使: ["辉耀", "勇气"],
  术士: ["奥术", "午夜"], 战士: ["利刃", "骸骨"], 法师: ["典籍", "辉耀"],
};
for (const [className, domains] of Object.entries(classDomains)) {
  rules.push({
    ID: `filter-domain-${className}`,
    sources: [{ 类型: "resourcePicker", 模块ID: "pick-class" }],
    targets: [target("pick-domain-card")],
    触发: { 类型: "resourceSelected", 来源模块ID: "pick-class" },
    条件: { 类型: "selectedResourceFieldEquals", 字段: "名称", 值: className },
    动作: [{ 类型: "setResourceDefaultFilter", 目标模块ID: "pick-domain-card", 字段: "领域", 值: domains }],
  });
}

appendUnique(modules, additions);
appendUnique(dependencies, rules);
await writeFile(modulesPath, `${JSON.stringify(modules, null, 2)}\n`, "utf8");
await writeFile(dependenciesPath, `${JSON.stringify(dependencies, null, 2)}\n`, "utf8");

function picker(ID, 按钮文本, 资源库ID) {
  return { ID, 类型: "resourcePicker", 按钮文本, 资源库ID, 默认查询: { sort: { field: "名称", direction: "asc" } } };
}
function cardPicker(ID, 按钮文本, 资源库ID) {
  return { ...picker(ID, 按钮文本, 资源库ID), 创建卡牌: { 卡牌桌面模块ID: "character-card-table", 默认状态: "configured" } };
}
function text(ID, 标签) { return { ID, 类型: "freeText", 标签 }; }
function longText(ID, 标签, 行数) { return { ID, 类型: "longText", 标签, 行数 }; }
function target(模块ID) { return { 类型: "module", 模块ID }; }
function selectedField(字段) { return { 类型: "selectedResourceField", 字段 }; }
function fillText(目标模块ID, 字段) { return { 类型: "fillText", 目标模块ID, 内容: selectedField(字段) }; }
function fillFieldsRule(ID, pickerId, prefix, fields, directTarget = false) {
  const mappings = fields.map(([suffix, field]) => [directTarget ? prefix : `${prefix}-${suffix}`, field]);
  return {
    ID,
    sources: [{ 类型: "resourcePicker", 模块ID: pickerId }],
    targets: mappings.map(([moduleId]) => target(moduleId)),
    触发: { 类型: "resourceSelected", 来源模块ID: pickerId },
    条件: { 类型: "always" },
    动作: mappings.map(([moduleId, field]) => fillText(moduleId, field)),
  };
}
function appendUnique(targetArray, values) {
  const ids = new Set(targetArray.map((value) => value.ID));
  for (const value of values) if (!ids.has(value.ID)) targetArray.push(value);
}
