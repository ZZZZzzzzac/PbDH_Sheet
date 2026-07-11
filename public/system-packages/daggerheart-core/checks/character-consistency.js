module.exports = ({ characterData, resourceLibraries }) => {
  const issues = [];
  const values = characterData.character.values;
  const classEntry = findEntry(resourceLibraries, "classes", text(values["class-name"]));
  const armorEntry = findEntry(resourceLibraries, "armor", text(values["armor-name"]));
  const level = countableCurrent(values.level);

  if (classEntry) {
    compareCountableMax(issues, values.hp, integer(classEntry.fields["生命点"]), {
      code: "CLASS_HP_MAX_MISMATCH",
      path: "character.values.hp",
      label: `职业「${classEntry.fields["名称"]}」的初始生命上限`,
    });
  }

  if (armorEntry) {
    compareCountableMax(issues, values["armor-slots"], integer(armorEntry.fields["护甲值"]), {
      code: "ARMOR_MAX_MISMATCH",
      path: "character.values.armor-slots",
      label: `护甲「${armorEntry.fields["名称"]}」的护甲值`,
    });

    if (level !== undefined) {
      compareTextInteger(issues, values["major-threshold"], add(integer(armorEntry.fields["重伤阈值"]), level), {
        code: "MAJOR_THRESHOLD_MISMATCH",
        path: "character.values.major-threshold",
        label: "重伤阈值",
      });
      compareTextInteger(issues, values["severe-threshold"], add(integer(armorEntry.fields["严重阈值"]), level), {
        code: "SEVERE_THRESHOLD_MISMATCH",
        path: "character.values.severe-threshold",
        label: "严重阈值",
      });
    }
  }

  return issues;
};

function findEntry(libraries, libraryId, name) {
  if (!name) return undefined;
  return libraries.find((library) => library.ID === libraryId)?.entries.find((entry) => entry.fields["名称"] === name);
}

function compareCountableMax(issues, value, expected, config) {
  if (expected === undefined || !isCountable(value) || value.max === expected) return;
  issues.push({
    level: "warning",
    code: config.code,
    path: config.path,
    text: `${config.label}应为 ${expected}，当前为 ${value.max ?? "无上限"}。`,
  });
}

function compareTextInteger(issues, value, expected, config) {
  if (expected === undefined) return;
  const actual = integer(value);
  if (actual === expected) return;
  issues.push({
    level: "warning",
    code: config.code,
    path: config.path,
    text: `${config.label}应为 ${expected}，当前为 ${actual ?? "未填写或不是整数"}。`,
  });
}

function text(value) { return typeof value === "string" ? value.trim() : ""; }
function integer(value) {
  const source = typeof value === "number" ? String(value) : text(value);
  return /^-?\d+$/.test(source) ? Number(source) : undefined;
}
function isCountable(value) {
  return value && typeof value === "object" && Number.isInteger(value.current) && (value.max === null || Number.isInteger(value.max));
}
function countableCurrent(value) { return isCountable(value) ? value.current : undefined; }
function add(left, right) { return left === undefined || right === undefined ? undefined : left + right; }
