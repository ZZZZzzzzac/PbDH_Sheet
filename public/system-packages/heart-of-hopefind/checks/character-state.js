module.exports = async (input) => {
  const values = input && input.characterData && input.characterData.character
    ? input.characterData.character.values || {}
    : {};
  const life = values.life;
  const stress = values.stress;
  const issues = [];

  const hopeDie = typeof values["hope-die"] === "string" ? values["hope-die"].trim().toUpperCase() : "";
  if (!["D12", "D10", "D8", "D6", "D4"].includes(hopeDie)) {
    issues.push({
      level: "error",
      code: "HOPEFIND_HOPE_DIE_INVALID",
      path: "character.values.hope-die",
      text: "希望骰必须填写为D12、D10、D8、D6或D4。",
    });
  }

  if (life && stress && typeof life === "object" && typeof stress === "object") {
    const total = Number(life.max) + Number(stress.max);
    if (Number.isFinite(total) && total !== 10) {
      issues.push({
        level: "error",
        code: "HOPEFIND_LIFE_STRESS_MAX_TOTAL",
        text: `生命与压力的上限合计应为 10，当前为 ${total}。`,
      });
    }
  }
  return issues;
};
