import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const legacyRoot = path.resolve(repoRoot, "..", "DaggerHeart_Character");
const outputRoot = path.join(repoRoot, "public", "system-packages", "daggerheart-core", "resources");
const requestedOutput = process.argv[2];

const sources = [
  ["ancestries.json", "data/Daggerheart_Core_Rulebook_种族.js", "RACES_DATA", "ancestry"],
  ["communities.json", "data/Daggerheart_Core_Rulebook_社群.js", "COMM_DATA", "community"],
  ["classes.json", "data/Daggerheart_Core_Rulebook_职业表.js", "MAIN_CLASS", "class"],
  ["subclasses.json", "data/Daggerheart_Core_Rulebook_职业表.js", "SUB_CLASS", "subclass"],
  ["primary-weapons.json", "data/Daggerheart_Core_Rulebook_主武器表.js", "PRIMARY_WEAPON", "primary-weapon"],
  ["secondary-weapons.json", "data/Daggerheart_Core_Rulebook_副武器表.js", "SECONDARY_WEAPON", "secondary-weapon"],
  ["armor.json", "data/Daggerheart_Core_Rulebook_护甲表.js", "ARMOR", "armor"],
  ["loot.json", "data/Daggerheart_Core_Rulebook_战利品与消耗品表.js", "LOOT_DATA", "loot"],
  ["domain-cards.json", "data/Daggerheart_Core_Rulebook_领域卡.js", "DOMAIN_CARDS", "domain-card"],
];

await mkdir(outputRoot, { recursive: true });

const generated = new Map();
for (const [outputName, sourceName, variableName, prefix] of sources.filter(([outputName]) => !requestedOutput || outputName === requestedOutput)) {
  const entries = await readLegacyArray(sourceName, variableName);
  const normalized = entries.map((entry) => normalizeEntry(entry, prefix));
  generated.set(outputName, normalized);
  await writeJson(outputName, normalized);
}

if (!requestedOutput) {
  const backupWeapons = [
    ...generated.get("primary-weapons.json").map((entry) => ({ ...entry, 武器类别: "主武器" })),
    ...generated.get("secondary-weapons.json").map((entry) => ({ ...entry, 武器类别: "副武器" })),
  ].map((entry) => ({
    ...entry,
    ID: `备用武器:${entry.武器类别}:${entry.名称}`,
    旧ID: stableId("backup-weapon", `${entry.武器类别}:${entry.名称}`),
  }));
  await writeJson("backup-weapons.json", backupWeapons);
}

async function readLegacyArray(relativePath, variableName) {
  const source = await readFile(path.join(legacyRoot, relativePath), "utf8");
  const value = Function(`"use strict"; ${source}; return ${variableName};`)();
  if (!Array.isArray(value)) throw new Error(`${variableName} is not an array`);
  return value;
}

function normalizeEntry(rawEntry, prefix) {
  const entry = { ...rawEntry };
  const name = String(entry.名称 ?? "").trim();
  if (!name) throw new Error(`${prefix} entry is missing 名称`);

  if (prefix === "class") {
    flattenQuestions(entry, "背景问题");
    flattenQuestions(entry, "关系问题");
  }

  if (prefix === "subclass" && !entry.描述) {
    entry.描述 = [entry.基础特性, entry.进阶特性, entry.精通特性].filter(Boolean).join("\n\n");
  }

  if (prefix === "ancestry") {
    const match = /^(.+?):\s*([\s\S]*?)\r?\n(.+?):\s*([\s\S]*)$/.exec(String(entry.描述 ?? ""));
    if (!match) throw new Error(`ancestry ${name} description does not contain exactly two features`);
    entry.特性A = `:red[**${match[1]}**]：${match[2]}`;
    entry.特性B = `:red[**${match[3]}**]：${match[4]}`;
    delete entry.描述;
  }

  return {
    ID: readableId(prefix, entry, name),
    旧ID: stableId(prefix, legacyIdentity(prefix, entry, name)),
    ...entry,
    名称: name,
    ...(entry.描述 ? { 描述: String(entry.描述) } : {}),
  };
}

function readableId(prefix, entry, name) {
  if (prefix === "class") return `职业:${name}`;
  if (prefix === "subclass") return `子职:${entry.主职 ?? entry.职业}:${name}:${entry.等级}`;
  if (prefix === "ancestry") return `种族:${name}`;
  if (prefix === "community") return `社群:${name}`;
  if (prefix === "domain-card") return `领域卡:${entry.领域}:${name}`;
  if (prefix === "primary-weapon") return `主武器:${name}`;
  if (prefix === "secondary-weapon") return `副武器:${name}`;
  if (prefix === "armor") return `护甲:${name}`;
  if (prefix === "loot") return `战利品:${name}`;
  throw new Error(`Unknown Resource ID prefix: ${prefix}`);
}

function legacyIdentity(prefix, entry, name) {
  return prefix === "subclass" ? `${entry.主职 ?? entry.职业}:${name}:${entry.等级}` : name;
}

function flattenQuestions(entry, key) {
  const questions = Array.isArray(entry[key]) ? entry[key] : [];
  for (let index = 0; index < 3; index += 1) {
    entry[`${key}${index + 1}`] = String(questions[index] ?? "");
  }
  delete entry[key];
}

function stableId(prefix, identity) {
  const digest = createHash("sha1").update(identity).digest("hex").slice(0, 12);
  return `${prefix}-${digest}`;
}

async function writeJson(name, value) {
  await writeFile(path.join(outputRoot, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
