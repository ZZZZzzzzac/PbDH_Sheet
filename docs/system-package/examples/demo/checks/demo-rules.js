module.exports = ({ characterData, resourceLibraries, cardState }) => {
  const issues = [];
  const values = characterData.character.values;

  checkEquation(values, issues);
  checkClassResources(values, resourceLibraries, issues);
  checkCards(cardState, issues);

  return issues;
};

function checkEquation(values, issues) {
  const raw = ["validation-a", "validation-b", "validation-c"].map((id) => stringValue(values[id]));
  if (raw.every((value) => value === "")) return;

  if (raw.some((value) => value === "")) {
    issues.push({ level: "info", code: "DEMO_EQUATION_INCOMPLETE", path: "character.values.validation-c", text: "A、B、C 尚未全部填写。" });
    return;
  }

  const numbers = raw.map((value) => Number(value));
  if (numbers.some((value) => !Number.isFinite(value))) {
    issues.push({ level: "warning", code: "DEMO_EQUATION_NOT_NUMERIC", path: "character.values.validation-c", text: "A、B、C 必须都是有限数字。" });
    return;
  }

  if (numbers[2] !== numbers[0] + numbers[1]) {
    issues.push({ level: "error", code: "DEMO_EQUATION_MISMATCH", path: "character.values.validation-c", text: `C 应为 ${numbers[0] + numbers[1]}，当前填写 ${numbers[2]}。` });
    return;
  }

  issues.push({ level: "info", code: "DEMO_EQUATION_VALID", path: "character.values.validation-c", text: "等式成立：C = A + B。" });
}

function checkClassResources(values, resourceLibraries, issues) {
  const className = stringValue(values["class-name"]);
  const subclassName = stringValue(values["subclass-name"]);
  if (!className || !subclassName) return;

  const classes = resourceLibraries.find((library) => library.ID === "classes");
  const subclasses = resourceLibraries.find((library) => library.ID === "subclasses");
  const classEntry = classes?.entries.find((entry) => entry.fields["名称"] === className);
  const subclassEntry = subclasses?.entries.find((entry) => entry.fields["名称"] === subclassName);
  if (classEntry && subclassEntry && subclassEntry.fields["主职"] !== className) {
    issues.push({ level: "error", code: "DEMO_SUBCLASS_CLASS_MISMATCH", path: "character.values.subclass-name", text: `子职「${subclassName}」不属于职业「${className}」。` });
  }
}

function checkCards(cardState, issues) {
  const instances = Array.isArray(cardState?.instances) ? cardState.instances : [];
  const consumed = instances.filter((instance) => instance.state === "已消耗").length;
  if (consumed > 0) {
    issues.push({ level: "info", code: "DEMO_CONSUMED_CARDS", path: "cards.instances", text: `卡牌桌面有 ${consumed} 张已消耗卡牌。` });
  }
  if (instances.length > 5) {
    issues.push({ level: "warning", code: "DEMO_MANY_CARDS", path: "cards.instances", text: "卡牌桌面超过 5 张卡，用于演示 Card state warning。" });
  }
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
